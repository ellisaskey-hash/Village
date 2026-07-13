# PROGRESS

## Current milestone: M0 — Foundation & design system ✅ (awaiting founder review of /dev/gallery)

**What's done**

- **Scaffold.** Vite + React 18 + TypeScript strict with `exactOptionalPropertyTypes: true`; standard Tailwind spacing scale and breakpoints (Elevra fixes #1/#8); ESLint (`--max-warnings 0`) plus custom greps; Prettier; Vitest (happy-dom); Playwright + axe; Sentry wired from M0 (no-ops without a DSN); GitHub Actions with lint/typecheck/test/e2e as required checks; CSP + HSTS + security headers in `vercel.json`; PWA manifest generated from tokens.
- **Tokens.** `design/tokens.ts` implements spec 06 (the Local identity: leaf + honey on warm charcoal-green, warm-chalk light theme).
- **Theming cascade.** `src/index.css` implements all seven axes in the documented cascade order (theme × skin × accent × density × font × contrast × motion) with the cold-boot script at `public/theme-boot.js` (external, so the strict CSP holds without a nonce).
- **Motion.** `src/lib/motion.ts` ports every named choreography from MOTION_AND_ANIMATION.md verbatim, plus the one new `alertArrival` choreography from spec 05. Reduced motion is honoured three ways (CSS, MotionConfig, `useMotionSafe`).
- **Hearth ambient.** `AppBackground` paints the warm ember glow from the `--bg-ambient-*` variables; its slow drift pauses entirely under reduced motion.
- **Primitives (33).** Button, IconButton, Chip (44px), Badge, Card, IconBadge, Avatar, ListRow (with `surface` prop, fix #7), Sheet, Modal, Toast, EmptyState, Skeleton (+ListRow/+Card), SegmentedControl, Tabs, SearchBar, Field, Textarea, Select, Checkbox, Toggle, RadioGroup, Banner, InfoCallout, TextLink, PullToRefresh, SwipeAction, StaggeredBody, MetricStat, StatCard, BrandLogo, Icon. No hex literals in components (SVGs use `var(--…)` stops); every string voice-passed (no em-dashes); 44px touch targets; every input at the 16px floor.
- **Gallery.** `/dev/gallery` renders every primitive in every state with a live control bar for all seven axes. Reviewable at desktop 1280px and mobile 375px, dark and light.

**Verification (this machine)**

- `npm run lint` — clean (ESLint + check-voice + check-hex).
- `npm run typecheck` — clean.
- `npm test` — 14 passing (AA token-contrast over both themes; `useMotionSafe` + motion tokens).
- `npm run build` — green; main JS 357 KB (112 KB gzip), well under the 800 KB budget.
- `npm run e2e` — 4 passing (gallery screenshot baseline + axe, dark & light, desktop & mobile).

**Acceptance criteria**

- Gallery screenshot suite green in dark + light — ✅
- axe clean — ✅ (`color-contrast` and `region` rules disabled with cause; AA covered by the token contrast unit test)
- Token contrast AA — ✅ (`tests/tokens.contrast.test.ts`)
- "Feels like the same family" — awaiting founder review of `/dev/gallery`.

**Open items / what's next**

- Screenshot baselines were captured on this Windows machine (`*-win32.png`). CI runs on Linux, so the Linux baselines (`*-linux.png`) must be generated once in that environment (run `npm run e2e:update` in the Playwright Linux container or via a one-off CI job) before the e2e check is meaningful on CI.
- Next milestone: **M1 — Auth, communities, membership & trust rails.** Strictly sequential after M0. Do not start until the founder signs off on the gallery.

**Open questions**

- None blocking. M0 built strictly to spec; no feature screens, auth, or database work (correctly deferred to M1+).
