# TECH_STACK.md

Source: `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`.

## Application shape

- **Type:** Progressive Web App (PWA), single-page React application.
- **Package name:** `elevra-app` (`package.json:2`).
- **Version:** `0.0.0` — never bumped; the app ships continuously via Vercel.
- **Module system:** ESM (`"type": "module"`).

## Languages

- **TypeScript 5.4.5** — every source file. `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `noFallthroughCasesInSwitch: true`, `noUnusedLocals: true`, `noUnusedParameters: true`. `exactOptionalPropertyTypes: false`. `useUnknownInCatchVariables: true`. `noEmit: true` — Vite handles the build; tsc is typecheck-only.
- **JSX:** `react-jsx` transform.
- **Target:** `ES2022`. `lib`: `["ES2022", "DOM", "DOM.Iterable", "WebWorker"]`.
- **Module resolution:** `Bundler`. Path aliases: `@/*` → `src/*`, `@design/*` → `design/*`.
- **CSS:** Tailwind CSS + hand-written CSS variables in `src/index.css` for theme layering.

## Frameworks & core libraries

| Package | Version | Purpose |
|---|---|---|
| `react` | `^18.3.1` | UI framework. Concurrent features not currently used. |
| `react-dom` | `^18.3.1` | DOM renderer. |
| `react-router-dom` | `^6.23.1` | Client-side routing. Nested routes with `<Outlet>` in `CoachShell` / `ClientShell`. |
| `framer-motion` | `^11.2.6` | ALL animation. Spring configs live in `design/tokens.ts` as `motionToken`. |
| `zustand` | `^4.5.2` | Global state. Stores in `src/app/state/*.ts`: `session`, `theme`, `a11y`, `notifications`, etc. |
| `zod` | `^3.23.8` | Runtime schema validation. |
| `date-fns` | `^3.6.0` | Date arithmetic. No dayjs, no moment. |
| `idb-keyval` | `^6.2.1` | IndexedDB wrapper. Photo blob store (`src/lib/photoStore.ts`), offline action queue (`src/app/pwa/queueHelpers.ts`). |
| `lucide-react` | `^1.17.0` | Icon library. Custom `Icon` primitive at `src/components/ui/Icon.tsx` maps semantic names to Lucide glyphs. |
| `react-icons` | `^5.6.0` | Backup icon set (weight glyphs, brand marks). |

## Backend & data

| Package | Version | Purpose |
|---|---|---|
| `@supabase/supabase-js` | `^2.108.1` | Auth (email+password, magic link, OAuth), Postgres, Realtime, Storage, RLS. Client at `src/lib/supabase/client.ts`. |
| `@anthropic-ai/sdk` | `^0.103.0` | Claude API for food photo → macros and chat-drafting suggestions. Called from Vercel functions in `api/`. |
| `web-push` | `^3.6.7` | VAPID push notifications. Server function in `api/`. |
| `@types/web-push` | `^3.6.4` | Types for the above. |

## Vercel runtime

| Package | Version | Purpose |
|---|---|---|
| `@vercel/node` | `^5.8.14` | Node runtime for `api/*.mjs` serverless functions. Source lives in `api/_src/*.ts`, built via `scripts/build-api.mjs`. |
| `middleware.ts` (root) | n/a | Vercel Edge middleware (auth gate, redirects). |

## Rich content & media

| Package | Version | Purpose |
|---|---|---|
| `@tiptap/react` | `^3.26.0` | Rich text editor (coach message composer, longer notes). |
| `@tiptap/starter-kit` | `^3.26.0` | TipTap default extensions. |
| `@tiptap/extension-link` | `^3.26.0` | Autolink URLs. |
| `qrcode` | `^1.5.4` | QR code generation for coach invite share sheet. |
| `@types/qrcode` | `^1.5.6` | Types. |
| `sharp` | `^0.33.4` | Server-side image processing (dev only — `scripts/gen-icons.mjs`). |

## Charts & data viz

| Package | Version | Purpose |
|---|---|---|
| `echarts` | `^6.1.0` | Charting engine. Line/bar/heatmap. |
| `echarts-for-react` | `^3.0.6` | React wrapper. |
| Bespoke SVG | n/a | Small charts (sparklines, gauges, progress rings, water glass, weekly heat strip) hand-drawn as SVG per-component to avoid pulling ECharts into the main bundle. |

## Documents / export

| Package | Version | Purpose |
|---|---|---|
| `jspdf` | `^4.2.1` | Client-side PDF generation (coach reports, invoice-adjacent exports). |
| `jspdf-autotable` | `^5.0.8` | Tables inside PDFs. |
| `xlsx` | `^0.18.5` | Excel export (roster CSV/XLSX). |

## Rendering (WebGL background)

| Package | Version | Purpose |
|---|---|---|
| `ogl` | `^1.0.11` | Small WebGL library. Powers the app-wide Iridescence aurora at `src/components/decor/AppBackground.tsx`. iOS Safari falls back to a static CSS wash. |

## Fonts (self-hosted, no CDN)

| Package | Purpose |
|---|---|
| `@fontsource/inter` `^5.0.18` | Body font. |
| `@fontsource/inter-tight` `^5.0.20` | Display font. |
| `@fontsource/caveat` `^5.2.8` | Handwriting accent (marketing / rare use). |
| `@fontsource/atkinson-hyperlegible` `^5.2.5` | Optional dyslexia-friendly body swap via `data-font='dyslexia'`. |

## Build tooling

| Tool | Version | Role |
|---|---|---|
| `vite` | `^5.2.13` | Dev server + production bundler. |
| `@vitejs/plugin-react` | `^4.3.1` | React fast refresh. |
| `vite-plugin-pwa` | `^0.20.0` | Service worker generation. Strategy: `injectManifest` (custom SW at `src/sw.ts`). `maximumFileSizeToCacheInBytes: 4 * 1024 * 1024` — the 873-exercise built-in corpus pushes the main chunk past workbox's 2 MiB default. |
| `workbox-window` | `^7.1.0` | SW registration / update UX. |
| `tailwindcss` | `^3.4.4` | Utility CSS. `darkMode: 'class'`. Content: `./index.html`, `./src/**/*.{ts,tsx}`. |
| `autoprefixer` | `^10.4.19` | CSS vendor prefixes. |
| `postcss` | `^8.4.38` | Tailwind + autoprefixer. |
| `eslint` | `^8.57.0` | Linter. `--max-warnings 0`. |
| `@typescript-eslint/eslint-plugin` + `parser` | `^7.13.0` | TS lint rules. |
| `eslint-plugin-react-hooks` | `^4.6.2` | Hook exhaustive-deps checks. |
| `eslint-plugin-react-refresh` | `^0.4.7` | Refresh boundary lint. |
| `prettier` | `^3.3.2` | Formatter. |

## Test tooling

| Tool | Version | Role |
|---|---|---|
| `vitest` | `^1.6.0` | Unit test runner. |
| `happy-dom` | `^20.10.2` | DOM simulator for Vitest. |
| `@playwright/test` | `^1.61.0` | E2E test runner. Config at `playwright.config.ts`. |
| `@axe-core/playwright` | `^4.12.1` | Automated a11y checks inside Playwright suites. |

## Database tooling

| Tool | Version | Role |
|---|---|---|
| `supabase` | `^2.105.0` | Supabase CLI (migrations). Files at `supabase/migrations/NNNN_*.sql`, applied sequentially. |
| `pg` | `^8.21.0` | Node Postgres driver (dev scripts only). |

## npm scripts (`package.json:6-19`)

```json
"dev":         "vite",
"predev:vercel": "npm run build:api",
"dev:vercel":  "vercel dev",
"build:api":   "node scripts/build-api.mjs",
"build":       "npm run build:api && tsc --noEmit && vite build",
"preview":     "vite preview --host",
"typecheck":   "tsc --noEmit",
"test":        "vitest run",
"test:watch":  "vitest",
"lint":        "eslint . --max-warnings 0",
"format":      "prettier --write .",
"gen:icons":   "node scripts/gen-icons.mjs"
```

- Production build runs `build:api` → `tsc --noEmit` → `vite build`. Fails on any TS error.
- Dev via `vite` runs on `port: 3005` (`vite.config.ts:73`).
- `dev:vercel` runs the full Vercel emulator (needed for `/api/*` functions).

## Platform targets

- **Primary:** installed PWA on modern browsers (iOS Safari 16.4+, Android Chrome 90+, desktop Chrome/Edge/Firefox/Safari latest).
- **Manifest** (`vite.config.ts:37-58`):
  - `name: 'Elevra'`, `short_name: 'Elevra'`
  - `description: 'Coach and client, in sync.'`
  - `display: 'standalone'`, `orientation: 'portrait'`
  - `theme_color: '#111116'`, `background_color: '#111116'`
  - Icons: 192×192, 512×512, 512×512 maskable
  - `start_url: '/?source=pwa'`, `scope: '/'`
- **Service worker:** custom implementation at `src/sw.ts`. Uses Workbox precache manifest injection. `registerType: 'prompt'` — the client sees an "Update available" toast (`src/components/ui/UpdateToast.tsx`) rather than a silent reload.
- **Native shells:** none. The install path is browser Add-to-Home-Screen via `PrePermissionSheet.tsx` + `InstallCoach.tsx`.

## Minimum OS / browser versions

Not codified explicitly, but constrained by:
- iOS Safari 16.4+ (Web Push API landed in 16.4; earlier versions fall through the `Notification` guards in `src/app/pwa/notificationEngine.ts` without crashing).
- Android Chrome 90+ (backdrop-filter, aspect-ratio, container queries not used).
- Desktop: any 2022+ Chromium / Firefox / Safari.
- WebGL 1 required for the Iridescence aurora background — no-crash fallback to CSS wash (`src/components/decor/AppBackground.tsx`).

## Hosting

- **Vercel** (`vercel.json`, `middleware.ts`, `api/`).
- **Region:** derived from Vercel default (single region — see `BACKEND_ARCHITECTURE.md` for detail).

## Analytics

- No analytics SDK. In-house telemetry service: `services.telemetry.record({ userId, kind, data })` writes to a `telemetry_events` table via Supabase.

## Error / crash reporting

- None wired. `console.error` and Supabase error mapping (`src/lib/supabase/error.ts`) are all that exists.

## Feature flags

- Two ad-hoc gates in `App.tsx:339-354`: `/dev/*` routes gated on `import.meta.env.DEV` OR `?dev=1` in the URL OR `localStorage['elevra:dev-unlock'] === '1'`. No structured feature-flag system.

## Deep linking

- Supabase auth callbacks: `/auth/reset-password`, `/auth/signup-client/:code`.
- Invite links: `/invite/:code`.
- Public coach profiles: `/c/:slug`.
- In-app deep links: alerts and notifications carry a `deepLink` string that navigates via `useNavigate()` when tapped.
