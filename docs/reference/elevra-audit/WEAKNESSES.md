# WEAKNESSES.md

Every known weakness, tech debt line, inconsistency, and pattern the rebuild team should NOT copy. Honest, not defensive. Grouped by domain, ordered by impact within each group.

## Design system

### 1. Custom Tailwind spacing scale that collides with keyword steps
- **Issue:** `tailwind.config.ts:13-20` rebinds `h-8 = 40px`, `h-10 = 64px`, `h-11 = 80px`. Every `h-N` in the codebase reads differently than a Tailwind snippet from Stack Overflow.
- **Consequence:** IconButton has been fixed for this twice ("the circle around the arrow is MASSIVE"). Every new contributor hits it.
- **Rebuild advice:** either keep Tailwind defaults and use unique names for extras, or rebind and only ever use arbitrary values (`h-[Npx]`).

### 2. Hardcoded hex values in ~10 SVG components
- **Files:** `HabitsHero.tsx`, `HabitsAmbientFooter.tsx`, `HabitsSuggestionCard.tsx`, others documented in DESIGN_TOKENS.md § HARDCODED STYLE BYPASSES.
- **Consequence:** these components don't pick up the client-skin lime accent or any accent user-override. A rebrand would need to touch each file.
- **Rebuild advice:** use `stop-color="var(--c-accent)"` in SVG `<stop>` elements from day one. It works — no browser drops it.

### 3. Chart lib reads CSS variables at mount time only
- **File:** ECharts wrapper.
- **Consequence:** a chart mounted before a theme change keeps its old colours until re-mount.
- **Rebuild advice:** either use a chart lib that observes CSS variables, or write a hook that subscribes to `data-theme` changes and forces a chart remount.

### 4. Chip and small icon touch targets under 44px
- **File:** `Chip.tsx` (locked 40px), IconButton `sm` (32px visible, 44px via `::before`).
- **Consequence:** WCAG 2.5.5 (Target Size) AAA fails on Chip. AA passes.
- **Rebuild advice:** raise to 44px explicitly. The horizontal padding cheat is a workaround, not a fix.

### 5. Light-mode `textFaint` at 2.5:1 contrast
- **Value:** `#A0AAC0` on `#F6F8FC`.
- **Consequence:** fails WCAG AA for body text. Only used on decorative captions but the consistency contract is that any text should pass AA.
- **Rebuild advice:** raise to at least `#6B7690` (~4.5:1). High-contrast mode already fixes it.

### 6. Sheet fluid-glass default was flipped globally in one PR
- **Date:** 2026-06-15.
- **File:** `Sheet.tsx`. Every existing Sheet's surface treatment changed at once.
- **Consequence:** implicit visual regression risk across ~20+ sheets. No per-sheet migration path.
- **Rebuild advice:** decide surface treatment per-sheet from day one. Global flips of a default are expensive to review.

### 7. Two `DrawerActionRow` variants
- **Files:** `DrawerActionRow.tsx` + `DrawerActionRowGlass.tsx`.
- **Issue:** the two exist because we didn't dare change the canonical row's surface when the Sheet default flipped in #6.
- **Consequence:** consumers now have to know which sibling to use. Split will drift further as features land.
- **Rebuild advice:** one row primitive with a `surface` prop.

### 8. Grid breakpoints don't match Tailwind defaults
- **Values:** `sm: 360, md: 600, lg: 900, xl: 1200`. Standard Tailwind: `sm: 640, md: 768, lg: 1024, xl: 1280`.
- **Consequence:** any component pasted from a Tailwind gallery uses the wrong breakpoint.
- **Rebuild advice:** use the standard Tailwind breakpoints unless there's a specific reason to deviate (Elevra had one — the design mocked at 600px tablet — but the trade-off is worth naming).

---

## Accessibility

### 9. No route-change `aria-live` announcement
- **Consequence:** screen reader users hear only the first focused element inside the new route, not "You've navigated to Today".
- **Rebuild advice:** an `aria-live="polite"` node bound to `document.title` at shell level. Easy to add; easy to forget.

### 10. No skip-to-main-content link
- **Consequence:** keyboard users tab through the entire header on every route.
- **Rebuild advice:** add `<a href="#main" className="sr-only focus:not-sr-only">` at shell top.

### 11. `aria-current="page"` missing on TabBar active tab
- **File:** `src/app/shells/TabBar.tsx`.
- **Consequence:** screen readers don't know which tab is active.
- **Rebuild advice:** add `aria-current={isActive ? 'page' : undefined}` on NavLink.

### 12. WebGL aurora doesn't freeze under reduced motion
- **File:** `src/components/decor/AppBackground.tsx`.
- **Consequence:** slow shader still runs. Vestibular risk is low but formally out of spec.
- **Rebuild advice:** pause the `requestAnimationFrame` when `useMotionSafe() === false`.

### 13. Ad-hoc `<svg>` in feature code often lacks `aria-hidden`
- **Consequence:** decorative SVGs get read as unlabelled graphics.
- **Rebuild advice:** every raw SVG gets `aria-hidden="true"` unless it's actually meaningful, in which case it gets `<title>` inside.

### 14. Arrow-key navigation only on SegmentedControl
- **Consequence:** RadioRow, RadioTile, Chip row all require Tab-Tab-Tab.
- **Rebuild advice:** roll a shared `useArrowNavigation` hook.

### 15. PDF exports have no tagged accessibility structure
- **File:** anything using `jspdf`.
- **Consequence:** screen reader users get raw text with no headings/lists.
- **Rebuild advice:** switch to a PDF lib that supports tagged output, or generate accessible HTML and use print-to-PDF.

---

## Data / backend

### 16. No server-state cache (React Query / SWR)
- **File:** `src/lib/useAsyncData.ts` — fetch-on-mount wrapper.
- **Consequence:** every screen visit refetches. No background revalidation. No optimistic update helpers.
- **Rebuild advice:** `@tanstack/react-query` from day one. Fixes ~40% of the perceived slowness.

### 17. Offline queue is in-memory only
- **File:** `src/lib/offlineQueue.ts`.
- **Consequence:** hard refresh with pending writes loses them.
- **Rebuild advice:** persist the queue to IndexedDB or use SW Background Sync.

### 18. Local sync merge is last-write-wins
- **Consequence:** two devices editing the same client simultaneously will silently overwrite each other.
- **Rebuild advice:** for shared state (rare in Elevra), use CRDT-style merge or explicit conflict resolution.

### 19. Migration renumbering collisions
- **Consequence:** two migrations authored in parallel with the same prefix collide. Documented in memory as a recurring issue.
- **Rebuild advice:** use timestamped filenames (`YYYYMMDDHHMMSS_name`) instead of sequential prefixes.

### 20. Some services still have "phase 1 stub, will replace" comments
- **Files:** grep for `/** Phase 1 status:` in `src/services/`.
- **Consequence:** technically live but historically half-built. Fine but the comments betray it.

### 21. No formal RPC catalogue
- **Consequence:** `save_programme` and friends are RPCs but there's no doc listing them. New contributors don't know to look.
- **Rebuild advice:** every RPC in a single reference doc, with input schema, output schema, and side effects.

### 22. Real-time channel leaks under fast route change
- **Consequence:** a Messages channel opened on thread A and immediately navigated away can leak a subscription for ~200ms until useEffect cleanup runs.
- **Rebuild advice:** structured effect cleanup + explicit `channel.unsubscribe()` in the cleanup. Elevra does this most places; grep for `channel.on` and check.

---

## Performance

### 23. Main JS chunk ~1.6 MB gzipped
- **Consequence:** cold-start on 4G ≈ 2.4s TTI. Should be < 1.5s.
- **Rebuild advice:** dynamic-import ECharts, TipTap, jspdf, xlsx. Split the built-in exercise corpus off the main entry. Halves the cold start.

### 24. No list virtualisation
- **Consequence:** at 500+ items, list-render frames drop.
- **Rebuild advice:** `@tanstack/react-virtual` for every list ≥ 50 items.

### 25. No `srcset` on images
- **Consequence:** low-DPR devices download native-resolution photos.
- **Rebuild advice:** Supabase Storage image transforms + `srcset`.

### 26. SW cache max raised to 4 MiB as a hack
- **File:** `vite.config.ts:22-27`.
- **Consequence:** the SW happily precaches the huge main chunk. That precache costs bandwidth on install.
- **Rebuild advice:** fix the underlying chunk size (see #23) and lower the cap back to 2 MiB.

### 27. `backdrop-filter: blur` cost on lower-end Android
- **Consequence:** Sheet open dips to ~40 FPS on Chrome-90 generation.
- **Rebuild advice:** feature-detect and fall back to solid `bg-bg/95` on unsupported / slow devices.

---

## Codebase hygiene

### 28. `src/app/state/` has ~40 stores
- **Consequence:** cross-store transactions are painful to trace. Store proliferation is a smell.
- **Rebuild advice:** consolidate related concerns (all UI prefs into one store, all messaging state into one, etc.). Elevra should have started with 5 stores and grown to 15, not 40.

### 29. `scripts/` bloat is common in fitness apps too
- **Elevra parallel:** in the Sales Progressor codebase (author's other product), `scripts/` grew to 155 files. Elevra has kept it small so far by convention.
- **Rebuild advice:** every script has a purpose + deletion criteria. One-shots get deleted after use.

### 30. No structured feature-flag system
- **Consequence:** `/dev/*` gate + a handful of Zustand booleans. Fine at 5 flags, unmaintainable at 50.
- **Rebuild advice:** LaunchDarkly, Statsig, or Unleash if flags start to accumulate.

### 31. No error observability
- **Consequence:** `console.error` + Vercel function logs are the only signal. Users hitting bugs don't file tickets fast enough to catch anything transient.
- **Rebuild advice:** Sentry or a self-hosted error reporter. Day-1 non-negotiable.

### 32. CI doesn't block on tests
- **Consequence:** a broken test can merge to main because Vercel's build only runs `tsc`.
- **Rebuild advice:** GitHub Actions running `npm run test` + `npm run lint` as a required check.

### 33. No visual regression in CI
- **Consequence:** a design-system change can silently regress every screen using the changed primitive.
- **Rebuild advice:** Playwright `toHaveScreenshot()` on every canonical primitive rendered in every state in `/dev/gallery`. Diff threshold ~0.1%.

### 34. Component canonicalisation drift
- **Consequence:** ~15 drawer bodies had identical stagger animations before `StaggeredBody` was extracted in 2026-07-12. Similar patterns still lurk in the codebase (share-with-coach sheets were consolidated on 2026-07-03 but there's more).
- **Rebuild advice:** a component catalog doc that's updated with every new primitive. Elevra has one (`/docs/reference/COMPONENT_LIBRARY_CATALOG.md` in the SP product's convention, not shipped here).

### 35. TypeScript `strict` on but `exactOptionalPropertyTypes: false`
- **Consequence:** `optional?: string` and `undefined` are treated identically, which permits some subtle bugs.
- **Rebuild advice:** enable it. Fix the ~200 sites that'll break. Worth it.

### 36. `useAsyncData` doesn't dedupe concurrent requests
- **File:** `src/lib/useAsyncData.ts`.
- **Consequence:** two components mounting simultaneously with the same fetch both hit the server.
- **Rebuild advice:** dedupe by key inside the hook or reach for React Query.

---

## Voice / copy

### 37. Em-dashes still creep into user-facing copy
- **Rule (VOICE):** banned.
- **Consequence:** documented in memory as `feedback_no_em_dashes_cadence.md`. Broken across the onboarding redesign; caught in review.
- **Rebuild advice:** pre-commit grep sweep for `—` in `*.tsx` / `*.ts` strings outside comments.

### 38. Some strings still say "the system" / "automatically"
- **Rule (VOICE):** use "we'll" or a subject.
- **Consequence:** occasional drift. No enforcement.
- **Rebuild advice:** grep sweep in CI.

### 39. Fake coach voice risk
- **Consequence:** documented in memory as `feedback_never_fake_coach_voice.md`. Any attributed "Coach says: X" must be real, not invented.
- **Rebuild advice:** treat coach voice as user-generated content — never invent it, never template it.

---

## Testing

### 40. Unit test coverage is thin
- **Files:** ~10 `*.test.ts` files. No % target.
- **Rebuild advice:** at minimum every service should have unit tests. Aim 60%.

### 41. No E2E for full happy paths
- **Consequence:** the Playwright suite exists but coverage is narrow.
- **Rebuild advice:** happy-path E2E per top-level route.

### 42. No screen-reader testing beyond spot VoiceOver
- **Rebuild advice:** at least monthly manual pass with TalkBack + NVDA.

---

## Security

### 43. No CSP headers
- **File:** `vercel.json` — headers block doesn't include CSP.
- **Rebuild advice:** ship a `Content-Security-Policy` header from day one. Elevra's inline styles + eval-free JS + no external script hosts makes this tractable.

### 44. VAPID keys as plain env vars
- **Consequence:** any Vercel org admin can read them. Rotation is a redeploy.
- **Rebuild advice:** consider Vercel's encrypted env or a secrets manager (Doppler, Infisical) for signing keys.

### 45. Anthropic API key in Vercel env
- **Consequence:** same as VAPID.
- **Rebuild advice:** same as VAPID. Also worth rate-limiting per-user on the server so a compromised session can't burn the whole budget.

---

## What NOT to copy

Full list, distilled from above:

1. Custom Tailwind spacing scale collision.
2. Hardcoded hex in SVG components.
3. Chart mount-time colour reads.
4. Chip 40px height.
5. `textFaint` low-contrast in light mode.
6. Global default flip on Sheet without per-sheet migration.
7. Duplicated `DrawerActionRow*` sibling primitives.
8. Non-standard Tailwind breakpoints without a labelled reason.
9. Missing route-change `aria-live`.
10. No skip-link.
11. Missing `aria-current` on TabBar.
12. WebGL background that doesn't respect reduced motion.
13. In-memory offline queue.
14. Fetch-on-mount pattern without server-state cache.
15. Store proliferation (~40 Zustand stores).
16. Feature flags as ad-hoc booleans.
17. Console.error as observability.
18. Tests not blocking merge.
19. No visual regression in CI.
20. No pre-commit CSP.

## What to copy anyway

Not everything in this doc is negative. Elevra gets a lot right. From the audit's other documents:

- The multi-axis theming system (theme × skin × accent × density × font × contrast × motion).
- CSS-variables + Tailwind + one TS token source.
- Motion tokens as named spring configurations, not just durations.
- The `<MotionConfig reducedMotion="user">` global collapse.
- The requirement that IconButton's `ariaLabel` be non-optional at the type level.
- The `useFocusTrap` hook.
- The 16px-minimum font-size on every form control.
- The `EmptyState` is a designed first-class state.
- The `Skeleton*` composed to match final layout.
- One `Sheet` primitive for every drawer.
- `Modal` only for destructive confirms.
- Tabular numerals default on every metric.
- Anthropic prompt caching with `cache_control: ephemeral`.
- Vercel + Supabase minimal-server posture.
- RLS-first data gating.
- Bundled `api/_src → api/*.mjs` build pattern.
- No em-dashes in user-facing copy (a small rule with outsized "our-voice" impact).

Take the wins. Fix the drifts. Skip the mistakes.
