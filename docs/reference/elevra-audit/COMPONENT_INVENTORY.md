# COMPONENT_INVENTORY.md

Every reusable UI primitive in `src/components/ui/`. 90 files. Each entry lists file path, purpose, prop signature, variants/states, motion coupling, and where it's used.

Grouping is by function, not folder — the folder is flat. Every component listed here is intended for reuse across features; feature-specific components live in `src/components/<domain>/` and are not covered here except where they define patterns that should be extracted.

Conventions used in prop signatures:
- Types come verbatim from the file's TypeScript interface.
- "Motion" refers to the named variant from `src/lib/motion.ts` or a keyframe from `tailwind.config.ts`.
- "States" lists every visible state — default, hover, active, focus, disabled, loading, empty, error, and any variant-specific state.

---

## 1. Actionable primitives (things you click / tap)

### 1.1 `Button` — `src/components/ui/Button.tsx`

The universal button. Every clickable trigger that isn't icon-only, chip, or nav uses this.

**Variants:** `primary` (brand gradient + white text + glowAccent shadow + Inter Tight semibold), `secondary` (surface fill + strong hairline border), `ghost` (transparent, animated capsule border-trace on hover), `danger` (solid rose fill + white text), `pill` (30px surface pill for filter-adjacent uses).

**Sizes (two-size canon post-2026-06-16):**
- `sm` — 32px mobile / 30px tablet / 28px desktop. Default for every inline / toolbar / card-action button.
- `xl` — 52px mobile / 44px tablet+desktop. Drawer footer save buttons.

**Props:**
```ts
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'pill';
  size?: 'sm' | 'xl';
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: IconName;
  trailingIcon?: IconName;
  children?: ReactNode;
}
```

**States:** default, hover (gradient sheen sweep for non-ghost; SVG stroke path traces the capsule outline for ghost), press (scale 0.96 + y+2px + soft drop shadow), disabled (opacity 40%, pointer-events off), loading (spinner replaces leading icon, `aria-busy`).

**Motion:** hardcoded `PRESS_TRANSITION = { type: 'spring', stiffness: 380, damping: 28 }` and `PRESS_STATE = { scale: 0.96, y: 2, boxShadow: '0 2px 6px rgba(15,26,46,0.10)' }`. Hover sheen is a 700ms `translate-x-full` transform on an absolute `<span>`. Ghost border-trace is `pathLength: 0 → 1` via Framer Motion over 800ms.

**Mobile-full-width auto-tall:** `fullWidth && max-md:h-[52px]` bumps any full-width sm button to 52px below 768px, so touch remains generous on a phone.

**Accessibility:** `aria-busy` when loading, disabled when `disabled || loading`. Pointer-events disabled while non-interactive so keyboard users still see focus rings but clicks do nothing.

---

### 1.2 `IconButton` — `src/components/ui/IconButton.tsx`

Icon-only round button. Toolbars, sheet close X, ShellHeader bell/profile.

**Sizes:**
- `sm` — 32px visible / 44px hit area (via `::before -inset-1.5` pseudo). Toolbars.
- `md` — 44px (default).
- `lg` — 48px. Workout-player oversized controls.

**Props:**
```ts
interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  icon: IconName;
  ariaLabel: string;      // required — no visible fallback text
  variant?: 'ghost' | 'surface';
  showBadge?: boolean;    // unread / alert dot at top-right
  size?: 'sm' | 'md' | 'lg';
}
```

**States:** default, hover (icon crossfades to accent-coloured copy which rings with a rotation wiggle), press (scale 0.97), focus (accent ring), badge (top-right dot; unread affordance).

**Motion:** Phase 4C-2 canonical — icon crossfade + rotation wiggle on hover, `pressable` from motion.ts.

---

### 1.3 `Chip` — `src/components/ui/Chip.tsx`

Canonical pill for filters, tags, time-slot pickers.

**Height locked at 40px, padding `px-3`.**

**Tones:** `neutral`, `accent`, `lime`, `warn`, `danger`, `purple`. Each maps to a colour trio (border/40, bg/12, text).

**Variants:**
- `tint` (default) — subtle accent tint when selected. Filter chips.
- `solid` — filled accent + white text + soft accent shadow when selected. Time-slot / one-of-many.

**Props:**
```ts
interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'lime' | 'warn' | 'danger' | 'purple';
  selected?: boolean;
  variant?: 'tint' | 'solid';
  leadingIcon?: IconName;
}
```

**States:** default, hover (border thickens 1→2px to accent, 1px padding compensation keeps width stable), selected (bg + border change per variant).

---

### 1.4 `FilterChip` — `src/components/ui/FilterChip.tsx`

Sibling of Chip specialised for filter states with a leading dot + trailing count and a five-state matrix (default / hover / selected / selected+hover / disabled) that's discriminable at a glance. Used for Roster tag filters, Alerts filter row, and any chip-row that needs a count.

Distinguishes itself from Chip by having the leading dot + trailing count + the "selected+hover always brighter, never dimmer" contract.

---

### 1.5 `IconChipButton` — `src/components/ui/IconChipButton.tsx`

Square-rounded icon button for inline "remove this row" / "close this chip" affordances that sit next to input rows and Chip-adjacent chrome. Round IconButton is the wrong shape here — this pattern needs a square outline that matches adjacent input pills.

---

### 1.6 `ActionTile` — `src/components/ui/ActionTile.tsx`

Tone-tinted square CTA tile for Coach Home quick-action row (Add check-in / Send message / Add note). Coloured icon badge top, label below, tone-tinted background. Hover brightens bg + accentuates border + 0.5px lift + soft shadow. Press `scale 0.97`. Focus accent ring.

---

### 1.7 `QuickActionTile` — `src/components/ui/QuickActionTile.tsx`

The "icon badge + 2-line label + trailing chevron" tile used in drawer quick-action grids (Search drawer, Calendar tools, "pick a path" surfaces). Renders as a button by default; pass `href` to render as an `react-router-dom` `<Link>`.

---

### 1.8 `TonalGradientButton` — `src/components/ui/TonalGradientButton.tsx`

Primary CTA with a per-tone two-stop gradient background. Same press feel and hover sheen as Button (Phase 4C-2 canonical) so they read as siblings. Built for GymCaptureFlow (2026-06-10) — cyan for free weights, purple for machines, lime for cardio, coral/red for rig.

---

### 1.9 `TextLink` — `src/components/ui/TextLink.tsx`

Text-style affordance (button or anchor) with a polished underline animation on hover — underline scales in from centre over 150ms `easeOut`. Respects `prefers-reduced-motion`. Used for centred "See all" links inside cards and inline "Learn more →".

---

### 1.10 `SocialAuthButton` — `src/components/ui/SocialAuthButton.tsx`

"Continue with Apple / Google / Microsoft / Outlook" CTA. `iconOnly` mode for the row of three square icon buttons beneath the primary "Continue with Google" button. Handler is the caller's concern (typically calls Supabase OAuth).

---

## 2. Input primitives

### 2.1 `Field` — `src/components/ui/Field.tsx`

Labelled text input with helper / error, prefix / suffix slots, iOS-safe 16px font (prevents keyboard zoom).

**Types:** `text`, `email`, `number`, `password`, `tel`.

**Props:**
```ts
interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'prefix'> {
  label: string;
  type?: 'text' | 'email' | 'number' | 'password' | 'tel';
  helper?: ReactNode;
  error?: ReactNode;
  prefixSlot?: ReactNode;
  suffixSlot?: ReactNode;
  hideLabel?: boolean;
}
```

**States:** default, focus (border shifts to accent + small accent check icon in trailing slot; no halo, no bg fill), filled, error (danger border + danger helper text), disabled.

**Canonical focus feel:** picked from `/dev/interactives` gallery in Phase 4C-2.

---

### 2.2 `Textarea` — `src/components/ui/Textarea.tsx`

Multi-line text input mirroring Field's chrome. Built-in character counter at bottom-right when `maxLength` is set. Used by every drawer that collects free text (booking notes, praise messages, challenge descriptions, photo captions).

---

### 2.3 `IntegerField` — `src/components/ui/IntegerField.tsx`

Numeric Field that doesn't fight the user. Stock `<Field type="number">` runs the clamp on every keystroke (`Math.max(min, Number(e.target.value) || min)`), which snaps the box back to `min` while backspacing. This variant defers the clamp until blur, so you can actually type "12" over an existing "8".

---

### 2.4 `PasswordField` — `src/components/ui/PasswordField.tsx`

Field wrapper with a built-in show/hide reveal toggle (eye / eye-off). Optional `meter` slot renders `<PasswordStrengthMeter />` beneath the input. Use instead of inlining `<Field type="password" />` anywhere a password is captured.

---

### 2.5 `PasswordStrengthMeter` — `src/components/ui/PasswordStrengthMeter.tsx`

4-segment bar + tone-aware label. Driven by `scorePassword` in `lib/password.ts`. Segments fill left-to-right as score climbs (0..4). Tone: danger → warn → lime, with a glow on "Strong" (4). Label + feedback pass through from the score result.

---

### 2.6 `Select` — `src/components/ui/Select.tsx`

Token-styled dropdown. **Two modes:**
- Mobile (< lg): native `<select>` — OS wheel picker on iOS/Android; 16px `text-input` prevents auto-zoom.
- Desktop (≥ lg): styled trigger opens a `PortalPopover` menu with checkmark on the selected item.

`onChange` synthesises a `ChangeEvent<HTMLSelectElement>` so `e.target.value` works in both modes.

---

### 2.7 `Checkbox` — `src/components/ui/Checkbox.tsx`

Standard token-styled checkbox. **Canonical feel:** hover (unchecked) previews the check icon at 50% opacity via SVG stroke path animation. Click commits + a single-shot pulse halo expands outward.

**Props:** `checked`, `onChange`, `label`, `helper`, `disabled`, `dense`.

---

### 2.8 `RadioRow` — `src/components/ui/RadioRow.tsx`

Large selectable row for one-of-N choices (frequency, cycle mode). Border brightens on hover (no bg tint). Select: dot springs in with a bouncy overshoot.

### 2.9 `RadioTile` — `src/components/ui/RadioTile.tsx`

Richer sibling of RadioRow with per-option icon. "What kind of gym?" — Commercial / Home / Studio / Outdoor / Bodyweight. Shape: `[icon] [check ●]` top row, label below.

---

### 2.10 `Toggle` — `src/components/ui/Toggle.tsx`

Boolean switch. 44px touch target. Animated knob via spring. Pair with visible label; `srLabel` for screen-reader-only labelling.

```ts
interface ToggleProps { checked, onChange, srLabel, disabled, className }
```

### 2.11 `SegmentedControl` — `src/components/ui/SegmentedControl.tsx`

Small set of mutually-exclusive options, active pill slides between segments via Framer `layoutId`. `role="tablist"` + arrow-key navigation (Left/Right/Home/End). Reduced-motion guard: pill instant-snaps. `layoutId` randomly suffixed per instance so two SegmentedControls with the same ariaLabel don't cross-pollinate.

Per-option `disabled` supported — disabled buttons stay focusable for arrow-nav but ignore clicks and skip the pill.

---

### 2.12 `Slider` — `src/components/ui/Slider.tsx`

Native `<input type="range">` styled with tokens. 1–5 (pulse) and 1–10 (check-in). Big 44px thumb, tick markers, value on right. Keyboard accessible by default. Haptic tick via `navigator.vibrate`.

### 2.13 `PulseSlider` — `src/components/ui/PulseSlider.tsx`

1–10 slider with smooth drag + snap-on-release. Framer Motion value drives visual position continuously, snaps to `Math.round(v)` on release. `role="slider"` for a11y. `onChange` only fires on integer commits. Haptic tick on new committed value.

### 2.14 `GradientSlider` — `src/components/ui/GradientSlider.tsx`

Extracted from repeated per-drawer patterns (SleepSheet, FoodSheet hunger). Gradient-background track with pointer-driven `useMotionValue` + spring snap on release. Haptic tick (8ms vibrate) on integer changes.

### 2.15 `PeriodSlider` — `src/components/ui/PeriodSlider.tsx`

Continuous 2w → 12w period selector with `All` end-stop. Replaces the 4w/12w/All segmented control across Progress screens for consistency.

---

### 2.16 `DateField` — `src/components/ui/DateField.tsx`

Three quick-pick chips (Today / Yesterday / Pick…) + reveal styled native `<input type="date">` for everything else. Replaces the fragile `<Field type="text" helper="YYYY-MM-DD" />` pattern in log sheets.

### 2.17 `DatePicker` — `src/components/ui/DatePicker.tsx`

Full month-grid calendar drawer. Year jumper, quick offset chips (Today/Yesterday/Tomorrow/Last 7/1 month ago), marked-date dots, clearable, swipe-to-change-month on mobile (50px threshold), compact inline mode (drops Sheet wrapper for inline embedding). Uses `Sheet` bottom drawer.

### 2.18 `DateRangePicker` — `src/components/ui/DateRangePicker.tsx`

Two tappable rows, each opening the DatePicker drawer. Enforces start ≤ end by clamping the second picker's `min`. Read-only display when `disabled`.

### 2.19 `TimePicker` — `src/components/ui/TimePicker.tsx`

Locale-aware 12h/24h picker. Bounds support (`minTime`/`maxTime` as HH:mm). "Now" quick chip snaps to current time rounded to `minuteStep`. Custom presets. IntersectionObserver-driven wheel-snap scroll. Type-to-input above columns. Sheet bottom drawer.

### 2.20 `PickerField` — `src/components/ui/PickerField.tsx`

"Looks like a Select, opens a picker dialog on click" form field. Labelled button row matching Select's visual weight. Used by drawers that surface Date / Time / Recurrence / Client pickers in form context.

---

### 2.21 `SearchBar` — `src/components/ui/SearchBar.tsx`

Pill-shaped input with leading search icon + optional clear button. Mobile: `h-9` (36px) + `text-input` (16px, prevents iOS auto-zoom). Desktop: `h-8` (32px) + `text-small`. Focus ring wraps the whole container via `focus-within` (accent ring); input's own outline is suppressed via `focus-visible:outline-none`.

---

### 2.22 `EmojiPicker` — `src/components/ui/EmojiPicker.tsx`

Categorised emoji picker with search + recents. Fixed-height panel; consumer decides where to mount it (sheet on mobile, popover on desktop). Recents bumped to localStorage on pick.

### 2.23 `InlineEditableText` — `src/components/ui/InlineEditableText.tsx`

Tap-to-edit single-line or multiline text. Render-as-text, tap to turn into an input. Used by programme builder for session name, focus, week note, block title.

### 2.24 `MuscleChipPicker` — `src/components/ui/MuscleChipPicker.tsx`

11-muscle picker + "add other" overflow. Anything outside the 11 maps to a free-text custom chip stored alongside canonical picks. Data shape stays `string[]`.

### 2.25 `EquipmentTaxonomyPicker` — `src/components/ui/EquipmentTaxonomyPicker.tsx`

Search-anywhere chip picker over the 61-node equipment taxonomy in `src/data/equipmentTaxonomy.ts`. "all of these" / "any of these" toggle decides `allOf` vs `anyOf` on the resulting `EquipmentRequirement`.

### 2.26 `AlternativesPicker` — `src/components/ui/AlternativesPicker.tsx`

Typeahead chip picker over the existing exercise library. Caps at 5 picks. Excludes self (`selfId`) + already-picked. Free text intentionally not supported (must be a real library exercise).

### 2.27 `Stepper` — `src/components/ui/Stepper.tsx`

Canonical step indicator for multi-step wizards. Row of numbered circles with connector lines + step labels. States per step: `complete` (accent-tinted with check icon), `current` (filled brand circle with number), `upcoming` (outlined muted circle). Connector between completed steps draws in left-to-right over 400ms as user advances.

---

## 3. Feedback primitives

### 3.1 `Toast` + `ToastHost` — `src/components/ui/Toast.tsx`

Top-anchored, auto-dismiss 3s, replace-not-stack. Variants: `info`, `success`, `error`, `update`. `push({title, body, durationMs, action})` API via `useToasts()`. Duration 0 = sticky (used for the PWA update toast).

**Motion:** `toastMotion` — enter drops 16px with springSnappy, exit lifts 16px with linear 200ms.

### 3.2 `UpdateToast` — `src/components/ui/UpdateToast.tsx`

Thin wrapper around Toast's `update` variant. Listens for the SW `elevra:update-ready` event and dispatches a sticky toast with a "Refresh" action.

### 3.3 `Skeleton`, `SkeletonListRow`, `SkeletonCard` — `src/components/ui/Skeleton.tsx`

Gradient-sweep placeholders. Used for content loads instead of spinners so there's no spinner-then-layout-jump. `Skeleton` primitive: `width`, `height`, `shape='rect' | 'circle' | 'pill'`. Pre-baked layouts: `SkeletonListRow`, `SkeletonCard`.

**Motion:** `skeletonShimmer` — 1.4s linear loop of `backgroundPosition: 0% → 100%`. Framer `MotionConfig` collapses to static under reduced motion.

**Skeleton CSS variables:** `--skeleton-from`, `--skeleton-via` per theme.

### 3.4 `ContentPulse` — `src/components/ui/ContentPulse.tsx`

Page-level loading view. Empty, transparent overlay over the content zone while data fetches. The AppShell aurora shines through — that's the "in-between" the user wants. No loader visual, no skeleton, just room for cards to land.

### 3.5 `EmptyState` — `src/components/ui/EmptyState.tsx`

Every list screen has a designed empty. Illustration slot (default: ElevraMark at 70% opacity), title, optional body, optional action. Wraps in `max-w-[420px]` centered card with hairline border.

### 3.6 `TabFetchStates` — `src/components/ui/TabFetchStates.tsx`

Shared loading + error scaffolding for screens that fetch on mount. `<TabLoading>` = 2-3 stacked SkeletonCards. `<TabError>` = EmptyState + "Try again" Button. Keeps loading and empty visually distinct.

### 3.7 `Banner` — `src/components/ui/Banner.tsx`

Single-line action prompt with icon + title + body + button. Tones: `accent`, `warn`, `lime`. Icons: 8 curated names. When `action` is empty string, the button omits — supports the calm "all in for today" closer with no CTA.

### 3.8 `InfoCallout` — `src/components/ui/InfoCallout.tsx`

Soft-tinted "you should know this" card. Icon on left, optional heading, body copy. Used to explain WHY a form asks for something ("Why this matters") without demanding attention.

### 3.9 `TipFooter` — `src/components/ui/TipFooter.tsx`

Small "🟡 Tip: …" or "🛡 Urgent always delivered" row at the bottom of drawers. Variants: `tip` (sun icon, warn tone), `disclaimer` (shield icon, accent tone).

### 3.10 `Tooltip` — `src/components/ui/Tooltip.tsx`

Inline floating popover anchored INSIDE a relatively-positioned trigger. Not a menu — no focus trap, no list semantics. Designed for the long-press breakdown pattern. Backdrop-blur surface, `role="tooltip"`, fade + slight rise on enter. Auto-dismiss `autoDismissMs`. Pairs with `useLongPress`.

### 3.11 `HelpWidget` — `src/components/ui/HelpWidget.tsx`

Floating support / feedback surface. Glass pill trigger in bottom-right (above mobile TabBar). Auto-compacts to just "?" icon on scroll. Feeds into shared inbox at inbox@thesalesprogressor.co.uk (shared with the Sales Progressor product for now).

### 3.12 `OfflinePill` — `src/components/ui/OfflinePill.tsx`

Subtle banner that drops in when `navigator.onLine` is false. Copy: "Offline, showing your latest."

### 3.13 `SupportBadge` — `src/components/ui/SupportBadge.tsx`

"Will this exercise work at this gym?" tag. Four states with a single API: `supported` (quiet; `showWhenSupported` renders a small lime "Good here" tag for parity), plus three warning tiers.

### 3.14 `Badge` — `src/components/ui/Badge.tsx`

Small count or indicator. TabBar icons and ListRow trailing slots. `dot` mode hides the number for "just a presence" indicator.

```ts
interface BadgeProps { count?, dot?, tone?='accent', className? }
```

### 3.15 `StatusPill` — `src/components/ui/StatusPill.tsx`

`onTrack` / `quiet` / `atRisk` — coach surfaces only, never client-facing. At-risk variant's dot pulses via `statusPulse` (2s loop). Reduced motion = static dot.

### 3.16 `PulseBandDot` — `src/components/ui/PulseBandDot.tsx`

Green / amber / red Pulse Score indicator. Just the dot with optional label. Client-facing copy lives elsewhere — this is the visual token.

### 3.17 `PulseDot` — `src/components/ui/PulseDot.tsx`

Tone-coloured dot with soft ping-ring halo. Pure CSS animation ("live", "syncing", "online", "active now"). Reduced-motion via `transform`-only animation (browsers throttle these under reduced motion).

---

## 4. Data-display primitives

### 4.1 `Card` — `src/components/ui/Card.tsx`

Frosted surface, `lg` radius. Variants: `default`, `featured` (gradient hairline for "great week"), `pressable` (whole card is interactive; hover lifts -3px + raised shadow; press scale 0.98).

**Surface lock (2026-06-22):** optional `surface: 'liquidMercury' | 'hyper' | 'crystal' | 'onyx'` swaps the bg/border/shadow/backdrop-blur block for locked tokens from `/dev/elevation`. All motion, padding, hover/focus, transitions, ARIA unchanged. Default (undefined) keeps `bg-bgElevated` — no visual regression risk.

**Motion:** hover `{y: -3, boxShadow: '0 16px 36px rgba(15,26,46,0.14)'}`, press `{scale: 0.98, y: 0}`, spring `{stiffness: 380, damping: 28}`.

### 4.2 `IconBadge` — `src/components/ui/IconBadge.tsx`

Tone-tinted icon tile. Row leader across DrawerActionRow, ChallengeRow, CurrentPlanCard, ReportTypeRow, sheet menu rows. Default shape: `circle`, size `sm` (`h-7 w-7`, icon 14px). Variants: `filled` (default; pastel bg from `--badge-{tone}-bg/fg`), `tinted-bordered` (1px tonal border + 15% bg + solid tonal text — used for selectable-row affordances).

### 4.3 `MetricStat` — `src/components/ui/MetricStat.tsx`

Big tabular number + label + delta arrow (▲▼). Hero of nearly every coach + client screen. Numbers always `tabular-nums`. Delta arrow: `lime` for positive-in-goal-direction, `danger` for negative, `textMuted` for no change.

### 4.4 `StatCard` — `src/components/ui/StatCard.tsx`

Opinionated tile in top-of-Home stat row. Top: coloured icon badge + uppercase eyebrow. Middle: big value (display-style numeral). Bottom: optional footer (trend delta / mini progress bar / CTA). Optional `onClick` makes the whole tile pressable. `valueGradient` clips the big number to the brand gradient.

**Hover:** icon badge scales 1.15 + card border shifts to accent (clean colour change, not bg fade).

### 4.5 `CountUp` — `src/components/ui/CountUp.tsx`

Animated count tween. When `value` changes, tweens from previous to new over `durationMs` (default 600ms cubic ease-out). Integers round each frame; decimals preserve one place. Respects `prefers-reduced-motion`.

### 4.6 `ProgressRing` — `src/components/ui/ProgressRing.tsx`

270° semi-circular gauge (Apple-Watch feel), animated fill. Used for adherence, recovery, "x of y". Motion: `drawTransition` (700ms expo-out) on mount + on value change. Sizes sm/md/lg. Optional centre label slot.

### 4.7 `PhaseRing` — `src/components/ui/PhaseRing.tsx`

Cycle phase indicator using calm phase tokens. Four-segment ring with current phase highlighted. `caption` for hint ("Day 14 · high confidence"), `state: 'shared' | 'private' | 'off'` for privacy (private/off never leak the underlying phase). `uncertain` renders dashed segment edges to echo widened boundary bands.

### 4.8 `WaterGlass` — `src/components/ui/WaterGlass.tsx`

Animated glass primitive with live sine-wave water fill. Extracted from FoodHydrationCard to share with HabitsDetailSheet. Sine wave 3.2s continuous loop. `pingKey` increment drops a droplet from above the glass to sell "a drink just landed". Both animations skip under `useReducedMotion`. `showPercentage` prints fraction inside the glass.

### 4.9 `MetricSparkline` — `src/components/ui/MetricSparkline.tsx`

40×16 default, single stroke, tonal. Renders nothing when < 2 data points (one point isn't a trend). Caller picks tone.

### 4.10 `MiniProgressBar` — `src/components/ui/MiniProgressBar.tsx`

4px-tall track + filled bar in single accent tone. No animation. Pairs with the Check-ins stat card on Home.

### 4.11 `StreakFlame` — `src/components/ui/StreakFlame.tsx`

Number + flame glyph. Milestone celebration state for 7 / 30 / 100 day marks (`STREAK.milestones`). Celebration adds a brief shimmer behind the flame. Reduced motion = static highlight.

### 4.12 `Avatar` — `src/components/ui/Avatar.tsx`

Photo or `user` icon on a deterministic-colour disc. Sizes sm/md/lg/xl. Stack variant overlaps for "5 participants" rows. Determinism: hash name once, pick from a small palette of brand-safe accent colours. Same disc colour for "Tom B." everywhere.

### 4.13 `BrandLogo` — `src/components/ui/BrandLogo.tsx`

Canonical Elevra mark. Thin delegate — preserves the legacy `size` + `withWordmark` API. Under the hood routes to `src/components/brand/ElevraMark` / `ElevraLogo`. Static animation by default.

### 4.14 `Illustration` — `src/components/ui/Illustration.tsx`

Inline SVG illustrations, hand-drawn in the stroke-style of the rest of the app's iconography. Used by warm empty states ("No sessions today", "Nothing in the inbox"). 64×64 viewBox; caller sets visible size via `size`.

### 4.15 `MarkdownText` — `src/components/ui/MarkdownText.tsx`

Display-side wrapper around `renderMarkdown` (`src/lib/markdown.tsx`). Drop-in for any message bubble or template preview.

### 4.16 `ExerciseCard` — `src/components/ui/ExerciseCard.tsx`

Shared pressable card used by library grid, programme-builder picker, workout-player swap sheet.

**Layouts:**
- `default` — thumbnail on top (aspect-video), meta + name + muscles below. 2-col library grid.
- `compact` — single row, small square thumbnail on the left. Dense pickers / sheets.

### 4.17 `LoopingFrames` — `src/components/ui/LoopingFrames.tsx`

Alternates an exercise's two demo frames at fixed cadence — reads as a low-bandwidth "GIF" demo. Honours reduced-motion (renders frame 0 only). Frames hit the GitHub raw CDN; SW's CacheFirst image strategy persists them offline after first view.

---

## 5. Container / layout primitives

### 5.1 `Sheet` — `src/components/ui/Sheet.tsx`

The drawer primitive. **Two positions:**
- `bottom` (default) — bottom-anchored on every breakpoint. Drag-to-dismiss with velocity-aware spring. Grabber bar.
- `center` — bottom-anchored on mobile (< lg), centered card on `lg:+` with backdrop blur. Drag-to-dismiss suppressed on centered shape.

Both: backdrop fades to 60% black, body scroll-locked, safe-area padding, ESC to close. Detents (`content` / `medium` / `full`) only on bottom layout.

**Defaults post-2026-06-15 (fluidGlass on by default):**
- Panel bg: `bg-bg/80 backdrop-blur-md` (was solid `bg-bgElevated`)
- Top fade overlay: 28px sticky gradient, opacity scroll-driven
- Scrollbar: `.sheet-scrollbar` (6px, accent-tinted)

Per-sheet opt-out: `fluidGlass={false}`.

Optional `hero: { icon, tone }` renders IconBadge above title. Focus trap via `useFocusTrap`. Renders via `createPortal` to `document.body`.

### 5.2 `Modal` — `src/components/ui/Modal.tsx`

Centre dialog. Confirmations only (destructive + irreversible). Title + body + action row. Destructive button right (platform convention); both full-width on phone, side-by-side on tablet+.

**Optional slots (Polish-arc session 2, 2026-06-08):**
- `hero`: large tinted IconBadge above title, optional corner badge (red "!" dot).
- `infoCard`: purple-tinted callout between body and actions.
- `footerNote`: small muted disclaimer below action row.
- `primary.leadingIcon`: glyph on primary CTA.

All four optional; simple title + body + two-button shape still works untouched.

### 5.3 `PortalPopover` — `src/components/ui/PortalPopover.tsx`

Canonical floating menu / dropdown / tooltip primitive. Renders via portal so it escapes ancestor CSS stacking contexts (`transform`, `opacity < 1`, `filter`, `will-change: transform`, `isolation: isolate` all trap absolutely-positioned descendants otherwise). z-index defaults to `popover` (35); `elevated` prop bumps to `popoverElevated` (45) for popovers triggered from inside sheets.

### 5.4 `ListRow` — `src/components/ui/ListRow.tsx`

Avatar/icon + title + subtitle + trailing slot. Swipe actions (message / nudge) reveal via a Framer drag on x-axis with `dragConstraints` from `0` to `-(actionCount * 88px)`. Snap: closed unless dragged past halfway. Basic non-swipe variant is a styled row with press affordance.

```ts
interface SwipeAction { icon: IconName; label: string; tone: 'accent' | 'warn' | 'danger'; onAction: () => void; }
```

### 5.5 `DrawerActionRow` — `src/components/ui/DrawerActionRow.tsx`

Canonical "icon badge + title + subtitle + trailing" row inside drawers (Profile, Settings, Notifications, Search quick actions, Calendar tools, Thread options, Log outcome, Challenge row actions). Defaults to a button. `destructive` switches to danger tones. Trailing slot defaults to chevron; override for checkboxes / toggles.

### 5.6 `DrawerActionRowGlass` — `src/components/ui/DrawerActionRowGlass.tsx`

Fluid-glass sibling of DrawerActionRow. Same API; tuned visuals for sheets whose panel is `bg-bg/80 backdrop-blur-md` (the default since 2026-06-15). Kept as a sibling instead of editing the canonical row, so 20+ sheets on the old row don't regress silently.

### 5.7 `DrawerPreviewLayout` — `src/components/ui/DrawerPreviewLayout.tsx`

Canonical "config-on-left, live-preview-on-right" 2-column body used by Challenge row actions, Send praise, Edit/New challenge. `lg:grid-cols-2` shape (matches the mock breakpoint at `lg:` because `width="wide"` sheets only get centered card from `lg:+`). Stacks below the breakpoint.

### 5.8 `Tabs` — `src/components/ui/Tabs.tsx`

In-screen tabs with sliding active underline via `layoutId`. Used inside screens (client detail Overview · Progress · Training). For app-level tabs see `TabBar` in shells. Softer spring than SegmentedControl (less wobble).

### 5.9 `PullToRefresh` — `src/components/ui/PullToRefresh.tsx`

Branded spinner that drops in from the top while user pulls down past a threshold. Custom (not browser native) so it follows brand. Touch-driven; wheel + pointer on desktop fall through to OS scroll. `onRefresh` fires once when threshold exceeded and finger released.

### 5.10 `SwipeAction` — `src/components/ui/SwipeAction.tsx`

Wrap a list-row to enable swipe-to-commit. Drag leftward reveals coloured action panel behind. Release with `offset.x < -threshold * width` OR velocity < -800px/s commits: row animates fully off-screen left, then `onComplete()` fires.

### 5.11 `StaggeredBody` — `src/components/ui/StaggeredBody.tsx`

Fades + drifts each direct child up on mount with per-item delay. Extracted 2026-07-12 from ~15 identical drawer bodies. `reduce` (from `useReducedMotion()`) is passed in by caller so the drawer's motion policy stays coherent.

---

## 6. Media capture primitives

### 6.1 `PhotoCapture` — `src/components/ui/PhotoCapture.tsx`

File input wired to camera (`capture="environment"`) with brand-styled trigger. Returns a Blob and preview `ObjectURL`. States: idle / chosen / error.

### 6.2 `VideoRecorder` — `src/components/ui/VideoRecorder.tsx`

Coach exercise filming. 60-second cap (per `WORKOUT.videoMaxSeconds`). States: idle, recording (with countdown), preview, error. Uses camera-capture file-input route; OS-native compression.

### 6.3 `VoiceRecorder` — `src/components/ui/VoiceRecorder.tsx`

Push-to-talk. States: idle, recording, preview (with playback), error (mic denied / unsupported). Uses MediaRecorder where available; degrades gracefully. Returns Blob + objectURL on stop.

### 6.4 `ExerciseImageCapture` — `src/components/ui/ExerciseImageCapture.tsx`

Two-tile start/end frame uploader for NewExerciseSheet Media step. Stores as `images: string[]` — start frame at index 0, end at index 1. Each tile opens file picker, hands blob to `onUpload` callback.

### 6.5 `RichTextEditor` — `src/components/ui/RichTextEditor.tsx`

TipTap-backed editable surface. Formatting toolbar: Bold / Italic / Link / Bullet list / Numbered list / Emoji. Output: HTML via `onChangeHtml`. Caller runs `htmlToMarkdown` from `lib/markdown.tsx` before persisting to keep DB portable + safe.

---

## 7. Specialised sheets / drawers

### 7.1 `ShareToCoachSheet` — `src/components/ui/ShareToCoachSheet.tsx`

Canonical share-with-coach confirm primitive. Extracted 2026-07-03 to retire three near-identical siblings (ShareMeasurementSheet / ShareTrendSheet / SharePerformanceSheet). `marker` string supplied by callsite so one primitive covers every share flow.

### 7.2 `PrePermissionSheet` — `src/components/ui/PrePermissionSheet.tsx`

Push permission + preferences drawer. Three modes adapting to `Notification.permission`: `default` (first-time consent + categories + reassurance + "Not now" / "Enable notifications"), plus the subsequent states. Submit asks the OS prompt + saves prefs.

### 7.3 `InstallCoach` — `src/components/ui/InstallCoach.tsx`

Branded install drawer. Three platforms (iOS, Android, Desktop), each with two phases: `prompt` (explainer + CTA + don't-ask-again link), `installed` (success — lime check hero + "Get started" close).

---

## 8. Iconography

### 8.1 `Icon` — `src/components/ui/Icon.tsx`

Canonical glyph dispatcher. Default family: **Heroicons Solid** (chosen via icon-gallery picks in Phase 4D V2). Alternate families: `family="duotone"` (Phosphor Duotone — inbox-style rows), `family="feather"` (Feather Icons — drawer rows).

API: `<Icon name="user" size={20} />`. Every icon has a semantic name; the mapping to underlying library glyphs is internal.

### 8.2 IconName type

The full set of semantic icon names is exported from `Icon.tsx`. See file for the union. Notable names used across the app: `user`, `bell`, `check`, `alert`, `refresh`, `loader`, `sun`, `shield`, `search`, `settings`, `close`, `chevron-right`, `chevron-down`, `back`, `flame`, `trend-up`, `trend-down`, `camera`, `mic`, `send`, `edit`, `trash`, `pin`, `filter`, `sparkle`, `star`, etc.

---

## Component catalog summary table

| # | Component | File | Purpose | Reuse |
|---|---|---|---|---|
| 1 | Button | Button.tsx | Universal button | high |
| 2 | IconButton | IconButton.tsx | Icon-only round button | high |
| 3 | Chip | Chip.tsx | Pill primitive | high |
| 4 | FilterChip | FilterChip.tsx | Filter chip with count | medium |
| 5 | IconChipButton | IconChipButton.tsx | Square inline remove/close | medium |
| 6 | ActionTile | ActionTile.tsx | Coach Home quick-action tile | medium |
| 7 | QuickActionTile | QuickActionTile.tsx | Drawer quick-action tile | medium |
| 8 | TonalGradientButton | TonalGradientButton.tsx | Per-tone gradient CTA | low-medium |
| 9 | TextLink | TextLink.tsx | Text-style affordance | high |
| 10 | SocialAuthButton | SocialAuthButton.tsx | OAuth CTA | low |
| 11 | Field | Field.tsx | Text input | high |
| 12 | Textarea | Textarea.tsx | Multi-line input | high |
| 13 | IntegerField | IntegerField.tsx | Numeric input, blur-clamp | medium |
| 14 | PasswordField | PasswordField.tsx | Password + reveal | medium |
| 15 | PasswordStrengthMeter | PasswordStrengthMeter.tsx | Strength bar | low |
| 16 | Select | Select.tsx | Dropdown | high |
| 17 | Checkbox | Checkbox.tsx | Boolean tick | high |
| 18 | RadioRow | RadioRow.tsx | Large one-of-N row | medium |
| 19 | RadioTile | RadioTile.tsx | Icon-bearing one-of-N tile | low-medium |
| 20 | Toggle | Toggle.tsx | Boolean switch | high |
| 21 | SegmentedControl | SegmentedControl.tsx | Mutually-exclusive segmented | high |
| 22 | Slider | Slider.tsx | Native range | medium |
| 23 | PulseSlider | PulseSlider.tsx | 1-10 spring slider | medium |
| 24 | GradientSlider | GradientSlider.tsx | Gradient-track drag slider | medium |
| 25 | PeriodSlider | PeriodSlider.tsx | 2w-12w period selector | medium |
| 26 | DateField | DateField.tsx | Quick-pick date | high |
| 27 | DatePicker | DatePicker.tsx | Calendar drawer | high |
| 28 | DateRangePicker | DateRangePicker.tsx | Start/end pair | medium |
| 29 | TimePicker | TimePicker.tsx | Locale-aware time drawer | medium |
| 30 | PickerField | PickerField.tsx | Select-look picker button | medium |
| 31 | SearchBar | SearchBar.tsx | Pill search input | high |
| 32 | EmojiPicker | EmojiPicker.tsx | Categorised emoji | low-medium |
| 33 | InlineEditableText | InlineEditableText.tsx | Tap-to-edit text | medium |
| 34 | MuscleChipPicker | MuscleChipPicker.tsx | 11-muscle picker | low (domain) |
| 35 | EquipmentTaxonomyPicker | EquipmentTaxonomyPicker.tsx | Equipment picker | low (domain) |
| 36 | AlternativesPicker | AlternativesPicker.tsx | Exercise alternatives picker | low (domain) |
| 37 | Stepper | Stepper.tsx | Wizard step indicator | medium |
| 38 | Toast / ToastHost | Toast.tsx | Auto-dismiss toast | high |
| 39 | UpdateToast | UpdateToast.tsx | PWA update toast | low |
| 40 | Skeleton | Skeleton.tsx | Shimmer placeholder | high |
| 41 | ContentPulse | ContentPulse.tsx | Page-level load view | medium |
| 42 | EmptyState | EmptyState.tsx | Designed empty | high |
| 43 | TabFetchStates | TabFetchStates.tsx | Loading + error scaffold | high |
| 44 | Banner | Banner.tsx | Single-line prompt | medium |
| 45 | InfoCallout | InfoCallout.tsx | Soft-tinted info card | medium |
| 46 | TipFooter | TipFooter.tsx | Drawer footnote | medium |
| 47 | Tooltip | Tooltip.tsx | Inline floating tooltip | medium |
| 48 | HelpWidget | HelpWidget.tsx | Floating support pill | low |
| 49 | OfflinePill | OfflinePill.tsx | Offline banner | low |
| 50 | SupportBadge | SupportBadge.tsx | Exercise support tag | low (domain) |
| 51 | Badge | Badge.tsx | Count/dot indicator | high |
| 52 | StatusPill | StatusPill.tsx | Coach status | medium |
| 53 | PulseBandDot | PulseBandDot.tsx | Pulse score dot | low (domain) |
| 54 | PulseDot | PulseDot.tsx | Live/syncing dot | medium |
| 55 | Card | Card.tsx | Frosted surface | high |
| 56 | IconBadge | IconBadge.tsx | Tone-tinted icon tile | high |
| 57 | MetricStat | MetricStat.tsx | Big number + delta | high |
| 58 | StatCard | StatCard.tsx | Home stat tile | high |
| 59 | CountUp | CountUp.tsx | Animated tween count | medium |
| 60 | ProgressRing | ProgressRing.tsx | 270° gauge | high |
| 61 | PhaseRing | PhaseRing.tsx | Cycle phase ring | low (domain) |
| 62 | WaterGlass | WaterGlass.tsx | Animated glass fill | low (domain) |
| 63 | MetricSparkline | MetricSparkline.tsx | Tiny inline sparkline | medium |
| 64 | MiniProgressBar | MiniProgressBar.tsx | 4px progress bar | high |
| 65 | StreakFlame | StreakFlame.tsx | Streak count | low (domain) |
| 66 | Avatar | Avatar.tsx | User disc | high |
| 67 | BrandLogo | BrandLogo.tsx | Elevra mark delegate | high |
| 68 | Illustration | Illustration.tsx | Stroke-style SVGs | medium |
| 69 | MarkdownText | MarkdownText.tsx | Markdown display | medium |
| 70 | ExerciseCard | ExerciseCard.tsx | Exercise picker card | low (domain) |
| 71 | LoopingFrames | LoopingFrames.tsx | 2-frame GIF-alike | low (domain) |
| 72 | Sheet | Sheet.tsx | Drawer primitive | high |
| 73 | Modal | Modal.tsx | Confirm dialog | high |
| 74 | PortalPopover | PortalPopover.tsx | Floating menu | high |
| 75 | ListRow | ListRow.tsx | List-row primitive | high |
| 76 | DrawerActionRow | DrawerActionRow.tsx | Drawer action row | high |
| 77 | DrawerActionRowGlass | DrawerActionRowGlass.tsx | Glass action row | medium |
| 78 | DrawerPreviewLayout | DrawerPreviewLayout.tsx | Config + preview grid | medium |
| 79 | Tabs | Tabs.tsx | In-screen tabs | high |
| 80 | PullToRefresh | PullToRefresh.tsx | Branded PTR | medium |
| 81 | SwipeAction | SwipeAction.tsx | Swipe-to-commit wrap | medium |
| 82 | StaggeredBody | StaggeredBody.tsx | Sheet body stagger | high |
| 83 | PhotoCapture | PhotoCapture.tsx | Camera capture | medium |
| 84 | VideoRecorder | VideoRecorder.tsx | Video capture | low-medium |
| 85 | VoiceRecorder | VoiceRecorder.tsx | Voice capture | low-medium |
| 86 | ExerciseImageCapture | ExerciseImageCapture.tsx | Two-tile frame uploader | low (domain) |
| 87 | RichTextEditor | RichTextEditor.tsx | TipTap editor | medium |
| 88 | ShareToCoachSheet | ShareToCoachSheet.tsx | Share-with-coach primitive | low (domain) |
| 89 | PrePermissionSheet | PrePermissionSheet.tsx | Push consent drawer | low |
| 90 | InstallCoach | InstallCoach.tsx | PWA install drawer | low |
| 91 | Icon | Icon.tsx | Glyph dispatcher | universal |

## Component library principles enforced across all of the above

1. **Motion is centralised.** Components never inline a transition config — they import from `src/lib/motion.ts`. See MOTION_AND_ANIMATION.md.
2. **Colour is a token.** No hex literals in JSX except for the ~10 documented bypasses (see DESIGN_TOKENS.md § HARDCODED STYLE BYPASSES).
3. **Focus is global.** Every focusable element gets a `:focus-visible` ring from `src/index.css`. Components don't roll their own.
4. **Every input is 16px+ minimum.** Prevents iOS Safari auto-zoom on focus.
5. **Every touch target is 44px minimum.** Small visual affordances extend hit area via `::before` pseudo (`IconButton sm`, small chips, etc.).
6. **Every list has a designed empty.** `EmptyState` is not a fallback — it's a first-class state.
7. **Loading is skeleton, not spinner.** `Skeleton*` primitives compose to match the final layout so the load-in doesn't jump.
8. **Every drawer is a `Sheet`.** No bespoke drawer shells. Modal is only for destructive confirms.
9. **Every string passes VOICE.md.** No em-dashes, no exclamation marks, no titles (Mr./Mrs.), plain English only.
10. **Every animation respects `prefers-reduced-motion`.** Either via `MotionConfig`, `useMotionSafe()`, or the CSS `[data-motion='reduce']` block.
