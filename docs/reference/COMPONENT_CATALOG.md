# Component Catalog

Every UI primitive: name, file, props, states. Updated with every new primitive. Canon defined in /docs/reference/elevra-audit/COMPONENT_INVENTORY.md with fixes per /docs/spec/05_DESIGN_SYSTEM.md.

The living reference is `/dev/gallery` (dark + light, all states). Screenshot baseline in `e2e/__screenshots__/`.

## M0 primitives (all in `src/components/ui/`)

| Component | File | Purpose | Notable states / fixes |
|---|---|---|---|
| Icon | Icon.tsx | Semantic glyph dispatcher over Lucide | decorative by default (`aria-hidden`); domain map (requests/listings/…) |
| Button | Button.tsx | Universal button | 5 variants × sm/xl; loading, disabled, icons, full-width auto-tall |
| IconButton | IconButton.tsx | Icon-only round button | required `ariaLabel`; sm keeps 44px hit area; badge dot |
| Chip | Chip.tsx | Filter / tag pill | **44px** (fix #4); tint + solid; selected; tones |
| Badge | Badge.tsx | Count / dot indicator | count cap 99+, dot mode, tones |
| Card | Card.tsx | Frosted surface | default / featured / pressable (keyboard-operable) |
| IconBadge | IconBadge.tsx | Tone-tinted icon tile | filled / tinted-bordered; sm/md/lg |
| Avatar | Avatar.tsx | User disc | deterministic tone from name; photo / initials / icon |
| ListRow | ListRow.tsx | The one row primitive | **`surface` prop** (fix #7); plain / pressable |
| Sheet | Sheet.tsx | The only drawer | bottom + center; focus trap, ESC, scroll-lock, drag-to-dismiss, fluidGlass |
| Modal | Modal.tsx | Destructive confirm dialog | hero, footerNote, destructive; focus trap |
| Toast / ToastProvider | Toast.tsx | Auto-dismiss toasts | info/success/error/update; sticky (duration 0); `useToasts()` |
| EmptyState | EmptyState.tsx | First-class designed empty | invitation copy + action |
| Skeleton (+ListRow/+Card) | Skeleton.tsx | Shimmer placeholder | collapses to static under reduced motion |
| SegmentedControl | SegmentedControl.tsx | Mutually-exclusive segments | sliding pill (`layoutId`), arrow-nav, per-option disabled |
| Tabs | Tabs.tsx | In-screen tabs | sliding underline, arrow-nav |
| SearchBar | SearchBar.tsx | Pill search input | focus-within ring; clear button; 16px floor |
| Field | Field.tsx | Labelled text input | helper / error / prefix / suffix; 16px floor |
| Textarea | Textarea.tsx | Multi-line input | live counter on `maxLength` |
| Select | Select.tsx | Token-styled dropdown | native under the hood; chevron overlay |
| Checkbox | Checkbox.tsx | Boolean tick | 44px label target |
| Toggle | Toggle.tsx | Boolean switch | spring knob; 44px hit area |
| RadioGroup | RadioRow.tsx | One-of-N rows | roving arrow-nav radiogroup; dot springs in |
| Banner | Banner.tsx | Single-line prompt | accent / warn / positive; optional CTA |
| InfoCallout | InfoCallout.tsx | Soft-tinted info card | explains WHY |
| TextLink | TextLink.tsx | Text affordance | centre-out underline; anchor or button |
| PullToRefresh | PullToRefresh.tsx | Branded pull-to-refresh | touch-driven; indicator drops in |
| SwipeAction | SwipeAction.tsx | Swipe-to-commit wrap | drag left → commit off-screen |
| StaggeredBody | StaggeredBody.tsx | Drawer body stagger | caller passes reduce policy |
| MetricStat | MetricStat.tsx | Big number + delta | tabular numerals; up/down/none |
| StatCard | StatCard.tsx | Home stat tile | icon badge + eyebrow + value; pressable; value gradient |
| BrandLogo | BrandLogo.tsx | The Local mark | SVG stops read `var(--c-accent/…)` — re-colours with theme/skin/accent |

Shared: `tones.ts` (badge tone → CSS-var classes), `primitiveProps.ts` (framer-safe native prop omissions).
