# PROGRESS

## 🚦 GATES

- **M0 gallery ✓ passed** (founder-approved).
- **Gate 2 — M3 + DB security proof ✓ MET.** M0–M3 built; database wired and every migration applied to the real Supabase project; RLS security model proven live (26/26 checks, all four isolation assertions + trust-0 caps + cold-DM + full loop + realtime). ← **current position: just cleared. Next up is M4/M5 toward gate 3.**
- Gate 3 — M5 deployed PWA on your phone (real-device push). Not yet.
- Gate 4 — M7 real Horsmonden ingestion review. Not yet.
- Gate 5 — M8 launch checklist. Not yet.

---

## ⭐ MORNING REVIEW (read this first)

**Database is now live and the security model is proven.** M0–M3 are built; all migrations are applied to the real Supabase project; the app runs against real Postgres (not the mock). Five migration/policy bugs were caught by running the tests against real Postgres and fixed (see "Migration fixes" below).

### What to look at

- **The app now runs on the real database.** `.env` is set (gitignored) with the project URL + anon key, so `npm run dev` (restart it if it was already running) or a production build uses Supabase, not the mock. Sign in with a seeded test account: `rlstest+alice@example.com` / `password123` (alice is a trust-2 member of Dev Village with a request + a business already posted). Explore → Requests shows her "Borrow a ladder" request; Inbox shows the thread from the loop test.
- **Security proof:** `node scripts/db/verify-security.mjs` → **26/26 checks passed** against the live DB. It drives the real RLS through PostgREST as five separate authenticated users. Covers all four isolation assertions (cross-community, hidden-invisible, acting-as-forgery) across M1–M3 tables, trust-0 caps rejecting over-posting via direct API, cold-DM refusal, the full post→respond→realtime-thread-both-ways→fulfil→notifications loop, and P4 participant-only reads. Re-runnable and idempotent.
- `/dev/gallery` still works (M0).

### AWAITING-ELLIS / open items

- **Push + CI still BLOCKED** — the machine's cached GitHub credential is for account `ellis-askey`, which is denied access to `ellisaskey-hash/Village` (403). I can't mint a token for the repo-owner account. **You need to add a Personal Access Token (or push once yourself).** Everything is committed locally; nothing is lost.
- **UI signup email validation:** Supabase's anon signup rejects `@example.com` / `+alias` addresses as invalid, and email-confirmation may be on. Test accounts were created via the admin API (confirmed). For frictionless UI signup in this test project, toggle "Confirm email" off / relax email validation in the dashboard, or just use the seeded accounts.
- **Map view** (M2) and **real ingestion APIs** (AWAITING-KEYS) still deferred as before.
- Visual/feel review of the M1–M3 screens.

---

## Migration fixes (caught by running against real Postgres)

Per your instruction — every migration that failed against real Postgres, and the fix:

1. **`array_to_string` in a generated column** (`20260714010001`). Spec 03 builds `businesses.search_document` with `array_to_string(categories,' ')`, but that function is STABLE, and generated columns require IMMUTABLE expressions → "generation expression is not immutable". **Fix:** added an `imm_array_to_string()` wrapper declared IMMUTABLE (output depends only on input) and used it. Edited in place before first successful apply.
2. **`created_by` had no default** (`20260714030001`, new). The app's client inserts omit `created_by` (the mock set it); on real Postgres that violates NOT NULL. **Fix:** `alter … set default auth.uid()` on listings/requests/places — fixes the app insert and keeps the `created_by = auth.uid()` RLS check valid.
3–5. **RLS infinite recursion** (`20260714030002`, new), caught by the live verification:
   - `listings`/`requests` trust-0 cap policies did `count(*) from listings/requests` inside the policy on that same table → "infinite recursion detected in policy". **Fix:** moved the counts into SECURITY DEFINER helpers (`active_listing_count`, `open_request_count`) that read outside RLS.
   - `thread_participants` read policy referenced `thread_participants` (and `threads`/`messages` policies did the same) → recursion. **Fix:** SECURITY DEFINER `my_thread_ids()` helper; all thread/message/participant policies now use it.

These are forward migrations (applied ones are never edited except #1 which was fixed before its first successful apply). All applied cleanly; the verification then went 26/26.

## DECISION-MADE

- **Project region is eu-north-1, not eu-west-2.** You said eu-west-2, but the project (`xlksaymsvproupvaylit`) is actually in eu-north-1 (the direct host is IPv6-only eu-north; the working pooler is `aws-0-eu-north-1.pooler.supabase.com`). DB password corrected to `Talia-2021!!`. Used the IPv4 session pooler because the direct host is IPv6-only and this environment's IPv6 egress is flaky.
- **Live JS verification is the authoritative RLS proof.** The pgTAP `supabase/tests/rls_m*.sql` files remain the checked-in spec artifacts, but the proof of record is `scripts/db/verify-security.mjs`, which exercises the actual policies through PostgREST as real authenticated users (stronger than pgTAP, which would need a TAP runner + direct `auth.users` inserts). 26/26.
- **Mock service layer stays as the no-env fallback.** With `.env` present the app uses Supabase; without it (e.g. CI without secrets) it falls back to the labelled mock, so the mock-mode Playwright specs still act as regression tests.

---

## Current milestone: M5 — Alerts, Notifications, Push (IN PROGRESS)

M0–M4 complete; database live; RLS proven. M5 adds tiered alerts, the notification/push
preference chain, and VAPID web-push (real-device push testing is AWAITING-ELLIS at gate 3).

---

## Done

### M4 — Events, RSVPs, Equipment, Skills, Services ✅ (proven live 12/12)

- **Acceptance:** recurring event expands correctly across DST (19:00 local held across the
  29 Mar 2026 boundary) ✅; capacity event waitlists then promotes on cancellation ✅;
  "Ask to borrow" opens a thread ✅. All proven live (`scripts/db/verify-m4.mjs`).
- **Shipped:** events (+recurrence/capacity), event_rsvps, services, skills, equipment_items
  schema + RLS + set_rsvp/expand_recurrence/promote_waitlist RPCs (applied live); services
  (mock + Supabase); Events list/detail (RSVP, waitlist, ICS), Directory Services/Equipment/
  Skills sub-chips, equipment ask-to-borrow, event/service/equipment composers, Home
  "Happening soon".
- Verified: tsc/lint clean, 29 unit tests, build, mock e2e 14/14, live DB 12/12.

### M3 — Threads, Messages, Listings, Requests ✅ (RLS BLOCKED; two-device realtime needs DB)

- **Acceptance:** post → respond → thread → mark fulfilled loop works (unit-tested end to end; single-user in the UI) ✅; trust-0 caps enforced in RPCs + RLS + mock ✅ (server-side curl test BLOCKED, no DB); cold DM from trust-0 refused, in-context thread allowed ✅ (unit-tested); two-device realtime BLOCKED (needs Supabase).
- **Shipped:** listings/requests schema + status machines + RLS (trust-0 caps) + `open_thread`/`set_listing_status`/`set_request_status` RPCs + triggers (thread bump + notification fan-out + request first-response) + realtime publication (checked in, not executed); services (mock + Supabase seam); composers (request, sell/free/wanted, lend); Explore Listings/Requests; listing/request detail with respond + status controls; Inbox (threads + notifications); thread screen.
- Verified: tsc/lint clean, 27 unit tests, build, e2e 14/14 (adds M3 content lifecycle).

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
