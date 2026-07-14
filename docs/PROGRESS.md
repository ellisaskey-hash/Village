# PROGRESS

---

## ⭐ MORNING REVIEW (read this first)

**Overnight run: M1 → M2 → M3, autonomous.** Started after M0 sign-off.

### What to look at

- Run the app: `npm install` then `npm run dev`, open `http://localhost:3005`. Sign-in is mock (labelled) because there is no database yet — see BLOCKED below.
- `/dev/gallery` still works (M0).
- New screens land as milestones complete; this section will list exactly which routes are reviewable and which are still stubs.

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

## Current milestone: M1 — Auth, communities, membership & trust rails (IN PROGRESS)

Reading done: spec 03 (data model + RLS patterns), 04 (trust), 07 (onboarding/screens), 09 (auth). Building test-first per CLAUDE.md rule 4.

- [ ] RLS tests written (cross-community isolation, DOB refusal, invite grants trust 1)
- [ ] Migrations (extensions + helpers, structural tables, RLS policies, RPCs)
- [ ] Seed horsmonden + dev fixture
- [ ] Data layer (Supabase client + mock services + TanStack Query + session store)
- [ ] Screens (shell + 5 tabs, welcome/auth/onboarding, Me + settings axes)

---

## Done

### M0 — Foundation & design system ✅ (founder-approved)

Scaffold, `design/tokens.ts` (spec 06), seven-axis theming cascade, motion library, hearth ambient, 33 primitives with mandatory fixes, `/dev/gallery`. Verified: lint / typecheck / 14 unit tests / build (112 KB gz) / e2e 4/4 (screenshots + axe, dark+light, desktop+mobile). Gallery reviewed and approved.

_Note: the M0 e2e screenshot baselines are `*-win32.png` (this machine). CI on Linux needs `*-linux.png` generated once (`npm run e2e:update` in the Playwright Linux container)._
