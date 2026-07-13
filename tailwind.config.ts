import type { Config } from 'tailwindcss';

/**
 * Every colour utility resolves to a CSS custom property so a single
 * `data-theme` / `data-skin` / `data-accent` flip rewires the whole app in one
 * paint (THEMING_ARCHITECTURE.md). No component knows which theme it is in.
 *
 * Standard Tailwind spacing scale and breakpoints are used deliberately
 * (Elevra fixes #1 and #8) — only named extras are added.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--c-bg)',
        bgElevated: 'var(--c-bg-elevated)',
        bgSunken: 'var(--c-bg-sunken)',
        surface: 'var(--c-surface)',
        surfaceHover: 'var(--c-surface-hover)',
        surfaceActive: 'var(--c-surface-active)',
        border: 'var(--c-border)',
        borderStrong: 'var(--c-border-strong)',
        text: 'var(--c-text)',
        textMuted: 'var(--c-text-muted)',
        textFaint: 'var(--c-text-faint)',
        textOnAccent: 'var(--c-text-on-accent)',
        accent: 'var(--c-accent)',
        accentWarm: 'var(--c-accent-warm)',
        positive: 'var(--c-positive)',
        warn: 'var(--c-warn)',
        danger: 'var(--c-danger)',
        info: 'var(--c-info)',
        purple: 'var(--c-purple)',
        chart1: 'var(--c-chart-1)',
        chart2: 'var(--c-chart-2)',
        chart3: 'var(--c-chart-3)',
        chart4: 'var(--c-chart-4)',
        chart5: 'var(--c-chart-5)',
        alertCommunity: 'var(--c-alert-community)',
        alertVerified: 'var(--c-alert-verified)',
        alertPlatform: 'var(--c-alert-platform)',
      },
      spacing: {
        screenX: '20px',
        sectionGap: '28px',
        cardPad: '16px',
        tabBar: '64px',
      },
      borderRadius: {
        none: '0',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '20px',
        sheet: '24px',
        pill: '999px',
        full: '9999px',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        sans: 'var(--font-body)',
      },
      fontSize: {
        display: ['34px', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        h1: ['26px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        h2: ['21px', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
        h3: ['17px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        body: ['15px', { lineHeight: '1.55', fontWeight: '400' }],
        input: ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        small: ['13px', { lineHeight: '1.45', fontWeight: '400' }],
        micro: ['11px', { lineHeight: '1.35', letterSpacing: '0.02em', fontWeight: '500' }],
        eyebrow: ['11px', { lineHeight: '1.2', letterSpacing: '0.12em', fontWeight: '600' }],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
        glowAccent: 'var(--shadow-glow-accent)',
        glowWarm: 'var(--shadow-glow-warm)',
      },
      backgroundImage: {
        brand: 'var(--g-brand)',
        hairline: 'var(--g-hairline)',
      },
      zIndex: {
        base: '0',
        raised: '10',
        header: '20',
        tabBar: '30',
        popover: '35',
        sheet: '40',
        popoverElevated: '45',
        modal: '50',
        toast: '60',
        installCoach: '70',
      },
      keyframes: {
        breath: {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(240,185,90,0.15), 0 0 6px 0 rgba(240,185,90,0.25)',
          },
          '50%': {
            boxShadow: '0 0 0 6px rgba(240,185,90,0.05), 0 0 18px 2px rgba(240,185,90,0.4)',
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100% 0%' },
        },
      },
      animation: {
        breath: 'breath 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
