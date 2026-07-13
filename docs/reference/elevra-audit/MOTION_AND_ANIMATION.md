# MOTION_AND_ANIMATION.md

Every animation in Elevra is a named choreography from `src/lib/motion.ts` or a keyframe from `tailwind.config.ts`. There are no inline transition configs anywhere in application code — the lint expectation is that a component imports its motion, never invents it.

## Sources of truth

1. `design/tokens.ts` — duration + spring + easing tokens (`motionToken`).
2. `src/lib/motion.ts` — Framer Motion `Variants` and `Transition` objects that consume those tokens. Named choreographies.
3. `tailwind.config.ts:113-140` — two CSS keyframes (`breath`, `voice-playhead`).
4. `src/index.css:551-584` — reduced-motion overrides.
5. `src/app/App.tsx` — `<MotionConfig reducedMotion="user">` wraps the app so Framer Motion collapses variants to instant when the user (or `data-motion='reduce'`) requests it.

## Duration tokens

From `design/tokens.ts:269-281`:

```ts
motionToken = {
  instant: 120,   // ms — micro-interactions where any duration is a nuisance
  fast:    200,   // ms — hover states, chip flips
  base:    280,   // ms — default fade + slide
  slow:    360,   // ms — used when `base` reads too quick
  drawn:   700,   // ms — ring fills, chart draws, hero reveals
  staggerChildren: 0.05,   // seconds
  staggerDelay:    0.04,   // seconds
}
```

**No duration ever appears in component code except by referencing `motionToken.<name>`.** Anything else is a bug.

## Spring tokens

```ts
springSnappy: { type: 'spring', stiffness: 420, damping: 32 },
springSheet:  { type: 'spring', stiffness: 320, damping: 34 },
springGentle: { type: 'spring', stiffness: 220, damping: 28 },
```

- **`springSnappy`** — buttons, chips, tab-bar icons, toasts, pressable feedback. The default "feels responsive" spring.
- **`springSheet`** — bottom sheets, drawers, floating popovers arriving from a rest position. Slightly slower than `springSnappy` so the sheet feels heavier.
- **`springGentle`** — cards settling into place, list items on reorder, drag-and-drop drop feedback. Calmer overshoot.

Empirically these translate to roughly:
- `springSnappy` → visible settle in ~180–220ms with negligible overshoot.
- `springSheet` → ~250–320ms.
- `springGentle` → ~350–420ms with a subtle overshoot (~4% past target on the way in).

## Easing tokens

```ts
easeOut:   [0.16, 1, 0.3, 1],   // cubic bezier — expo-out, aggressive tail
easeInOut: [0.65, 0, 0.35, 1],  // symmetric ease-in-out
```

Non-spring transitions (fades, chart draws, backdrop opacity) use `easeOut`. There is no linear easing anywhere — even the skeleton shimmer uses `'linear'` explicitly (`motion.ts:165`), the exception that proves the rule.

## Named choreographies (`src/lib/motion.ts`)

### `screenEnter` — route transitions

Full block:
```ts
export const screenEnter: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: easeOut,
      staggerChildren: 0.08,
    },
  },
  exit: { opacity: 0, transition: { duration: fast / 1000, ease: easeOut } },
};
```

Every route root wraps its content in `<motion.div variants={screenEnter} initial="initial" animate="animate" exit="exit">`. Duration: 200ms fade + 80ms stagger between direct children.

Why the parent fades but the children don't: cards use `backdrop-filter: blur(…)` in their glass background. Fading a blurred layer causes the compositor to snapshot the blur, then interpolate the whole flat bitmap — which momentarily flat-shades the frost. The parent fade covers this: children stay at `opacity: 1` throughout.

### `cardEnter` — per-card cascade

```ts
export const cardEnter: Variants = {
  initial: { y: 24 },
  animate: {
    y: 0,
    transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] },
  },
};
```

Y-only translation over **1000ms** with an expo-out curve, cascading via the parent's `staggerChildren: 0.08`. Reads as cards rising into place from below.

### `cardEnterPlus` — paired hero cards

Identical to `cardEnter` plus `delay: 0.07`. Used for the second card in a horizontal pair (e.g. today-hero + streak-hero on desktop) so it lands ~70ms after the first — the human eye perceives them as related but distinct.

### `sheetMotion` + `backdropMotion`

```ts
sheetMotion: {
  initial: { y: '100%' },
  animate: { y: 0, transition: springSheet },  // stiffness 320, damping 34
  exit:    { y: '100%', transition: { duration: base / 1000, ease: easeOut } },
}
backdropMotion: {
  initial: { opacity: 0 },
  animate: { opacity: 0.6, transition: { duration: fast / 1000 } },
  exit:    { opacity: 0, transition: { duration: fast / 1000 } },
}
```

Backdrop opacity peak: **0.6** (60% black). Sheet enters with a spring, exits with a linear 280ms slide — springs on exit "chase" the finger and read as sticky.

### `modalMotion` — centered dialogs

```ts
{ initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { duration: fast / 1000, ease: easeOut } },
  exit:    { opacity: 0, scale: 0.96, transition: { duration: fast / 1000, ease: easeOut } } }
```

Scale 96% → 100% + fade over 200ms. No spring — spring on a modal feels bouncy in a way that mismatches the "settled surface" intent.

### `listContainer` + `listItem` — inline lists

```ts
listContainer: { animate: { transition: { staggerChildren: 0.04 } } }
listItem:      { initial: { opacity: 0, y: 8 },
                 animate: { opacity: 1, y: 0, transition: springGentle } }
```

Used for any list that appears after data loads (roster, food log, sessions, alerts). Cap: caller slices the first N items and applies the variant only to those — beyond ~12 items the stagger runs off the screen edge, so remaining items appear without animation.

### `pressable` — tap feedback

```ts
export const pressable = {
  whileTap: { scale: 0.97 },
  transition: springSnappy as Transition,
};
```

Any pressable primitive (Button, IconButton, Chip, ListRow, ExerciseCard) spreads `{...pressable}` onto the underlying `motion.div`. Scale to 97% with springSnappy return.

### `tabIconSpring` + `tabScreenCrossfade`

```ts
tabIconSpring: springSnappy;
tabScreenCrossfade: {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: instant / 1000 } },   // 120ms
  exit:    { opacity: 0, transition: { duration: instant / 1000 } },
}
```

Tab-bar icon interpolates size + color via springSnappy. Route change under tab-bar uses a 120ms crossfade so the change doesn't feel like a full page load.

### `drawTransition` — ring fills, chart draws

```ts
{ duration: drawn / 1000, ease: easeOut }   // 700ms expo-out
```

`ProgressRing`, `PhaseRing`, ECharts entry animation, hero streak flame reveal. Deliberately slow enough that the eye reads it as "value going up" rather than a snap-fill.

### `toastMotion`

```ts
{ initial: { opacity: 0, y: -16 },
  animate: { opacity: 1, y: 0, transition: springSnappy },
  exit:    { opacity: 0, y: -16, transition: { duration: fast / 1000, ease: easeOut } } }
```

Toasts drop 16px on entry (spring) and lift 16px on exit (linear 200ms).

### `statusPulse` — at-risk indicator

```ts
{ animate: { opacity: [1, 0.4, 1], transition: { duration: 2, repeat: Infinity, ease: easeOut } } }
```

The `PulseDot` primitive uses this — 2s loop between full opacity and 40%. `<MotionConfig reducedMotion>` freezes it to a static dot when reduced motion is on. Only two infinite loops exist in the app: this and `skeletonShimmer`.

### `skeletonShimmer`

```ts
{ animate: {
    backgroundPosition: ['0% 0%', '100% 0%'],
    transition: { duration: 1.4, repeat: Infinity, ease: 'linear' },
} }
```

Applied to the `Skeleton` primitive. A linear-gradient sweeps across the surface every 1.4s. `MotionConfig` collapses it to a static frosted rectangle under reduced motion.

## CSS keyframes (`tailwind.config.ts:113-140`)

Two CSS keyframes exist alongside the Framer library:

### `breath`
```css
@keyframes breath {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(174,240,119,0.15), 0 0 6px 0 rgba(174,240,119,0.25);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(174,240,119,0.05), 0 0 18px 2px rgba(174,240,119,0.4);
  }
}
/* animation: breath 2.4s ease-in-out infinite */
```

Hero-CTA breathing glow (2.4s loop). Meant to invite, not demand.

### `voice-playhead`
```css
@keyframes voice-playhead {
  0%, 100% { transform: scaleY(1); }
  50%      { transform: scaleY(1.4); }
}
/* animation: voice-playhead 0.5s ease-in-out infinite */
```

Applied to the single audio bar at the current play position while a voice note is playing. Reason (per comment): during playback of short notes the fill boundary barely advances between frames, so the bar height pulse gives the "audio is live" signal without depending on the boundary.

## Reduced motion

Three layers cooperate:

1. **CSS reduce** (`src/index.css:551-584`) — when `<html data-motion='reduce'>`, all transitions/animations are forced to `0.01ms` and hover-scale transforms are neutralised. This is the CSS-only fallback for elements that don't route through Framer.
2. **MotionConfig** — `<MotionConfig reducedMotion="user">` in `App.tsx` tells Framer Motion to interpret the OS media query (and any `document.documentElement` override) and collapse variants to instant fades. The infinite loops (`statusPulse`, `skeletonShimmer`) collapse to a static state.
3. **`useMotionSafe()`** hook — for JS-driven motion (e.g. imperative timelines in `LoopingFrames`), components read this to decide whether to run the timeline at all.

Full reduced-motion CSS block:
```css
[data-motion='reduce'] *,
[data-motion='reduce'] *::before,
[data-motion='reduce'] *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}
[data-motion='reduce'] .hover\:scale-\[1\.02\]:hover,
[data-motion='reduce'] .hover\:scale-\[1\.03\]:hover,
[data-motion='reduce'] .hover\:scale-\[1\.05\]:hover {
  transform: none !important;
}
```

## Overriding OS reduced-motion

`data-motion='full'` on `<html>` OVERRIDES `prefers-reduced-motion: reduce` — the app opts back into animation for users who want it. This is exposed via a settings toggle in `MeScreen`. `data-motion` absent → follow the OS.

## Motion for specific patterns

- **Route change:** parent fade 200ms + child cascade 1000ms rise (screenEnter + cardEnter).
- **Tab switch:** crossfade 120ms.
- **Bottom sheet open:** backdrop fade 200ms (to 0.6 opacity) + sheet spring (~280ms).
- **Modal open:** scale + fade 200ms.
- **Button/chip press:** scale 0.97 via springSnappy.
- **Success confirmation:** toast drops 16px (spring, ~200ms).
- **List reveal:** items fade + 8px rise, 40ms stagger, spring-gentle.
- **Ring/chart draw:** 700ms expo-out.
- **Hero streak flame reveal:** `drawTransition` + a canvas-based looping sequence via `LoopingFrames`.
- **Voice-note playback:** playhead bar pulses (0.5s CSS loop). Non-playhead bars stay static.
- **At-risk chip:** pulses opacity 1 → 0.4 → 1 every 2s.

## Motion for gestures

- **Pull-to-refresh** (`PullToRefresh.tsx`): rubber-band spring on overpull, spring-in of the loading indicator, spring-back on release.
- **SwipeAction** (`SwipeAction.tsx`): finger-tracking translateX with springSnappy on release. Snap points at 0, threshold (60px), and full-width. Haptic ping fires at threshold on iOS via `navigator.vibrate(10)` when supported.
- **LongPress**: 500ms delay (`src/lib/useLongPress.ts`), haptic ping on trigger.

## Motion NOT to use

The following patterns are intentionally absent and considered anti-patterns in this codebase:

- Bouncy springs (stiffness < 200 with damping < 20) — cutesy, mismatches the tone.
- Linear tweens on visible UI — used only for the skeleton shimmer.
- Animation over 1500ms except the two intentional infinite loops.
- Parallax on scroll.
- Confetti / celebration animations (a StreakFlame reveal is the closest we get).

## Framer Motion version constraints

`framer-motion 11.2.6`. `Variants` type imported directly. `<MotionConfig>` used for global settings. `LayoutGroup`, `AnimatePresence`, and `layout` prop used sparingly — mainly around list reorder in the coach roster and the check-in inbox.

## Testing motion

- Vitest `motion.test` covers the `useMotionSafe` hook via `matchMedia` mocks.
- Playwright uses `axe-core` for a11y; motion-specific tests are not currently in the suite (see WEAKNESSES.md).
