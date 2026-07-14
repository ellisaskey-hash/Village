/*
 * Proves the RLS security model against the LIVE database, exercising the real policies
 * through PostgREST as each authenticated user (exactly as the app does), with SQL only for
 * setup/inspection. Covers the four canonical assertions across M1-M3 tables plus the full
 * mutual-aid loop, trust-0 caps, cold-DM gate, and realtime.
 * Run: node scripts/db/verify-security.mjs
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const URL = env.VITE_SUPABASE_URL, ANON = env.VITE_SUPABASE_ANON_KEY, SR = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL, SR, { auth: { persistSession: false, autoRefreshToken: false } });
const sql = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await sql.connect();
await sql.query('set search_path=public,extensions;');

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`);
}
const rowId = (d) => (d == null ? undefined : Array.isArray(d) ? d[0]?.id : d.id ?? d);

// ---- cleanup + fixtures --------------------------------------------------------
await sql.query("delete from auth.users where email like 'rlstest+%'");
await sql.query("delete from businesses where name in ('Alice Bakery','Forged','Forged Business')");
await sql.query("delete from places where name='Secret Spot'");
await sql.query("delete from communities where slug='iso-b'");
await sql.query(
  "insert into communities (slug,name,type,region,postcode_districts,skin,status) values ('iso-b','Iso B','village','Test',array['ISO1'],'village','launched') on conflict (slug) do nothing",
);
const devId = (await sql.query("select id from communities where slug='dev-village'")).rows[0].id;

async function makeUser(tag) {
  const email = `rlstest+${tag}@example.com`, password = 'password123';
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`createUser ${tag}: ${error.message}`);
  const id = data.user.id;
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: se } = await client.auth.signInWithPassword({ email, password });
  if (se) throw new Error(`signIn ${tag}: ${se.message}`);
  const { error: pe } = await client.from('profiles').insert({ id, display_name: tag, email, date_of_birth: '1990-01-01' });
  if (pe) throw new Error(`profile ${tag}: ${pe.message}`);
  return { id, client };
}
async function join(u, slug, postcode) {
  const { error } = await u.client.rpc('join_community', { slug, postcode, invite_code: null });
  if (error) throw new Error(`join ${slug}: ${error.message}`);
}

const alice = await makeUser('alice');
const ben = await makeUser('ben');
const tina = await makeUser('tina');
const fred = await makeUser('fred');
const carol = await makeUser('carol');
await join(alice, 'dev-village', 'DV1 1AA');
await join(ben, 'dev-village', 'DV1 1AA');
await join(tina, 'dev-village', 'DV1 1AA');
await join(fred, 'dev-village', 'DV1 1AA');
await join(carol, 'iso-b', 'ISO1 1AA');

// bump alice to trust 2 for setup (business/org creation) — via the RPC bypass flag
await sql.query("select set_config('app.rpc','true',false)");
await sql.query('update memberships set trust_level=2 where profile_id=$1 and community_id=$2', [alice.id, devId]);
await sql.query("select set_config('app.rpc','false',false)");

const bizRes = await alice.client.from('businesses').insert({ community_id: devId, owner_profile_id: alice.id, name: 'Alice Bakery', source: 'self' }).select('id');
check('alice (trust 2) can create her own business', !bizRes.error, bizRes.error?.message);
const aliceBiz = rowId(bizRes.data);
const reqRes = await alice.client.from('requests').insert({ community_id: devId, title: 'Borrow a ladder', category: 'borrow' }).select('id');
check('alice can post a request (created_by defaulted to auth.uid())', !reqRes.error, reqRes.error?.message);
const aliceReq = rowId(reqRes.data);

// ---- (a) cross-community isolation ----------------------------------------------
check('isolation: carol (iso-b) cannot read dev-village requests', ((await carol.client.from('requests').select('id').eq('community_id', devId)).data ?? []).length === 0);
check('isolation: carol cannot read dev-village businesses', ((await carol.client.from('businesses').select('id').eq('community_id', devId)).data ?? []).length === 0);
check('isolation: carol cannot read dev-village memberships', ((await carol.client.from('memberships').select('community_id').eq('community_id', devId)).data ?? []).length === 0);
check('same-community: ben can read the request in his community', ((await ben.client.from('requests').select('id').eq('id', aliceReq)).data ?? []).length === 1);

// ---- (c) hidden rows invisible to third parties ---------------------------------
const placeId = (await sql.query("insert into places (community_id,name,kind,source,created_by) values ($1,'Secret Spot','other','member',$2) returning id", [devId, alice.id])).rows[0].id;
await sql.query("update places set hidden_at=now(), hidden_reason='test' where id=$1", [placeId]);
check('hidden: a third party (fred) cannot see a hidden place', ((await fred.client.from('places').select('id').eq('id', placeId)).data ?? []).length === 0);
check('hidden: the author (alice) can still see her hidden place', ((await alice.client.from('places').select('id').eq('id', placeId)).data ?? []).length === 1);

// ---- (d) acting-as cannot be forged ---------------------------------------------
{
  const { error } = await carol.client.from('businesses').insert({ community_id: devId, owner_profile_id: carol.id, name: 'Forged Business', source: 'self' }).select('id');
  check('acting-as: carol cannot create a business in a community she is not in', !!error, error ? 'denied' : 'ALLOWED!');
}
{
  const { error } = await tina.client.from('listings').insert({ community_id: devId, as_business_id: aliceBiz, kind: 'sell', title: 'Forged', category: 'x' }).select('id');
  check('acting-as: tina cannot post a listing as a business she does not own', !!error, error ? 'denied' : 'ALLOWED!');
}

// ---- (b) trust-0 create caps ----------------------------------------------------
{
  const l1 = await tina.client.from('listings').insert({ community_id: devId, kind: 'free', title: 'One', category: 'x' }).select('id');
  const l2 = await tina.client.from('listings').insert({ community_id: devId, kind: 'free', title: 'Two', category: 'x' }).select('id');
  const l3 = await tina.client.from('listings').insert({ community_id: devId, kind: 'free', title: 'Three', category: 'x' }).select('id');
  check('trust-0 cap: first two listings allowed', !l1.error && !l2.error, l1.error?.message || l2.error?.message);
  check('trust-0 cap: third active listing rejected server-side', !!l3.error, l3.error ? 'denied' : 'CAP BREACH');
  const r1 = await tina.client.from('requests').insert({ community_id: devId, title: 'Req one', category: 'help' }).select('id');
  const r2 = await tina.client.from('requests').insert({ community_id: devId, title: 'Req two', category: 'help' }).select('id');
  check('trust-0 cap: first open request allowed', !r1.error, r1.error?.message);
  check('trust-0 cap: second open request rejected server-side', !!r2.error, r2.error ? 'denied' : 'CAP BREACH');
}

// ---- (e) cold-DM gate -----------------------------------------------------------
{
  const { error } = await tina.client.rpc('open_thread', { p_context: 'direct', p_context_id: null, p_recipient: ben.id, p_first_message: 'hey' });
  check('cold-DM: a trust-0 cold direct message is refused', !!error, error ? 'refused' : 'ALLOWED!');
  const inCtx = await tina.client.rpc('open_thread', { p_context: 'request', p_context_id: aliceReq, p_recipient: null, p_first_message: 'I can help' });
  check('cold-DM: an in-context reply to a request is allowed', !inCtx.error && !!inCtx.data, inCtx.error?.message);
}

// ---- (f) full mutual-aid loop + (P4) participant-only ---------------------------
{
  const open = await ben.client.rpc('open_thread', { p_context: 'request', p_context_id: aliceReq, p_recipient: null, p_first_message: 'I have a ladder' });
  const threadId = rowId(open.data);
  check('loop: ben opens a thread on the request', !open.error && !!threadId, open.error?.message);
  const reqStat = (await alice.client.from('requests').select('status').eq('id', aliceReq).single()).data;
  check('loop: request auto-moves open -> answered on first response', reqStat?.status === 'answered', reqStat?.status);
  const send = await ben.client.from('messages').insert({ thread_id: threadId, sender_id: ben.id, body: 'When suits?' }).select('id');
  check('loop: a participant can send a message', !send.error, send.error?.message);
  await new Promise((r) => setTimeout(r, 600));
  check('loop: alice receives a message notification (fan-out trigger)', ((await alice.client.from('notifications').select('id').eq('category', 'message')).data ?? []).length >= 1);
  const reply = await alice.client.from('messages').insert({ thread_id: threadId, sender_id: alice.id, body: 'Tomorrow AM' }).select('id');
  check('loop: the author can reply (both directions)', !reply.error, reply.error?.message);
  await new Promise((r) => setTimeout(r, 600));
  check('loop: ben receives a notification on the reply', ((await ben.client.from('notifications').select('id').eq('category', 'message')).data ?? []).length >= 1);
  const ff = await alice.client.rpc('set_request_status', { p_id: aliceReq, p_status: 'fulfilled', p_fulfilled_by: ben.id });
  check('loop: the author marks the request fulfilled', !ff.error, ff.error?.message);
  check('loop: request status is now fulfilled', rowId(ff.data) ? (Array.isArray(ff.data) ? ff.data[0].status : ff.data.status) === 'fulfilled' : false);
  check('P4: a non-participant (carol) cannot read the thread messages', ((await carol.client.from('messages').select('id').eq('thread_id', threadId)).data ?? []).length === 0);
}

// ---- (g) realtime both directions ----------------------------------------------
try {
  const open = await alice.client.rpc('open_thread', { p_context: 'direct', p_context_id: null, p_recipient: ben.id, p_first_message: 'hello direct' });
  const threadId = rowId(open.data);
  if (open.error) { check('realtime: setup direct thread', false, open.error.message); }
  else {
    let got = false;
    const ch = alice.client.channel('rt-test').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` }, () => { got = true; });
    await new Promise((res) => ch.subscribe((s) => { if (s === 'SUBSCRIBED') res(); }));
    await new Promise((r) => setTimeout(r, 800));
    await ben.client.from('messages').insert({ thread_id: threadId, sender_id: ben.id, body: 'realtime ping' });
    const start = Date.now();
    while (!got && Date.now() - start < 8000) await new Promise((r) => setTimeout(r, 200));
    check('realtime: message INSERT delivered to the other participant', got, got ? 'received' : 'not received in 8s');
    await alice.client.removeChannel(ch);
  }
} catch (e) { check('realtime: message delivery', false, e.message); }

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass);
console.log(`\n==== ${passed}/${results.length} checks passed ====`);
if (failed.length) { console.log('FAILURES:'); for (const f of failed) console.log('  - ' + f.name); }
await sql.end();
process.exit(failed.length ? 1 : 0);
