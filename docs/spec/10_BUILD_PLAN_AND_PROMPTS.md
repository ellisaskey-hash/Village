# 10 — Build Plan & Claude Code Prompts

Nine milestones. Each ends with acceptance criteria that must pass (in CI + manually) before the next begins. Every prompt assumes the repo contains `/docs/spec/` (this package) and `/docs/reference/elevra-audit/` (the 14 audit files).

**Standing prompt preamble (paste at the top of every session):**

> You are building Local, specified completely in /docs/spec (10 files) and visually/infrastructurally derived from the Elevra audit in /docs/reference/elevra-audit (14 files). Before writing code for any area, read the relevant spec file AND the corresponding audit file. Non-negotiables: the six rules in /docs/spec/00_README.md; every WEAKNESSES.md fix listed in /docs/spec/02_ARCHITECTURE.md; RLS on every table using the helper-function patterns in 03; no hex literals in components; no em-dashes in user-facing copy; TanStack Query for all server state; virtualise lists over 50 items; update /docs/reference/RPC_CATALOGUE.md and /docs/reference/COMPONENT_CATALOG.md whenever you add an RPC or primitive. When the spec is silent, follow the Elevra audit pattern; when both are silent, ask before inventing.

## M0 — Foundation & design system (the "same feel" milestone)
Scaffold repo per 02 stack table (Vite, TS strict + exactOptionalPropertyTypes, Tailwind standard scale, ESLint incl. custom greps, Prettier, Vitest, Playwright+axe, Sentry, GitHub Actions with required checks, Vercel + Supabase projects in London, CSP headers, PWA manifest generated from tokens). Implement `design/tokens.ts` from 06_tokens.local.json, the full CSS cascade per THEMING_ARCHITECTURE.md (all seven axes + cold-boot script), `src/lib/motion.ts` verbatim from MOTION_AND_ANIMATION.md, and the complete primitive set from COMPONENT_INVENTORY.md with fixes (Button, IconButton, Chip@44px, ListRow(surface), Sheet, Modal, Toast, Badge, EmptyState, Skeleton*, SegmentedControl, Tabs, SearchBar, form primitives, PullToRefresh, SwipeAction, Icon map, AppBackground hearth ambient with reduced-motion pause). Build `/dev/gallery` rendering every primitive in every state in both themes; wire `toHaveScreenshot` CI.
**Accept:** gallery screenshot suite green in dark+light; axe clean; token contrast test passes AA; a reviewer familiar with the PT app says "this feels like the same family" from the gallery alone.

**Prompt M0:** "Execute milestone M0 from /docs/spec/10. Read 05, 06, and the audit's THEMING_ARCHITECTURE, MOTION_AND_ANIMATION, COMPONENT_INVENTORY, DESIGN_TOKENS, TECH_STACK first. Build the foundation and full primitive gallery. Do not build any feature screens. End by running the full CI suite and the gallery screenshot baseline."

## M1 — Auth, communities, membership & trust rails
Schema: helper functions, communities, community_links, profiles, memberships, invites, vouches + RLS pattern file + pgTAP-style RLS tests (03's four assertions). RPCs: `join_community`, `vouch_for`. Screens: welcome/auth/onboarding flow (07), shell with 5 tabs (stub screens), Me/settings axes. Seed a `horsmonden` community row (status seeding) + a dev community fixture.
**Accept:** two test users in different communities cannot read each other's memberships (test-proven); 15-year-old DOB refused; invite path grants trust 1; theme/density/font/contrast/motion settings all function.

**Prompt M1:** "Execute M1. Read /docs/spec/03 (structural entities + RLS patterns), 04 (trust table), 07 (onboarding), 09 (auth). Migrations are timestamped. Write the RLS test file first, then the schema, then make the tests pass, then the screens."

## M2 — Places, Businesses, Organisations + Directory + Seeding console
Schema: places, businesses, business_items, business_claims, organisations, organisation_members, organisation_posts, seed_proposals + RLS + FTS columns. RPCs: claim pair, seed pair. Ingestion functions (Overpass, Companies House, FHRS, URL-extract via Haiku). Screens: Explore→Directory (all sub-chips except Equipment/Skills), business/org/place details, claim sheet, business/org management in Me, `/admin/seeding` console with checklist. Run real ingestion for Horsmonden; founder reviews.
**Accept:** Horsmonden directory populated from real data with map pins sane; claim flow works end-to-end including claim-link auto-approval; unclaimed stub renders "Is this yours?".

**Prompt M2:** "Execute M2. Read /docs/spec/08 fully plus 03's places/businesses/organisations sections. Build schema→RPCs→ingestion functions→directory screens→seeding console, in that order. Ingestion functions must write only to seed_proposals."

## M3 — Threads, Messages, Listings, Requests (the heart)
Schema: threads, thread_participants, messages, listings, requests, notifications + RLS (P4) + realtime. RPCs: `open_thread`, both status RPCs. Screens: Explore→Listings + Requests with composers (photo store, drafts, AI listing-assist), detail screens, Inbox→Messages, thread screen with realtime, Post sheet (first four tiles). Status lifecycles + trust-0 caps live.
**Accept:** full loop on two devices: A posts request → B responds → thread realtime both ways → A marks fulfilled → statuses and notifications correct. Trust-0 caps enforced server-side (attempt via curl fails). Cold DM from trust-0 refused; in-context thread allowed.

**Prompt M3:** "Execute M3. Read 03's threads/listings/requests sections, D5/D6 in 02, and the audit's realtime + offline patterns. The open_thread RPC is the single point of thread-creation truth — no client-side thread inserts anywhere."

## M4 — Events, RSVPs, Equipment, Skills, Services
Schema + RPCs + recurrence expansion cron. Screens: Explore→Events (+detail, RSVP/waitlist, ICS), Directory→Equipment/Skills/Services, remaining Post tiles (event, service), org announcements surfacing on Home.
**Accept:** recurring seeded event expands correctly across DST; capacity event waitlists then promotes on cancellation; "Ask to borrow" opens a thread.

## M5 — Alerts, Notifications, Push
Schema: alerts + tier trigger; push tables verbatim; fan-out queue. Full preference chain, digest, quiet hours; alert composer with tier gating; Home alerts strip realtime; resolution flow.
**Accept:** community alert pushes only to opted-in members; verified alert requires acting-as verified org (forgery attempt fails at RLS); emergency bypasses quiet hours; resolution push fires; fan-out to 200 fixture subscriptions completes via queue without function timeout.

## M6 — Global search & Home assembly
`global_search` RPC + SearchSheet; Home screen assembled per 07 with all live cards, seeded-state variants, quick actions; public landing page.
**Accept:** search returns mixed-kind ranked results respecting RLS and hidden flags; Home renders valuably for a brand-new trust-0 member in seeded-only Horsmonden (screenshot-reviewed); landing page Lighthouse ≥ 90.

## M7 — Moderation, safety, admin console
Reports + moderation_actions + `report_target` auto-hide + `admin_moderate` + rate limits + first-post delay queue + moderation-triage AI + full `/admin` per 04/07 + community standard screen + escalation signposting + GDPR delete/export.
**Accept:** 3 reports auto-hide (author still sees, third parties don't — test-proven); every admin action appears in the log; suspension blocks writes but not reads; delete/export function correctly.

## M8 — Hardening & launch
Performance pass (PERFORMANCE.md targets: cold TTI < 1.5s on 4G, main chunk < 800 KB gz, code-split verification) · full E2E happy paths per tab · a11y manual pass (VoiceOver + TalkBack) · offline drill (post in airplane mode, hard refresh, reconnect: nothing lost) · load fixture: 500 members / 1000 listings, lists smooth · security review of every RLS policy against the four assertions · Horsmonden seeding finalised, claim links sent, launch checklist green · launch copy generated.
**Accept:** the 08 launch checklist fully green; founder completes a real transaction-shaped loop with a real pre-launch claimant; `launch_community('horsmonden')`.

## Sequencing note
M0–M1 are strictly sequential. M2 and M3 can interleave after M1 (M3's thread contexts need only listing/request schema, not the directory). M5 depends on M3+M4 content existing; M6 on all entities; M7 touches everything and goes last before hardening. Estimated shape: M0 and M3 are the two heavyweight milestones; budget them double.
