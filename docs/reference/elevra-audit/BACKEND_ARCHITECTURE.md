# BACKEND_ARCHITECTURE.md

Server architecture. What runs where, why, and what it costs.

## Overview

Elevra has a small backend on purpose. The design principle: push as much as possible into Postgres (via RLS + triggers + RPCs), reach for a serverless function only when a step requires a private key or a long-running compute (Anthropic vision, VAPID push signing, cron dispatch).

Three tiers:

1. **Supabase (managed)** — Postgres + Auth + Realtime + Storage + Edge Functions (not currently used).
2. **Vercel serverless functions** — 22 functions under `api/*.mjs`. Node runtime. Bundled from TypeScript sources at `api/_src/*.ts` via `scripts/build-api.mjs`.
3. **Vercel Edge middleware** — `middleware.ts` at root. Runs at the edge before any function.

## Hosting

**Vercel:**
- Static app: served from `dist/` via Vercel's global CDN.
- Functions: `api/*.mjs` deployed as Node serverless functions to Vercel's US East region by default.
- Cron: Vercel Cron Jobs (configured in `vercel.json`).

**Supabase:**
- Project region: eu-west-1 (Ireland).
- Postgres 15.
- Storage backed by S3 under the hood.

Cross-region latency: Vercel functions in `us-east-1` calling Supabase in `eu-west-1` adds ~80ms per hop. Acceptable for user-triggered operations; cron operates within Supabase-region round-trip so it's fine.

## Vercel serverless functions (`api/`)

Full inventory:

| Function | Purpose | Runtime cap |
|---|---|---|
| `account-delete.mjs` | GDPR erasure — anonymises client data, hard-deletes `auth.users` row. Uses service role. | default |
| `account-export.mjs` | GDPR data export — assembles JSON zip, emails signed URL. | default |
| `alert-note-suggestion.mjs` | Claude Haiku suggests a coach note in response to an alert. | default |
| `availability-suggestion.mjs` | Suggests availability blocks from booking history. | default |
| `challenge-draft.mjs` | Claude drafts a coach challenge description. | default |
| `checkin-insights.mjs` | Claude summarises a submitted check-in for the coach. | default |
| `coach-calendar.mjs` | Assembles a calendar payload for coach dashboard. | default |
| `conversation-export.mjs` | Exports a conversation thread as PDF. | default |
| `conversation-report.mjs` | Claude drafts a periodic conversation summary. | default |
| `cron-storage-sweep.mjs` | Daily 03:00 UTC — sweeps orphaned Storage objects. | 300s |
| `cron-tick.mjs` | Every 10 minutes — dispatches notification digest, scheduled broadcasts, check-in cadences, scheduled invites. | 60s |
| `feedback.mjs` | Ships user feedback to `SUPPORT_INBOX_EMAIL`. | 15s |
| `food-estimate.mjs` | Claude Sonnet 4.6 vision — food photo → macros. Signed Storage URL in, `{ kcal, proteinG, carbsG, fatsG, confidence }` out. | default |
| `gym-scan.mjs` | Claude Sonnet 4.6 vision — gym scan → equipment taxonomy. | 60s |
| `og-coach.mjs` | Generates OG social card for public coach profile pages. | default |
| `push-notify.mjs` | Dispatch web-push through user's notification prefs. | 15s |
| `send-invite.mjs` | Emails a coach → client invite. | 15s |
| `send-subscribe-url.mjs` | Emails a client-facing signup URL. | default |
| `sessions.mjs` | Session helper — currently unused, kept for future. | default |
| `support-recovery.mjs` | Kicks off support-mediated account recovery. | default |
| `template-draft.mjs` | Claude drafts a message template body. | default |
| `voice-transcribe.mjs` | Transcribes a voice note. | default |

### Function source pattern

All function sources live at `api/_src/*.ts`. The underscore prefix tells Vercel to exclude this directory from function discovery. `scripts/build-api.mjs` bundles each `.ts` with esbuild into a self-contained `api/*.mjs` file that Vercel ships as-is:

```bash
esbuild api/_src/gym-scan.ts \
  --bundle --platform=node --format=esm \
  --external:@anthropic-ai/sdk --external:@vercel/node \
  --outfile=api/gym-scan.mjs
```

**Why this pattern:** Vercel's `@vercel/node` TS compiler doesn't bundle cross-directory imports. It transpiles the .ts and ships the JS expecting `../src/...` to resolve on the deployment filesystem, which it doesn't. Result: `ERR_MODULE_NOT_FOUND` at cold start. Bundling with esbuild ahead of deploy solves it.

**Trap:** Vercel validates the `functions` block in `vercel.json` BEFORE running `buildCommand`. If a listed function's `.mjs` doesn't exist on disk, deploy fails at function-validation, before `npm run build` can generate it. Every `api/*.mjs` must be committed to the repo. See memory `feedback_cadence_api_mjs.md`.

## Vercel Edge middleware

`middleware.ts` at repo root. Runs at the edge before any request reaches a function or the static bundle.

Responsibilities:
- Auth gate on `/api/*` — extracts `Authorization: Bearer <supabase_jwt>` header, verifies against Supabase, sets `x-user-id` header.
- Redirects: `/coach/*` when signed in as client, and vice versa.
- Skips public routes: `/`, `/c/:slug`, `/invite/:code`, `/auth/*`.

## Cron

Configured in `vercel.json`:
```json
"crons": [
  { "path": "/api/cron-tick",           "schedule": "*/10 * * * *" },
  { "path": "/api/cron-storage-sweep",  "schedule": "0 3 * * *" }
]
```

**`cron-tick.mjs`** (every 10 min): dispatches four queues in sequence:
1. `notification_digest_queue` (migration 0043) — daily 07:30-local push digest.
2. `scheduled_broadcasts` (migration 0057) — coach-authored batch messages.
3. `check_in_cadences` (migration 0058) — recurring check-in cadence tick.
4. `invite_codes.scheduled_for` (migration 0055) — scheduled invite dispatch.

All queue drains use `SUPABASE_SERVICE_ROLE_KEY` so RLS doesn't get in the way. Individual row failures are logged and skipped so a single bad row can't block the whole queue.

**`cron-storage-sweep.mjs`** (daily 03:00 UTC): walks all Storage buckets, looks up whether the referenced row still exists, deletes orphans. Runs the sweep in bounded batches to stay under the 300s function cap.

## Push notifications

`push-notify.mjs` is the canonical dispatcher. Everything that ends in a push goes through it.

**Preference filter chain (short-circuits at first match):**
1. `mutedUntil > now` → skip (user snoozed everything).
2. Category toggle off (per-user preferences) → skip.
3. Inside user's quiet hours → skip.
4. Frequency cap = `'off'` → skip.
5. Frequency cap = `'1h'` AND last push of this category was within the last hour → skip.
6. Frequency cap = `'daily'` → write to `notification_digest_queue` and skip (cron flushes at 07:30 local).
7. Otherwise → send.

**Send:**
- Look up all `push_subscriptions` for the user.
- For each: `webpush.sendNotification(subscription, JSON.stringify(payload))` with VAPID keys.
- If 410 Gone or 404: delete the subscription row.
- Otherwise log the outcome to `push_dispatch_log`.

## AI (Anthropic Claude)

**Client SDK:** `@anthropic-ai/sdk` v0.103.0. Called only from server functions (never client — the API key is server-only).

**Models used:**
- **Claude Sonnet 4.6** — food-estimate + gym-scan (vision-required).
- **Claude Haiku** — everything textual (chat drafting, alert-note suggestion, challenge draft, check-in insights, conversation report, template draft).

**Prompt caching:** `cache_control: ephemeral` set on the system + tool blocks so repeat estimates read at ~0.1× input price. First call pays a ~1.25× write premium; subsequent calls cache-hit within 5 minutes.

**Tool use for structured output:** every AI endpoint forces a tool call so the response is validated JSON, not free-text. E.g. food-estimate defines a tool with schema `{ kcal, proteinG, carbsG, fatsG, confidence }` and forces its use.

**Rate limiting:** none at the function layer. Per-user cost tracking via the `anthropic_usage` table (migration `0111`) — future rate limits can be built off this.

**Fallback:** functions never mock — if Anthropic fails, they return a clear error and the client surfaces a Toast rather than silently mocking values.

## Storage

Buckets (see DATA_MODEL.md § Storage buckets):

- `progress-photos` — private.
- `exercise-media` — mixed private/public read.
- `food-photos` — private.
- `avatars` — public read.
- `chat-documents` — private.
- `voice-notes` — private.
- `gym-scans` — private, cleaned post-processing.

**Upload pattern:**
1. Client acquires a signed upload URL (`supabase.storage.from(bucket).createSignedUploadUrl(path)`).
2. Uploads directly to Supabase (never through a Vercel function).
3. Emits a row insert with the path.

**Read pattern:**
- Public buckets: direct public URL.
- Private buckets: `createSignedUrl(path, 3600)` — 1-hour signed URL, regenerated on view.

## Real-time

Supabase Realtime channels:

- **Messages** — every new insert on `messages` pushes to a per-thread channel. Client subscribes on thread open.
- **Alerts** — coach subscribes to their `alerts` inserts, drives the notification bell red dot in real time.
- **Presence** — Supabase Realtime Presence API for who's online per coach ↔ client pairing.

Implementation:
```ts
const channel = supabase
  .channel(`thread:${clientId}`)
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages',
        filter: `thread_client_id=eq.${clientId}` },
      (payload) => appendMessage(payload.new))
  .subscribe();
```

Every subscription is torn down in the effect cleanup — no leaks.

## Cost estimate

Order-of-magnitude for a 100-active-user MVP:

- **Vercel Pro ($20/mo):** bandwidth + function invocations. Hobby is enough until crossing 100 GB / 100k invocations.
- **Supabase Pro ($25/mo):** 8 GB DB, 100 GB egress, 100 GB storage, unlimited API requests, daily backups.
- **Anthropic:** metered. Food estimate ≈ $0.005 per call (Sonnet 4.6, ~2000 input + ~200 output tokens, cache-hit after first). 100 users × 10 estimates/day × 30 days ≈ $150/month.
- **Gym scan:** $0.02 per scan (multi-image, larger prompt). Rare — likely < $5/month.
- **VAPID web push:** free (self-signed).
- **Cloudflare Turnstile:** free (up to 1M challenges/month).
- **Total:** ~$50/month infra + ~$150/month AI at scale.

## Third-party services

| Service | Purpose | SLA | Alternative |
|---|---|---|---|
| Supabase | DB + auth + storage + realtime | 99.9% | Neon + Clerk + Cloudflare R2 |
| Vercel | Hosting + functions + edge middleware + cron | 99.99% | Cloudflare Pages + Workers |
| Anthropic Claude | Vision + drafting | 99.5% | OpenAI + Google Gemini (both have vision + tool-use) |
| Cloudflare Turnstile | Bot verification | 99.9% | hCaptcha |
| GitHub | Repo + CI trigger | 99.95% | GitLab |
| SendGrid (via Supabase) | Transactional email | 99.9% | Postmark, AWS SES |

## Backup + recovery

- Supabase Pro: daily database backups, 7-day retention. Point-in-time-recovery to any second within retention.
- Storage: no automated backup. Documented risk.
- User data export: on demand via `account-export.mjs`.

## Rate limits (as of writing)

- Supabase Pro: unlimited API requests, no explicit rate limit.
- Vercel Pro: 1000 serverless invocations/day soft cap on Hobby; Pro is effectively unlimited.
- Anthropic: TPM (tokens per minute) budgets per model — Sonnet 4.6 at ~2000 TPM by default, upgradable.
- Web push: no rate limits (self-issued VAPID).

## Observability

- **Vercel logs:** the only server-side telemetry currently. Function invocations + runtime + error traces visible in Vercel dashboard.
- **Supabase logs:** query performance dashboard shows slow queries.
- **In-house telemetry:** `telemetry_events` table (see DATA_MODEL.md § Telemetry). Queryable via SQL.
- **No Sentry / Datadog / Rollbar.**

## Security

- All server-only secrets in Vercel env vars, one per environment.
- No secrets in the client bundle beyond `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (both public by design).
- Postgres access gated by RLS. Even the anon key can't read data without a valid `auth.uid()`.
- Service-role key used only in server functions. Never reaches the browser.
- CSP headers not currently configured — documented gap.
- HSTS enabled by Vercel.
- `manifest.webmanifest` served with `no-cache` (PWA install requires fresh reads).
- Static assets served with `public, max-age=31536000, immutable` (they're content-hashed).

## Deployment lifecycle

1. Push to a branch → Vercel Preview URL.
2. Merge to `main` → production deploy.
3. Build steps: `npm run build` = `build:api → tsc --noEmit → vite build`.
4. Any tsc error fails the deploy.
5. Post-deploy: Vercel Functions block validates all listed `.mjs` files exist.
6. Rollback: Vercel dashboard "Promote previous deployment".

## Migration workflow

- New migration: `supabase/migrations/NNNN_short_name.sql`.
- Apply locally: `supabase db reset` (dev) or manual `psql` for prod.
- Prod migrations run manually by the founder — no auto-apply from CI.
- Migration renumbering trap: two migrations authored in parallel with the same prefix will collide (documented in memory as a recurring issue).

## Local dev

- `npm run dev` — Vite on port 3005. Anon key used; no server functions available.
- `npm run dev:vercel` — Vercel emulator. `predev:vercel` runs `build:api` first so functions have their `.mjs` files.
- Local Supabase: not currently used. Dev usually points to a staging Supabase project.

## Green-field simplifications

If starting fresh, a rebuild team should consider:

- **All-in-Cloudflare** — Pages + Workers + D1 + R2 + Queues + KV. Lower egress cost, single region, single provider. Trade-off: no managed auth (need Clerk or roll your own).
- **Single-region colocation** — put functions and DB in the same region. Trims ~80ms per DB roundtrip.
- **Postgres-first RPC habit** — everything that touches multiple tables goes in `save_programme`-style RPCs. Elevra started that way and drifted; a rebuild should stick to it.
- **Structured feature flags** — reach for LaunchDarkly / Statsig / Unleash if flags become a habit. Elevra's ad-hoc gates are fine at 5 flags, unmaintainable at 50.
- **Server-state cache** — react-query / TanStack Query for cross-mount cache and background refetch. Elevra's `useAsyncData` is a fetch-on-mount wrapper; server-state gets refetched on every screen visit.
