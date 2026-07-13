/**
 * design/tokens.ts — the single TypeScript source of truth for Local's design tokens.
 *
 * Law (inherited from Elevra, DESIGN_TOKENS.md): no colour, spacing, radius, shadow,
 * duration or easing exists outside this file and its runtime twin, src/index.css.
 *
 * Structure mirrors docs/spec/06_tokens.local.json so the same pipeline consumes it.
 * The identity layer (colour, gradient, ambient, brand) is Local's; spacing / radius /
 * type / motion / z inherit from Elevra with the WEAKNESSES fixes applied (standard
 * Tailwind spacing + breakpoints, 44px chip, AA-safe textFaint).
 *
 * Consumed by:
 *  - tailwind.config.ts (colour utilities resolve to the CSS vars written from this shape)
 *  - src/lib/motion.ts (motion tokens, verbatim)
 *  - vite.config.ts (PWA manifest theme colour)
 *  - tests/tokens.contrast.test.ts (AA contrast assertion over every text token)
 */

export const BRAND = 'Local';

/** localStorage key prefix — one constant behind the brandability contract (spec 05). */
export const STORAGE_PREFIX = 'local:';

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

export const color = {
  dark: {
    bg: '#0D110D',
    bgElevated: '#151B15',
    bgSunken: '#090C09',
    surface: 'rgba(255,255,255,0.04)',
    surfaceHover: 'rgba(255,255,255,0.07)',
    surfaceActive: 'rgba(255,255,255,0.10)',
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.16)',
    text: '#F5F7F2',
    textMuted: '#98A394',
    textFaint: '#6A755F',
    textOnAccent: '#0C140C',
    accent: '#7DD883',
    accentWarm: '#F0B95A',
    positive: '#7DD883',
    warn: '#F0B95A',
    danger: '#F07A72',
    info: '#8AC6E8',
    purple: '#C9A0E8',
    chart1: '#7DD883',
    chart2: '#F0B95A',
    chart3: '#8AC6E8',
    chart4: '#F07A72',
    chart5: '#C9A0E8',
    alertCommunity: '#8AC6E8',
    alertVerified: '#F0B95A',
    alertPlatform: '#F07A72',
  },
  light: {
    bg: '#F7F6F1',
    bgElevated: '#FFFFFF',
    bgSunken: '#EEEDE5',
    surface: 'rgba(28,34,26,0.03)',
    surfaceHover: 'rgba(28,34,26,0.05)',
    surfaceActive: 'rgba(28,34,26,0.08)',
    border: 'rgba(28,34,26,0.08)',
    borderStrong: 'rgba(28,34,26,0.14)',
    text: '#1C221A',
    textMuted: '#5C665A',
    textFaint: '#77826F',
    textOnAccent: '#FFFFFF',
    accent: '#2F7A44',
    accentWarm: '#B4791F',
    positive: '#2F7A44',
    warn: '#B4791F',
    danger: '#CC4A44',
    info: '#2F6FA8',
    purple: '#7A55B8',
    chart1: '#2F7A44',
    chart2: '#B4791F',
    chart3: '#2F6FA8',
    chart4: '#CC4A44',
    chart5: '#7A55B8',
    alertCommunity: '#2F6FA8',
    alertVerified: '#B4791F',
    alertPlatform: '#CC4A44',
  },
} as const;

/** User accent override (data-accent). Leaf is the default and equals theme accent. */
export const accentUserOverride = {
  leaf: { dark: { accent: '#7DD883' }, light: { accent: '#2F7A44' } },
  honey: {
    dark: { accent: '#F0B95A', textOnAccent: '#141005' },
    light: { accent: '#B4791F', textOnAccent: '#FFFFFF' },
  },
  cobalt: { dark: { accent: '#7FA8FF' }, light: { accent: '#3D6FD0' } },
} as const;

export const gradient = {
  dark: {
    brand: 'linear-gradient(135deg, #7DD883 0%, #F0B95A 100%)',
    hairline: 'linear-gradient(90deg, rgba(125,216,131,0.6), rgba(240,185,90,0.2))',
  },
  light: {
    brand: 'linear-gradient(135deg, #57B36E 0%, #E0A94E 100%)',
    hairline: 'linear-gradient(90deg, rgba(47,122,68,0.55), rgba(180,121,31,0.18))',
  },
} as const;

/** The hearth signature — warm ember glows behind every screen (spec 05). */
export const ambient = {
  dark: {
    1: 'radial-gradient(60% 40% at 15% 8%, rgba(240,185,90,0.09), transparent 70%)',
    2: 'radial-gradient(50% 35% at 85% 92%, rgba(125,216,131,0.06), transparent 70%)',
  },
  light: {
    1: 'radial-gradient(75% 55% at 8% 6%, rgba(240,185,90,0.18), transparent 72%)',
    2: 'radial-gradient(70% 50% at 92% 12%, rgba(125,216,131,0.14), transparent 72%)',
    3: 'radial-gradient(85% 60% at 50% 96%, rgba(224,169,78,0.16), transparent 75%)',
  },
} as const;

// ---------------------------------------------------------------------------
// Spacing / radius / type / z / breakpoints
// ---------------------------------------------------------------------------

/** Named spacing extras on top of the standard Tailwind scale (Elevra fix #1). */
export const spacing = {
  screenX: 20,
  sectionGap: 28,
  cardPad: 16,
  tabBarHeight: 64,
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, sheet: 24, pill: 999 } as const;

export const type = {
  display: { sizePx: 34, lineHeight: 1.15, letterSpacing: '-0.02em', weight: 700 },
  h1: { sizePx: 26, lineHeight: 1.2, letterSpacing: '-0.02em', weight: 700 },
  h2: { sizePx: 21, lineHeight: 1.25, letterSpacing: '-0.01em', weight: 600 },
  h3: { sizePx: 17, lineHeight: 1.3, letterSpacing: '-0.01em', weight: 600 },
  body: { sizePx: 15, lineHeight: 1.55, weight: 400 },
  input: { sizePx: 16, lineHeight: 1.5, weight: 400 },
  small: { sizePx: 13, lineHeight: 1.45, weight: 400 },
  micro: { sizePx: 11, lineHeight: 1.35, letterSpacing: '0.02em', weight: 500 },
  eyebrow: { sizePx: 11, lineHeight: 1.2, letterSpacing: '0.12em', weight: 600 },
} as const;

export const font = {
  display: "'Inter Tight', 'Inter', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
  dyslexiaSwap: "'Atkinson Hyperlegible', 'Inter', system-ui, sans-serif",
} as const;

export const density = {
  compact: '15px',
  regular: '16px',
  spacious: '17px',
} as const;

export const z = {
  base: 0,
  raised: 10,
  header: 20,
  tabBar: 30,
  popover: 35,
  sheet: 40,
  popoverElevated: 45,
  modal: 50,
  toast: 60,
  installCoach: 70,
} as const;

/** Standard Tailwind breakpoints (Elevra fix #8). */
export const breakpoint = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;

// ---------------------------------------------------------------------------
// Motion — inherited from Elevra verbatim (the feel being cloned). MOTION_AND_ANIMATION.md
// ---------------------------------------------------------------------------

export const motionToken = {
  instant: 120,
  fast: 200,
  base: 280,
  slow: 360,
  drawn: 700,
  staggerChildren: 0.05,
  staggerDelay: 0.04,
} as const;

export const springSnappy = { type: 'spring', stiffness: 420, damping: 32 } as const;
export const springSheet = { type: 'spring', stiffness: 320, damping: 34 } as const;
export const springGentle = { type: 'spring', stiffness: 220, damping: 28 } as const;

export const easeOut = [0.16, 1, 0.3, 1] as const;
export const easeInOut = [0.65, 0, 0.35, 1] as const;

// ---------------------------------------------------------------------------
// Aggregate — convenience object (used by vite.config and tests)
// ---------------------------------------------------------------------------

export const tokens = {
  brand: BRAND,
  color,
  accentUserOverride,
  gradient,
  ambient,
  spacing,
  radius,
  type,
  font,
  density,
  z,
  breakpoint,
  motion: { motionToken, springSnappy, springSheet, springGentle, easeOut, easeInOut },
} as const;

export type ThemeName = keyof typeof color;
export type ColorToken = keyof typeof color.dark;
