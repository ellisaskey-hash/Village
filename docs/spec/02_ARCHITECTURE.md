# 02 — Architecture

## Stack (decided)

Identical shape to Elevra, deliberately — the audit proves this stack end to end for a PWA of this class, and reusing it means every pattern in `/docs/reference/elevra-audit/` applies directly.

| Layer | Choice | Notes |
|---|---|---|
| App | React 18 + TypeScript strict, Vite, PWA (`injectManifest` custom SW) | `exactOptionalPropertyTypes: true` (Elevra fix #35) |
| Styling | Tailwind + CSS custom properties, one TS token source (`design/tokens.ts`) | **Standard Tailwind breakpoints and spacing** (Elevra fix #1/#8) |
| Motion | Framer Motion, Elevra's motion tokens and named choreographies verbatim | See 05 |
| State | Zustand, **max 10 stores** (session, theme, a11y-prefs, notification-prefs, ui, drafts, community, search, admin, dev) | Elevra fix #28 |
| Server state | **TanStack Query from day one** | Elevra fix #16/#36. No `useAsyncData` clone. |
| Lists | **@tanstack/react-virtual on every list that can exceed 50 items** | Elevra fix #24 |
| Backend | Supabase: Postgres 15 + Auth + Realtime + Storage. RLS-first. | Region: eu-west-2 (London) — closer to Kent than Elevra's eu-west-1 |
| Functions | Vercel serverless (`api/_src/*.ts` → esbuild → committed `api/*.mjs`), Edge middleware, Vercel Cron | Copy Elevra's build-api pattern verbatim, including the commit-the-mjs trap. **Colocate: set Vercel function region to London (lhr1)** (Elevra fix, PERFORMANCE §7) |
| Geo | PostGIS extension for community boundaries + place coordinates | New — Elevra had no geo needs |
| Search | Postgres FTS (`tsvector` generated columns) + pg_trgm, unified search RPC | Upgrade over Elevra's `ilike` |
| AI | Anthropic SDK, server-only. Haiku for text, Sonnet for vision. Tool-use forced schemas + prompt caching, per-user `anthropic_usage` metering **with rate limits from day one** | Elevra pattern + fix #45 |
| Push | web-push VAPID, Elevra's preference-chain dispatcher verbatim | See 09 |
| Email | Transactional via Supabase/SendGrid (invites, claims, digests) | |
| Observability | **Sentry (client + functions) from milestone M0** | Elevra fix #31. Non-negotiable. |
| CI | GitHub Actions: `lint` + `typecheck` + `test` + Playwright smoke **required checks blocking merge**; Vercel deploys on green | Elevra fix #32 |
| Migrations | `supabase/migrations/` with **timestamped filenames** `YYYYMMDDHHMMSS_name.sql` | Elevra fix #19 |
| Security headers | CSP + HSTS in `vercel.json` from M0 | Elevra fix #43 |

## The Elevra inheritance table

Every subsystem in the audit, dispositioned. "Copy" = same pattern, new code, near-verbatim. References are to the audit docs and WEAKNESSES fix numbers.

### Copy verbatim (pattern-identical)

- Theming architecture: `data-theme` × `data-skin` × `data-accent` × `data-density` × `data-font` × `data-contrast` × `data-motion` CSS-variable cascade, cold-boot inline script, dual `data-theme`+`.dark` write. `data-skin` becomes the **community-type skin axis** (village today; estate/retirement later).
- Motion system: all duration/spring/easing tokens, every named choreography (`screenEnter`, `cardEnter`, `sheetMotion`, `modalMotion`, `listContainer/listItem`, `pressable`, `toastMotion`, `statusPulse`, `skeletonShimmer`, `drawTransition`), `<MotionConfig reducedMotion="user">`, `useMotionSafe`, the two CSS keyframes, the anti-pattern list.
- Component canon: Button (two-size canon), IconButton (required `ariaLabel`), Chip (at 44px — fix #4), ListRow, Sheet-as-only-drawer, Modal-for-destructive-only, EmptyState first-class, Skeleton-matches-layout, SegmentedControl, Tabs, Toast, Badge, SearchBar, peek-drawer browse pattern, the three screen scaffolds (A stacked cards / B list-detail / C immersive), `/dev/gallery`.
- Shell pattern: mobile bottom TabBar + desktop LeftRail + DesktopTopBar, `AnimatePresence` crossfade, RouteErrorBoundary with reload guard.
- Auth: Supabase email+password, magic link, OAuth Google/Apple; TOTP MFA optional; session store shape; account-delete + GDPR export functions; Turnstile on auth.
- Push: the entire preference filter chain (mute → category → quiet hours → frequency cap → digest queue → send), `push_subscriptions` with 410-cleanup, `push_dispatch_log`, digest cron.
- Offline: photo blob store via idb-keyval, SW precache strategy, fonts/media CacheFirst, OfflinePill, update-prompt toast. Queue **persisted to IndexedDB** (fix #17), not in-memory.
- Storage: signed-upload-URL direct-to-Supabase pattern, private buckets + 1h signed reads, orphan-sweep cron.
- RPC habit: every multi-table write is a Postgres RPC; **maintain a single RPC catalogue doc** (fix #21).
- Telemetry: in-house `telemetry_events` with `app.* / nav.* / feature.* / error.*` taxonomy.
- Voice rules: no em-dashes, no "the system", never fabricate an attributed human voice.
- API function structure, cron-tick queue-drain pattern (skip-and-log bad rows), migration-per-feature discipline.

### Copy with mandatory fixes (WEAKNESSES numbers)

#1 standard spacing scale · #2 CSS vars in SVGs (no hex literals ever) · #3 chart colours via subscription hook not mount-time read · #4 44px chips · #5 AA-passing `textFaint` · #7 one row primitive with `surface` prop · #8 standard breakpoints · #9 route-change `aria-live` · #10 skip-link · #11 `aria-current` on tabs · #12 background respects reduced motion · #14 shared `useArrowNavigation` · #16/#36 TanStack Query · #17 persistent offline queue · #19 timestamped migrations · #23/#26 code-split anything >100 KB used on <20% of screens; SW cache cap stays 2 MiB · #24 virtualise lists · #25 `srcset` + Supabase image transforms · #27 backdrop-blur fallback on slow devices · #28 ≤10 stores · #31 Sentry · #32 tests block merge · #33 Playwright `toHaveScreenshot` on the gallery · #35 `exactOptionalPropertyTypes` · #37/#38 voice greps in CI · #43 CSP · #45 per-user AI rate limits.

### Replace entirely (domain layer)

- **Identity model:** Elevra's binary `coach|client` → Person + facets + community memberships with trust levels (03).
- **Security model:** Elevra's pairwise-private RLS → community-membership-scoped RLS with per-row visibility and acting-as authorship (03 § RLS). This is the single largest piece of new engineering thought in the build; it is specified fully in the data model, not improvised per-table.
- **Data model:** all domain tables new (03).
- **Search:** `ilike` scans → FTS + trigram unified search RPC (09).
- **Fan-out:** one-coach alerts → community-scale notification fan-out with batching (09).
- **The dropped 90%:** programmes, exercises, check-ins, food logs, wearables, cycles, gym scans — none of it carries over. The one shape worth studying: Elevra's `locations` + `equipment_snapshots` prefigures the equipment directory.

## Core architectural decisions (new, LocalOS-specific)

**D1 — Community is a first-class entity.** Every piece of content belongs to exactly one community. `communities.type` + `communities.config` (JSONB) carry all per-type variation. Adjacency is a relation between communities (`community_links`), not a radius query — villages have social boundaries, not circular ones. Rationale: makes "village app" one configuration of a general platform; makes village #2 a data operation, not a deploy.

**D2 — One account, many facets, explicit acting-as.** A person has one `profile`. Capabilities attach via facets: membership rows (per community), business ownership, organisation officership, tradesperson listing. Content rows carry `created_by` (always a profile) plus optional `as_business_id` / `as_organisation_id`. No generic polymorphic author FK — two nullable columns with a check constraint is queryable, indexable, and RLS-friendly where polymorphism is not.

**D3 — Trust levels gate capability, not entry** (04). Encoded as `memberships.trust_level` 0–3, checked in RLS write policies and RPCs — never only in the client.

**D4 — Alerts are tiered by authority** (04). `alerts.tier` ∈ community / verified / platform, enforced in RLS: tier ≥ verified requires acting-as an organisation with `verified_source = true` or platform admin.

**D5 — Threads are the universal conversation container.** One `threads` table with a `context` (listing / request / event / business_enquiry / organisation / direct), participants table, one realtime pattern, one UI. A DM is just a thread with `context='direct'`. Rationale: Elevra proved the single-Sheet lesson; this is the same lesson applied to messaging.

**D6 — Content has a lifecycle, not just existence.** Listings and Requests carry status machines with auto-expiry (cron). A community platform where last month's sold sofa still shows is a dead platform. Expiry prompts are re-engagement moments ("Is this still available?").

**D7 — Seeding is a subsystem** (08). Ingestion pipeline + claimable stubs + launch console are product features with tables, functions, and UI — not a founder spreadsheet.

**D8 — Everything moderatable, uniformly.** One `reports` table and one `moderation_actions` table target any entity via `(target_kind, target_id)`. One report UI. Auto-hide at threshold. (04.)

**D9 — PWA, no native shells.** Proven by Elevra for the identical audience mechanics (Add-to-Home-Screen coaching, iOS 16.4+ push). Launch-day distribution via a link in a Facebook group is precisely the PWA's home turf: no store, no review cycle, no install friction beyond A2HS.

**D10 — 16+ only.** DOB at signup, gate enforced at auth, safeguarding copy tuned for 16–17-year-olds. Child-related features (school hub, playdates) are parent-facing only and live in phase 2.
