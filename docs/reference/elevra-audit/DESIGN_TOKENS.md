# DESIGN_TOKENS.md

Every token consumed by the app. Two sources of truth kept in lockstep: `design/tokens.ts` (TypeScript, imported by `tailwind.config.ts` + selected components) and `src/index.css` (CSS custom properties, the runtime shape).

Law from `design/tokens.ts:3`: *"no color, spacing, radius, shadow, duration or easing exists outside this file."*

## 1. Colours — dark theme (default)

Source: `design/tokens.ts:8-46`, mirrored in `src/index.css:17-127`.

| Semantic name | Token key | Hex / RGBA | Usage |
|---|---|---|---|
| Page background | `bg` | `#0A0E17` | body / html paint. |
| Elevated section | `bgElevated` | `#121826` | tab bar, sheet chrome, cards on background. |
| Sunken well | `bgSunken` | `#070A10` | chart wells, recessed insets. |
| Frosted surface | `surface` | `rgba(255,255,255,0.04)` | translucent card interior. |
| Surface hover | `surfaceHover` | `rgba(255,255,255,0.07)` | row hover. |
| Surface active | `surfaceActive` | `rgba(255,255,255,0.10)` | row pressed. |
| Hairline | `border` | `rgba(255,255,255,0.08)` | card outlines, dividers. |
| Strong hairline | `borderStrong` | `rgba(255,255,255,0.16)` | high-contrast borders. |
| Text | `text` | `#F4F7FB` | primary body copy. |
| Muted text | `textMuted` | `#8A97AC` | secondary copy, labels. |
| Faint text | `textFaint` | `#5C6778` | placeholders, disabled. |
| Text on accent | `textOnAccent` | `#06121A` | for text painted over accent-fill. |
| Accent | `accent` | `#38E1FF` | cyan — primary actions, links, focus. |
| Accent blue | `accentBlue` | `#5B8CFF` | brand gradient stop. |
| Lime | `lime` | `#A8FF60` | success / on-track. |
| Sky | `sky` | `#5FB4F7` | cool data (hunger, sleep). |
| Positive status | `positive` | `#A8FF60` | same hex as lime. |
| Warn status | `warn` | `#FFC24B` | amber, needs review. |
| Danger status | `danger` | `#FF6B7A` | rose, destructive. |
| Info | `info` | `#38E1FF` | same as accent. |
| Chart 1 | `chart1` | `#38E1FF` | series 1. |
| Chart 2 | `chart2` | `#A8FF60` | series 2. |
| Chart 3 | `chart3` | `#5B8CFF` | series 3. |
| Chart 4 | `chart4` | `#FFC24B` | series 4. |
| Chart 5 | `chart5` | `#C792EA` | series 5. |
| Purple accent | `purple` | `#B383FF` | (index.css only — not in tokens.ts). |
| Phase menstrual | `phaseMenstrual` | `#F36A75` (index.css) / `#FF8FA3` (tokens.ts, superseded) | cycle-menstrual band. |
| Phase follicular | `phaseFollicular` | `#B393FF` (index.css) / `#7BD8C2` (tokens.ts, superseded) | cycle-follicular band. |
| Phase ovulation | `phaseOvulation` | `#9ADF6B` (index.css) / `#FFD479` (tokens.ts, superseded) | cycle-ovulation band. |
| Phase luteal | `phaseLuteal` | `#F5A46B` (index.css) / `#9BA7FF` (tokens.ts, superseded) | cycle-luteal band. |

**Drift note:** Cycle phase hexes in `design/tokens.ts` (lines 44-45) do NOT match `src/index.css:50-53`. The CSS wins at runtime. See `WEAKNESSES.md`.

## 2. Colours — light theme

Source: `design/tokens.ts:71-106`, `src/index.css:130-249`.

| Semantic name | Hex / RGBA |
|---|---|
| `bg` | `#F6F8FC` |
| `bgElevated` | `#FFFFFF` |
| `bgSunken` | `#EDF1F8` |
| `surface` | `rgba(15,26,46,0.03)` |
| `surfaceHover` | `rgba(15,26,46,0.05)` |
| `surfaceActive` | `rgba(15,26,46,0.08)` |
| `border` | `rgba(15,26,46,0.08)` |
| `borderStrong` | `rgba(15,26,46,0.14)` |
| `text` | `#0F1A2E` |
| `textMuted` | `#5A6478` |
| `textFaint` | `#A0AAC0` |
| `textOnAccent` | `#FFFFFF` |
| `accent` | `#3D7DF7` |
| `accentBlue` | `#6D8FFF` |
| `lime` | `#3D9C5F` |
| `sky` | `#4A9BD8` |
| `positive` | `#3D9C5F` |
| `warn` | `#D08A2E` |
| `danger` | `#E74C5E` |
| `info` | `#3D7DF7` |
| `chart1` | `#3D7DF7` |
| `chart2` | `#3D9C5F` |
| `chart3` | `#7E66E0` |
| `chart4` | `#D08A2E` |
| `chart5` | `#7E66E0` |
| `purple` | `#7A4EE0` |
| `phaseMenstrual` | `#DB4D5A` |
| `phaseFollicular` | `#7A4EE0` |
| `phaseOvulation` | `#6BB547` |
| `phaseLuteal` | `#D68448` |

## 3. Colour skin — client (dark theme deltas)

Source: `design/tokens.ts:136-139`, `src/index.css:268-281`.

Applied via `[data-skin='client']` on `<html>`. Only the two brand-interactive keys shift; every other role stays theme-driven.

- `accent`: `#A8FF60` (lime, replaces cyan)
- `info`: `#A8FF60`
- `--g-brand`: `linear-gradient(135deg, #A8FF60 0%, #38E1FF 100%)`
- `--g-hairline`: `linear-gradient(90deg, rgba(168,255,96,0.6), rgba(56,225,255,0.2))`
- `--shadow-glow-accent`: `0 0 24px rgba(168,255,96,0.25)`
- `--focus-ring`: `rgba(168,255,96,0.30)`
- `--focus-ring-soft`: `rgba(168,255,96,0.25)`
- `--badge-accent-bg`: `rgba(168,255,96,0.18)`
- `--badge-accent-fg`: `#A8FF60`

## 4. Colour skin — client (light theme deltas)

Source: `design/tokens.ts:150-154`, `src/index.css:283-304`.

- `accent`: `#3D9C5F`
- `info`: `#3D9C5F`
- `textOnAccent`: `#0F1A2E` (ink, not white — required for AA on the green)
- `--g-brand`: `linear-gradient(135deg, #63C284 0%, #7BA4FF 100%)`
- `--shadow-glow-accent`: `0 0 24px rgba(61,156,95,0.18)`
- `--badge-accent-bg`: `#E3F3EA`, `--badge-accent-fg`: `#2F8A4F`

## 5. Accent user override

Source: `src/index.css:322-399`. Three optional overrides via `<html data-accent='...'>`:

**Cobalt (dark):** accent `#5B8CFF`. **Cobalt (light):** accent `#3D7DF7`.
**Lime (dark):** accent `#A8FF60`, textOnAccent `#0F1A14`. **Lime (light):** `#3D9C5F` + ink.
**Purple (dark):** accent `#B383FF`. **Purple (light):** `#7C4FD6`.

Each override redefines `--c-accent`, `--c-info`, `--g-brand`, `--g-hairline`, `--bg-ambient-1`, `--shadow-glow-accent`, `--scroll-thumb-hover`, `--focus-ring*`, `--badge-accent-*`, `--c-glass-scroll-thumb*`.

## 6. Icon-badge palette

Source: `src/index.css:104-119` (dark), `:227-240` (light).

Dark tokens are RGBA tints. Light tokens are solid pastel hexes.

| Tone | Dark bg / fg | Light bg / fg |
|---|---|---|
| accent | `rgba(56,225,255,0.15)` / `var(--c-accent)` | `#E8F0FF` / `#3D7DF7` |
| lime | `rgba(168,255,96,0.15)` / `var(--c-lime)` | `#E3F3EA` / `#2F8A4F` |
| brand | `rgba(91,140,255,0.15)` / `var(--c-accent-blue)` | `#ECE7FB` / `#7E66E0` |
| warn | `rgba(255,194,75,0.15)` / `var(--c-warn)` | `#FBEEDE` / `#B46F1F` |
| danger | `rgba(255,107,122,0.15)` / `var(--c-danger)` | `#FBE1E4` / `#C6354B` |
| purple | `rgba(179,131,255,0.18)` / `var(--c-purple)` | `#EFE6FB` / `#5C3DAA` |
| sky | `rgba(95,180,247,0.15)` / `var(--c-sky)` | `#E3F0FA` / `#2E78B0` |

## 7. Gradients

Source: `design/tokens.ts:108-192`, `src/index.css:56-59` (dark), `:167-178` (light).

| Token | Dark value | Light value |
|---|---|---|
| `--g-brand` | `linear-gradient(135deg, #38E1FF 0%, #5B8CFF 100%)` | `linear-gradient(135deg, #7BA4FF 0%, #A3C1FF 100%)` |
| `--g-hairline` | `linear-gradient(90deg, rgba(56,225,255,0.6), rgba(91,140,255,0.2))` | `linear-gradient(90deg, rgba(61,125,247,0.55), rgba(109,143,255,0.18))` |
| `--g-glow-cyan` | `radial-gradient(circle, rgba(56,225,255,0.10) 0%, transparent 70%)` | `radial-gradient(circle, rgba(61,125,247,0.06) 0%, transparent 70%)` |
| `--g-glow-lime` | `radial-gradient(circle, rgba(168,255,96,0.07) 0%, transparent 70%)` | `radial-gradient(circle, rgba(61,156,95,0.04) 0%, transparent 70%)` |

## 8. Ambient body wash

Source: `src/index.css:61-68` (dark), `:180-187` (light).

Painted on `<html>`. Multiple radial blobs composed via `background-image:` (see `src/index.css:441-445`).

**Dark:**
```
--bg-ambient-1: radial-gradient(60% 40% at 15% 10%, rgba(56,225,255,0.08), transparent 70%);
--bg-ambient-2: radial-gradient(50% 35% at 85% 90%, rgba(168,255,96,0.05), transparent 70%);
--bg-ambient-3: (no-op)
--bg-ambient-4: (no-op)
```

**Light (Apple-Bento 4-blob):**
```
--bg-ambient-1: radial-gradient(75% 55% at 8% 6%,  rgba(255,188,168,0.28), transparent 72%);
--bg-ambient-2: radial-gradient(70% 50% at 92% 12%, rgba(196,180,255,0.26), transparent 72%);
--bg-ambient-3: radial-gradient(85% 60% at 50% 96%, rgba(255,208,176,0.30), transparent 75%);
--bg-ambient-4: radial-gradient(40% 28% at 50% -4%, rgba(56,225,255,0.16), transparent 70%);
```

Plus a WebGL Iridescence layer on top for dark theme (`src/components/decor/AppBackground.tsx`). Null in light theme.

## 9. Sheet / glass tokens

Source: `src/index.css:80-94` (dark), `:200-213` (light).

Dark:
```
--c-glass-panel-bg:      rgba(10,14,23,0.80);
--c-glass-fade-from:     rgba(10,14,23,1);
--c-glass-fade-mid:      rgba(10,14,23,0.55);
--c-glass-backdrop:      rgba(10,14,23,0.65);
--c-glass-row-bg:        rgba(255,255,255,0.04);
--c-glass-row-bg-hover:  rgba(255,255,255,0.08);
--c-glass-row-border:    rgba(255,255,255,0.08);
--c-glass-scroll-thumb:        rgba(56,225,255,0.28);
--c-glass-scroll-thumb-hover:  rgba(56,225,255,0.55);
--c-glass-scroll-thumb-active: rgba(56,225,255,0.75);
```

Light:
```
--c-glass-panel-bg:      #FFFFFF;      (solid — the iOS "light glass" pattern)
--c-glass-fade-from:     #FFFFFF;
--c-glass-fade-mid:      rgba(255,255,255,0.55);
--c-glass-backdrop:      rgba(15,26,46,0.28);
--c-glass-row-bg:        rgba(15,26,46,0.03);
--c-glass-row-bg-hover:  rgba(15,26,46,0.06);
--c-glass-row-border:    rgba(15,26,46,0.08);
--c-glass-scroll-thumb:        rgba(61,125,247,0.32);
--c-glass-scroll-thumb-hover:  rgba(61,125,247,0.55);
--c-glass-scroll-thumb-active: rgba(61,125,247,0.75);
```

## 10. Focus ring tokens

Source: `src/index.css:96-98` (dark), `:215-217` (light).

Dark: `--focus-ring: rgba(56,225,255,0.20)`, `--focus-ring-soft: rgba(56,225,255,0.18)`.
Light: `--focus-ring: rgba(61,125,247,0.28)`, `--focus-ring-soft: rgba(61,125,247,0.20)`.

Applied globally via `src/index.css:529-532`:
```css
:where(button, a, [role='button'], [tabindex]):focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--focus-ring, rgba(56,225,255,0.20));
}
```

## 11. Skeleton shimmer

`--skeleton-from` / `--skeleton-via`. Dark: white 4% / 12%. Light: ink 4% / 10%.

## 12. Shadows

Source: `design/tokens.ts:229-262`, `src/index.css:70-74` (dark), `:189-193` (light).

| Token | Dark | Light |
|---|---|---|
| `--shadow-card` | `0 2px 12px rgba(0,0,0,0.35)` | `0 1px 2px rgba(15,26,46,0.04), 0 8px 24px rgba(15,26,46,0.06)` |
| `--shadow-raised` | `0 8px 28px rgba(0,0,0,0.45)` | `0 4px 16px rgba(15,26,46,0.06), 0 24px 48px rgba(15,26,46,0.10)` |
| `--shadow-glow-accent` | `0 0 24px rgba(56,225,255,0.25)` | `0 0 24px rgba(61,125,247,0.18)` |
| `--shadow-glow-lime` | `0 0 24px rgba(168,255,96,0.22)` | `0 0 24px rgba(61,156,95,0.18)` |

## 13. Spacing scale (4pt base)

Source: `design/tokens.ts:216-223`. Consumed by Tailwind at `tailwind.config.ts:13-20`.

| Step | Pixels |
|---|---|
| `0` | 0 |
| `1` | 4 |
| `2` | 8 |
| `3` | 12 |
| `4` | 16 |
| `5` | 20 |
| `6` | 24 |
| `7` | 32 |
| `8` | 40 |
| `9` | 48 |
| `10` | 64 |
| `11` | 80 |

**Non-standard project convention:** `h-8` = 40px, `h-10` = 64px, `h-11` = 80px. These OVERRIDE Tailwind's defaults (32, 40, 44). Consumers use arbitrary values (`h-[32px]`, `h-[44px]`) for canonical rendered sizes. See `src/components/ui/Button.tsx:75-81` for the canonical acknowledgement.

Special semantic aliases:
- `screenX` = 20px (horizontal screen padding — phone)
- `sectionGap` = 28px (vertical gap between screen sections)
- `cardPad` = 16px
- `tabBar` = 64px (+ safe-area inset)

## 14. Border radii

Source: `design/tokens.ts:225-227`.

| Token | Pixels |
|---|---|
| `sm` | 8 |
| `md` | 12 |
| `lg` | 16 |
| `xl` | 20 |
| `sheet` | 24 |
| `pill` | 999 |

## 15. Type scale

Source: `design/tokens.ts:201-214`. Each entry is `[size (px), line-height (multiplier), letter-spacing]`.

| Token | Size | Line-height | Letter-spacing | Weight (default) |
|---|---|---|---|---|
| `display` | 34 | 1.15 | -0.02em | 700 |
| `h1` | 26 | 1.2 | -0.02em | 700 |
| `h2` | 21 | 1.25 | -0.01em | 600 |
| `h3` | 17 | 1.3 | -0.01em | 600 |
| `body` | 15 | 1.55 | 0 | 400 |
| `input` | 16 | 1.5 | 0 | 400 (iOS zoom floor) |
| `small` | 13 | 1.45 | 0 | 400 |
| `micro` | 11 | 1.35 | 0.02em | 500 |
| `eyebrow` | 11 | 1.2 | 0.12em | 600 (UPPERCASE) |

## 16. Font families

Source: `design/tokens.ts:194-199`, `tailwind.config.ts:63-67`.

- `font-display`: `'Inter Tight', 'Inter', system-ui, sans-serif`
- `font-body`: `'Inter', system-ui, sans-serif`
- `font-handwriting`: `'Caveat', 'Marker Felt', 'Comic Sans MS', cursive`
- Optional a11y swap: `'Atkinson Hyperlegible', 'Inter', system-ui, sans-serif` when `data-font='dyslexia'`.

Numerals: `font-variant-numeric: tabular-nums` applied via `.tabular` / `[data-numeric]` selector at `src/index.css:506-509`. Every displayed metric uses this.

## 17. Density (font-size root scaling)

Source: `src/index.css:406-411`.
- `data-density='compact'` → `font-size: 15px` on `:root`
- default → `16px` (Tailwind default)
- `data-density='spacious'` → `font-size: 17px`

## 18. Opacity values (recurring)

Not centralised as tokens; inline. Notable recurring values:
- Row disabled: `opacity: 0.80` (see `src/features/today/HabitRow.tsx:341`)
- Done+non-numeric row: `opacity-80`
- Chip un-selected: `opacity: 0.7`-ish via muted fg tokens.

## 19. Z-index scale

Source: `tailwind.config.ts:89-112`, `design/tokens.ts:264-267`.

| Token | z-index |
|---|---|
| `base` | 0 |
| `raised` | 10 |
| `header` | 20 |
| `tabBar` | 30 |
| `popover` | 35 |
| `sheet` | 40 |
| `popoverElevated` | 45 |
| `modal` | 50 |
| `toast` | 60 |
| `installCoach` | 70 |

The `tokens.ts` version is missing `popover` / `popoverElevated`; the Tailwind config extends it.

## 20. Breakpoints

Source: `design/tokens.ts:283`, `tailwind.config.ts:83-88`.

| Token | Pixels |
|---|---|
| `sm` | 360 |
| `md` | 600 |
| `lg` | 900 |
| `xl` | 1200 |

**Non-standard:** These are NOT Tailwind's defaults (640/768/1024/1280). Any consumer using `md:` expecting 768 will be wrong. Every component in this codebase respects the override.

## 21. Motion tokens

Source: `design/tokens.ts:269-281`. See `MOTION_AND_ANIMATION.md` for full detail.

- Durations (ms): `instant: 120`, `fast: 200`, `base: 280`, `slow: 360`, `drawn: 700`.
- Springs (Framer Motion): `springSnappy: { stiffness: 420, damping: 32 }`, `springSheet: { 320, 34 }`, `springGentle: { 220, 28 }`.
- Easings: `easeOut: [0.16, 1, 0.3, 1]`, `easeInOut: [0.65, 0, 0.35, 1]`.
- Stagger: `staggerChildren: 0.05`, `staggerDelay: 0.04`.

## 22. Status-colour semantic map

Source: `design/tokens.ts:286-288`.

```ts
statusColor = {
  onTrack: color.positive,   // #A8FF60 dark / #3D9C5F light
  quiet:   color.warn,       // #FFC24B / #D08A2E
  atRisk:  color.danger,     // #FF6B7A / #E74C5E
}
```

## 23. Tailwind keyframes / animations

Source: `tailwind.config.ts:113-140`.

- `breath` (2.4s ease-in-out infinite) — lime box-shadow pulse on hero CTAs.
- `voice-playhead` (0.5s ease-in-out infinite) — vertical scaleY 1 → 1.4 on the playing voice-note bar.

## 24. Hardcoded style bypasses

The following values recur in-code and are NOT read from the token export. All are runtime hex/rgba literals used inline. Fixing them would require adding a token; the team knowingly did not.

| File | Line | Value | Purpose |
|---|---|---|---|
| `src/components/ui/WaterGlass.tsx` | 43 | `#4EA8DE` | Water-blue. Comment says "Kept out of the design tokens because it's specific to this primitive; if we ever add another water/hydration surface we promote it to `--c-water`." |
| `src/features/today/HabitRow.tsx` | 199 | `#4EA8DE` cyan tint | Habit-badge cyan tone (client-side icon library). |
| `src/features/today/HabitRow.tsx` | 200 | `#C084FC` | Purple tone. |
| `src/features/today/HabitRow.tsx` | 201 | `#FB923C` | Orange tone. |
| `src/features/today/HabitsSuggestionCard.tsx` | 41-79 | RGBA/hex literals for cyan/lime/purple/orange | Suggestion card tones (matching HabitRow tones). |
| `src/features/today/HabitsHero.tsx` | 235-237 | `#A8FF60`, `#4EA8DE` | Ring gradient stops. |
| `src/features/today/HabitsAmbientFooter.tsx` | 45-49 | `#A8FF60`, `#C084FC` | Light-trail gradient stops. |
| `src/features/today/IntakeRefreshBanner.tsx` | (in `border-accent/40 bg-accent/12`) | via CSS variables — tokenised. |
| `src/lib/compute/alerts.ts` | — | (no hex literals in code) |
| `src/features/coach/alerts/alertPlaybooks.ts` | — | no hex — pure copy. |
| `src/features/today/IntakeRefreshSheet.tsx` | — | no hex. |
| `src/index.css` | 121-124 | `#CDB88A`, `#F4F0E8`, `#0B0B0F` | Elevra brand marks (dark). |
| `src/index.css` | 243-246 | `#0B0B0F`, `#8d8580`, `#F4F0E8` | Elevra brand marks (light). |
| `src/features/wellbeing/PulseSlider.tsx` | (inspection required) | Likely pulse-band hexes. |
| `src/features/food/FoodHungerCue.tsx` | (inspection required) | Hunger scale gradient stops match hexes hard-coded in FoodSheet.tsx `HungerScale.gradient` (`FoodSheet.tsx:790-791`). |
| `src/features/quicklogs/SleepSheet.tsx` | 552-556 | rgba hex literals for red/orange/lime/blue sleep bands. |
| `src/features/quicklogs/FoodSheet.tsx` | 790-791 | rgba hex literals for hunger gradient (lime→orange). |
| `src/features/today/HabitsAmbientFooter.tsx` | 39-49 | `<linearGradient>` stops. |
| `src/components/ui/CountUp.tsx` | — | no hex. |
| `src/features/coach/clientDetail/IntakePanel.tsx` | 155 | `border-warn/40 bg-warn/12` — tokenised via Tailwind opacity syntax on `warn`. OK. |

**Structural bypasses:** `#4EA8DE` (water blue) is a canonical "we knowingly did not tokenise this yet" case. `#A8FF60` and other brand-hex literals sit inside SVG `<stop>` elements where token substitution requires JS injection — several components (`HabitsAmbientFooter`, `HabitsHero`, `HabitsSuggestionCard`) hard-code them.

**Photo / illustration hex:** Splash gradient background `#111116` (`vite.config.ts:46-47`) is not present in tokens — bespoke to the manifest.

For a fresh application to fully replicate the visual system, tokenise:
- Water blue (`#4EA8DE`) — one hex, promote to `--c-water` per the comment.
- Suggestion tone palette (cyan/lime/purple/orange) — currently duplicated inline.
- Sleep band ramp (red 0-4h → orange 4-6h → lime 6-8h → blue 8-12h).
- Hunger scale ramp (lime → orange).

## 25. Consumption pattern

- **Tailwind consumers:** every colour, spacing, radius, shadow, breakpoint, and z-index is exposed via `tailwind.config.ts` as `var(--c-*)` or literal token values. Components use utility classes (`bg-bgElevated`, `text-textMuted`, `px-cardPad`, `rounded-lg`, `shadow-glowAccent`, `md:`, `z-modal`, etc.).
- **Direct TypeScript consumers:** `import { motionToken } from '../../design/tokens'` (framer-motion configs) — `src/features/**/*.tsx`. About 40 imports of the `motionToken` object.
- **CSS variable consumers:** components that render inside sheets/glass use raw `var(--c-glass-*)` in Tailwind arbitrary syntax (`bg-[var(--c-glass-row-bg)]`, `border-[var(--c-glass-row-border)]`) because the tokens are dark/light-swapped by parent selectors.

## 26. Where they land at runtime

`src/index.css` writes every token above onto `:root` per theme+skin+accent+density+font combination. The Tailwind `bg-accent` class compiles to `background-color: var(--c-accent)`. Toggling `[data-theme='light']` rewires every variable in a single paint.
