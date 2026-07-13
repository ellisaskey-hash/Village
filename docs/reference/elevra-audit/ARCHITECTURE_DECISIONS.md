# ARCHITECTURE_DECISIONS.md

The ten most consequential decisions in Elevra's architecture, in the order they matter. Each entry: the decision, the alternative considered, what it bought, what it cost, and what hindsight says.

---

## 1. Design tokens as a TypeScript module, consumed as CSS variables

**Decision:** `design/tokens.ts` is the source of visual truth. `tailwind.config.ts` reads it at build time and generates utility classes that resolve to CSS custom properties on `<html>`. `src/index.css` writes theme + skin + user-preference overrides as CSS variable rewrites.

**Alternatives considered:**
- Style Dictionary / Tokens Studio JSON pipeline.
- Emotion / styled-components with a runtime theme object.
- Tailwind config as source of truth with no separate tokens file.
- CSS-only tokens (no TS layer).

**What it bought:**
- One place to change any colour, spacing, radius, shadow, easing, duration.
- Type-safe token access from TS code (Framer Motion configs import `motionToken` directly).
- Runtime theme switch without React re-renders — the `<html data-theme>` attribute swap paints the new theme in one frame.
- Six user-preference axes (theme, skin, accent, density, font, contrast, motion) layer without any component knowing.

**What it cost:**
- Some tokens need to be authored twice — TS for JS consumers, CSS for CSS consumers. Kept in sync manually.
- The Tailwind type scale is baked at build time, so a runtime type-scale swap isn't possible.
- ECharts colours are read via `getComputedStyle` at chart-mount time; not reactive to theme changes without a remount.

**Hindsight:** the setup is worth it. The 2026-06-08 light theme addition took a day of writing values, not a week of rewriting components. The client-skin lime accent took two hours. A green-field rebuild should copy this pattern verbatim — CSS variables + Tailwind + one TS source of truth.

---

## 2. Supabase for everything backend

**Decision:** use Supabase for Postgres + Auth + Realtime + Storage. Do not run our own server.

**Alternatives considered:**
- Node/Express on Fly.io + Postgres on Neon + Auth0 + Cloudflare R2.
- Firebase.
- All-Cloudflare (Pages + Workers + D1 + R2 + Access).

**What it bought:**
- No server to maintain, no auth to implement, no realtime layer to build.
- Row-Level Security in Postgres gates data at the source — every query, from every client, is filtered by `auth.uid()`.
- Type-safe DB queries via generated types.
- One vendor bill instead of four.

**What it cost:**
- Region locked to `eu-west-1` (chosen for GDPR proximity). Vercel functions in `us-east-1` add ~80ms/hop.
- Supabase Realtime has quirks — presence + row-changes on the same channel can conflict; cleanup needs careful useEffect discipline.
- Vendor lock — everything from RLS to Storage to Auth is Supabase-specific. Migration to a different backend would be a rewrite.

**Hindsight:** correct decision for the stage. If Elevra hits a scale where region-locking Vercel to `us-east-1` isn't tenable, the fix is to move functions to Supabase Edge Functions (same region as DB) — not to abandon Supabase.

---

## 3. Framer Motion for all animation

**Decision:** every animation in the app is a Framer Motion variant from `src/lib/motion.ts`. No CSS keyframes for interactive motion (only two for CSS-only affordances: `breath` and `voice-playhead`). No competing motion libraries.

**Alternatives considered:**
- CSS transitions + keyframes with a per-component variant table.
- React Spring / GSAP.
- Native Web Animations API.

**What it bought:**
- One motion language, one place to change durations/easings/springs.
- Layout animation via `layoutId` (used in SegmentedControl, Tabs) that would take 100 lines of custom code otherwise.
- `<MotionConfig reducedMotion="user">` collapses all animations to instant fades globally — reduced motion is one line, not per-component.
- Springs feel more physical than tweens, and the app's "responsive on tap" feel is entirely spring-driven.

**What it cost:**
- Framer Motion is ~90 KB gzipped in the main bundle. Non-trivial.
- Some animations (screen enter, list stagger) could be lighter as CSS keyframes. We pay for uniformity.
- Learning curve — new contributors need to know the `motionToken` vocabulary before touching a variant.

**Hindsight:** correct for a design-heavy app. A dashboard-heavy or content-heavy app might reach for lighter. For anything with a "feel" as a primary product attribute, Framer is worth the weight.

---

## 4. Zustand for global state, one store per concern

**Decision:** every global-state concern gets its own persisted Zustand store (`elevra:theme`, `elevra:session`, `elevra:a11y`, `elevra:messages`, `elevra:notificationPrefs`, and ~35 others). No single "app store". No Redux, no Context-only patterns.

**Alternatives considered:**
- Redux Toolkit + persist middleware.
- Jotai (atoms).
- React Context per concern with `useReducer`.

**What it bought:**
- No boilerplate. A new store is 15 lines including `persist`.
- Each concern is independently persisted with its own localStorage key — invalidating one doesn't invalidate all.
- Consumers subscribe to slices via selectors and only re-render when the slice changes.
- Tests don't need a Provider wrapper — just import the hook.

**What it cost:**
- ~40 stores is a lot to trace when debugging cross-concern state.
- No devtools story like Redux DevTools (Zustand's is thinner).
- Persistence versioning across breaking changes has bitten twice — a v1 → v2 shape change without a migration silently truncates old data.

**Hindsight:** worth it at this scale. If concerns crossed into cross-store transactions frequently, a single store might make more sense. In practice, cross-store reads are rare in Elevra.

---

## 5. Custom Tailwind spacing scale

**Decision:** `tailwind.config.ts` reads the `space` object from `design/tokens.ts:216-223` and rebinds the numeric keys (`h-8 = 40px` not 32px; `h-10 = 64px` not 40px; `h-11 = 80px` not 44px). Every component uses arbitrary values (`h-[32px]`, `h-[44px]`) to hit real pixel targets.

**Alternatives considered:**
- Stick with Tailwind defaults.
- Rename the tokens to avoid the collision (e.g. `h-nudge = 4px`).

**What it bought:**
- Consistency with the 4pt grid from the token file.
- Named spacing steps (`screenX`, `sectionGap`, `cardPad`, `tabBar`).

**What it cost:**
- Every h-N in the codebase requires knowing whether the target is a rebound step or an arbitrary pixel. IconButton has been fixed for this **twice** (in memory as `feedback_cadence_arbitrary_pixels.md`).
- New contributors hit this trap immediately.
- Copy-paste from a Tailwind snippet is unreliable — the same class means different things.

**Hindsight:** a mistake. A green-field build should either (a) keep the default Tailwind scale and name the extra tokens uniquely, or (b) rebind and use only arbitrary values everywhere with no keyword `h-N` in the codebase. Elevra ends up doing (b) informally, but the type system doesn't enforce it.

---

## 6. Bottom-sheet as the drawer primitive; Modal only for destructive confirms

**Decision:** every secondary surface is a `Sheet` (bottom-anchored on mobile, centered on `lg:+`). `Modal` is used exclusively for destructive-and-irreversible confirmations.

**Alternatives considered:**
- Radix Dialog for everything.
- Router-based drawers (a modal is a route).
- No drawers at all — expand inline.

**What it bought:**
- One primitive, one focus-trap, one keyboard/backdrop dismissal, one drag-to-dismiss.
- Sheets scale naturally from phone (bottom-anchored) to desktop (centered card) via `position="center"`.
- Clear semantic separation: Sheets are the workspace; Modals are the "are you sure".

**What it cost:**
- Some UIs on desktop feel drawer-heavy where a popover would fit. `PortalPopover` fills the gap, but the pattern-selection call is judgement.
- Sheet's opinionated defaults (fluidGlass, top fade, accent scrollbar) were changed in 2026-06-15 as an implicit global rewrite — every existing Sheet visually shifted. Migration risk high; documented as a `feedback_bilateral_paired_read`-style event.

**Hindsight:** correct. A single drawer primitive with two position modes handles 90% of secondary surfaces. Popovers cover the remaining 10%.

---

## 7. Motion tokens as spring configs, not just durations

**Decision:** `motionToken.springSnappy`, `motionToken.springSheet`, `motionToken.springGentle` are named spring configurations at design-token time. Components import a name, not a duration.

**Alternatives considered:**
- Duration + easing only (`motionToken.fast + easeOut`).
- Named animations at the component level (`Button.transition = ...`).

**What it bought:**
- Uniform physical feel across every pressable primitive.
- Tuning one spring updates every consumer.
- No "each dev picks a spring" drift.

**What it cost:**
- Springs are less predictable than durations for timeline choreography.
- Reduced-motion has to collapse springs to instant — Framer's `MotionConfig` handles this transparently, but it wouldn't in a hand-rolled system.

**Hindsight:** the right call. The "responsive on tap" feel throughout the app is a direct consequence of every pressable using the same spring config.

---

## 8. Hand-rolled offline queue instead of Service Worker Background Sync

**Decision:** `src/lib/offlineQueue.ts` is an in-memory FIFO with an idempotency key per item. Drains on `online` event.

**Alternatives considered:**
- Service Worker Background Sync API.
- IndexedDB-backed queue that survives hard refresh.

**What it bought:**
- Simple implementation, testable in unit tests.
- No SW lifecycle races.
- Works in all browsers (Background Sync has patchy iOS Safari support).

**What it cost:**
- In-memory queue is lost on hard refresh. A user who hits Airplane Mode, taps Save, then hard-refreshes loses the pending write.
- Requires the app to be open for the queue to drain.

**Hindsight:** correct for the "user is watching the screen" case. Wrong for genuinely-async flows where the app might be closed. A rebuild should either persist to IndexedDB or use Background Sync in browsers that support it.

---

## 9. Anthropic Claude as the AI provider; Sonnet for vision, Haiku for text

**Decision:** all AI operations go through the Anthropic SDK. Sonnet 4.6 for anything vision-required (food photos, gym scans). Haiku for text drafts.

**Alternatives considered:**
- OpenAI (GPT-4V for vision, GPT-3.5 for drafts).
- Google Gemini.
- Multi-provider with runtime routing.

**What it bought:**
- One SDK, one billing account, one rate-limit budget.
- Consistent tool-use forced-schema patterns.
- Prompt caching (`cache_control: ephemeral`) cuts food-estimate cost by ~90% on repeat calls.

**What it cost:**
- Vendor lock — a bad Anthropic incident stops every AI feature simultaneously.
- Sonnet is expensive relative to GPT-3.5 for pure-text tasks. Migrating textual endpoints to Haiku (or a smaller model) has been an ongoing exercise.

**Hindsight:** correct at start; the vendor-diversity question becomes real if / when Anthropic pricing shifts.

---

## 10. PWA with no native shells

**Decision:** ship as a PWA with `display: 'standalone'`, `orientation: 'portrait'`, prompt-based service worker updates, in-house install coach. No native iOS or Android app.

**Alternatives considered:**
- React Native.
- Capacitor wrapping the web app.
- Ionic.

**What it bought:**
- One codebase, one deploy pipeline.
- No app store review cycle for updates.
- No Apple / Google 30% cut on subscriptions (when they land).
- Install path via Add-to-Home-Screen is friction-light on modern iOS + Android.

**What it cost:**
- No Face ID / Touch ID.
- No native push notification categories (web push categories are shallow).
- iOS Safari Web Push landed only in 16.4 — earlier iOS users can't get push at all.
- No native health data pipeline (Apple Health / Health Connect) — wearable data comes via Whoop / Garmin / Oura / Fitbit APIs instead.
- Some users don't know how to install a PWA. `InstallCoach.tsx` exists to walk them through it, but the discovery cost is real.

**Hindsight:** correct for a founder building solo. If Elevra hits a scale where 20% of users are on iOS and can't get push, a Capacitor wrap becomes worth the deploy overhead.

---

## Honourable mentions (didn't crack the top ten)

- **Vite over Next.js.** Chosen because Elevra is an authenticated SPA — no SEO on 95% of the surface, no ISR need. Vite's dev-server speed is worth the manual routing. If SEO ever mattered on more surfaces, Next would win.
- **date-fns over dayjs / moment.** Tree-shakes; each function is imported by name.
- **TipTap over Slate or Draft.** Modern, ProseMirror-based, extension model is clean.
- **ECharts over Recharts / Victory.** Faster on 5k-point series; API is verbose but stable.
- **idb-keyval over Dexie.** Minimal wrapper — Dexie's schema layer is overkill for a bag-of-blobs.
- **web-push over Firebase Cloud Messaging.** No Google dependency; VAPID keys under our control.
