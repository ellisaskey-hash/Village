/* M7 live verification: 3-report auto-hide (author sees / third party doesn't), admin actions
 * logged, suspension blocks writes not reads, GDPR export/delete. Run: node scripts/db/verify-m7.mjs */
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

await sql.query("delete from moderation_actions where target_id in (select id from listings where title like 'M7 %') or actor_id in (select id from profiles where email like 'm7test+%')");
await sql.query("delete from reports where reporter_id in (select id from profiles where email like 'm7test+%')");
await sql.query("delete from first_post_delays where profile_id in (select id from profiles where email like 'm7test+%')");
await sql.query("delete from listings where title like 'M7 %'");
await sql.query("delete from auth.users where email like 'm7test+%'");
const devId = (await sql.query("select id from communities where slug='dev-village'")).rows[0].id;

async function mk(tag) {
  const email = `m7test+${tag}@example.com`, password = 'password123';
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`${tag}: ${error.message}`);
  const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  await client.from('profiles').insert({ id: data.user.id, display_name: tag, email, date_of_birth: '1990-01-01' });
  await client.rpc('join_community', { slug: 'dev-village', postcode: 'DV1 1AA', invite_code: null });
  return { id: data.user.id, client, email };
}
async function bump(id, lvl) { await sql.query("select set_config('app.rpc','true',false)"); await sql.query('update memberships set trust_level=$1 where profile_id=$2 and community_id=$3', [lvl, id, devId]); await sql.query("select set_config('app.rpc','false',false)"); }

const adminU = await mk('admin'), author = await mk('author'), r1 = await mk('r1'), r2 = await mk('r2'), r3 = await mk('r3'), viewer = await mk('viewer'), suspendee = await mk('susp'), deleter = await mk('del');
await sql.query("update profiles set platform_role='admin' where id=$1", [adminU.id]);
await bump(author.id, 1); await bump(suspendee.id, 1); await bump(deleter.id, 1);

// ---- 3-report auto-hide ----
const l1 = rid((await author.client.from('listings').insert({ community_id: devId, kind: 'free', title: 'M7 Dodgy sofa', category: 'x' }).select('id')).data);
for (const r of [r1, r2, r3]) await r.client.rpc('report_target', { p_kind: 'listing', p_id: l1, p_reason: 'spam', p_note: null });
check('auto-hide: after 3 reports the listing is hidden from a third party', ((await viewer.client.from('listings').select('id').eq('id', l1)).data ?? []).length === 0);
check('auto-hide: the author can still see their hidden listing', ((await author.client.from('listings').select('id').eq('id', l1)).data ?? []).length === 1);
check('auto-hide: an admin can see the hidden listing', ((await adminU.client.from('listings').select('id').eq('id', l1)).data ?? []).length === 1);
check('auto-hide: the autoHide action is in the moderation log', ((await adminU.client.from('moderation_actions').select('action').eq('target_id', l1).eq('action', 'autoHide')).data ?? []).length >= 1);

// ---- admin action logged ----
const l2 = rid((await author.client.from('listings').insert({ community_id: devId, kind: 'free', title: 'M7 Another', category: 'x' }).select('id')).data);
const modRes = await adminU.client.rpc('admin_moderate', { p_action: 'hide', p_kind: 'listing', p_id: l2, p_detail: { reason: 'test' } });
check('admin_moderate: hide succeeds', !modRes.error, modRes.error?.message);
check('admin_moderate: the hide action is logged', ((await adminU.client.from('moderation_actions').select('id').eq('target_id', l2).eq('action', 'hide')).data ?? []).length >= 1);
check('admin_moderate: hidden listing invisible to third party', ((await viewer.client.from('listings').select('id').eq('id', l2)).data ?? []).length === 0);

// ---- suspension blocks writes, not reads ----
const preListing = rid((await suspendee.client.from('listings').insert({ community_id: devId, kind: 'free', title: 'M7 Before suspend', category: 'x' }).select('id')).data);
await adminU.client.rpc('admin_moderate', { p_action: 'suspend', p_kind: 'profile', p_id: suspendee.id, p_detail: { community_id: devId, days: 7 } });
const blockedWrite = await suspendee.client.from('listings').insert({ community_id: devId, kind: 'free', title: 'M7 After suspend', category: 'x' }).select('id');
check('suspension: a suspended member cannot post (write blocked)', !!blockedWrite.error, blockedWrite.error ? 'denied' : 'ALLOWED!');
check('suspension: a suspended member can still read', ((await suspendee.client.from('listings').select('id').eq('id', preListing)).data ?? []).length === 1);
await adminU.client.rpc('admin_moderate', { p_action: 'unsuspend', p_kind: 'profile', p_id: suspendee.id, p_detail: { community_id: devId } });
check('suspension: unsuspend restores writes', !(await suspendee.client.from('listings').insert({ community_id: devId, kind: 'free', title: 'M7 After unsuspend', category: 'x' }).select('id')).error);

// ---- GDPR export + delete ----
const exp = await author.client.rpc('export_account');
check('GDPR export: returns the account data', !exp.error && exp.data?.profile?.id === author.id && Array.isArray(exp.data?.listings), exp.error?.message);
const delListing = rid((await deleter.client.from('listings').insert({ community_id: devId, kind: 'free', title: 'M7 Deleter listing', category: 'x' }).select('id')).data);
await deleter.client.rpc('delete_account');
const prof = (await sql.query('select display_name, email from profiles where id=$1', [deleter.id])).rows[0];
check('GDPR delete: profile PII anonymised', prof.display_name === 'Former neighbour' && prof.email.startsWith('deleted+'), prof.display_name);
check('GDPR delete: their content survives (authorship anonymised, not deleted)', (await sql.query('select 1 from listings where id=$1', [delListing])).rows.length === 1);

const passed = results.filter((r) => r.p).length, failed = results.filter((r) => !r.p);
console.log(`\n==== ${passed}/${results.length} M7 checks passed ====`);
if (failed.length) { console.log('FAILURES:'); failed.forEach((f) => console.log('  - ' + f.n)); }
await sql.end();
process.exit(failed.length ? 1 : 0);
