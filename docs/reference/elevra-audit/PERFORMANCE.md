# PERFORMANCE.md

Empirical performance posture. Measurements are directional (single-device dev-observation), not lab-grade. Where a number is a rough estimate, it's flagged.

## Cold start (production)

Measured on iPhone 12 (iOS 17.4, Safari, 4G). Route: `/today`. Cold: no service worker cache, no localStorage session.

- HTML: ~90ms.
- Root JS chunk: ~1.6 MB gzipped (~4.4 MB uncompressed). Includes React, framer-motion, echarts (currently in the main bundle — see WEAKNESSES.md), the 873-exercise built-in corpus, and every route module referenced at boot.
- First contentful paint: ~1.3s.
- Time to interactive: ~2.4s.

Warm (SW cached + localStorage session):
- HTML: ~40ms.
- Root JS chunk: served from Cache Storage.
- FCP: ~250ms.
- TTI: ~600ms.

## First-time-installer cold start

Meta viewport is set, the manifest has `start_url: '/?source=pwa'`, and the SW registers with `registerType: 'prompt'`. Cold install cost on a 4G phone: ~4s from tap-home-screen-icon to interactive. Second and subsequent starts share the warm profile above (<1s).

## Bundle

`vite build` outputs to `dist/`. Rough sizes (from `vite build` output on the most recent full build):

- `assets/index-<hash>.js` — ~1.6 MB gzipped (main chunk).
- `assets/echarts-<hash>.js` — split when possible; currently included in main due to the way ECharts wraps its React binding.
- `assets/react-<hash>.js` — split as a separate chunk when Vite detects it.
- Route-level lazy chunks — each screen (`TodayScreen`, `RosterScreen`, etc.) split as `<hash>.js` at ~10-80 KB each.

**Known bloat sources:**
1. **Built-in exercise corpus** (873 exercises with full metadata) is imported at boot from `src/services/builtin/taxonomy.ts`. Approx 400 KB uncompressed. Should be code-split off the main entry (documented in WEAKNESSES.md).
2. **ECharts**. ~700 KB uncompressed for the full lib. Used only on a few screens (Progress, coach analytics). Should be dynamic-imported per chart mount.
3. **jspdf + jspdf-autotable + xlsx** — required only for coach exports. Should be dynamic-imported on export button tap.
4. **TipTap StarterKit** — required for the composer + RichTextEditor. Loaded eagerly. Could be lazy-loaded on first "compose" interaction.

**Service worker cache raise** (`vite.config.ts:22-27`):
```ts
maximumFileSizeToCacheInBytes: 4 * 1024 * 1024
```
Workbox default is 2 MiB. Raised to 4 MiB because the main chunk grew past 2 MiB with the corpus. Long-term fix: code-split. Short-term fix: raise the cap.

## Route rendering

- **Route change:** `AnimatePresence mode="wait"` in the shells fades the outgoing route in 120ms + mounts the new one. Time from `useNavigate()` call to first paint of new route: ~200ms on iPhone 12.
- **Route lazy load first hit:** the lazy chunk needs to fetch (over-the-wire from Vercel CDN edge). Typical 4G: ~300-500ms. Cached: instant.
- **Per-screen `screenEnter`** cascades cards over 200ms fade + 1000ms rise. First frame of the first card appears at the same time as the route mount; the cascade continues in parallel.

## List rendering

**No virtualisation currently.** Every list renders every item on mount.

Anecdotal:
- Roster with 50 clients: renders in ~100ms, smooth.
- Roster with 500 clients (documented stress test): renders in ~800ms + first scroll frame drops briefly. Documented gap — see WEAKNESSES.md. Fix: `react-virtual` or `@tanstack/react-virtual`.
- Library with 873 built-in exercises: filtered client-side. Filter response: ~30ms after debounce. Fine.
- Roster / Messages / Alerts all use plain `.map()` today.

For the current user base this is fine. For a 10x scale-up it's not.

## Image loading

- **Exercise demo frames** (GitHub raw CDN) — first hit uncached ~200ms. `LoopingFrames` waits for both frames before starting the loop, so no partial cycle.
- **Progress photos** — Supabase Storage signed URL, first hit ~300ms depending on region.
- **Avatars** — small (usually < 100 KB), served from Supabase Storage or the deterministic-color-disc fallback.
- **No `srcset` / responsive images.** Every image is served at native resolution. Documented gap.
- **No blur-up placeholders.** Skeleton renders in the image's slot until it loads.
- **No lazy loading below-the-fold.** `loading="lazy"` is not consistently applied.

## Framer Motion performance

- Every animation uses `transform` + `opacity` — GPU-composited.
- `backdrop-filter: blur` is used heavily in Sheets and Cards. Costly on lower-end Android (Chrome 90-generation devices see 30-40 FPS during a Sheet open). On modern devices: 60 FPS.
- Layout animations (`layoutId`) used sparingly — only in SegmentedControl and Tabs. No perf issue.
- `whileHover` scale on cards / buttons / icon buttons composites cheaply.

**Reduced-motion CSS kill switch** collapses transitions to 0.15s and neutralises hover transforms — pref is honoured, but the intent is a11y not perf.

## Real-time subscription cost

Supabase Realtime channels are cheap on the client. Every open channel:
- Holds an open WebSocket to Supabase.
- Sends periodic ACKs.
- Emits row events as they land.

Elevra opens:
- 1 messages channel per open conversation.
- 1 alerts channel for coach dashboard.
- 1 presence channel per active pairing.

At 100 concurrent users: ~300 open channels total server-side. Well within Supabase Pro's stated capacity.

## Database performance

Indexed via migrations — see DATA_MODEL.md. Notable hotspots:

- `weight_entries (client_id, date desc)` — fast for chart draws.
- `messages (thread_client_id, at desc)` — fast for conversation load.
- `pulse_entries (client_id, date desc)` — fast for daily-pulse charts.
- `workout_logs (date)` — fast for date-range queries.

**Slow queries** (observed):
- Full roster join with tags + last check-in date + last message: ~200-400ms at 500 clients. Under 100ms at 50 clients.
- Coach Home aggregate query (unread + alerts + upcoming bookings): ~150ms. Split into three queries for parallelism.
- Alert list with 1000+ historical alerts: needs a `state != 'dismissed'` index. Documented.

**pg_trgm** for search: enabled but not aggressively used. Search across clients + messages + exercises does full-table `ilike` scans — fine at current scale.

## Anthropic latency

- Food estimate (Sonnet 4.6 vision + tool-use, cache-warmed): ~2.5s. Cache-cold: ~3.5s (~1.25× write premium). Presented to user with a spinner + skeleton macro row.
- Gym scan (Sonnet 4.6 vision, multi-image): ~8s. Presented as a background job with a follow-up push notification when done.
- Text drafts (Haiku): ~0.8s. Presented inline in the composer.

## Push notification latency

- Cron tick: every 10 min. Digest push arrives within 10 min of dispatch time.
- Real-time push (message reply, coach nudge): ~1-2s from trigger to device.

## App shell HTML/JS caching

Response headers in `vercel.json`:
- `/sw.js` — `no-cache, no-store, must-revalidate`. SW must always be fresh.
- `/manifest.webmanifest` — no-cache. PWA install requires fresh manifest.
- `/assets/*` — `public, max-age=31536000, immutable`. Content-hashed URLs; safe to cache forever.

## Idle memory

Client tab at idle (roster + one messages channel + presence):
- ~65 MB heap on Chrome desktop.
- ~35 MB on iOS Safari.

Photo capture spike: +30-100 MB while a Blob is held before upload. Released after upload.

## Bottlenecks (ordered by impact)

1. **Main JS chunk size.** ~1.6 MB gzipped is the single biggest cold-start cost. Splitting the built-in corpus + dynamic-importing ECharts + lazy-loading jspdf/xlsx/TipTap could halve this.
2. **No list virtualisation.** Painless at current scale; expensive at 10x.
3. **No server-state cache.** Every screen visit refetches. React Query would fix but is a non-trivial swap.
4. **No image responsive sizes.** Serving native-resolution photos wastes bandwidth on low-DPR devices.
5. **backdrop-filter blur cost on older Android.** Sheet opens dip to ~40 FPS on Chrome 90-generation devices. Fixed by using `bg-bg/95` (mostly opaque) rather than `bg-bg/80` on those devices, but the app doesn't currently branch.

## Lighthouse (production, from spot-check)

Approximate scores on desktop:
- Performance: 78
- Accessibility: 92
- Best Practices: 92
- SEO: 90 (marketing site scores higher; the app itself is behind auth so most SEO is n/a)
- PWA: passes.

Mobile scores drop ~10 points on Performance due to slower CPU.

## What the rebuild team should improve

1. **Code-split from day one.** Route-level lazy is fine; also lazy-load anything > 100 KB used on < 20% of screens (ECharts, TipTap, jspdf, xlsx).
2. **Virtualise every list > 50 items.** `@tanstack/react-virtual`. Non-negotiable.
3. **Server-state cache** with `@tanstack/react-query` or SWR. Refetch on window focus, background revalidate.
4. **Responsive images.** `srcset` on progress photos + avatars. Use Supabase's on-the-fly image transform where practical.
5. **CSP headers.** Not currently configured.
6. **Structured error reporting.** Sentry or a self-hosted equivalent. `console.error` isn't observability.
7. **Consider colocating** Vercel functions with Supabase in the same region.
