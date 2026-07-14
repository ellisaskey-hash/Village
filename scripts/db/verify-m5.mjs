/* M5 live verification: tiered alerts + push fan-out. Run: node scripts/db/verify-m5.mjs */
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sql = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await sql.connect(); await sql.query('set search_path=public,extensions;');
const results = [];
const check = (n, p, d = '') => { results.push({ n, p }); console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${d ? `  [${d}]` : ''}`); };

// cleanup
await sql.query("delete from auth.users where email like 'm5test+%'");
await sql.query("delete from alerts where title like 'M5 %'");
await sql.query("delete from push_fanout_queue where title like 'M5 %'");
await sql.query("delete from push_dispatch_log where title like 'M5 %'");
await sql.query("delete from organisations where name='M5 Parish Council'");
await sql.query("insert into communities (slug,name,type,region,postcode_districts,skin,status) values ('iso-b','Iso B','village','Test',array['ISO1'],'village','launched') on conflict (slug) do nothing");
const devId = (await sql.query("select id from communities where slug='dev-village'")).rows[0].id;

async function mk(tag) {
  const email = `m5test+${tag}@example.com`, password = 'password123';
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`${tag}: ${error.message}`);
  const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  await client.from('profiles').insert({ id: data.user.id, display_name: tag, email, date_of_birth: '1990-01-01' });
  return { id: data.user.id, client };
}
async function join(u, slug, pc) { const { error } = await u.client.rpc('join_community', { slug, postcode: pc, invite_code: null }); if (error) throw new Error('join ' + error.message); }
async function bump(id, lvl) { await sql.query("select set_config('app.rpc','true',false)"); await sql.query('update memberships set trust_level=$1 where profile_id=$2 and community_id=$3', [lvl, id, devId]); await sql.query("select set_config('app.rpc','false',false)"); }

const adminU = await mk('admin'), m1 = await mk('m1'), officer = await mk('officer'), nonoff = await mk('nonoff'), optedout = await mk('optedout'), quietU = await mk('quiet'), normalU = await mk('normal'), iso = await mk('iso');
for (const u of [adminU, m1, officer, nonoff, optedout, quietU, normalU]) await join(u, 'dev-village', 'DV1 1AA');
await join(iso, 'iso-b', 'ISO1 1AA');
for (const u of [m1, officer]) await bump(u.id, 1);
await sql.query("update profiles set platform_role='admin' where id=$1", [adminU.id]);

// verified org + officer
const orgId = (await sql.query("insert into organisations (community_id,name,kind,verified_source,source) values ($1,'M5 Parish Council','council',true,'seed') returning id", [devId])).rows[0].id;
await sql.query('insert into organisation_members (organisation_id, profile_id, role) values ($1,$2,$3)', [orgId, officer.id, 'officer']);
// prefs + quiet hours + subscriptions
await sql.query(`update profiles set notification_prefs='{"alert.community":false}'::jsonb where id=$1`, [optedout.id]);
await sql.query(`update profiles set quiet_hours='{"start":"00:00","end":"23:59","tz":"Europe/London"}'::jsonb where id=$1`, [quietU.id]);
await sql.query("insert into push_subscriptions (profile_id, endpoint, keys) values ($1,'m5-quiet','{\"p256dh\":\"x\",\"auth\":\"y\"}'::jsonb)", [quietU.id]);
await sql.query("insert into push_subscriptions (profile_id, endpoint, keys) values ($1,'m5-normal','{\"p256dh\":\"x\",\"auth\":\"y\"}'::jsonb)", [normalU.id]);
await sql.query("insert into push_subscriptions (profile_id, endpoint, keys) select $1, 'm5-bulk-'||g, '{\"p256dh\":\"x\",\"auth\":\"y\"}'::jsonb from generate_series(1,200) g", [m1.id]);

// ---- tier gating + forgery ----
check('community alert: trust-1 member can post', !(await m1.client.rpc('post_alert', { p_community: devId, p_tier: 'community', p_category: 'lostPet', p_title: 'M5 Lost cat', p_body: 'Ginger tom', p_as_org: null })).error);
{
  const { error } = await nonoff.client.from('alerts').insert({ community_id: devId, tier: 'verified', category: 'roadClosure', as_organisation_id: orgId, title: 'M5 Forged' }).select('id');
  check('forgery: non-officer verified alert blocked at RLS (direct insert)', !!error, error ? 'denied' : 'ALLOWED!');
}
check('forgery: non-officer verified alert refused by post_alert', !!(await nonoff.client.rpc('post_alert', { p_community: devId, p_tier: 'verified', p_category: 'roadClosure', p_title: 'M5 Forged2', p_body: null, p_as_org: orgId })).error);
check('verified alert: a verified-org officer can post', !(await officer.client.rpc('post_alert', { p_community: devId, p_tier: 'verified', p_category: 'roadClosure', p_title: 'M5 Road closed', p_body: 'High St', p_as_org: orgId })).error);
check('platform alert: a non-admin is refused', !!(await m1.client.rpc('post_alert', { p_community: devId, p_tier: 'platform', p_category: 'emergency', p_title: 'M5 nope', p_body: null, p_as_org: null })).error);

// ---- opted-in only (in-app) ----
await adminU.client.rpc('post_alert', { p_community: devId, p_tier: 'community', p_category: 'lostItem', p_title: 'M5 Found keys', p_body: 'by the green', p_as_org: null });
check('in-app: a normal member receives the community alert notification', ((await normalU.client.from('notifications').select('id').eq('title', 'M5 Found keys')).data ?? []).length === 1);
check('in-app: an opted-out member does NOT receive it', ((await optedout.client.from('notifications').select('id').eq('title', 'M5 Found keys')).data ?? []).length === 0);

// ---- isolation + resolution ----
check('isolation: iso-b member cannot read dev-village alerts', ((await iso.client.from('alerts').select('id').eq('community_id', devId)).data ?? []).length === 0);
const myAlert = (await m1.client.from('alerts').select('id').eq('title', 'M5 Lost cat').single()).data;
await m1.client.rpc('resolve_alert', { p_id: myAlert.id });
const resolved = (await sql.query('select resolved_at from alerts where id=$1', [myAlert.id])).rows[0];
check('resolution: resolve_alert stamps resolved_at', !!resolved.resolved_at);
check('resolution: a resolution push is enqueued', (await sql.query("select count(*)::int c from push_fanout_queue where title like '%resolved'")).rows[0].c >= 1);

// ---- push fan-out drain: emergency bypass + quiet hours + 200-sub scale ----
await adminU.client.rpc('post_alert', { p_community: devId, p_tier: 'platform', p_category: 'emergency', p_title: 'M5 Flood warning', p_body: 'Evacuate low areas', p_as_org: null });
const t0 = Date.now();
const drained = await adminU.client.rpc('drain_fanout', { p_batch: 1000 });
check('drain: cron drain runs (admin only)', !drained.error, drained.error?.message);
const dlog = async (title, profileId) => (await sql.query('select count(*)::int c from push_dispatch_log where title=$1 and profile_id=$2', [title, profileId])).rows[0].c;
check('push: emergency reaches a quiet-hours member (bypass)', (await dlog('M5 Flood warning', quietU.id)) >= 1);
check('push: a normal community alert is skipped for a quiet-hours member', (await dlog('M5 Found keys', quietU.id)) === 0);
check('push: a normal community alert reaches a non-quiet member', (await dlog('M5 Found keys', normalU.id)) >= 1);
check('push: 200-subscription fan-out completed (set-based, no timeout)', (await dlog('M5 Found keys', m1.id)) >= 200, `${Date.now() - t0}ms`);

const passed = results.filter((r) => r.p).length, failed = results.filter((r) => !r.p);
console.log(`\n==== ${passed}/${results.length} M5 checks passed ====`);
if (failed.length) { console.log('FAILURES:'); failed.forEach((f) => console.log('  - ' + f.n)); }
await sql.end();
process.exit(failed.length ? 1 : 0);
