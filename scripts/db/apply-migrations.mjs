/*
 * Applies supabase/migrations/*.sql in filename order against the DB in SUPABASE_DB_URL,
 * tracked in public._migrations, each file in its own transaction. Ops tool for the no-CLI
 * (no Docker) environment. Run: node scripts/db/apply-migrations.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import pg from 'pg';

function loadEnv() {
  const out = {};
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const env = loadEnv();
const client = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query('set search_path = public, extensions;');
await client.query('create table if not exists public._migrations (name text primary key, applied_at timestamptz default now());');

const applied = new Set((await client.query('select name from public._migrations')).rows.map((r) => r.name));
const dir = 'supabase/migrations';
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

for (const f of files) {
  if (applied.has(f)) {
    console.log('skip   ', f);
    continue;
  }
  const sql = readFileSync(`${dir}/${f}`, 'utf8');
  try {
    await client.query('begin');
    await client.query(sql);
    await client.query('insert into public._migrations(name) values($1)', [f]);
    await client.query('commit');
    console.log('applied', f);
  } catch (e) {
    await client.query('rollback').catch(() => {});
    console.error('\nFAILED ', f, '\n  ', e.message);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log('\nAll migrations applied.');
