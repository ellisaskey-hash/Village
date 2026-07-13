# 09 — Platform Services

Each service names its Elevra source pattern (audit doc §) and what changes. Where "verbatim" appears, the audit doc is the implementation spec.

## Auth & session (PLATFORM_AUDIT §1–2, verbatim + deltas)
Supabase Auth: email+password, magic link, Google/Apple OAuth; Turnstile; optional TOTP MFA; account-delete + GDPR-export functions. Deltas: signup collects DOB + display name; `join_community` RPC immediately after first auth (postcode or invite path); session store carries `profileId`, `memberships[]` (communityId, trust, skin), `activeCommunityId`; Edge middleware gates `/api/*` by JWT and `/admin/*` by `platform_role`.

## Server state & data layer (replaces Elevra's useAsyncData — fix #16)
TanStack Query everywhere: window-focus refetch, background revalidation, optimistic mutations with rollback toasts, infinite queries for all browse lists (paired with virtualisation), query-key convention `[entity, communityId, filters]`. Service layer keeps Elevra's `buildXService` + `useServices()` shape with Zod boundaries; services return plain promises consumed by Query.

## Realtime (BACKEND §Real-time, verbatim pattern)
Channels: per-open-thread messages · per-user notifications inserts (badge) · community alerts channel while app foregrounded (Home strip live update). Strict effect cleanup (fix #22). No presence at launch (a village doesn't need "online now"; it needs "replies eventually" — presence invites social-app expectations).

## Push notifications (BACKEND §Push, verbatim chain)
`push-notify.mjs` with Elevra's exact filter chain: mute → category toggle → quiet hours → frequency cap → daily-digest queue → send; `push_subscriptions` 410-cleanup; dispatch log; 07:30-local digest via cron. Deltas: category set = `alert.emergency` (bypasses quiet hours + caps, platform tier only) · `alert.verified` · `alert.community` · `message` · `request.activity` · `event.reminder` · `listing.enquiry` · `digest`. **Fan-out batching:** community-wide pushes enqueue to a `push_fanout_queue` drained by cron-tick in batches of 100 sends with per-batch error isolation — the one place Elevra's one-coach scale genuinely differs; never loop sends inside a user-triggered function.

## Offline & PWA (PLATFORM §5, verbatim + fix #17)
Custom SW via injectManifest; precache ≤ 2 MiB enforced by code-splitting; fonts/media CacheFirst; offline pill; update-prompt toast; A2HS install coach. Write queue persisted to IndexedDB (idb-keyval) with idempotency keys, drained on `online` + app start; composers save drafts locally so a field-edge signal drop never loses a post. Photo blob store verbatim.

## Search (upgrade over PLATFORM §9)
`global_search(community_id, query, kinds?)` RPC: one SQL over the per-table `search_document` tsvector columns (GIN-indexed) UNION'd with `ts_rank` + recency boost + kind weighting (requests/alerts above places), pg_trgm fallback for short/typo queries, respecting RLS via the helper functions (RPC is `security invoker`). Returns typed result rows `{kind, id, title, snippet, meta}` → SearchSheet renders grouped. In-context SearchBars filter client-side under 200 items, server-side above (Elevra's rule).

## AI functions (BACKEND §AI, verbatim posture)
Server-only Anthropic SDK; tool-use forced schemas; prompt caching; `anthropic_usage` metering **with per-user daily budget enforced in the function (fix #45)**. Launch set (small, deliberate): `seed-extract.mjs` (08, admin-only) · `listing-assist.mjs` (photo → suggested title/category/description, Sonnet vision — the "list something in 20 seconds" supply-side lubricant) · `moderation-triage.mjs` (Haiku priority-scores incoming reports for the admin queue; advisory only, never auto-actions). The community assistant stays phase 2; the entity model and search are its future grounding.

## Cron (BACKEND §Cron pattern, verbatim drain-and-skip)
`cron-tick.mjs` every 10 min: push fan-out queue · digest queue · expiry warnings ("still available?" at T-3 days) · expiry sweeps (listings/requests/alerts → expired) · recurrence expansion (next event instances) · scheduled seeded notices (bin day). `cron-storage-sweep.mjs` daily: orphaned storage objects. `cron-metrics.mjs` daily: materialise the success-criteria aggregates (01 §Success) into a `community_metrics_daily` table the admin dashboard reads.

## Email
Transactional only: invite/claim links, claim decisions, weekly community digest (opt-in, phase 1.5), auth mails. Via Supabase SMTP/SendGrid.

## Telemetry & observability (PLATFORM §11–12 + fixes #31/#32)
`telemetry_events` verbatim with taxonomy: `app.*`, `nav.*`, `feature.request_posted`, `feature.request_fulfilled`, `feature.listing_completed`, `feature.thread_opened`, `feature.claim_submitted`, `error.*` — chosen so the success criteria in 01 are directly computable. Sentry on client + functions from M0. GitHub Actions CI: lint (incl. em-dash + hex-in-SVG greps) · typecheck · vitest · Playwright smoke + axe + gallery screenshots — all required checks.

## Environment
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY`, `VITE_SENTRY_DSN` client-side; `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `VAPID_*`, `TURNSTILE_SECRET_KEY`, `SENTRY_AUTH_TOKEN`, `OVERPASS_ENDPOINT`, `COMPANIES_HOUSE_KEY` server-side. Vercel region **lhr1**; Supabase **eu-west-2**.
