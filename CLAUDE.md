# CLAUDE.md — Local

You are building **Local**, a location-centric community platform (working name; platform: LocalOS). The complete specification is in `/docs/spec/` (11 files). The visual language and platform infrastructure derive from a prior production app, fully audited in `/docs/reference/elevra-audit/` (14 files).

## Session rules

1. **Spec first.** Before writing code for any area, read the relevant `/docs/spec/` file AND the corresponding audit file. When the spec is silent, follow the Elevra audit pattern. When both are silent, ask before inventing.
2. **Milestones.** Work proceeds strictly through the milestones in `/docs/spec/10_BUILD_PLAN_AND_PROMPTS.md`. Do not start a milestone until the previous one's acceptance criteria pass. Track progress in `/docs/PROGRESS.md` (update it every session: milestone, what's done, what's next, open questions).
3. **Non-negotiables** (from `/docs/spec/00_README.md` and `02_ARCHITECTURE.md`):
   - Entities are first-class; features derive from them. Every content table carries `community_id`; every table has RLS using the helper functions in spec 03.
   - Every WEAKNESSES.md fix listed in spec 02 is mandatory: standard Tailwind spacing and breakpoints, TanStack Query for all server state, virtualise lists over 50 items, timestamped migrations, Sentry from M0, tests block merge, CSP headers, 44px touch targets, `exactOptionalPropertyTypes: true`.
   - No hex colour literals in components or SVGs; CSS variables only (`stop-color="var(--c-accent)"`).
   - No em-dashes in user-facing copy. Plain verbs, sentence case, "we'll" not "the system will". Never fabricate an attributed human voice.
   - The app must be useful at one user: every list has a designed seeded/empty state.
   - Multi-table writes go through Postgres RPCs. Every new RPC is added to `/docs/reference/RPC_CATALOGUE.md`; every new primitive to `/docs/reference/COMPONENT_CATALOG.md`.
4. **RLS is the highest-severity bug class.** Every migration touching policies ships with tests asserting: (a) members of community A cannot read community B's rows, (b) trust-0 caps hold server-side, (c) hidden rows are invisible to third parties, (d) acting-as cannot be forged. Write the tests before the policies.
5. **Design fidelity.** The feel is inherited from the audit: tokens in `/docs/spec/06_tokens.local.json`, theming cascade per THEMING_ARCHITECTURE.md, motion per MOTION_AND_ANIMATION.md (durations, springs, and choreographies verbatim — never invent a transition inline), components per COMPONENT_INVENTORY.md with the fixes in spec 05. `/dev/gallery` with screenshot tests is the living reference.
6. **Secrets** never in the client bundle except `VITE_`-prefixed public keys. Anthropic calls are server-side only, tool-use forced schemas, metered in `anthropic_usage`, per-user rate limited.

## Current state

**M0–M8 complete; database live; security proven (66/66); hardened; DEPLOYED.** Everything through the admin console + M8 hardening is built. All migrations applied to the real Supabase project (**eu-north-1**); RLS/behaviour proven live 66/66 (`verify-security` 26, `verify-m4` 12, `verify-m5` 15, `verify-m7` 13). Deployed at **https://village-tau-mauve.vercel.app** (real Postgres). The app uses real Supabase when `.env` is present, else a labelled mock. Green: typecheck (app + `tsconfig.api.json`) · lint · **44 unit** · **26 e2e** · build.

**M8 recap:** main chunk 221 KB gz (< 800 target; admin + gallery code-split off it); Lighthouse mobile 91; list virtualisation via `VirtualList` (`@tanstack/react-virtual`) on Listings/Requests/Members (1000 rows → < 80 DOM, proven live); offline draft store (`src/lib/drafts.ts`) so composing offline survives a refresh; a11y axe + keyboard-only clean; e2e now force-builds mock mode (`scripts/build-e2e.mjs` → `dist-e2e`) and `api/` is typechecked. Real Horsmonden ingestion (Gate 4) ran live via `scripts/db/ingest-horsmonden.mjs` → 37 proposals staged in `/admin/seeding` (nothing auto-published).

**Open (needs founder / AWAITING-KEYS):** (1) CI is off — PAT lacks the `workflow` scope (workflow parked at `docs/ci/github-actions-ci.yml`). (2) Gate 3 real-device push confirmation (one on-phone test). (3) `ANTHROPIC_API_KEY` in Vercel to flip moderation-triage to live AI **and** enable URL-extract org/event ingestion. (4) `CH_API_KEY` for Companies House ingestion. (5) The spec-08 launch checklist — accept the staged proposals, send claim links, `launch_community('horsmonden')` — all founder-led (status table at the end of `docs/PROGRESS.md`). Not-yet-built engineering: the in-console launch-copy generator; map-pin materialisation on accept (deferred with the map view).

Run it: deployed URL above, or `npm install` + `npm run dev`. Sign in `rlstest+alice@example.com` / `password123`.

## Commands (once scaffolded — keep this section updated)

- `npm run dev` — Vite dev server
- `npm run build` — build:api → typecheck → vite build
- `npm run test` / `npm run lint` / `npm run typecheck`
- `npx playwright test` — E2E + axe + gallery screenshots
