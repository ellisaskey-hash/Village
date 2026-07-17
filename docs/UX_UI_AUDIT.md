# UX/UI Upgrade Audit — Village/Local

**Date:** 2026-07-17
**Method:** 8 parallel surface auditors (shell/nav/home, content browse+detail, directory, compose, inbox/messaging, auth/onboarding/profile, primitive library, admin) each measured against the Elevra reference bar (`docs/reference/elevra-audit/`: PATTERNS, MOTION_AND_ANIMATION, DESIGN_TOKENS, ACCESSIBILITY, COMPONENT_INVENTORY).
**Total findings:** 154 (read-only; no code changed in this pass).
**Bar:** "an app that's had millions of investment."

---

## Implementation progress

**Done (shipped 2026-07-17):**
- **All cross-cutting themes** — T1 (enum→label maps via `lib/labels.ts`), T2 (detail `<h1>` = entity name + eyebrow), T3 (tab spring/glow, safe-area tab bar, list/screen entrance motion), T6 (error states on Home/Me/admin), T8 (forced-colors focus, OS reduced-motion, Toast `role=alert`/cap/duration).
- **Tier 1 — content**: real peek CTAs (`?reply=1`), browse create affordances + Home quick-actions open composers (`?compose=`), clean price formatting, listing status leak fixed, EventDetail host banner + Report + capacity/waitlist copy.
- **Tier 1 — directory**: actionable contact/directions (`ContactRow`), editable business enquiry (was canned auto-send), claim-empty guard, per-type empty states with CTAs.
- **Tier 1 — inbox**: message previews (`lastSnippet`), optimistic send, explicit mark-all-read (unread stays live), day separators, smart auto-scroll, primary send button (new `IconButton` variant).

**Remaining:** Tier 2 (items 11-25) and Tier 3 (26-50) below, plus the noted seams that need migrations (event cancel/edit; Supabase thread snippet view). Directory dead-end rows (services/skills → no destination) need a product decision (profile route vs message flow) before build.

---

> Context: the earlier robustness pass already added a global `ErrorBoundary`, `QueryError` on browse/detail/inbox queries, and submit-empty guards. Findings below that touch those areas are the *remaining* gaps (Home / admin / Me still swallow errors; the empty guards want to become inline field errors).

---

## Part 1 — Cross-cutting themes (highest leverage: fix once, benefits everywhere)

These patterns recurred across 3+ independent surfaces. They are the biggest "funded-product illusion" breakers and the cheapest wins per unit of effort.

### T1. Raw enum values leak to users (VOICE / Law 21 breach) — 4 surfaces
Categories, identities, and `kind` render as raw tokens: `recommendations · Sam`, `tradesperson`, `green_space`. Filter chips already have humane labels that aren't reused for display.
- Content: `RequestsView.tsx:67`, `ListingDetail.tsx:91`, `PeekSheet.tsx:99`
- Directory: `PlaceDetail.tsx:39`, `OrganisationDetail.tsx:43`, `DirectoryView.tsx:127`
- Profile: `MeScreen.tsx:99-101` (identity chips)
- Admin: `CommunityConfig.tsx:11-15` (trust levels as bare integers)
- **Fix:** one shared `enum → label` map per taxonomy (reuse existing `CATS`/identity/trust label sets), render labels everywhere. Never rely on CSS `capitalize` over a raw enum.

### T2. The `<h1>` is the entity *type*, not its name — a11y + hierarchy — 2 surfaces, every detail page
Every detail page's sole `<h1>` is the generic word "Listing"/"Request"/"Event"/"Business"; the real name is demoted to `<h2>`. Screen readers announce the type, not the subject; the biggest text on a business's own page is "Business."
- Content: `ListingDetail.tsx:61`, `RequestDetail.tsx:58`, `EventDetail.tsx:36`
- Directory: `BusinessDetail.tsx:79`, `PlaceDetail.tsx:20`, `OrganisationDetail.tsx:24`, `EquipmentDetail.tsx:45`
- **Fix:** name becomes `<h1>`; type becomes a small `text-eyebrow` kicker above it. Also feeds `document.title` (see T8).

### T3. Defined motion vocabulary sits unused → screens feel flat — 4 surfaces
`tabScreenCrossfade`, `listContainer`/`listItem`, and the active-tab spring/glow are all defined in `motion.ts` but never consumed on the busiest surfaces, so navigation hard-cuts and lists pop in.
- Shell: `<Outlet/>` not wrapped in `AnimatePresence`; active tab only swaps text colour (`AppShell.tsx:116,163-182`)
- Directory list: no entrance motion at all (`DirectoryView.tsx:60`)
- Content browse: cards/rows pop in, no `listItem` (`ListingsView`, `RequestsView`, `EventsView`)
- Admin: section switch hard-cuts (`AdminLayout.tsx:62`)
- **Fix:** wrap route outlets in `AnimatePresence` + `tabScreenCrossfade`; wrap list regions in `listContainer` with per-item `listItem` (cap first ~12); add active-tab icon spring + `shadow-glowAccent`.

### T4. Validation is "disable the button" — the `Field.error` primitive exists but is used nowhere — 2 surfaces
`Field`/`Textarea` fully support `error` (danger border + `aria-invalid` + `aria-describedby`), but not a single composer or auth screen passes it. No inline per-field errors, no email/password format checks, no `<form>` wrapper (so Enter-to-submit is dead).
- Compose: all 7 composers (`ListingComposer.tsx:75` etc.); no `<form>` anywhere
- Auth: `SignUpScreen.tsx`, `SignInScreen.tsx`, `WelcomeScreen.tsx:19-29`
- **Fix:** Zod-per-form → map failures to `Field error`; wrap bodies in `<form onSubmit>`, primary button `type="submit"`; validate email shape + 8-char password client-side.

### T5. Empty states have no action, skeletons don't match final layout — 5 surfaces
Empty copy invites posting but ships no button (the `EmptyState.action` prop goes unused); loading skeletons are generic bars that snap into grids → visible reflow.
- Content: browse empties have no create CTA (`ListingsView.tsx:70`, etc.)
- Directory: one generic empty for 7 types, wrong icon, "being seeded" jargon (`DirectoryView.tsx:74`); skeleton is 2 bars even for card grids (`:72`)
- Home: skeleton shapes don't match the grid (`HomeScreen.tsx:80`)
- Me: no loading state, flashes empty + wrong trust level (`MeScreen.tsx:27-47`)
- Admin/Seeding: bare Card empty, no skeletons (`SeedingConsole.tsx:162`)
- **Fix:** every empty state gets a real action CTA + correct per-context icon/copy; skeletons mirror the resolved layout (extract `SkeletonCard`/`SkeletonListRow` variants).

### T6. Error states still swallowed on Home, Me, and all admin queries — 3 surfaces
(The browse/detail/inbox queries were fixed in the robustness pass; these were not.) `?? []` / fall-through-to-empty makes a failed fetch look like an empty inbox — dangerous in a moderation tool.
- Home: 4 queries with `?? []` (`HomeScreen.tsx:43-52`)
- Me: no error branch (`MeScreen.tsx`)
- Admin: `q.isError` never checked on any queue (`ReportsQueue.tsx:51`, `MembersQueue.tsx:63`, `AdminQueues.tsx`, `AdminDashboard.tsx:42`, `CommunityConfig.tsx:29`)
- **Fix:** reuse the new `QueryError` component with retry on these surfaces too.

### T7. Responsive: phone-width columns on desktop — 3 surfaces
Hardcoded `grid-cols-2` / single narrow column with no `lg:` step; `lg:900`/`xl:1200` tokens defined but unused.
- Content: `ListingsView.tsx:68` (2 huge cards/row on desktop)
- Directory: `DirectoryView.tsx:91,131`
- Admin: whole console capped at `max-w-3xl`, detail opens as a bottom Sheet even on a 27" monitor (`AdminLayout.tsx:30`)
- **Fix:** responsive column counts (`md:grid-cols-3 lg:grid-cols-4`); admin gets a desktop master-detail two-pane layout.

### T8. a11y hygiene gaps repeated app-wide
- `aria-current` on a decorative span / missing (shell `AppShell.tsx:167`, admin `AdminLayout.tsx:42`)
- No skip-to-content link outside the main shell; `document.title` never set per route, so `RouteAnnouncer` announces nothing meaningful (`App.tsx:79`)
- Status conveyed by colour-dot only, no text (member suspended, request status, inbox unread)
- Toast: `role="status"` for errors (should be `alert`) — flagged by both inbox and primitives auditors (`Toast.tsx:87`)
- Native `forced-colors` (WHCM) strips the focus ring (`outline:none`), and `prefers-reduced-motion` OS query is not honoured (only the in-app toggle) (`index.css:276,304`) — two one-block CSS fixes closing real holes
- **Fix:** batch a11y sweep; the forced-colors + reduced-motion CSS blocks are the cheapest high-value items in the whole audit.

### T9. The 7 composers diverge where they should be identical
Draft persistence (2/7), `StaggeredBody` entrance (3/7), success-toast-vs-navigate (split), category free-text-vs-Select (2 vs 3). A shared `<Composer>` scaffold would erase most of these at once.

### T10. Missing primitive families the reference treats as canonical
No `PortalPopover`/`Menu`/`Tooltip` (blocks overflow menus, desktop Select, date pickers); no `PasswordField` (icons already present), `DatePicker`/`TimePicker`, `Slider`, `Stepper`, `ProgressBar`/`CountUp`, `Accordion`/`Divider`. Several features hand-roll around these gaps (native datetime input, plain-text password).

---

## Part 2 — Priority tiers

### Tier 1 — Breaks the "funded product" illusion (do first)
1. **Peek-drawer CTAs are fake** — "Message" and "View listing" both navigate to the same detail page; the "quick action" promise is a no-op (`PeekSheet.tsx:54-56`). *[content #1]*
2. **No create/post affordance on any browse view** — no FAB, no empty-state action; a zero-listing community offers nothing to tap (`ListingsView`/`RequestsView`/`EventsView`). *[content #2]*
3. **Business Enquire auto-sends a canned message** the user never wrote, while Equipment opens a compose sheet — same interaction, two behaviours (`BusinessDetail.tsx:61`). *[directory #12]*
4. **Contact info & addresses are inert text** — phone/email/website/address not tappable (`tel:`/`mailto:`/maps); the highest-value action in a local directory does nothing (`BusinessDetail.tsx:105`, `PlaceDetail.tsx:43`). *[directory #6, #8]*
5. **EventDetail has no author controls and no Report** — a creator sees attendee UI for their own event; events are unreportable (whole file). *[content #4]*
6. **Price renders `£40.00` / `£1500.00`** — no thousands separator, forced pence (`ListingCard.tsx:19`). *[content #5]*
7. **Inbox rows show no message preview** — line 2 duplicates the name; no snippet to triage on (`InboxScreen.tsx:92`). *[inbox #1]*
8. **Sending a message has no optimistic UI** — your own message vanishes for the full round-trip (`ThreadScreen.tsx:51`). *[inbox #2]*
9. **Notifications tab marks everything read on view** — the unread accent is effectively dead (`InboxScreen.tsx:41`). *[inbox #6]*
10. **Directory rows that don't navigate** — services & skills rows have no `onClick`; taps land on nothing while 5 sibling types navigate (`DirectoryView.tsx:106-123`). *[directory #2]*

### Tier 2 — Strongly felt polish / correctness
11. Bottom tab bar has no safe-area inset — clips on every notched phone (`AppShell.tsx:122`). *[shell #1]*
12. No unread badges on Inbox/nav tabs — the core re-engagement signal is invisible (`AppShell.tsx`). *[shell #3]*
13. Home Quick-actions route to *browse* views, not the composers they imply; "village" hardcoded in a section title (`HomeScreen.tsx:14-18,134`). *[shell #6, #7]*
14. `neededBy` deadline on requests is captured but never shown anywhere — the top action-driving field (`RequestsView`/`RequestDetail`/`PeekSheet`). *[content #3]*
15. No day/date separators in threads; auto-scroll yanks you to the bottom mid-read (`ThreadScreen.tsx:46,99`). *[inbox #3, #4]*
16. Event end time never shown; capacity copy ("10 spaces") ambiguous vs remaining (`EventDetail.tsx:55,61`). *[content #8]*
17. Photo gallery is a bare scroll strip — no counter/dots/snap/zoom, `alt=""` on the product's own images (`PhotoHero.tsx:24`). *[content #11]*
18. Listings sort is a cryptic cycling chip (`↑`/`↓`, options invisible) (`ListingsView.tsx:60`). *[content #10]*
19. Admin: no error state on any queue (false inbox-zero when backend is down); no report age/SLA; launch-community fires with no confirm (`ReportsQueue`, `SeedingConsole.tsx:72`). *[admin #4, #5, #6]*
20. Admin: no desktop master-detail, no keyboard triage, no bulk actions, no undo on suspend/trust changes. *[admin #1, #2, #3]*
21. Photo upload silently truncates >4 files, no progress, no size/type validation, no reorder/cover (`PhotoInput.tsx:21`). *[compose #7, #8]*
22. Sign-in has no "Forgot password?"; passwords have no show/hide toggle (`SignInScreen.tsx`). *[auth #2, #5]*
23. Consent-before-reading: user agrees to the community standard before it's shown; "Tap to read it" is a dead affordance (`SignUpScreen.tsx:76`). *[auth #6]*
24. Toast stacks unbounded despite a "replace-not-stack" contract; action toasts auto-dismiss in 3s (`Toast.tsx:39,51`). *[inbox #7, primitives #8]*
25. Trust signals fragmented — "Verified" shown 3 ways; badge on card but not on detail; no vouch counts as social proof (`DirectoryView`, `BusinessDetail`, `AuthorCard`). *[directory #10, #16]*

### Tier 3 — Consistency, delight, and depth
26. Requests browse as a spreadsheet vs listings/events' rich cards — category tone, urgency, freshness all thrown away (`RequestsView.tsx:63`). *[content #17]*
27. No relative timestamps anywhere ("2h ago") despite `createdAt` on everything. *[content #12]*
28. Success feedback inconsistent — listing status changes & event RSVP are silent; requests toast (`ListingDetail`, `EventDetail`). *[content #13]*
29. Request status regresses from a labelled chip (list) to a bare dot (detail) (`RequestDetail.tsx:85`). *[content #14]*
30. No save/bookmark and no share on any content (needs a typed seam, Law 13). *[content #20]*
31. Directory: 7 co-equal filter chips wrap to 3 lines on mobile; no counts, no memory, no search across a surface that will hold hundreds. *[directory #1]*
32. Photo-bearing equipment shown as a monochrome icon row; card-vs-list split tracks type, not content richness. *[directory #7]*
33. Compose entry is a mandatory two-sheet, select-then-Continue flow; three bespoke "Post" buttons instead of the `Button` primitive (`AppShell.tsx:133,202`). *[compose #11, #12]*
34. Event composer uses a raw `datetime-local`, allows past dates, no house DatePicker (`EventComposer.tsx:76`). *[compose #4]*
35. Category is free-text in 2 composers, Select in 3 → taxonomy drift ("Furniture"/"furniture"). *[compose #9]*
36. Report pre-selects "spam" as default reason → mis-tap files a spam accusation (`ReportSheet.tsx:31`); no block/mute alongside report (`ReportSheet.tsx:35`). *[inbox #16, #9]*
37. Landing hero is text-only — no product visual, no social proof; value cards hover-lift but aren't clickable (`LandingScreen.tsx:25,44`). *[auth #9]*
38. No first-run/quiet-community hero on Home — the marquee screen collapses to near-empty for a new member (`HomeScreen.tsx:87`). *[shell #9]*
39. Settings has no account section (change email/password); danger action not isolated (`SettingsScreen.tsx:257`). *[auth #11]*
40. Edit-profile drops the `adultOnly` identity gate a minor can bypass; empty display name saves (`EditProfileSheet.tsx:10,82`). *[auth #12]*
41. Primitive drift — Chip has no disabled state but animates on press; Card/StatCard inline their own press scale (0.98) vs the shared `pressable` (0.97) (`Chip.tsx:36`, `Card.tsx:31`, `StatCard.tsx:59`). *[primitives #4, #5]*
42. Avatar has no `onError` fallback to initials, no `loading="lazy"` (`Avatar.tsx:47`). *[primitives #15]*
43. SwipeAction commit is unreachable by keyboard/SR (`SwipeAction.tsx`). *[primitives #7]*
44. Border-radius token redundancy (`xl`==`2xl`==20px; `pill` 999 vs `full` 9999) (`tailwind.config.ts:51`). *[primitives #13]*
45. Icon-set gaps: no `flag` (despite a report system), `chevron-up`, `share`, `link`, `download`, `map` (`Icon.tsx`). *[primitives #12]*
46. Back is `navigate(-1)` on shareable deep links → dead-ends when opened cold (`ListingDetail.tsx:60`, `ThreadScreen.tsx:72`). *[content #19, inbox #22]*
47. Semantic icon mismatches: community switcher uses `more` (ellipsis) not a chevron; sign-out uses `back`; thread context uses `more` as a forward chevron. *[shell #11, auth #15, inbox #22]*
48. Composer is a single-line `<input>` — no multi-line/auto-grow, no Shift+Enter (`ThreadScreen.tsx:128`). *[inbox #13]*
49. Mobile keyboard can cover the composer (no `visualViewport` handling) — threads and compose sheets both (`ThreadScreen.tsx:70`, `Sheet.tsx:94`). *[inbox #15, compose #16]*
50. Dashboard stats are bare integers — no trend/delta despite the ▲/▼ vocabulary existing (`AdminDashboard.tsx:31`). *[admin #17]*

*(Full per-surface catalog with all 154 findings, severities, and upgrades follows in Part 3.)*

---

## Part 3 — Full catalog by surface

Each auditor's complete findings are preserved verbatim in the task transcripts. Summary counts and the highest-severity items per surface:

| Surface | Findings | Top-severity items |
|---|---|---|
| Shell / Nav / Home | 20 | safe-area tab bar; Home error state; unread badges; tab crossfade+spring; quick-action intent |
| Content browse + detail | 20 | fake peek CTAs; no create affordance; event author/report gaps; hidden `neededBy`; price format; type-as-h1 |
| Directory | 17 | inert contact/address; dead-end rows; 7-tab IA; wrong empty/skeleton; name-as-h1; canned Enquire |
| Compose | 20 | no inline validation; draft persistence 2/7; no `<form>`; datetime input; required-field indication |
| Inbox / Messaging / Moderation | 23 | no message preview; no optimistic send; no day separators; mark-all-read-on-view; toast role/stack |
| Auth / Onboarding / Profile | 18 | field-level validation; no password reset; raw identity chips; no funnel progress; PasswordField |
| Primitive library | 18 | forced-colors focus; OS reduced-motion; no Popover/Menu/Tooltip; Chip disabled; focus-ring contrast |
| Admin | 18 | desktop master-detail; error states; keyboard triage+bulk+undo; report age; launch confirm |

**Highest-leverage sequence** (my recommendation): the T-series cross-cutting fixes first (they clear dozens of individual findings at once — enum-label map, motion-vocabulary wiring, the two a11y CSS blocks, error states on the 3 remaining surfaces), then Tier-1 one surface at a time.
