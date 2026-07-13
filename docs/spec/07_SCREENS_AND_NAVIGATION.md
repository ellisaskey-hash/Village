# 07 — Screens & Navigation

Shell mechanics inherited from Elevra's PATTERNS.md: one shell (there is one role now, member — admin is a route tree, not a shell), sticky header + scrollable main + bottom TabBar on mobile, LeftRail + DesktopTopBar at `lg:+`, `AnimatePresence` 120ms crossfade between tabs, `screenEnter`/`cardEnter` cascades within screens, RouteErrorBoundary, safe-area handling, skip-link + route `aria-live` (fixes #9/#10/#11).

## Tabs (5)

| Tab | Route | Job |
|---|---|---|
| **Home** | `/` | Today in the community: what's important, happening, needed, new |
| **Explore** | `/explore` | Everything browsable: segmented Listings · Requests · Events · Directory |
| **Post** (+) | opens PostSheet | The universal create action — centre slot, accent-filled circular button (the one TabBar deviation from Elevra; anatomy otherwise identical) |
| **Inbox** | `/inbox` | Threads + notifications, segmented |
| **Me** | `/me` | Profile, identities, my activity, my business/orgs, settings |

Global search: search IconButton in the ShellHeader on every screen → `SearchSheet` (Elevra's pattern, `/` hotkey on desktop).

## Screens

Scaffold letters per Elevra's PATTERNS.md (A stacked cards / B list-detail / C immersive).

### Onboarding & auth (C)
`/welcome` (value prop + community picker by postcode or invite link `/j/:code`) → `/auth/*` (Elevra auth screens re-skinned: signup adds DOB + display name; postcode confirm; community standard one-screen accept) → `/onboarding` (identity chips: resident/parent/tradesperson/business/club · notification pre-permission sheet · A2HS install coach). First landing on Home is the seeded-content payoff moment — it must render populated.

### Home `/` (A)
Card stack, order fixed: **Alerts strip** (live alerts, tier-coloured; collapsed when none — never an empty card) · **Happening soon** (next 3 events, RSVP inline) · **Needs a hand** (open requests, respond inline) · **New in the village** (latest listings, horizontal scroll) · **From the noticeboard** (verified org announcements) · **Quick actions** (Post a request / List something / Report something lost). Pull-to-refresh. Every card links into Explore with the filter pre-applied.

### Explore `/explore` (B ×4, one SegmentedControl)
- **Listings** — filter chips (kind: sell/free/wanted/lend · category · sort), virtualised grid/list, `ListingCard` (photo, title, price/FREE/WANTED badge, status). Peek drawer → full `/listings/:id` (gallery, description, author card with trust-era badge, **Message about this** primary CTA, report). Author view adds status controls (reserve/complete/relist).
- **Requests** — open requests, category chips, urgency ("needed by") sort. `/requests/:id`: description, response count, **I can help** → opens context thread. Author view: mark answered/fulfilled (fulfilment prompts optional thanks note — the mutual-aid loop made visible).
- **Events** — This week / month list + compact month grid toggle. `/events/:id`: hero, time/place (map snippet via PostGIS point), RSVP control (open/capacity/waitlist), attendee count, event thread entry, add-to-calendar (ICS), organiser card.
- **Directory** — sub-chips: Places · Businesses · Services & trades · Equipment · Skills · Organisations · People. Businesses: `/businesses/:id` (hours, items/offers, contact per visibility, **Enquire** → thread; unclaimed stubs show "Is this yours? Claim it"). Equipment: the lending library list — owner, terms, **Ask to borrow** → thread. People directory is opt-in (profile toggle, default on, discoverable by name/skills only).

### Post (Sheet over any screen)
Six large `RadioTile`s: Request help · Sell or give away · Lend or offer equipment · Event · Alert · Offer a service. Each opens a C-scaffold composer (Elevra form primitives; photos via the offline-capable photo store; drafts persisted to the drafts store). Alert composer shows only categories the member's trust/acting-as permits; acting-as selector appears when the member owns a business/org. Trust-0 caps surface as friendly inline explanations, never dead buttons.

### Inbox `/inbox` (B)
Segmented **Messages** (thread list: context icon + title + snippet + unread badge; virtualised; realtime) / **Notifications** (Elevra's notification list pattern; deep links). `/inbox/t/:threadId` (C): message list (newest bottom), context header card linking to the listing/request/event, composer (text + photo + document), realtime channel with disciplined cleanup (Elevra fix #22).

### Me `/me` (A)
Profile card (avatar, name, identity chips, trust badge shown as tenure language: "Villager since July 2026 · Vouched") · My activity (my listings/requests/events with status controls) · My equipment & skills · My business / My organisations (management entry: items, offers, claim status, org posts, verified-source badge) · Invite neighbours (share sheet + QR, Elevra pattern) · Settings (theme/accent/density/font/contrast/motion axes · notification prefs · DM privacy · quiet hours · account/export/delete).

### Admin `/admin/*` (B; platform_role gated at middleware + RLS)
Dashboard (today's numbers, priority reports) · Reports queue · Hidden items · Claims queue · First-post delay queue · Members (detail: trust history, actions) · Alert log · Community config · Seeding console (08) · Moderation action log.

### System screens
Offline pill · update toast · `/dev/gallery` + `/dev/sheets` (dev-gated, screenshot-tested) · 404/error EmptyStates · public unauthenticated landing `/` (marketing one-pager with join CTA — the Facebook-group link target; SEO matters here and nowhere else).

## Empty/seeded states (rule 3 — specified, not improvised)

Every list's empty state is an invitation with a CTA: Requests → "Nobody needs a hand right now. Ask for one?" · Listings → "Nothing for sale yet. Got something lying around?" · Equipment → "Start the village lending library — add your ladder." Directory and Events are never empty at launch (seeding guarantees), so their empty states only matter for future unseeded communities and say so honestly ("We're still setting up <name> — here's what's coming").

## Notification → screen map
`alert.*` → Home alerts strip anchor · `message` → thread · `request.response` → request detail · `event.reminder`/`event.change` → event detail · `listing.enquiry` → thread · `claim.decided` → business manage · `moderation.*` → the affected item (author view). Deep links stored as route strings on notifications, navigated via `useNavigate()` (Elevra pattern).
