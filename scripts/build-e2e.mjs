/* Build the app in guaranteed MOCK mode for e2e, into dist-e2e.
 *
 * The trap this closes (hit during M7): `vite build` bakes in whatever VITE_SUPABASE_* are
 * present, and `.env` (gitignored, holds real creds) is present locally — so `npm run preview`
 * served a Supabase-mode bundle and Playwright hit rate-limited real auth. Here we build with
 * `.env` temporarily moved aside, so hasSupabaseEnv() is false and the app selects the mock.
 * `.env` is always restored, even if the build fails. Output goes to dist-e2e so it can never
 * collide with a real `dist` from `npm run build`.
 * Registry: docs/SCRIPTS_REGISTRY.md (ongoing — e2e tooling). */
import { existsSync, renameSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const ENV = '.env';
const HIDDEN = '.env.e2e-hidden';
const hid = existsSync(ENV);
if (hid) renameSync(ENV, HIDDEN);
try {
  const r = spawnSync('npx', ['vite', 'build', '--outDir', 'dist-e2e'], { stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
} finally {
  if (hid && existsSync(HIDDEN)) renameSync(HIDDEN, ENV);
}
console.log('e2e mock-mode build ready in dist-e2e (no Supabase credentials baked in).');
