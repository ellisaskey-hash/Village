/* Provision the designated admin test account and a small live moderation scenario in
 * dev-village so the /admin console has something real to show. Idempotent: the admin account
 * is created once and preserved; the demo content is rebuilt each run.
 * Run: node scripts/db/seed-admin.mjs
 * Registry: docs/SCRIPTS_REGISTRY.md (ongoing — test-account provisioning). */
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sql = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await sql.connect(); await sql.query('set search_path=public,extensions;');

const ADMIN_EMAIL = 'admin@thelocal.test';
const ADMIN_PASSWORD = 'Local-admin-2026';
const rid = (x) => (Array.isArray(x) ? x[0]?.id : x?.id);

const devId = (await sql.query("select id from communities where slug='dev-village'")).rows[0].id;

async function ensureUser(email, password, displayName) {
  let { data: existing } = await admin.auth.admin.listUsers();
  let user = existing.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(`${email}: ${error.message}`);
    user = data.user;
  }
  const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  // profile + membership (idempotent)
  if ((await sql.query('select 1 from profiles where id=$1', [user.id])).rows.length === 0) {
    await client.from('profiles').insert({ id: user.id, display_name: displayName, email, date_of_birth: '1985-01-01' });
  }
  const hasM = (await sql.query('select 1 from memberships where profile_id=$1 and community_id=$2', [user.id, devId])).rows.length > 0;
  if (!hasM) await client.rpc('join_community', { slug: 'dev-village', postcode: 'DV1 1AA', invite_code: null });
  return { id: user.id, client };
}

// ---- admin account (stable) ----
const a = await ensureUser(ADMIN_EMAIL, ADMIN_PASSWORD, 'Ellis (admin)');
await sql.query("update profiles set platform_role='admin' where id=$1", [a.id]);
await sql.query("select set_config('app.rpc','true',false)");
await sql.query('update memberships set trust_level=3 where profile_id=$1 and community_id=$2', [a.id, devId]);
await sql.query("select set_config('app.rpc','false',false)");

// ---- rebuild the demo moderation scenario ----
await sql.query("delete from moderation_actions where target_id in (select id from listings where title like 'DEMO %') or actor_id in (select id from profiles where email like 'demoseed+%')");
await sql.query("delete from reports where reporter_id in (select id from profiles where email like 'demoseed+%')");
await sql.query("delete from listings where title like 'DEMO %'");
await sql.query("delete from auth.users where email like 'demoseed+%'");

const author = await ensureUser('demoseed+author@thelocal.test', 'password123', 'Demo Author');
const listing = rid((await author.client.from('listings').insert({ community_id: devId, kind: 'sell', title: 'DEMO Cheap iPhones, cash only', category: 'electronics', price_pence: 5000 }).select('id')).data);
for (const n of [1, 2, 3]) {
  const r = await ensureUser(`demoseed+r${n}@thelocal.test`, 'password123', `Demo Reporter ${n}`);
  await r.client.rpc('report_target', { p_kind: 'listing', p_id: listing, p_reason: n === 1 ? 'scam' : 'spam', p_note: n === 1 ? 'Looks like a scam, no photos and cash only.' : null });
}

const hidden = (await sql.query('select hidden_at from listings where id=$1', [listing])).rows[0].hidden_at;
console.log('\nAdmin account ready:');
console.log(`  email:    ${ADMIN_EMAIL}`);
console.log(`  password: ${ADMIN_PASSWORD}`);
console.log(`  role:     platform admin, steward of Dev Village`);
console.log(`\nDemo scenario in Dev Village:`);
console.log(`  1 listing "DEMO Cheap iPhones, cash only" reported 3 times -> auto-hidden: ${hidden ? 'yes' : 'NO'}`);
console.log(`  Expect: Reports queue shows it (1 priority-ish), Hidden shows it, Action log shows an auto-hide.`);
await sql.end();
