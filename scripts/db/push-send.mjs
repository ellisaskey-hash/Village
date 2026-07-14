/*
 * Web-push sender (spec 09 — the delivery half of the fan-out). Reads push_subscriptions and
 * sends a VAPID-signed notification; cleans up 404/410 (gone) subscriptions. This is what a
 * Vercel cron function will call in M8; runnable now for gate-3 device testing.
 * Usage: node scripts/db/push-send.mjs "Title" "Body" "/deeplink" [emailFilter]
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';
import webpush from 'web-push';

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
webpush.setVapidDetails(env.VAPID_SUBJECT || 'mailto:test@example.com', env.VITE_VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

const [title = 'Local', body = 'Test notification', deepLink = '/', emailFilter] = process.argv.slice(2);
const sql = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await sql.connect();

const q = emailFilter
  ? await sql.query('select ps.endpoint, ps.keys from push_subscriptions ps join profiles p on p.id=ps.profile_id where p.email=$1', [emailFilter])
  : await sql.query('select endpoint, keys from push_subscriptions');

console.log(`Sending to ${q.rows.length} subscription(s)...`);
let sent = 0, gone = 0, failed = 0;
for (const row of q.rows) {
  try {
    await webpush.sendNotification({ endpoint: row.endpoint, keys: row.keys }, JSON.stringify({ title, body, deepLink }));
    sent++;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) {
      await sql.query('delete from push_subscriptions where endpoint=$1', [row.endpoint]);
      gone++;
    } else {
      failed++;
      console.log('  send error', e.statusCode, String(e.body || e.message).slice(0, 80));
    }
  }
}
console.log(`sent=${sent} cleaned(gone)=${gone} failed=${failed}`);
await sql.end();
