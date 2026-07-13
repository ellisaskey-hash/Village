# PATTERNS.md

Recurring UI + interaction patterns. Where COMPONENT_INVENTORY.md documents the primitives, this document documents how they compose.

## Application shells

Two shells exist, one per role. Both share the same three-region layout: sticky top bar, scrollable main, sticky bottom bar (or persistent left rail on desktop).

- **`CoachShell`** — `src/app/shells/CoachShell.tsx`. Tabs: Home · Clients · Calendar · Messages · Business. Writes `data-skin='coach'` on `<html>` (explicit; visually equivalent to absent because the CSS deltas only fire under `[data-skin='client']`).
- **`ClientShell`** — `src/app/shells/ClientShell.tsx`. Tabs: Today · Train · Progress · Messages · Me. Writes `data-skin='client'` on `<html>`.

Both shells:
1. Render `<ShellHeader>` at the top on mobile, `<DesktopTopBar>` on `lg:+`.
2. Render `<TabBar>` at the bottom on mobile, `<LeftRail>` on the left at `lg:+`.
3. Wrap `<Outlet>` in `<AnimatePresence mode="wait">` with `tabScreenCrossfade` variants (120ms crossfade on route change).
4. Wrap the entire tree in `<MotionConfig reducedMotion="user">`.
5. Mount `<InstallPromptManager />` + `<HelpWidget />` as siblings of `<main>`.

**Why two shells rather than one shell + role prop:** the tab sets diverge entirely, the desktop rail affordances differ (coach has search / avatar / more; client has skinnier profile row), and the routes under each are lazy-loaded from distinct file trees.

**Route error boundary:** `<RouteErrorBoundary>` wraps `<Outlet>` in both. On error, renders an EmptyState with a Reload CTA. The reload guard key (`RELOAD_GUARD_KEY`) prevents infinite reload loops if the error re-fires on mount.

## Navigation

### Bottom tab bar (mobile)

`src/app/shells/TabBar.tsx`. Five slots per shell. Icon-led with 12-13px label below. Active tab: icon springs to 1.1 via `tabIconSpring` (springSnappy), text switches to `text-accent`, an accent glow drops under the icon via `shadow-glowAccent`. Badge slot per tab renders `<Badge count={n} dot={n === 0 ? undefined : false} />`.

Sticky at bottom (`sticky bottom-0 z-tabBar`), safe-area padding via `.safe-bottom`. `border-t + bg-bgElevated/95 + backdrop-blur` — nearly-opaque top hairline + slight glass.

Hidden on immersive routes (workout player, programme builder wizard) via the `hidden` prop — parent decides.

### Left rail (desktop)

`src/app/shells/LeftRail.tsx`. Replaces the TabBar at `lg:+`. Persistent column with:
- Elevra mark at top
- Same navigable items as TabBar
- Utility affordances at the bottom (avatar / settings / help)

Uses NavLink `end` prop where necessary so Home doesn't stay highlighted for descendant routes.

### Desktop top bar

`src/app/shells/DesktopTopBar.tsx`. Renders across the top of the main column on `lg:+`. Search input on coach; profile pill on client.

### Route change

Both shells wrap `<Outlet>` in `<AnimatePresence mode="wait">` with `tabScreenCrossfade` variants: 120ms crossfade. Individual routes then apply their own `screenEnter` (200ms fade with `staggerChildren: 0.08`) to cascade their internal cards.

### Deep linking

- Supabase auth callbacks: `/auth/reset-password`, `/auth/signup-client/:code`.
- Coach invite: `/invite/:code`.
- Public coach profile: `/c/:slug`.
- In-app deep-links stored on alerts / notifications as a `deepLink` string. Tap → `useNavigate()(deepLink)`.

### Dev-only routes

`/dev/*` routes lazy-loaded under a runtime guard: `import.meta.env.DEV || URLSearchParams.get('dev') === '1' || localStorage['elevra:dev-unlock'] === '1'`. Includes `/dev/gallery` (component gallery), `/dev/sheets` (drawer gallery), `/dev/interactives` (interaction picks gallery), `/dev/metrics` (data-viz picks gallery), `/dev/elevation` (surface tokens gallery).

## Screen scaffolds

Every screen follows one of three scaffolds:

### Scaffold A — vertically-stacked cards

Standard content scaffold. Top: greeting or breadcrumb (small eyebrow). Middle: cards stacked in a single column (mobile), 12-col grid (`lg:grid-cols-12`) on desktop with common spans 6/6, 8/4. Bottom: quiet footer or nothing.

Wrapped in a `<motion.div variants={screenEnter} initial="initial" animate="animate">` so children cascade via `staggerChildren: 0.08`. Each card is a direct child with `variants={cardEnter}`.

Screens: TodayScreen, CoachHomeScreen, MeScreen, BusinessHubScreen, ProgressScreen, most tab entry points.

### Scaffold B — list detail

A search / filter chrome row at the top, scrollable list of `ListRow`s below, optional peek drawer (client peek from the coach roster) or full-route detail navigation.

Screens: RosterScreen, MessagesScreen, ChallengesScreen, LibraryScreen, TemplatesScreen, AlertInboxScreen, CheckInInboxScreen.

Empty variant: `EmptyState` centered. Error variant: `TabError` from `TabFetchStates`. Loading: `TabLoading` (2-3 SkeletonCards).

### Scaffold C — immersive workflow

Full-screen — TabBar hidden. Multi-step wizard chrome (Stepper at top or absent) + a big content area + a fixed footer with next/back.

Screens: WorkoutPlayerScreen, ProgrammeBuilderScreen, CheckInReviewScreen, CoachSelfTrainingShell.

## List / detail

Coach-side clients are the reference implementation:
- `/coach/clients` renders `RosterScreen` — search + filter chips + `ListRow`s.
- Tapping a row opens a **client peek drawer** (`ClientPeekProvider` context) — a bottom Sheet on mobile, side drawer at `lg:+` — showing summary + action row. Long-press or "Open" button navigates to full detail.
- `/coach/clients/:id` renders `ClientDetailScreen` — the full-detail route.

The peek pattern (drawer preview → full route) is Elevra's canonical browse/detail affordance. It preserves list context by default.

## Forms

Every form field is a primitive from `src/components/ui/`. **Never inline a `<input>`, `<select>`, `<textarea>`.** Rationale: consistent focus rings, 16px iOS-safe font floor, keyboard-safe reorder guard, validation surface parity.

Field mapping:
- Text / email / number / password / tel → `Field` (or `PasswordField`, `IntegerField`).
- Multi-line → `Textarea`.
- Date → `DateField` (chip-based quick pick) OR `DatePicker` (full calendar drawer).
- Date range → `DateRangePicker`.
- Time → `TimePicker`.
- Anything opening a picker dialog on click → `PickerField` (renders like Select).
- Boolean → `Toggle`.
- Boolean (check-in list) → `Checkbox`.
- One-of-N (row) → `RadioRow`.
- One-of-N (tile with icon) → `RadioTile`.
- One-of-N (small pills) → `SegmentedControl`.
- Numeric range → `Slider` / `PulseSlider` / `GradientSlider`.
- Dropdown → `Select`.
- Search-in-list → `SearchBar`.
- Rich text → `RichTextEditor`.
- Emoji → `EmojiPicker`.
- Media → `PhotoCapture` / `VideoRecorder` / `VoiceRecorder` / `ExerciseImageCapture`.

### Form submit

Bottom of the Sheet: a full-width primary `Button size="xl" fullWidth>Save</Button>`. Loading state via `loading` prop → spinner replaces leading icon. Disabled while invalid.

Cancel is typically the sheet's dismiss (backdrop tap / drag / X close button); a separate `Cancel` button is authored only when confirmation semantics matter.

### Validation

- Zod schemas for shape validation. `zod-error-map` maps to VOICE-safe copy where necessary.
- Inline error text via `error` prop on the Field.
- Submit-blocking error surfaces as a Toast on save-fail.

## Errors

Three error surfaces:

1. **Field-level** — inline `error` prop on the Field / Textarea. Danger border + danger helper text below. Announced via `aria-describedby` linking the input to the error node.
2. **Screen-level** — `<TabError />` from `TabFetchStates`. EmptyState + "Try again" Button. Copy: "We couldn't load this. Try again." (no blame-the-network).
3. **Toast-level** — `toast.push({ variant: 'error', title, body })` for transient failures (save failed, action failed). 3s auto-dismiss.

## Loading

Never a spinner-standing-alone. Three surfaces:

1. **Page loading** — `<ContentPulse />` or `<TabLoading />`. ContentPulse is a transparent overlay (aurora shines through); TabLoading is stacked SkeletonCards that match the final layout.
2. **Section loading** — inline `<Skeleton*>` composed to match the final content. E.g. `<SkeletonListRow>` while roster streams.
3. **Button loading** — `loading` prop on Button. Spinner replaces leading icon; `aria-busy` set.

## Empty states

Every list has one. `EmptyState` component with:
- Illustration (default: `ElevraMark` at 70% opacity)
- Title (VOICE: never apologetic)
- Body (optional, one sentence of guidance)
- Action (optional CTA)

Examples:
- Roster empty: "No clients yet." + "Add your first client to get started." + `<Button>Add client</Button>`.
- Messages empty: "No conversations yet." + illustration.
- Inbox empty: "Inbox zero. Well done." + calm illustration.

## Toasts

Top-anchored via portal. Auto-dismiss 3s (0 = sticky). Replace-not-stack — a new toast dismisses the current one.

Variants and their tone chrome:
- `info` — bell icon, hairline border, bgElevated.
- `success` — check icon, lime border + lime bg (12% opacity) + lime text.
- `error` — alert icon, danger border + danger bg + danger text.
- `update` — refresh icon, accent border + accent bg + accent text. Used for the PWA "new version" prompt with a Refresh action.

Usage:
```ts
const toast = useToasts();
toast.push({
  variant: 'success',
  title: 'Programme saved',
  body: '5 sessions across 2 weeks.',
  action: { label: 'Undo', onClick: undo },
  durationMs: 5000,
});
```

## Modals vs Sheets

**Rule (documented at `Modal.tsx:2-4`):** Modal is ONLY for confirmations of destructive + irreversible actions. Discard, Delete, Archive, End, Remove, Disconnect. Everything else — including non-destructive confirmations, forms, pickers, previews — is a Sheet.

## Drawers (Sheet)

The Sheet primitive is used for ~90% of secondary surfaces. Consistency contract:

- Grabber bar at top (bottom sheets only).
- Optional hero: `<IconBadge>` (large, tone-tinted) above title.
- Title in `text-h2`, muted subtitle below.
- Body wrapped in `<StaggeredBody>` for staggered fade-in of direct children.
- Footer: full-width `Button size="xl"` save.

Drawer bodies typically compose:
- `<DrawerActionRow>` for menu-style rows.
- `<DrawerActionRowGlass>` when the parent Sheet uses `fluidGlass` (default post-2026-06-15).
- `<DrawerPreviewLayout>` for config-on-left + preview-on-right two-column bodies.
- `<InfoCallout>` for "why this matters".
- `<TipFooter>` for the small "Tip:" or "Disclaimer:" row at the bottom.

## Popovers

Every floating menu / dropdown / tooltip goes through `PortalPopover`. Reason: portal-rendered, escapes ancestor stacking contexts, positioned via `getBoundingClientRect` of the trigger.

z-index:
- `z-popover` (35) — default. Above TabBar (30), below Sheet (40) so a Modal / Sheet triggered from a menu wins.
- `z-popoverElevated` (45) — opt-in via `elevated` prop. Above Sheet but below Modal. For popovers triggered from inside a Sheet (e.g. time-picker dropdown in AvailabilitySheet).

## Iconography

`Icon` component. Default family: **Heroicons Solid**. Alternative families: `duotone` (Phosphor Duotone) for inbox-style rows, `feather` for drawer rows. Icon size prop is a number (px). Named semantic set exported as `IconName`.

Never inline SVG icons — always use `<Icon name="…" />`. This is enforced by convention because switching families is a global visual dial.

## Numeric display

Every metric uses **tabular numerals**. Class: `font-numeric` or inline `font-variant-numeric: tabular-nums`. Tokens set this on all display font uses. Reason: columns of numbers align across rows.

Delta arrows: ▲ (positive) / ▼ (negative). Colour semantic:
- Positive-in-goal-direction → `text-lime` (e.g. adherence up).
- Negative-in-goal-direction → `text-danger`.
- No change → `text-textMuted`.

Note: "positive-in-goal-direction" depends on the metric. Body weight down is "positive" for a fat-loss goal; up is positive for a muscle-gain goal. The consumer picks the tone.

## Colour semantics

- `accent` — brand interactive. Coach: cyan. Client: lime.
- `positive` / `lime` — on track, complete, success.
- `warn` — quiet, amber band, needs review.
- `danger` — at risk, red band, destructive.
- `info` — informational callouts. Follows `accent` semantically.
- Phases — `phaseMenstrual` / `phaseFollicular` / `phaseOvulation` / `phaseLuteal`. Calm, never pink-washed.

## Numbers, dates, times

- Dates: `date-fns`. Format via `formatDate` in `src/lib/dates.ts`. Never inline `date.toLocaleDateString()` without a wrapper.
- Times: locale-aware 12h/24h detected via `Intl.DateTimeFormat().resolvedOptions().hour12`.
- Units: locale-aware kg/lbs, cm/in, C/F via `src/app/state/units.ts` (Zustand-persisted user preference).

## Copy / VOICE

Every user-facing string passes VOICE. Ellis-authored rules (enforced by code review):
- No em-dashes (banned across-the-board).
- No exclamation marks in coach-facing copy; sparingly in client success moments.
- No "the system" / "the platform" / "automatically". Use "we'll" or a subject.
- No hedging: "should be", "might", "kind of", "perhaps".
- No titles (Mr./Mrs./Miss/Dr.).
- No technical codes (enum values, IDs) surfaced to users.
- "Delete" is UI-technical; "remove" is human. Prefer "remove" in user-facing strings.
- No fake coach voice ("Coach says: X") unless the string is authored by a real coach.

Voice is treated as a first-class design token — reviewed at DoD.

## Motion patterns

See MOTION_AND_ANIMATION.md for the full choreography vocabulary. Highlights:

- Route change: 200ms fade with 80ms child stagger.
- Sheet open: backdrop fade to 60% + spring slide up (~280ms).
- Modal open: 200ms scale 0.96→1 + fade.
- Button press: scale 0.97 via springSnappy.
- List reveal: 40ms stagger + spring-gentle rise.
- Toast enter: 200ms spring drop from -16px.
- Ring / chart draw: 700ms expo-out.

## Auth / session

- `NextAuth`-analogue: Supabase Auth. `src/lib/supabase/client.ts` initialises the client. `useSession()` returns the current session; `useCurrentCoachId()` / `useCurrentClientId()` return the resolved role-scoped IDs.
- Session persisted to Supabase's default storage (localStorage in web; token refresh handled by their SDK).
- Sign in: email+password, magic link, OAuth (Google, Apple, Microsoft, Outlook). See `SocialAuthButton`.
- Sign out: `services.session.signOut()` → clears session + navigates to `/auth/sign-in`.

## Offline

Offline is a first-class state, not a fallback:
- `<OfflinePill>` drops in when `navigator.onLine === false`.
- `idb-keyval` stores photo blobs + queued actions.
- SW caches static assets + image thumbnails (CacheFirst on `githubusercontent.com` for exercise frames).
- Queued actions in `src/app/pwa/queueHelpers.ts` are drained when back online.

Details in PLATFORM_AUDIT.md.

## Push notifications

`web-push` VAPID stack. `src/lib/notifications.ts` orchestrates. `PrePermissionSheet` walks the user through consent + category preferences. Push subscription → `push_subscriptions` table → server function fires from `api/push-notify.mjs`.

## Media

- **Images:** Supabase Storage under `photos/`, `avatars/`, `exercise-media/`. Public bucket with signed-URL fallback for private. Cropping via a canvas-based `AvatarCropSheet` on avatars; passthrough on freeform photos.
- **Video:** exercise demo capture via `VideoRecorder` (60s cap). Stored in the `exercise-media` bucket.
- **Audio:** voice notes captured via `VoiceRecorder`, stored in `voice-notes` bucket. Playback with a custom waveform bar (Phase 4 polish; primitive currently plays as a simple audio element with a play/pause + play-head bar).

## Search

- **Global search:** coach-only. `SearchSheet` opens from ShellHeader or `/` hotkey. Searches clients, messages, exercises, templates.
- **In-context search:** each list has its own `SearchBar` (roster, library, templates). Filters against a local `useMemo` filter or a server-side query depending on list size.

## Storage / caching layers

1. In-memory (Zustand). Session, theme, a11y, all UI-persistence stores.
2. localStorage (via Zustand `persist`). Theme, density, font pref, accent user override, motion pref.
3. IndexedDB via `idb-keyval` (`src/lib/photoStore.ts`, `gymPhotoStore.ts`). Photo blobs, gym photos, offline queue.
4. Supabase Postgres. Everything canonical.
5. Supabase Storage. Media assets.

## Analytics

In-house telemetry: `services.telemetry.record({ userId, kind, data })` writes to a `telemetry_events` table. No external analytics SDK. Events land in Postgres and can be queried by any coach with admin permissions.

## Feature flags

Two ad-hoc gates:
- `/dev/*` routes: DEV OR `?dev=1` OR `localStorage['elevra:dev-unlock']=='1'`.
- Individual features occasionally use a Zustand-persisted boolean (e.g. `useCoachHomeLayout`), but there's no structured feature-flag system.

## Config

- Vercel env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY` (server-only), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `SUPPORT_INBOX_EMAIL`.
- `vercel.json` at root configures the API functions block.
- No YAML config; no dotenv beyond Vite's `.env` convention.

## Testing

- **Vitest** — unit + hook. `*.test.ts` colocated with the module. Currently covers `password`, `useAsyncData`, `markdown`, `theme`, `units`, `messageInterpolation`, `checkinTemplate`, `useAutoPopupSlot`, `validation`, `a11y`.
- **Playwright** — E2E. Config at `playwright.config.ts`. `@axe-core/playwright` for automated a11y checks in the same suite.
- **No visual regression** currently in CI. `/dev/gallery` exists as a manual visual reference.

## CI / CD

- Vercel Git integration. Push to `main` → production deploy. Preview URLs on every branch.
- `npm run build` runs `build:api → tsc --noEmit → vite build`. Any tsc error fails the build.
- No separate CI runner; Vercel's build machine handles typecheck + build.
- Tests currently not blocking deploys — they run locally / on developer machines.
