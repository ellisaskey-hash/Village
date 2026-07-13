# ACCESSIBILITY.md

Honest accounting of accessibility posture. Wins, gaps, and specific failures. Automated Axe checks run in the Playwright suite; this document supplements with detail Axe doesn't catch.

## Overview

The app targets WCAG 2.1 AA on both themes, both skins, and every user preference axis. It gets there for most surfaces but has documented gaps.

Enforcement layers:
1. **Global CSS rules** (`src/index.css`) — focus rings, reduced motion, high contrast, no-callout.
2. **Primitive contracts** (`src/components/ui/*`) — every input primitive owns its aria wiring; consumers can't accidentally strip it by inlining a raw element.
3. **`useFocusTrap`** (`src/lib/focusTrap.ts`) — traps focus in Sheet + Modal, restores on close.
4. **User preferences** (`src/app/state/a11y.ts`) — motion override + high contrast toggles.
5. **`@axe-core/playwright`** — automated a11y checks in the E2E suite (`axe-core` v4.12.1).

## Colour contrast

Dark theme (from `design/tokens.ts`):
- `text` `#F4F7FB` on `bg` `#0A0E17` — 16.6:1. **AAA large + body.**
- `textMuted` `#8A97AC` on `bg` `#0A0E17` — 5.9:1. **AA body.**
- `textFaint` `#5C6778` on `bg` `#0A0E17` — 3.0:1. **AA large only.** Used for very quiet meta text (timestamps, tertiary labels).
- `accent` `#38E1FF` on `bg` `#0A0E17` — 11.2:1. **AAA.**
- `textOnAccent` `#06121A` on `accent` `#38E1FF` — 10.6:1. **AAA.**
- `lime` `#A8FF60` on `bg` `#0A0E17` — 14.2:1. **AAA.**
- `warn` `#FFC24B` on `bg` `#0A0E17` — 11.4:1. **AAA.**
- `danger` `#FF6B7A` on `bg` `#0A0E17` — 5.4:1. **AA body.**
- `positive` `#A8FF60` on `bg` `#0A0E17` — 14.2:1. **AAA.**

Light theme (from `design/tokens.ts`):
- `text` `#0F1A2E` on `bg` `#F6F8FC` — 15.1:1. **AAA.**
- `textMuted` `#5A6478` on `bg` `#F6F8FC` — 5.2:1. **AA body.**
- `textFaint` `#A0AAC0` on `bg` `#F6F8FC` — 2.5:1. **Below AA.** Only used on non-critical decorative captions and timestamp meta. Documented risk — see WEAKNESSES.md.
- `accent` `#3D7DF7` on `bg` `#F6F8FC` — 4.6:1. **AA body only.** Retuned from the dark theme's `#38E1FF` specifically to pass AA on cream (the source of truth comment at `tokens.ts:87-91`).
- `textOnAccent` `#FFFFFF` on `accent` `#3D7DF7` — 4.9:1. **AA large only.** Buttons ≥ 18pt therefore pass; body-copy tint on top of `#3D7DF7` would need re-checking.
- `lime` `#3D9C5F` on `bg` `#F6F8FC` — 3.8:1. **AA large only.** Deeper green for AA on cream; ink is used as text-on-accent for the client skin because white-on-`#3D9C5F` fails.
- `warn` `#D08A2E` on `bg` `#F6F8FC` — 3.6:1. **AA large only.**
- `danger` `#E74C5E` on `bg` `#F6F8FC` — 4.3:1. **AA body.**
- `positive` `#3D9C5F` on `bg` `#F6F8FC` — 3.8:1. **AA large only.**

**Client-skin lime deltas (`colorClient` / `colorClientLight`):** the client `accent` on dark theme is `#A8FF60`. Contrast against `bg` `#0A0E17` = 14.2:1 (AAA). `textOnAccent` explicitly set to `#0F1A2E` for the light-mode client skin because white on `#3D9C5F` fails AA.

**Known low-contrast concessions:**
1. Light-mode `textFaint` `#A0AAC0` at 2.5:1 fails AA. Used only on decorative captions — never for actionable text. Consumers using it for actionable text is a review bug.
2. Light-mode `warn` / `positive` at ~3.7:1 pass only AA large. When used inline in body text this fails; when used as chip fills with adequate size it passes.

**High-contrast fix:** `data-contrast='high'` collapses `--c-border` onto `--c-border-strong` (raising border contrast), `--c-text-muted` onto `--c-text` (raising muted-text contrast to the body level), `--c-text-faint` onto `--c-text-muted` (raising the faint tier), and forces `--focus-ring*` to solid `--c-accent`.

## Focus management

### Global focus ring

From `src/index.css:521-532`:
```css
:where(button, a, [role='button'], [tabindex]):focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--focus-ring, rgba(56,225,255,0.20));
}
```

Every focusable non-form element gets a 3px accent halo on keyboard focus. `focus-visible` gates it so mouse users don't see the ring on click.

Form controls (`input`, `select`, `textarea`) explicitly get `outline: none` with no ring — their wrappers (`Field`, `Textarea`, `Select`) own the focus chrome via `focus-within:` utilities. Reason: box-shadow on a bare element leaks past the wrapper's rounded corners.

`--focus-ring` is theme-swapped and skin-swapped. High-contrast mode forces it to solid accent.

### Focus trap

`useFocusTrap` in `src/lib/focusTrap.ts`:
- On open: focuses the first focusable element inside the container on the next animation frame (so it doesn't fight framer-motion's enter).
- Tab/Shift+Tab wraps around the first / last focusable.
- On close: restores focus to the element that was focused when the overlay opened, if it's still in the document.

Consumers: `Sheet.tsx`, `Modal.tsx`, `PortalPopover.tsx`.

**Known limits (documented in the file):**
- Doesn't handle iframes.
- Doesn't handle positive tabindex values.
- Doesn't handle hidden ancestors that become visible mid-lifecycle.

Adequate for the component set. WCAG 2.1 § 2.1.2 (No Keyboard Trap) is satisfied because the ESC key always dismisses the overlay.

### Keyboard shortcuts

`src/lib/useHotkey.ts` — global hotkey hook. Coach global shortcuts:
- `/` — open SearchSheet.
- Others are configured per-screen; see `useHotkey` call sites.

Every hotkey has a mouse / touch equivalent affordance so keyboard-only isn't the only way in.

### Arrow-key navigation

`SegmentedControl` handles Arrow Left / Right / Home / End inside `role="tablist"`. This is documented in the component doc (`SegmentedControl.tsx:2-19`). Disabled options stay focusable for arrow-nav but ignore Enter.

Other one-of-N patterns (RadioRow, RadioTile, Chip rows) currently use Tab navigation. Arrow-nav is on the polish backlog.

## Reduced motion

Three-layer stack:

### Layer 1 — CSS `prefers-reduced-motion`

From `src/index.css:551-584`. When the OS query is `reduce` AND `<html data-motion>` is NOT `full`:
```css
:root:not([data-motion='full']) * {
  animation-duration: 0.001ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.15s !important;
  scroll-behavior: auto !important;
}
:root:not([data-motion='full']) *:hover,
:root:not([data-motion='full']) *:active {
  transform: none !important;
}
```

The `!important` cap on transition-duration lets subtle 150ms colour transitions still happen (perceived as instant, no vestibular impact) while killing scale/translate transforms outright. Anecdotal: this made the difference for one tester who was fine with colour crossfades but not with hover-lifts.

### Layer 2 — user override attribute

`<html data-motion='reduce'>` OR `<html data-motion='full'>`:
- `reduce` applies the same CSS as the OS query, unconditionally.
- `full` overrides the OS query (some users enable OS reduce-motion for other reasons but want animations in this specific app).

Toggle exposed in Me screen → Accessibility panel → "Reduce motion" with three options: system default / reduce / full.

### Layer 3 — Framer Motion `<MotionConfig>`

`<MotionConfig reducedMotion="user">` wraps the app in `AppBootstrap`. `useResolvedReducedMotion()` from `src/app/state/a11y.ts` resolves the user pref against `matchMedia('(prefers-reduced-motion: reduce)')` and feeds Framer, which collapses variants to instant fades. Infinite loops (`statusPulse`, `skeletonShimmer`) collapse to static state.

`useMotionSafe()` in `src/lib/motion.ts` is the same information exposed as a hook for imperative timelines (e.g. `LoopingFrames`, `WaterGlass`, `StreakFlame` celebration).

## Dynamic type / density

`data-density='compact' | 'spacious'` on `<html>` re-sets the root `font-size` between 15px and 17px (default 16px). Every `rem`-based utility scales. Touch targets stay ≥44px because they use px-based `min-height`, not rem.

`data-font='dyslexia'` swaps body font to Atkinson Hyperlegible.

No pinch-zoom disable — the meta viewport doesn't set `user-scalable=no`, so browser zoom works. Verified by inspection of `index.html`.

## Screen reader posture

- Every interactive primitive has an accessible name. `IconButton` requires `ariaLabel` at the type level (`ariaLabel: string` — not optional; the compiler enforces).
- `Toggle` requires `srLabel` when the visible label isn't wired via `<label htmlFor>`.
- Every input primitive (`Field`, `Textarea`, `Select`, `IntegerField`, `PasswordField`) generates a `useId` and wires `aria-describedby` to the helper + error nodes.
- `Modal` sets `role="dialog"`, `aria-modal="true"`, `aria-labelledby` to the title node, `aria-describedby` to the body.
- `Sheet` sets `role="dialog"`, `aria-modal="true"`, and (when present) `aria-labelledby`.
- `Toast` sets `role="status"` (info / success / update) or `role="alert"` (error) so screen readers announce it.
- `Banner` renders as an ARIA landmark region.
- `Tabs` follows the standard tabpanel pattern: `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`.

**Announcements:**
- Route change: no explicit `aria-live` announcement of new page titles (relies on `document.title` updates). Documented gap — see WEAKNESSES.md.
- Async success / error: toast handles it via `role="status"` / `role="alert"`.

## Touch targets

Minimum 44×44 CSS pixels for every interactive. Enforced by:
- `Button size="sm"` — 32px visible, 44px hit area via `fullWidth && max-md:h-[52px]` at mobile widths.
- `IconButton size="sm"` — 32px visible, 44px hit area via `::before -inset-1.5`.
- `Chip` — locked `h-8` (40px). **This is a documented shortfall vs the 44px target** — see WEAKNESSES.md. In practice compensated by `px-3` horizontal padding making the effective tap area larger.
- `Slider` thumb — 44px explicitly.
- All other primitives — 44px+ intrinsic.

Custom hit-area extension via `::before -inset-1.5` (12px extension = 32 + 12 = 44) is the standard trick where visual affordance and hit target diverge.

## Motion hazards

Two infinite loops exist:
1. `statusPulse` on the at-risk `StatusPill` dot — 2s opacity oscillation. Collapses to static under reduced motion.
2. `skeletonShimmer` on `Skeleton` — 1.4s linear gradient sweep. Collapses to static under reduced motion.

No parallax scroll effects. No confetti. No autoplay video (LoopingFrames is an opt-in demo pattern).

The `WaterGlass` sine-wave water fill (3.2s cycle) and droplet drop animation are the only continuous motion in the client-facing daily surfaces. Both skip under `useMotionSafe()`.

The Iridescence WebGL aurora (`AppBackground.tsx`) animates continuously in the app-background layer. It's a slow shader with no motion vestibular hazard, but for full transparency it does not currently freeze under reduced motion — see WEAKNESSES.md.

## Contrast for interactive states

- Hover: never changes text colour to something that fails AA. Chip hover lifts border thickness 1→2px (with 1px padding compensation to keep width stable) rather than swapping colour.
- Selected: chip / RadioRow / RadioTile use tone-tinted bg + tone-tinted border + tone-tinted text — never rely on colour alone. `Selected` also lifts the border weight and (for solid chip) fills the surface, so users who don't perceive colour differences still see the shape difference.
- Focus: 3px halo, distinct from hover.
- Disabled: `opacity-40` + `pointer-events-none`. Documented visual signal is opacity alone; users who don't perceive opacity differences can still perceive that the pointer cursor doesn't change to a pointer.

## Semantic HTML

- Buttons are `<button>` — never `<div role="button">` (unless a custom drag primitive requires it, e.g. the swipe row).
- Links are `<a>` or `react-router-dom`'s `<Link>` — never JavaScript click handlers pretending.
- Headings follow document outline: one `<h1>` per screen (typically the screen greeting or breadcrumb); subsequent sections use `<h2>`, `<h3>` from `text-h2`, `text-h3` primitives which render as their native tags.
- Lists (`<ul>`, `<ol>`) used for actual lists. `<dl>` for definition-style stat rows in a few places.
- Forms wrap fields in a `<form>` with `onSubmit`; primary action always renders as `<button type="submit">`.

## What Axe currently catches vs misses

**Catches (automated):**
- Missing alt text on `<img>`.
- Missing button accessible name.
- Colour contrast below AA (approximate).
- Duplicate IDs.
- Missing form labels.
- ARIA misuse.

**Misses (requires manual review):**
- Focus order coherence.
- Screen-reader announcement quality (does the meta really convey what the visual shows?).
- Keyboard-only workflow completability.
- Reduced-motion completeness (Axe doesn't test motion).
- Real-user usability (Axe is a machine).

Elevra has done spot-manual testing but not a full external audit.

## Known gaps (be honest, not defensive)

1. **Route-change announcements** — no `aria-live` polite announcement of the new page title. Screen reader users hear only the new focused element (usually the first focusable inside the new route). Fix: an `aria-live="polite"` node bound to `document.title` at the shell level. Not implemented.

2. **Chip touch target** — locked at 40px, not 44px. Compensated by generous horizontal padding but not sufficient for WCAG 2.5.5 (Target Size) at AAA. AA doesn't require 44px absolute so this passes AA.

3. **`textFaint` light-mode contrast** — 2.5:1 on `bg` `#F6F8FC`. Used for decorative captions. Passes AAA large-text contrast (3:1) if the text is ≥18pt, which is not always the case. Fix: bump `textFaint` deeper in light mode. High-contrast mode already promotes it to `textMuted`.

4. **Arrow-key nav on non-Segmented one-of-N** — RadioRow, RadioTile, and chip rows all fall through to Tab. Would benefit from arrow navigation. On backlog.

5. **PDF exports (jspdf)** — the generated PDFs are visual-only, no tagged accessibility structure. Users on assistive tech get raw text extraction, no headings / lists. Non-trivial to add; not currently on the roadmap.

6. **WebGL aurora doesn't freeze under reduced motion** — slow shader, low vestibular risk, but formally out of spec. Fix: pause the shader `requestAnimationFrame` loop when `useMotionSafe() === false`. On backlog.

7. **`aria-hidden` on decorative SVG** — mostly present but a spot-check would find gaps. The Icon primitive sets `aria-hidden` by default; the Illustration primitive too. Ad-hoc `<svg>` embedded in feature code is inconsistent.

8. **`aria-current` on TabBar** — active tab uses styling but doesn't set `aria-current="page"`. Fix: add it to the NavLink. Small change, on backlog.

9. **Language attribute** — `<html lang="en">` set statically in `index.html`. The app is single-language for now. When localisation ships, the `lang` attribute needs to swap.

10. **Skip-to-main-content link** — none. Users tabbing through must go through the entire header before reaching content. Fix: add a visually-hidden `<a href="#main-content" className="sr-only focus:not-sr-only">` at the shell top. On backlog.

## Testing

- `@axe-core/playwright` integrated into E2E specs. Runs against every route on every PR.
- Manual keyboard-only pass done on primary routes.
- Screen reader spot-tested with VoiceOver on macOS and iOS (Safari).
- No TalkBack testing (Android) currently.
- No JAWS / NVDA testing (Windows) currently.

## What the rebuild team should copy

- The three-layer reduced motion stack.
- The multi-axis preference system (contrast, motion, density, font).
- The `useFocusTrap` implementation.
- The global `:focus-visible` accent halo pattern.
- The requirement that IconButton's `ariaLabel` be non-optional at the type level.
- The Field / Textarea / Select owning focus chrome via `focus-within:` on the wrapper.
- The tabular numerals default on every metric.
- The empty-not-fallback treatment of every list.

## What the rebuild team should NOT copy

- The `textFaint` low-contrast light-mode value.
- The `Chip` 40px height (raise to 44px in a green-field build).
- The lack of route-change `aria-live` announcements.
- The lack of a skip-link.
- Ad-hoc `<svg>` in feature code without `aria-hidden`.
