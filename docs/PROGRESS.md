# PROGRESS

## 🚦 GATES

- **M0 gallery ✓ passed** (founder-approved).
- **Gate 2 — M3 + DB security proof ✓ MET.** M0–M3 built; DB wired; RLS proven live (53/53 incl. M4/M5).
- **Gate 3 — M5 deployed PWA on your phone (real-device push). ← one hands-on step left (you, on your phone).** Deployed live at **https://village-tau-mauve.vercel.app**; PWA is installable (manifest + SW + icons verified); custom push service worker shipped; landing Lighthouse (mobile) perf 96 / a11y 96 / best-practices 100 / SEO 91 (all ≥90). The only thing I can't do headlessly is confirm a push actually lands on a physical device — see the phone test steps below. AWAITING-ELLIS.
- **M7 — moderation, safety, admin console ✓ BUILT + proven live (13/13, `scripts/db/verify-m7.mjs`).** Reports + auto-hide, admin_moderate, suspension (writes-blocked/reads-kept), first-post delay queue, moderation-triage (advisory, fixture mode — AWAITING-KEYS), full `/admin` console, ReportSheet + escalation signposting, community-standard onboarding screen, GDPR export/delete. Admin walkthrough + creds in Morning Review.
- Gate 4 — M7 real Horsmonden ingestion review. Not yet (needs live ingestion keys).
- Gate 5 — M8 launch checklist. Not yet.

---

## ⭐ MORNING REVIEW (read this first)

**M0–M6 are built, the database is live, the security model is proven (53/53), and the app is DEPLOYED.** Live at **https://village-tau-mauve.vercel.app**, running on real Postgres. All 21 commits are on GitHub (`ellisaskey-hash/Village`).

### 📱 Gate 3 — test on your phone (this is the one hands-on step left)

1. On your phone, open **https://village-tau-mauve.vercel.app**.
2. Sign in with a seeded account: **`rlstest+alice@example.com`** / **`password123`** (or `rlstest+ben@example.com` / `password123`). (UI signup is fiddly in this test project — Supabase rejects `@example.com`/`+alias` emails and email-confirm may be on — so use these seeded accounts.)
3. **Install the PWA:** iOS Safari → Share → *Add to Home Screen*; Android Chrome → menu → *Install app*. Open it from the home-screen icon (standalone, no browser chrome).
4. **Turn on push:** in the app, **Me → Settings → Notifications → Enable push notifications**, and allow when prompted. (iOS needs the app installed to your home screen first; iOS 16.4+.)
5. **Trigger a push to your device** (from this machine, with `.env` present):
   - Targeted: `node scripts/db/push-send.mjs "Lost cat near the green" "Ginger tom, answers to Milo" "/home" rlstest+alice@example.com`
   - Or to everyone subscribed: `node scripts/db/push-send.mjs "Village fete Saturday" "On the green from 11am" "/explore?tab=events"`
6. **Expect:** a notification with that title/body. **Tapping it** opens the app at the deep link (Home, or Explore→Events). The sender also auto-cleans any expired subscriptions (404/410).
   - You can also exercise the real fan-out end-to-end: as an admin, post an alert in-app → it enqueues; the delivery half is `push-send.mjs` (a Vercel cron will call it in M8).

### 🛡️ M7 — walk the admin console (live, on the deployed URL)

**Admin account (already provisioned live):** **`admin@thelocal.test`** / **`Local-admin-2026`** — platform admin, and steward of Dev Village. I seeded a real scenario for you to act on (re-runnable any time with `node scripts/db/seed-admin.mjs`): one listing, *"DEMO Cheap iPhones, cash only"*, reported 3 times → auto-hidden.

1. Sign in as the admin above, then **Me → Admin console** (or go straight to **`/admin`**).
2. **Dashboard:** the tiles show today's numbers — Open reports, Priority, Hidden, and so on. Tap a tile to jump to its queue.
3. **Reports:** you'll see the DEMO listing (3 reports). Tap it → detail with the reporter's note and an **advisory triage suggestion** (rule-based today; it says so — it flips to AI when an `ANTHROPIC_API_KEY` is set). Choose **Dismiss** or **Uphold and hide**.
4. **Hidden:** the auto-hidden listing is here with **Restore** / **Keep hidden**. Restore un-hides it (and logs the action).
5. **Members:** tap a member → set their **trust** level, or **Pause** their posting (7 or 30 days). Pausing blocks posting but not reading — that's proven live. Every change is logged.
6. **Action log:** every action, automatic or human, most recent first — including the auto-hide from step 3. This is the audit trail.
7. **First posts:** the trust-0 delay queue. Empty by design (it's config-gated off; turn it on per community with `firstPostDelayMinutes` in **Config**).
8. **Config:** edit the community's thresholds (reports-before-auto-hide, trust gates). Saves live.
9. **Report affordance (member side):** as any non-author member, open a listing or request → the **Report** button (top-right) opens the shared sheet. Pick **"Someone may be at risk"** to see the 999/101/Childline/Samaritans escalation banner appear before you send.
10. **GDPR (member side):** **Me → Settings → Your data** → **Download my data** (JSON) and **Remove my account** (confirm → your name is anonymised, posts survive, you're signed out).

### What else to look at

- **The deployed app** (or locally: `.env` present → `npm run dev`). Post requests/listings/events/alerts/equipment/services via **+**; RSVP an event; **search** (header icon or `/` key) returns ranked mixed-kind results; **Home** shows live alerts, events, requests, listings; **Me → Settings** for the 6 axes + notification prefs.
- **Proof scripts (re-runnable, idempotent, against live DB):** `verify-security.mjs` → 26/26 · `verify-m4.mjs` → 12/12 · `verify-m5.mjs` → 15/15.
- **Public landing** at `/` (logged out) — Lighthouse mobile: perf 96 · a11y 96 · best-practices 100 · SEO 91.

### AWAITING-ELLIS / open items

- **CI is BLOCKED on one token scope.** Your PAT (`ellis-askey`) has write access (push works) but **lacks the `workflow` scope**, so GitHub rejects pushing `.github/workflows/*`. I parked the workflow at **`docs/ci/github-actions-ci.yml`**. To turn CI on: add `workflow` scope to the token, then `git mv docs/ci/github-actions-ci.yml .github/workflows/ci.yml && git push` (or paste it into the repo via the GitHub web UI). It self-seeds the Linux screenshot baselines on its first run — so **Linux baseline seeding is blocked with it**.
- **Real-device push confirmation** (gate 3, step above) — everything server-side is wired + deployed; only a physical device can confirm delivery (headless Chromium has no push service).
- **Vercel region:** the deploy defaults to `iad1`/auto; the **Supabase DB is in eu-north-1** (Stockholm). At launch, set the Vercel project + any functions region to `arn1` (Stockholm) to sit next to the database. (Spec said lhr1/eu-west-2, but the actual DB is eu-north-1.)
- **UI signup email validation** (test project): relax email validation / turn off "Confirm email" in the Supabase dashboard if you want to create accounts through the UI.
- **Moderation-triage AI (AWAITING-KEYS).** Built as a real seam: client `src/lib/moderation/triage.ts` + Vercel function `api/moderation-triage.ts` (forced tool-use, Haiku). With **no `ANTHROPIC_API_KEY`** it returns a transparent rule-based fixture marked "advisory, rule-based". Set `ANTHROPIC_API_KEY` in the Vercel env to switch it to live AI. It never auto-acts — advisory only.
- **Map view** (M2) and **real ingestion APIs** (AWAITING-KEYS) still deferred.

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

## Current milestone: M0–M7 complete + proven live. Gate 3 is one on-phone push test away (see Morning Review). M8 (offline/PWA hardening + launch) is next.

---

## Done

### M7 — Moderation, safety, admin console ✅ (proven live 13/13, `scripts/db/verify-m7.mjs`)

- **Acceptance (proven live via the API, `verify-m7.mjs` 13/13):** 3 reports auto-hide a target — author still sees it (flagged "hidden pending review"), third parties and non-members don't; every admin action lands in `moderation_actions`; **suspension blocks writes but not reads** (the bug the live run caught: `admin_moderate` had set `status='suspended'`, which `member_communities()` filters out, stripping reads — fixed to set `suspended_until` only, migration `20260714070003`); GDPR export returns the caller's data, delete anonymises PII while content survives.
- **DB (5 migrations, applied live):** `reports` + `moderation_actions` + `first_post_delays` + `is_suspended()`; suspension enforced by recreating the content-insert policies with `and not is_suspended(...)` (reads untouched). RPCs: `report_target` (10/day cap, threshold auto-hide, admin notify), `decide_report`, `admin_moderate`, `first_post_delay_trigger` (config-gated, inert by default), `release_delayed`/`release_delay`, `export_account`/`delete_account`, and the `can_moderate`-gated admin read RPCs (`admin_reports`/`_moderation_log`/`_hidden`/`_delays`/`_members`/`_dashboard`/`_set_config`). All in RPC_CATALOGUE.
- **Services (mock + Supabase, one contract):** `moderation` (report/decide/moderate/log/hidden/delays/releaseDelay/members/dashboard/config/triage) + `account` (export/delete); `Listing`/`RequestPost` carry a `hidden` flag surfaced only to the author; mock mirrors auto-hide + suspension + GDPR (unit test `tests/moderation.test.ts`, 3/3).
- **Moderation-triage AI:** advisory only, fixture mode by default (AWAITING-KEYS) — `src/lib/moderation/triage.ts` + `api/moderation-triage.ts`.
- **UI:** full `/admin` console (Dashboard · Reports + advisory triage · Hidden · First-post delays · Members with trust/suspend · Action log · Config · Seeding), entry under Me → Admin console; shared `ReportSheet` + `ReportButton` on listing/request detail; `EscalationNotice` (999/112/101/Childline/Samaritans) on the "unsafe" reason; one-screen `CommunityStandard` as onboarding step 1; GDPR export/delete in Settings → Your data.
- **Admin test account provisioned live** (`admin@thelocal.test` / `Local-admin-2026`) with a seeded reported-listing scenario in Dev Village (`scripts/db/seed-admin.mjs`). Walkthrough in Morning Review.
- Verified: `tsc` clean · lint (eslint + voice + hex) clean · 35 unit tests (32 + 3 M7) · build (precache 1.49 MiB < 2 MiB) · verify-m7 13/13 live.

### Deploy + PWA/push (gate 3 infrastructure) ✅

- Pushed all commits to `ellisaskey-hash/Village`. CI workflow parked (token lacks `workflow` scope) — see AWAITING-ELLIS.
- Vercel project **village** created; env vars set via CLI; **deployed → https://village-tau-mauve.vercel.app** (SPA rewrite added; empty functions block removed). App verified against the real DB on the deployed URL.
- **Custom injectManifest service worker** (`src/sw.ts`, pulled forward from M8 — DECISION-MADE): precache 1.45 MiB (< 2 MiB cap), CacheFirst fonts/media, prompt-based update (UpdatePrompt toast), OfflinePill, `push` → notification, `notificationclick` → deep link. Registered via `virtual:pwa-register` (CSP-safe). `scripts/db/push-send.mjs` is the VAPID web-push sender (with 404/410 cleanup).
- PWA installability verified on the deployed URL (manifest/SW/icons all serve; SW registers). Real-device delivery is the on-phone step (AWAITING-ELLIS).

### M6 — Global search + Home assembly + public landing ✅

- **Acceptance:** search returns mixed-kind ranked results respecting RLS + hidden flags — ✅ (`global_search` is SECURITY INVOKER, tested live); Home renders valuably for a new member (live alerts/events/requests/listings + seeded empties) — ✅; **landing Lighthouse ≥ 90** — ✅ (mobile: perf 96 · a11y 96 · best-practices 100 · SEO 91).
- **Shipped:** `global_search` RPC (FTS + pg_trgm fuzzy + kind weighting, applied live); search service (mock + Supabase); SearchSheet (header icon + rail + `/` hotkey); public LandingScreen at `/` with root routing (members → /home); Home live cards.
- Verified: tsc/lint clean, 32 unit tests, build, mock e2e 14/14, live search.

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
