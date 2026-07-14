# Scripts Registry

Every file in `scripts/`: purpose, lifetime, deletion criteria. Keep this list short.

| Script | Purpose | Lifetime | Deletion criteria |
|---|---|---|---|
| `check-voice.mjs` | Custom lint grep — no em-dashes / "the system" in shipped copy (spec 00 rule 6). Runs in `npm run lint` and CI. | ongoing | never (enforces a Law) |
| `check-hex.mjs` | Custom lint grep — no hex colour literals in component code / SVGs (spec 00 rule 3, fix #2). Runs in `npm run lint` and CI. | ongoing | never (enforces a Law) |
| `gen-icons.mjs` | Generates placeholder PWA raster icons (192 / 512 / 512-maskable) with no dependency. | one-shot-ish | delete once a brand pass ships real icon artwork |
| `db/apply-migrations.mjs` | Applies `supabase/migrations/*.sql` in order to the DB in `SUPABASE_DB_URL`, tracked in `public._migrations`. Stand-in for `supabase db push` where the CLI/Docker is unavailable. | ongoing (dev) | delete when the Supabase CLI migration flow is adopted |
| `db/exec-sql.mjs` | Runs a single `.sql` file against the DB (used for seed.sql). | ongoing (dev) | as above |
| `db/verify-security.mjs` | Live RLS security proof — drives real policies through PostgREST as multiple authenticated users; the four isolation assertions + caps + cold-DM + full loop + realtime. | ongoing | keep; this is the security regression proof |
| `db/verify-m7.mjs` | Live M7 moderation proof (13/13): 3-report auto-hide (author sees / third party doesn't), admin actions logged, suspension blocks writes not reads, GDPR export/delete. Cleans up `m7test+%` users each run. | ongoing | keep; M7 security regression proof |
| `db/seed-admin.mjs` | Provisions the designated admin test account (`admin@thelocal.test`) and rebuilds a small live moderation scenario in Dev Village so the `/admin` console has real data for a walkthrough. Admin account is preserved; `demoseed+%` demo content is rebuilt each run. | ongoing (dev) | delete when real onboarding provisions admins |
