# 05 — Design System

## Relationship to Elevra

Local's visual language **is** Elevra's system with a new identity poured into it. Structure, mechanics, motion, and component anatomy are inherited exactly; only the identity layer (palette, ambient atmosphere, brand marks, iconographic warmth) changes. Concretely:

- **Inherit verbatim** (build from the audit docs, they are the spec): the token pipeline (`design/tokens.ts` → Tailwind utilities → CSS custom properties on `<html>`), the seven-axis theming cascade and its exact cascade order, the cold-boot theme script, the full motion system (every duration/spring/easing token, every named choreography, the reduced-motion triple layer, the anti-pattern list), the type scale (display 34 → eyebrow 11, same line-heights, letter-spacing, weights, 16px input floor, tabular numerals on metrics), radii (8/12/16/20/24/pill), z-index ladder, glass surface system, shadow system, the component anatomy in COMPONENT_INVENTORY.md (Button two-size canon, IconButton with required ariaLabel, Sheet/Modal split, ListRow, EmptyState, Skeleton, SegmentedControl, Toast, Badge, PullToRefresh, SwipeAction, the peek drawer), the three screen scaffolds, and `/dev/gallery` as the living reference with screenshot tests (fix #33).
- **Apply every design-system fix** from 02: standard Tailwind spacing + breakpoints, 44px chips, AA `textFaint`, CSS variables inside every SVG (`stop-color="var(--c-accent)"` — zero hex literals in components, lint-enforced), chart colours via a theme-subscription hook, one row primitive with a `surface` prop.
- **Replace the identity**: palette below, ambient atmosphere, brand marks.

Fonts: keep Inter Tight (display) + Inter (body) + Atkinson Hyperlegible (dyslexia axis). They are load-bearing for the "same feel" requirement, they're self-hosted already, and the density/font axes depend on their metrics. A future brand pass may swap the display face; the `data-font` axis proves the slot exists.

## The Local identity

**Direction statement:** Elevra glows like a midnight gym — cyan neon on cold navy. Local should feel like **the village at dusk: lit windows, warm brick, the green after rain**. Same glass, same physics, same discipline; warmth instead of chill. The one deliberate signature: the **hearth ambient** — the app background's radial glows are warm amber-and-green embers rather than Elevra's cyan aurora, so every screen quietly says "you're somewhere warm" before a single component renders.

This is a considered choice, not a default: the palette is derived from the subject's own materials — Kentish oast brick, village-green grass, honey/wheat, chalk cream — and deliberately avoids both Elevra's acid-neon and the generic near-black-plus-acid-accent look.

### Dark theme (primary, matches Elevra's dark-first posture)

Neutrals keep Elevra's depth but trade blue for a faint warm-green undertone; accents move to leaf green + honey.

| Token | Value | Note |
|---|---|---|
| bg | `#0D110D` | deep warm charcoal-green (Elevra: `#0A0E17`) |
| bgElevated | `#151B15` | |
| bgSunken | `#090C09` | |
| text | `#F5F7F2` | warm off-white |
| textMuted | `#98A394` | |
| textFaint | `#6A755F` | decorative only; AA-checked usage rules unchanged |
| accent | `#7DD883` | **leaf** — the brand-interactive green; softer than Elevra's lime, AA on bg |
| accentWarm | `#F0B95A` | **honey** — secondary brand hue (replaces Elevra's accentBlue slot) |
| positive | `#7DD883` | |
| warn | `#F0B95A` | honey doubles as warn, as lime doubled as positive in Elevra |
| danger | `#F07A72` | warm coral (Elevra: `#FF6B7A`) |
| info | `#8AC6E8` | soft sky, demoted from brand to informational |
| purple | `#C9A0E8` | kept for chart range |
| chart1..5 | leaf, honey, sky, coral, purple | |
| textOnAccent | `#0C140C` | |

Gradients/ambient: `--g-brand: linear-gradient(135deg, #7DD883 0%, #F0B95A 100%)` (leaf → honey, the "green to lit window" move); hairline gradient same recipe at low alpha; **hearth ambient**: `--bg-ambient-1: radial-gradient(60% 40% at 15% 8%, rgba(240,185,90,0.09), transparent 70%)`, `--bg-ambient-2: radial-gradient(50% 35% at 85% 92%, rgba(125,216,131,0.06), transparent 70%)`. Glass tokens: Elevra's exact alphas re-based on the new bg (`panelBg rgba(13,17,13,0.80)` etc.). Shadows/focus: Elevra's recipes with leaf in place of cyan (`--shadow-glow-accent: 0 0 24px rgba(125,216,131,0.22)`).

### Light theme

Warm chalk, not clinical white — the light theme matters more here than in Elevra (older residents, daytime outdoor use):

bg `#F7F6F1` · bgElevated `#FFFFFF` · bgSunken `#EEEDE5` · text `#1C221A` · textMuted `#5C665A` · textFaint `#77826F` (AA-safe, fix #5) · accent `#2F7A44` (deep leaf, AA on white) · accentWarm `#B4791F` · danger `#CC4A44` · info `#2F6FA8` · textOnAccent `#FFFFFF`. Light ambient: very faint wheat + green washes (Elevra's light-mode peach/lavender recipe with the Local hues).

### Skins (the `data-skin` axis, repurposed for community type)

Elevra used `data-skin` for role (coach/client). Local uses it for **community type** — the exact mechanism the platform vision needs:

- `data-skin='village'` — default; the palette above.
- `data-skin='estate'` (reserved) — cooler slate + leaf.
- `data-skin='retirement'` (reserved) — village palette + default `data-density='spacious'` + default `data-contrast='high'` + larger touch affordances. Defined now as config defaults, shipped later.

`communities.skin` sets the attribute at shell mount, exactly as ClientShell set `data-skin='client'`. User axes (`data-accent` cobalt/leaf/honey user override, density, font, contrast, motion) all inherited unchanged.

### Brandability (the "Local is a placeholder" contract)

Everything brand-carrying is tokenised so the rename is a one-day change: `--brand-mark-*` colour variables (no `--elevra-*`-style sacred hex — fix for THEMING blocker #3); app name from a single `BRAND` const consumed by manifest generation, copy interpolation, OG images, and the wordmark component; logo as an SVG component using only CSS variables; `theme_color` in the manifest generated from tokens at build; storage-key prefix `local:` behind one constant.

### Iconography & imagery

Lucide via the semantic `Icon` primitive (Elevra's pattern). Local's semantic map leans domestic and warm: requests=hand-helping, listings=tag, equipment=wrench/ladder composites, alerts=bell (tiered colour), places=map-pin, organisations=landmark, events=calendar-heart. Illustration/empty-state style: simple line illustrations in leaf/honey duotone (no photos of generic stock people); photography appears only as user/place content. `EmptyState` copy is always an invitation to act ("No requests yet. Need a hand with something?").

### Motion

Zero changes to the motion system — it is the "feel" being cloned. The only new choreography: **alert arrival** on the Home alerts strip uses `toastMotion`'s drop + a single `breath`-style warm glow pulse (reusing the existing keyframe with honey rgba) for platform-tier alerts only. Everything else composes from the existing named set; the anti-pattern list (no confetti, no parallax, nothing >1500ms outside the two loops) stands.

### Accessibility floor (inherited + fixes)

Everything in ACCESSIBILITY.md plus fixes #9–#15: route-change `aria-live`, skip-link, `aria-current` on tabs, reduced-motion-respecting background, `aria-hidden` on decorative SVGs by lint rule, shared `useArrowNavigation`, 44px minimum targets everywhere including chips, WCAG AA on every text token in both themes (CI-checked contrast test over tokens.json), dyslexia font axis, high-contrast axis. The retirement-skin future makes this floor a product feature, not compliance.
