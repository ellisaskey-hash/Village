# PROGRESS

## 🚦 GATES

- **M0 gallery ✓ passed** (founder-approved).
- **Gate 2 — M3 + DB security proof ✓ MET.** M0–M3 built; DB wired; RLS proven live (26/26).
- **Gate 3 — M5 deployed PWA on your phone (real-device push). PARTIAL — this is the current position.** M4 and M5 are built and proven against the live DB (M4 12/12, M5 15/15). What remains for the gate, and needs you: **(a) deploy to Vercel** (I can't log into your Vercel), and **(b) real-device push test** — the VAPID keypair is generated and the subscribe flow is wired, but delivering a push needs the custom injectManifest service worker (an M8 item) plus a physical phone. AWAITING-ELLIS.
- Gate 4 — M7 real Horsmonden ingestion review. Not yet.
- Gate 5 — M8 launch checklist. Not yet.

---

## ⭐ MORNING REVIEW (read this first)

**M0–M5 are built; the database is live and the whole security + behaviour model is proven against real Postgres.** All migrations applied to the real Supabase project; the app runs on real Postgres (not the mock). Live verification totals **53/53** across three scripts (M1–M3: 26, M4: 12, M5: 15). Six migration/policy bugs were caught by running against real Postgres and fixed (see "Migration fixes").

### What to look at

- **The app runs on the real database.** `.env` is set (gitignored). Sign in with a seeded account `rlstest+alice@example.com` / `password123` (trust-2 member of Dev Village). Post requests/listings/events/alerts/equipment/services via the **+** button; RSVP to an event; check **Inbox** threads + notifications; **Home** shows the alerts strip + "Happening soon"; **Me → Settings → Notifications** for per-category prefs + push enable.
- **Proof scripts (all re-runnable, idempotent):**
  - `node scripts/db/verify-security.mjs` → **26/26** (M1–M3: four isolation assertions, trust-0 caps via direct API, cold-DM, full realtime loop, P4).
  - `node scripts/db/verify-m4.mjs` → **12/12** (capacity waitlist+promotion, DST-correct recurrence, ask-to-borrow, isolation).
  - `node scripts/db/verify-m5.mjs` → **15/15** (tier gating, verified-alert forgery blocked at RLS, opted-in-only, emergency bypasses quiet hours, resolution, 200-sub fan-out).
- `/dev/gallery` still works (M0).

### AWAITING-ELLIS / open items

- **Push to GitHub + CI: BLOCKED.** The machine's cached GitHub credential is account `ellis-askey`, denied access to `ellisaskey-hash/Village` (403). I can't mint a token for the repo-owner account. **Add a PAT for `ellisaskey-hash` (or push once yourself).** 15 commits are ready locally.
- **Gate 3 remainder:** deploy to Vercel (needs your login) + real-device push (custom SW is an M8 item + a phone). VAPID keypair is generated and the subscribe flow is wired.
- **UI signup email validation:** Supabase's anon signup rejects `@example.com`/`+alias` as invalid and email-confirm may be on. Seeded accounts (created via admin API) are confirmed; for UI signup, relax email validation / turn off "Confirm email" in the dashboard.
- **Map view** (M2) and **real ingestion APIs** (AWAITING-KEYS) still deferred.
- Visual/feel review of the M1–M5 screens.

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

## Current milestone: M5 complete. Runway to gate 3 is deploy + real-device push (needs you). M6 (search + Home assembly) is the next buildable milestone.

---

## Done

### M5 — Alerts, Notifications, Push ✅ (proven live 15/15; real-device push AWAITING-ELLIS)

- **Acceptance:** community alert pushes only to opted-in members ✅; verified alert requires
  acting-as a verified org (forgery fails at RLS) ✅; emergency bypasses quiet hours ✅;
  resolution push fires ✅; 200-subscription fan-out completes via the queue in ~200ms (no
  timeout) ✅. All proven live (`scripts/db/verify-m5.mjs`).
- **Shipped:** alerts (tiered, category trigger) + push tables + RLS + post_alert/resolve_alert/
  drain_fanout RPCs (applied live); alerts service (mock + Supabase); AlertComposer, Home
  alerts strip, Settings notification prefs + push-subscribe. VAPID keypair generated.
- Verified: tsc/lint clean, 32 unit tests, build, mock e2e 14/14, live DB 15/15.

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
