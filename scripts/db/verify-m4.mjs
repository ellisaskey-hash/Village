/* M4 live verification: capacity waitlist + promotion, DST-correct recurrence, ask-to-borrow
 * thread, and directory isolation. Run: node scripts/db/verify-m4.mjs */
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sql = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await sql.connect(); await sql.query('set search_path=public,extensions;');
const results = [];
const check = (n, p, d = '') => { results.push({ n, p }); console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${d ? `  [${d}]` : ''}`); };
const rid = (x) => (x == null ? undefined : Array.isArray(x) ? x[0]?.id : x.id ?? x);

await sql.query("delete from auth.users where email like 'm4test+%'");
await sql.query("insert into communities (slug,name,type,region,postcode_districts,skin,status) values ('iso-b','Iso B','village','Test',array['ISO1'],'village','launched') on conflict (slug) do nothing");
const devId = (await sql.query("select id from communities where slug='dev-village'")).rows[0].id;

async function mk(tag) {
  const email = `m4test+${tag}@example.com`, password = 'password123';
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`${tag}: ${error.message}`);
  const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  await client.from('profiles').insert({ id: data.user.id, display_name: tag, email, date_of_birth: '1990-01-01' });
  return { id: data.user.id, client };
}
async function join(u, slug, pc) { const { error } = await u.client.rpc('join_community', { slug, postcode: pc, invite_code: null }); if (error) throw new Error('join ' + error.message); }
async function bump(id, lvl) { await sql.query("select set_config('app.rpc','true',false)"); await sql.query('update memberships set trust_level=$1 where profile_id=$2 and community_id=$3', [lvl, id, devId]); await sql.query("select set_config('app.rpc','false',false)"); }

const org = await mk('org'), a = await mk('a'), b = await mk('b'), c = await mk('c'), owner = await mk('owner'), borrower = await mk('borrower'), iso = await mk('iso');
for (const u of [org, a, b, c, owner, borrower]) await join(u, 'dev-village', 'DV1 1AA');
await join(iso, 'iso-b', 'ISO1 1AA');
for (const u of [org, owner, borrower]) await bump(u.id, 1);

// ---- capacity waitlist + promotion ----
const evRes = await org.client.from('events').insert({ community_id: devId, title: 'Village Quiz', category: 'community', starts_at: new Date(Date.now() + 864e5).toISOString(), rsvp_mode: 'capacity', capacity: 2 }).select('id');
check('organiser (trust1) can create a capacity event', !evRes.error, evRes.error?.message);
const evId = rid(evRes.data);
const ra = await a.client.rpc('set_rsvp', { p_event_id: evId, p_status: 'going', p_party_size: 1 });
const rb = await b.client.rpc('set_rsvp', { p_event_id: evId, p_status: 'going', p_party_size: 1 });
const rc = await c.client.rpc('set_rsvp', { p_event_id: evId, p_status: 'going', p_party_size: 1 });
check('capacity: first two RSVPs are going', (Array.isArray(ra.data) ? ra.data[0] : ra.data)?.status === 'going' && (Array.isArray(rb.data) ? rb.data[0] : rb.data)?.status === 'going');
check('capacity: third RSVP is waitlisted', (Array.isArray(rc.data) ? rc.data[0] : rc.data)?.status === 'waitlist', (Array.isArray(rc.data) ? rc.data[0] : rc.data)?.status);
await a.client.rpc('set_rsvp', { p_event_id: evId, p_status: 'cancelled', p_party_size: 1 });
const cAfter = (await c.client.from('event_rsvps').select('status').eq('event_id', evId).eq('profile_id', c.id).single()).data;
check('capacity: cancelling a going RSVP promotes the waitlisted one', cAfter?.status === 'going', cAfter?.status);

// ---- DST-correct recurrence ----
const parent = (await sql.query(
  "insert into events (community_id, created_by, title, category, starts_at, recurrence, rsvp_mode) values ($1,$2,'Weekly Cricket','sport', timestamptz '2026-03-22 19:00:00 Europe/London', '{\"freq\":\"weekly\",\"interval\":1}'::jsonb, 'none') returning id",
  [devId, org.id],
)).rows[0].id;
const exp = await org.client.rpc('expand_recurrence', { p_parent_id: parent, p_count: 4 });
check('recurrence: expand_recurrence generates instances', !exp.error, exp.error?.message);
const kids = (await sql.query("select (starts_at at time zone 'Europe/London')::time::text as localtime, starts_at from events where parent_event_id=$1 order by starts_at", [parent])).rows;
const allLocal7pm = kids.length === 4 && kids.every((k) => k.localtime === '19:00:00');
const crossesDst = kids.some((k) => new Date(k.starts_at) >= new Date('2026-03-29T00:00:00Z'));
check('recurrence: all instances stay at 19:00 local across the DST change (DST-correct)', allLocal7pm, kids.map((k) => k.localtime).join(','));
check('recurrence: at least one instance is past the 29 Mar 2026 DST boundary', crossesDst);

// ---- ask to borrow -> thread ----
const eq = await owner.client.from('equipment_items').insert({ community_id: devId, owner_profile_id: owner.id, name: 'Pressure washer', category: 'garden' }).select('id');
check('owner (trust1) can add equipment to the lending library', !eq.error, eq.error?.message);
const ask = await borrower.client.rpc('open_thread', { p_context: 'direct', p_context_id: null, p_recipient: owner.id, p_first_message: 'Could I borrow the pressure washer this weekend?' });
check('ask-to-borrow opens a thread with the owner', !ask.error && !!rid(ask.data), ask.error?.message);

// ---- isolation ----
check('isolation: iso-b member cannot see dev-village events', ((await iso.client.from('events').select('id').eq('community_id', devId)).data ?? []).length === 0);
check('isolation: iso-b member cannot see dev-village equipment', ((await iso.client.from('equipment_items').select('id').eq('community_id', devId)).data ?? []).length === 0);
check('same-community: a member can see the event', ((await a.client.from('events').select('id').eq('id', evId)).data ?? []).length === 1);

const passed = results.filter((r) => r.p).length, failed = results.filter((r) => !r.p);
console.log(`\n==== ${passed}/${results.length} M4 checks passed ====`);
if (failed.length) { console.log('FAILURES:'); failed.forEach((f) => console.log('  - ' + f.n)); }
await sql.end();
process.exit(failed.length ? 1 : 0);
