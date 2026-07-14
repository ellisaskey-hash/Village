# PROGRESS

---

## ⭐ MORNING REVIEW (read this first)

**Overnight run: M1 → M2 → M3, autonomous.** Started after M0 sign-off.

### What to look at

- Run the app: `npm install` then `npm run dev`, open `http://localhost:3005`. It runs in **labelled demo mode** (in-memory data) because there is no database yet — see BLOCKED below.
- **M1 is reviewable end-to-end:** `/welcome` (enter `DV1 1AA` to find the seeded Dev Village, or `TN12` for Horsmonden) → sign up (try a DOB under 16 — it's refused) → onboarding → the 5-tab shell. Visit **Me → Settings** and flip theme / accent / text size / font / contrast / motion; all work live. Explore + Inbox show designed empty states (content lands M2/M3).
- `/dev/gallery` still works (M0).
- Milestones so far: **M0 ✅, M1 ✅, M2 ✅** (all RLS execution BLOCKED, tests written). M3 in progress.
- **M2 reviewable:** Me → "Seeding console" (visible in demo mode). Click **Run fixture ingestion**, accept a few proposals, then Explore → Directory → Businesses to see them. Unclaimed businesses show "Is this yours? Claim it" → claim sheet.

### AWAITING-ELLIS (needs your review)

- M1/M2 visual/feel review of the auth, shell, directory, and seeding screens (unit + e2e cover behaviour).
- **Map view not built** (M2 partial): the seeding console's "map of accepted places" and map pins on place detail need a map surface. Deferred in this offline run — external map tiles are blocked by the CSP and there's no coordinate data without live Overpass. Flagging rather than faking it. Decide later whether to add a self-hosted/vector map.

### Decisions / accounts I need from you

1. **Supabase project.** There is no cloud Supabase project and Docker is not installed on this machine, so I could not stand up a local database. Everything that needs a DB is written to spec and checked in, but **not executed**. To go live you need to: create a Supabase project (eu-west-2), run the migrations in `supabase/migrations/`, run the RLS tests in `supabase/tests/`, and put the URL + anon key in `.env`. Until then the app runs on a clearly-labelled in-memory mock service layer.
2. **Git remote.** This repo has no remote configured, so I could not push. All work is committed locally. Add a remote (`git remote add origin …`) and I (or you) can push.
3. **API keys** for M2 ingestion (Overpass is keyless; Companies House + Anthropic need keys) — logged AWAITING-KEYS; M2 ingestion runs in fixture mode without them.

### Status line

- Milestone in progress: **see "Current milestone" below.**
- Green at every commit: lint, typecheck, unit tests. Integration/RLS tests are BLOCKED (no DB) with the tests written.

---

## BLOCKED (environment, not spec)

- `BLOCKED: needs Supabase project` — no cloud project, and Docker is unavailable so `supabase start` (local stack) is not possible. All migrations, RLS policies, RLS tests, and RPCs are written per spec 03 and checked into `supabase/` but have **not** been executed. No integration or RLS test has been run; none are reported as passing.
- `BLOCKED: no git remote` — cannot push; committing locally only.
- `AWAITING-KEYS` — Companies House + Anthropic keys for M2 real ingestion; fixture mode covers the pipeline meanwhile.

## DECISION-MADE (spec-consistent choices made without stopping)

- **Mock service layer for no-DB dev.** Spec 09 mandates the `buildXService` + `useServices()` shape with Zod boundaries behind TanStack Query. With no DB, each service has a clearly-labelled in-memory implementation returning production-shaped data, selected at runtime when `VITE_SUPABASE_URL` is absent. The Supabase-backed implementation is written behind the same interface so the swap is one flag. Rationale: keeps every screen real and reviewable now (Law: no half-build), and makes the DB swap a single seam.

---

## Current milestone: M3 — Threads, Messages, Listings, Requests (IN PROGRESS)

Building test-first. Realtime is a seam (mock has no live channel); open_thread is the single point of thread-creation truth.

---

## Done

### M2 — Places, Businesses, Organisations, Directory, Seeding ✅ (RLS BLOCKED; real-API AWAITING-KEYS; map view deferred)

- **Acceptance:** directory populated from the **fixture** (real Overpass/CH/FHRS AWAITING-KEYS) ✅; claim flow end-to-end incl. claim-link auto-approval (RPC) ✅; unclaimed stub renders "Is this yours?" ✅; map pins **deferred** (see AWAITING-ELLIS).
- **Shipped:** directory schema + RLS + `can_act_as` + `seed_proposals` + claim/seed/launch RPCs (checked in, not executed); ingestion transformers + Horsmonden fixture (unit-tested); directory/claims/seeding services (mock + Supabase seam); directory + detail + claim screens; `/admin/seeding` console.
- Verified: tsc/lint clean, 23 unit tests, build, e2e 10/10 (adds the seeding pipeline).

### M1 — Auth, communities, membership & trust rails ✅ (RLS execution BLOCKED)

Reading: spec 03/04/07/09. Test-first per CLAUDE.md rule 4.

- **Acceptance:**
  - two users in different communities cannot read each other's memberships — RLS test written (`supabase/tests/rls_m1.sql`), **BLOCKED** (no DB to run it).
  - 15-year-old DOB refused — ✅ unit-tested (Zod gate) + DB `adults_only` check written.
  - invite path grants trust 1 — ✅ unit-tested (mock mirrors `join_community`).
  - theme/density/font/contrast/motion settings function — ✅ (Settings screen, verified).
- **Shipped:** structural schema + RLS + helpers + `join_community`/`vouch_for`/`discover_communities` RPCs (checked in, not executed); service layer (mock + Supabase seam); welcome/auth/onboarding; 5-tab shell; Me + Settings; guards; invite deep link.
- Verified: tsc/lint clean, 20 unit tests, build, e2e 8/8 (gallery + M1 happy path).

### M0 — Foundation & design system ✅ (founder-approved)

Scaffold, `design/tokens.ts` (spec 06), seven-axis theming cascade, motion library, hearth ambient, 33 primitives with mandatory fixes, `/dev/gallery`. Verified: lint / typecheck / 14 unit tests / build (112 KB gz) / e2e 4/4 (screenshots + axe, dark+light, desktop+mobile). Gallery reviewed and approved.

_Note: the M0 e2e screenshot baselines are `*-win32.png` (this machine). CI on Linux needs `*-linux.png` generated once (`npm run e2e:update` in the Playwright Linux container)._
