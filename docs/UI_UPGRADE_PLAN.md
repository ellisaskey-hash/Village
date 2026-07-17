# UI Upgrade Plan — Village/Local

**Date:** 2026-07-17
**Method:** Live-app screenshot review (desktop 1280px + mobile 390px, signed in as a demo resident) + 3 parallel code auditors (design-system/visual-consistency, motion/micro-interaction, visual-direction/big-ideas) measured against the token layer, the primitives, and the Elevra reference bar. Plus one production defect caught in the screenshots.
**Bar:** "an app with millions of investment."

## The diagnosis (where the agents agree)
The token architecture, theming cascade, a11y floor and motion *library* are genuinely strong. The gap to premium is in **consumption and surface craft**, concentrated in a handful of high-leverage places:
1. **The card placeholders are a wall of clashing multi-hue gradients** — the single biggest "unfinished" tell (flagged by all three).
2. **Desktop is scaled-up mobile** — 2-column grids of giant cards, inconsistent max-widths, dead canvas.
3. **The brand green→amber gradient is sprayed everywhere** (buttons, FAB, chat bubbles, placeholders, stat values) so it no longer signifies.
4. **Route/tab changes are hard cuts** — the written exit choreographies (`tabScreenCrossfade` etc.) are dead code.
5. **The identity the spec promised (duotone illustrations, visible "hearth" ambient, sense of place) was never built.**

Plus a **production correctness bug**: the Supabase inbox path stubs `otherName` to the thread title and returns no snippet/unread — so the live inbox shows the title twice with no preview.

---

## Phase 0 — Production correctness (do first)

### 0.1 Inbox is degraded in production (Supabase `threads.mine()`) — HIGH
The live app runs on Supabase. `src/lib/services/supabase/index.ts` `threads.mine()` sets `otherName: r.title ?? 'Conversation'`, `unread: false`, `lastSnippet: null` — stubs. Result (see `mobile-inbox.png`): the row shows the listing title on both lines, no message preview, unread never lights. The preview/unread features work in mock but not in production.
- **Fix:** compute per-thread the other participant's display name, the last message snippet + sender, and unread (last message newer than the viewer's `last_read_at`). Cleanest as a DB view or RPC (`my_threads`) returning it in one query; migration + wire the Supabase `mine()` to it. Verify against the live DB.

---

## Phase 1 — High-impact visual fixes (biggest ratio of impact to effort)

### 1.1 Neutralise the clashing placeholder blocks — HIGH *(all three agents' #1-ish)*
`ListingCard.tsx:8-13`, `EventCard.tsx:7-15`, `DirectoryCard`, `PhotoHero` render photo-less items as full-bleed diagonal gradients across the whole hue wheel (green/blue/purple/olive/brown). In a grid they read as a paint chart (`desktop-explore-listings.png`). Also two incompatible placeholder languages coexist (icon-on-gradient vs seed's title-on-flat-colour).
- **Fix:** one cohesive placeholder — a warm neutral "canvas" surface (tinted to the brand cream/green family, not per-kind rainbow) carrying a single tinted category glyph + the kind label. Constrain any hue to subtle green/amber shifts; encode kind via the badge, not the whole tile. Regenerate or drop the text-on-flat seed images so demo imagery matches. Reserve real colour for real user photos.

### 1.2 Responsive grids — stop 2 giant columns on desktop — HIGH *(design-system #1, my review, visual-direction #10)*
`ListingsView` chunks VirtualList rows into fixed pairs and renders `grid-cols-2`; `DirectoryView` business/place grids are `grid-cols-2` fixed. On desktop each card is ~430px (`desktop-explore-listings.png`).
- **Fix:** `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` (target ~240-280px cards); make the ListingsView row-chunk size breakpoint-aware (or switch to CSS `auto-fill,minmax(240px,1fr)` and drop manual chunking).

### 1.3 Reclaim desktop width + one shared content max-width — HIGH *(design-system #2)*
Explore caps at `max-w-4xl`, Home at `max-w-5xl`; sibling tabs jump width and float left with a large empty right gutter (worst on Inbox/Requests). The ambient wash then out-competes the content.
- **Fix:** one shared centred content max-width token across the app surfaces; spend the reclaimed width on the 1.2 grids. Consider a desktop two-pane for Inbox/Thread (list + conversation) so the thread doesn't float in a void.

### 1.4 Gradient restraint — reserve the signature — HIGH *(visual-direction #7, design-system #4/#5)*
`--g-brand` is on primary buttons, the Post pill, the FAB, IconButtons, **every sent chat bubble**, StatCard values, and placeholder tints. Chat bubbles are the worst — a ~620px green→amber wash on desktop (`desktop-thread.png`).
- **Fix:** reserve the full gradient for one or two true brand moments (the FAB as the "create" anchor; optionally the primary CTA). Sent chat bubbles → solid `bg-accent`; secondary/stat/placeholder → solid tint. Cap bubble width tighter on desktop (`lg:max-w-[52ch]`).

### 1.5 Directory filter chips → single scroll row — MEDIUM *(design-system #7, my review)*
7 icon chips `flex-wrap` to 3 rows on mobile (~150px of chrome before content). The listings filter already uses a single `-mx-screenX overflow-x-auto` row.
- **Fix:** match it — one horizontal-scroll row; drop the leading icons on filter chips (consistency with listings, eases the wrap).

### 1.6 Home "New nearby" scroller clips on desktop — MEDIUM *(design-system #6)*
The mobile horizontal scroller is reused on desktop and clips the last card (`desktop-home.png`), reading as breakage.
- **Fix:** on `lg`, switch to the 1.2 grid (4-up) or add an edge fade + chevron affordance; keep the scroller for mobile.

### 1.7 Title truncation loses to trailing controls — MEDIUM *(design-system #12)*
Event/request titles are single-line-truncated to make room for a fixed RSVP button ("DEMO Cricket club so…"). Content should out-rank the control.
- **Fix:** allow titles `line-clamp-2`, or drop RSVP below the title on narrow widths.

---

## Phase 2 — Motion wiring (activate what's already written)

### 2.1 AnimatePresence route boundary — HIGH *(motion H1)*
`App.tsx`/`AppShell` render `<Outlet/>` unwrapped, so every screen's `exit` variant is dead and `tabScreenCrossfade` is never used. **Caveat:** an earlier naive `AnimatePresence mode="wait"` on the outlet caused blank-page-on-load stalls. Re-approach carefully — key on pathname, keep exits fast/guaranteed, test the load path hard before shipping.
- **Fix:** wrap the routed outlet in `AnimatePresence` with `tabScreenCrossfade` (120ms) for tab-level changes; verify no stall regression.

### 2.2 Home cascade fires on real content, not the loading frame — HIGH *(motion H2)*
`screenEnter`'s `staggerChildren` runs once at mount when only the skeleton exists; real sections mount late and all play `cardEnter` (1000ms) simultaneously. The signature cascade is never seen on content. Skeleton→content is also a hard swap.
- **Fix:** mount the stagger container once data is ready (drive off an `isFetched` key), and wrap skeleton↔content in `AnimatePresence` so content resolves into place.

### 2.3 Stagger the virtualised lists — HIGH *(motion H3)*
Listings/Requests (VirtualList) snap in; Events/Inbox/Alerts fade+rise with `listItem`. Same app, two personalities.
- **Fix:** give `VirtualList` an optional stagger-reveal for the first ~12 rows (at least the ≤threshold small-list branch), using `listItem`.

### 2.4 Optimistic-send motion polish — MEDIUM *(motion M4)*
The pending bubble uses an inline transition-less config; success opacity snaps; failure removes the row with no exit. Add a named `messageEnter`, wrap the list in `AnimatePresence` for rollback exit, animate pending→committed with `springSnappy`.

### 2.5 Consistent tab-content transitions (Explore + Inbox) — MEDIUM *(motion M1/M2)*
Explore/Inbox segment switches hard-swap; EventsView has no entrance wrapper while its neighbours fade. Own the transition at one level (`AnimatePresence` keyed on section + `tabScreenCrossfade`); remove the per-view ad-hoc wrappers.

### 2.6 Smaller motion wins — LOW *(motion M3, M7, L1, L2, L4, 13)*
`layout` on list rows for smooth reorder; Home quick-actions spread `{...pressable}`; count-up on StatCard/Badge via `drawTransition`; desktop Post button gets press+breath; drop the infinite FAB "breath" (or first-session only) — a non-stop pulse reads gimmicky.

---

## Phase 3 — Identity, depth & consistency

### 3.1 Make the "hearth" ambient visible — MEDIUM, cheap *(visual-direction #3)*
The signature warm ambient is barely perceptible in light mode. Increase `--bg-ambient-*` alphas (~2x) + a warm ember low-centre + a subtle edge falloff so content feels lit from within. Screenshot and tune.

### 3.2 Elevation language — MEDIUM *(design-system #17, visual-direction #8)*
Everything is `border + shadow-card` on one plane. Define 2-3 tiers (flush list rows → resting cards → floating/glass overlays) and deploy the glass surfaces the tokens already provide.

### 3.3 Radius + badge + header-size consistency — LOW/MEDIUM *(design-system #11, #12, #15, #16, #9)*
Collapse `xl`==`2xl`==20px; assign radii by role (card 16 / overlay 20-24 / control 12). Fix low-contrast inactive segment/chip text. Section headers → `text-h2` (21px) to fill the hierarchy gap. Replace the blunt 4px noticeboard left-accent with a source chip. Unify verified/claim/price badge contrast (esp. dark text on dark placeholder).

### 3.4 Detail-header icon consistency — LOW *(my review)*
Save + Share are icon-only, Report is icon+label. Make them consistent (all icon-only with the report action in an overflow, or all labelled).

---

## Phase 4 — Bigger investments (flagged, scoped deliberately)

*(High identity payoff, larger effort — surface for a decision rather than auto-executing.)*

- **4.1 Duotone illustration system** *(visual-direction #1)* — the spec promised leaf/honey line illustrations; none exist. ~15-20 illustrations for empty states, onboarding, cards. `EmptyState` already has an unused `illustration` slot. Start with the 3 most-seen empties.
- **4.2 Real landing / first-impression** *(visual-direction #4)* — an illustrated "village at dusk" hero + in-situ pillar proof instead of logo + 4 plain cards.
- **4.3 Sense of place — village map motif** *(visual-direction #9)* — a stylised map of the village as landing backdrop / community-picker; the ownable asset for a hyperlocal product.
- **4.4 Home flagship hero** *(visual-direction #5)* — a "your village today" pulse band (live counts from queries already fetched) to anchor hierarchy over the equal-weight card grid.
- **4.5 Distinctive display face** *(visual-direction #6)* — trial a warmer humanist/editorial display face on `--font-display` (the `data-font` slot exists for this).

---

## Progress (2026-07-17)
- **Phase 0 — done & verified live:** inbox `my_threads` RPC (real other-name, preview, unread).
- **Phase 1 — done & verified live:** cohesive `Placeholder` across all cards/heroes (+ neutralised the demo seed photos in the live DB), responsive 2/3/4-col grids, solid chat bubbles, single-row directory chips, EventCard 2-line title. The listings grid went from 2 clashing giant columns to a calm 4-up system.
- **Phase 3 (partial) — done & verified live:** stronger hearth ambient; Home section headers → h2.
- **Remaining:** Phase 2 (motion wiring — mind the route-boundary caveat), rest of Phase 3 (radius/contrast/elevation/badges), Phase 4 (illustration system, landing, village map, Home flagship hero, display face).

## Execution order
Phase 0 (correctness) → Phase 1 (visual high-impact) → Phase 2 (motion, carefully re the route-boundary caveat) → Phase 3 (identity/consistency). Each in verified, deployed batches. Phase 4 items surfaced for a decision. Screenshot before/after on the flagship changes (1.1, 1.2, 1.4) since they're the ones that move the needle most.

## Demo-data note (not code)
`hgjhg`, the `DEMO` prefixes, and odd event times (22:47/05:47) are seed data. At this bar the demo corpus should be realistic — it's the first thing a viewer sees — but that's a seeding task, tracked separately.
