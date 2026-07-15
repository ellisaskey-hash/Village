/* Gate 4 — run the REAL ingestion pipeline for Horsmonden (TN12) against live APIs and land
 * the results as seed_proposals ONLY (nothing auto-publishes, spec 08). Dedupes against rows
 * already accepted (places/businesses/organisations) and against pending proposals, so it is
 * idempotent. Reuses the transformers + fetchers in src/lib/ingest via esbuild (no duplication).
 *
 * Companies House needs a key: set CH_API_KEY in .env, else that source logs AWAITING-KEY.
 * Run: node scripts/db/ingest-horsmonden.mjs
 * Registry: docs/SCRIPTS_REGISTRY.md (ongoing — per-community launch tooling). */
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { build } from 'esbuild';
import pg from 'pg';

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));

// Bundle the TS live-ingestion module to a temp ESM file, then import it.
const tmp = 'scripts/db/.live-ingest.bundle.mjs';
await build({ entryPoints: ['src/lib/ingest/live.ts'], bundle: true, format: 'esm', platform: 'node', outfile: tmp, logLevel: 'error' });
const { runLiveIngestion, draftKey } = await import('../../' + tmp);

const sql = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await sql.connect(); await sql.query('set search_path=public,extensions;');
const community = (await sql.query("select id from communities where slug='horsmonden'")).rows[0];
if (!community) throw new Error('Horsmonden community not found');
const cid = community.id;

console.log('Running live ingestion for Horsmonden (TN12)…\n');
const districts = (await sql.query('select postcode_districts from communities where id=$1', [cid])).rows[0].postcode_districts;
const { drafts, reports } = await runLiveIngestion({
  name: 'Horsmonden',
  lat: 51.1268, lon: 0.4368, radiusMetres: 2500,
  fhrsQuery: 'Horsmonden',
  postcodeDistricts: districts,
  companiesHouseKey: env.CH_API_KEY || undefined,
});

for (const r of reports) {
  console.log(`  ${r.ok ? 'OK ' : '-- '} ${r.source.padEnd(16)} raw:${String(r.rawCount).padStart(4)}  drafts:${String(r.draftCount).padStart(4)}${r.note ? `  (${r.note})` : ''}`);
}

// Dedupe: against accepted rows + existing pending proposals + within this batch.
const seen = new Set();
const accepted = [
  ...(await sql.query("select 'place' k, name from places where community_id=$1", [cid])).rows,
  ...(await sql.query("select 'business' k, name from businesses where community_id=$1", [cid])).rows,
  ...(await sql.query("select 'organisation' k, name from organisations where community_id=$1", [cid])).rows,
];
accepted.forEach((r) => seen.add(draftKey(r.k, r.name)));
const existingProps = (await sql.query("select kind, payload->>'name' name from seed_proposals where community_id=$1 and status='pending'", [cid])).rows;
existingProps.forEach((r) => seen.add(draftKey(r.kind, r.name || '')));

let inserted = 0, deduped = 0;
for (const d of drafts) {
  const name = String(d.payload.name ?? '');
  const key = draftKey(d.kind, name);
  if (seen.has(key)) { deduped++; continue; }
  seen.add(key);
  await sql.query('insert into seed_proposals (community_id, kind, source, payload, status) values ($1,$2,$3,$4,$5)',
    [cid, d.kind, d.source, JSON.stringify(d.payload), 'pending']);
  inserted++;
}

console.log(`\nDrafts: ${drafts.length}  →  inserted: ${inserted}  deduped: ${deduped}`);
const summary = (await sql.query("select source, kind, count(*)::int n from seed_proposals where community_id=$1 and status='pending' group by 1,2 order by 1,2", [cid])).rows;
console.log('\nPending proposals now in the review queue:');
summary.forEach((r) => console.log(`  ${r.source.padEnd(16)} ${r.kind.padEnd(14)} ${r.n}`));

rmSync(tmp, { force: true });
await sql.end();
