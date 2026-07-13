# THEMING_ARCHITECTURE.md

How theming is implemented. Two orthogonal axes plus three user-preference axes, layered as CSS custom-property rewrites on the `<html>` element.

## Storage & resolution

`src/app/state/theme.ts` — a Zustand store persisted to `localStorage['elevra:theme']`. Three possible prefs:

```ts
export type ThemePref = 'system' | 'dark' | 'light';
```

Resolution logic (`theme.ts:36-42`):
```ts
export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref === 'dark' || pref === 'light') return pref;
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}
```

Default when no localStorage entry exists: `'dark'`.

## Application to the DOM

`useApplyTheme()` (`theme.ts:66-87`) mounts once at app root (`AppBootstrap.tsx`). On preference change and (when `pref === 'system'`) on `matchMedia('(prefers-color-scheme: light)')` change:

```ts
function applyResolvedTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}
```

Two channels are written in tandem:
1. `<html data-theme='dark'>` / `<html data-theme='light'>` — the CSS variable cascade in `src/index.css` is keyed on this attribute.
2. `<html class='dark'>` / removed — Tailwind's `dark:` variants (configured with `darkMode: 'class'` at `tailwind.config.ts:28`) key on this. This dual write was added after a runtime bug where CSS-var themes and Tailwind `dark:` utilities went out of sync (comment at `theme.ts:50-54`).

## Cold-boot script

`index.html` contains an inline script that reads `localStorage['elevra:theme']` before React mounts and stamps `data-theme` + `.dark` immediately, so the first paint is themed correctly. Without it, the page flashes dark for one frame before hydration.

## Skin axis (role)

Orthogonal to `data-theme`. Owns which brand-interactive colour leads.

Selector: `[data-skin='client']` (default: no attribute → coach).

`ClientShell.tsx` writes `data-skin='client'` on `<html>` on mount. `CoachShell.tsx` writes nothing (default cascade → cyan).

CSS at `src/index.css:268-304` overrides `--c-accent`, `--c-info`, `--g-brand`, `--g-hairline`, `--bg-ambient-1`, `--shadow-glow-accent`, `--focus-ring*`, `--badge-accent-*`. Every OTHER semantic role (warn, danger, positive, phases, charts) stays theme-driven.

Runtime cost: zero JS re-render. Adding `data-skin='client'` on `<html>` triggers a single CSS cascade rebuild.

**Dual selector pattern** (`src/index.css:268-269`):
```css
:root[data-skin='client'],
[data-skin='client'] { … }
```
The `:root[...]` selector is the production cascade (whole app). The bare `[data-skin='client']` selector lets `/dev/gallery` render coach + client side-by-side on the same page by scoping the attribute to a wrapper `<div>`.

## User-preference axes

Layered AFTER theme + skin so user picks override.

### `data-accent` (`src/index.css:322-399`)

Three choices: `cobalt` | `lime` | `purple`. Each rewrites `--c-accent`, `--c-info`, `--g-brand`, `--g-hairline`, `--bg-ambient-1`, `--shadow-glow-accent`, `--scroll-thumb-hover`, `--focus-ring*`, `--badge-accent-*`, `--c-glass-scroll-thumb*`.

Compound selectors handle light-mode variants: `:root[data-theme='light'][data-accent='cobalt'] { … }` for AA-safe tuning.

### `data-density` (`src/index.css:406-411`)

Three choices: `compact` (root `font-size: 15px`) / regular (default `16px`) / `spacious` (`17px`). Every rem-based utility scales proportionally.

Touch targets stay ≥44px because they use px-based min-heights, not rem.

### `data-font` (`src/index.css:419-421`)

One override: `data-font='dyslexia'` swaps body font to Atkinson Hyperlegible.

### `data-contrast` (`src/index.css:591-597`)

`data-contrast='high'` collapses `--c-border` onto `--c-border-strong`, `--c-text-muted` onto `--c-text`, `--c-text-faint` onto `--c-text-muted`, `--focus-ring*` onto solid `--c-accent`.

### `data-motion` (`src/index.css:551-584`)

`data-motion='reduce'` forces all animations to ~1ms + kills hover-scale transforms.
`data-motion='full'` overrides the OS `prefers-reduced-motion` for users who want animations even when the OS says off.
Absence honours the OS query.

## Full CSS cascade order

Rules in `src/index.css`, top to bottom (`:16-597`):

1. `:root, :root[data-theme='dark']` — dark theme baseline (all `--c-*`, `--g-*`, `--bg-ambient-*`, `--shadow-*`, glass, focus, skeleton, badge, brand marks). Also sets `color-scheme: dark`.
2. `:root[data-theme='light']` — light theme overrides EVERY key from block 1.
3. `[data-skin='client']` — skin deltas (dark theme).
4. `[data-theme='light'] [data-skin='client']` — skin deltas (light theme).
5. `[data-accent='cobalt']`, `[data-accent='lime']`, `[data-accent='purple']` — user accent (dark).
6. Light-mode accent variants — same three, compound with `[data-theme='light']`.
7. `[data-density='compact' | 'spacious']` — root font-size.
8. `[data-font='dyslexia']` — body font swap.
9. Base element styles (`html, body, #root` — see `src/index.css:424-473`).
10. `mark` reset, focus chrome, safe-area helpers, iOS long-press protection.
11. `[data-motion='reduce']` — animation neutralisation.
12. `[data-contrast='high']` — high-contrast overrides.
13. Scrollbar styles.

## Tailwind's role

Every colour utility resolves to `var(--c-*)`:
```ts
// tailwind.config.ts:31-62
colors: {
  bg: 'var(--c-bg)',
  bgElevated: 'var(--c-bg-elevated)',
  text: 'var(--c-text)',
  accent: 'var(--c-accent)',
  lime: 'var(--c-lime)',
  // etc.
}
```

Toggling `<html data-theme>` rewires every utility in one paint. No component knows it's in dark or light mode.

`darkMode: 'class'` is retained for the small number of components that need to author two branches directly (e.g. `dark:bg-black/40` in a legacy menu). Everywhere else, the CSS variable does the work.

## Consumers

- **Almost every component** uses Tailwind utilities (`bg-bgElevated`, `text-textMuted`). They inherit theming for free.
- **Sheet + glass surfaces** use `var(--c-glass-*)` directly in arbitrary Tailwind class syntax:
  ```tsx
  className="border-[var(--c-glass-row-border)] bg-[var(--c-glass-row-bg)]"
  ```
  This is necessary because Tailwind doesn't expose the glass tokens as utilities.
- **Chart libraries** (ECharts) receive resolved theme colours via a helper that reads `getComputedStyle(document.documentElement).getPropertyValue('--c-chart-1')` at chart-mount time.
- **Framer Motion configs** import `motionToken` from `design/tokens.ts` directly (TypeScript).
- **Meta tag `theme-color`** is set to `#111116` in the PWA manifest (`vite.config.ts:46`); does NOT swap with theme. iOS home-screen chrome always reads dark.

## Could a second palette + type scale drop in without touching component code?

**Yes for colour.** Every colour utility resolves to a CSS variable. Substituting a full palette means editing the seven blocks in `src/index.css` (dark, light, skin-client dark, skin-client light, three accent user overrides, high-contrast). Component code doesn't change.

**Partially for type.** The Tailwind type scale is baked at build time from `design/tokens.ts:201-214` into utility classes (`text-h1`, `text-body`, `text-eyebrow`, etc.). Swapping sizes means editing tokens.ts and re-running `vite build`. Runtime is impossible without a shipping change.

Type family is easier — `data-font='dyslexia'` proves the axis works. A wholesale swap of the display + body families follows the same pattern; add a new `data-font='rebrand'` block or edit `body { font-family }` at `src/index.css:460`.

Line-height / letter-spacing per style: same as sizes — build-time via tokens.ts.

**Constraints on a rebrand:**
- Any component that inline-embeds `var(--c-accent)` in an SVG `<stop>` or motion.animate keyframe (e.g. `HabitsHero.tsx:235-237` hard-codes `#A8FF60` in an SVG gradient) will NOT pick up the new palette. There are ~10 such sites — see the `HARDCODED STYLE BYPASSES` section of `DESIGN_TOKENS.md`.
- Chart series colours (`chart1`..`chart5`) are read via `getComputedStyle` at chart-mount time. Charts that mount once and never remount will NOT re-read them until the next mount. Refreshing a chart-heavy screen post-theme-change fixes it.
- The Elevra brand marks (`#CDB88A`, `#F4F0E8`, `#0B0B0F` at `src/index.css:121-124` and `:243-246`) are named `--elevra-*`. A rebrand would need to swap these too — but the current setup treats them as sacred rather than themeable. This is the largest blocker to a pure token swap.

## Blockers to a wholesale visual rebrand (concrete list)

1. Hex literals inside SVG components. Fix: read tokens via CSS variables in `<stop>` (`stop-color="var(--c-lime)"` works). Cost: touch ~10 files.
2. Chart mount-time colour read. Fix: use a token subscription hook. Cost: modest.
3. Elevra brand marks — currently authored as their own `--elevra-*` variables, decoupled from the theme tokens by name. Rebrand needs to edit these two `<:root>` blocks explicitly.
4. Manifest theme-colour is a build-time constant (`vite.config.ts:46`). Rebrand rebuilds the PWA.
5. Illustration components (`src/components/ui/Illustration.tsx` and neighbours) may embed brand hues. Not exhaustively audited here.

For the rebuild team: a green-field replacement gets to solve #1 by using CSS variables in SVG from day one and #2 by using a chart lib that observes CSS var changes. The current pattern is retro-fittable but takes a day.
