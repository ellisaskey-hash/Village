# CLAUDE.md — Local

You are building **Local**, a location-centric community platform (working name; platform: LocalOS). The complete specification is in `/docs/spec/` (11 files). The visual language and platform infrastructure derive from a prior production app, fully audited in `/docs/reference/elevra-audit/` (14 files).

## Session rules

1. **Spec first.** Before writing code for any area, read the relevant `/docs/spec/` file AND the corresponding audit file. When the spec is silent, follow the Elevra audit pattern. When both are silent, ask before inventing.
2. **Milestones.** Work proceeds strictly through the milestones in `/docs/spec/10_BUILD_PLAN_AND_PROMPTS.md`. Do not start a milestone until the previous one's acceptance criteria pass. Track progress in `/docs/PROGRESS.md` (update it every session: milestone, what's done, what's next, open questions).
3. **Non-negotiables** (from `/docs/spec/00_README.md` and `02_ARCHITECTURE.md`):
   - Entities are first-class; features derive from them. Every content table carries `community_id`; every table has RLS using the helper functions in spec 03.
   - Every WEAKNESSES.md fix listed in spec 02 is mandatory: standard Tailwind spacing and breakpoints, TanStack Query for all server state, virtualise lists over 50 items, timestamped migrations, Sentry from M0, tests block merge, CSP headers, 44px touch targets, `exactOptionalPropertyTypes: true`.
   - No hex colour literals in components or SVGs; CSS variables only (`stop-color="var(--c-accent)"`).
   - No em-dashes in user-facing copy. Plain verbs, sentence case, "we'll" not "the system will". Never fabricate an attributed human voice.
   - The app must be useful at one user: every list has a designed seeded/empty state.
   - Multi-table writes go through Postgres RPCs. Every new RPC is added to `/docs/reference/RPC_CATALOGUE.md`; every new primitive to `/docs/reference/COMPONENT_CATALOG.md`.
4. **RLS is the highest-severity bug class.** Every migration touching policies ships with tests asserting: (a) members of community A cannot read community B's rows, (b) trust-0 caps hold server-side, (c) hidden rows are invisible to third parties, (d) acting-as cannot be forged. Write the tests before the policies.
5. **Design fidelity.** The feel is inherited from the audit: tokens in `/docs/spec/06_tokens.local.json`, theming cascade per THEMING_ARCHITECTURE.md, motion per MOTION_AND_ANIMATION.md (durations, springs, and choreographies verbatim — never invent a transition inline), components per COMPONENT_INVENTORY.md with the fixes in spec 05. `/dev/gallery` with screenshot tests is the living reference.
6. **Secrets** never in the client bundle except `VITE_`-prefixed public keys. Anthropic calls are server-side only, tool-use forced schemas, metered in `anthropic_usage`, per-user rate limited.

## Current state

**M0 complete, awaiting founder review of `/dev/gallery`.** Foundation, seven-axis theming cascade, motion library, hearth ambient, and the full primitive set are built and verified (lint / typecheck / test / build / e2e all green locally). See `/docs/PROGRESS.md` for detail and the one open CI item (Linux screenshot baselines). No feature screens, auth, or database work yet — those begin at M1. Do not start M1 until the founder signs off on the gallery.

Run the gallery: `npm install` then `npm run dev`, open `http://localhost:3005/dev/gallery`.

## Commands (once scaffolded — keep this section updated)

- `npm run dev` — Vite dev server
- `npm run build` — build:api → typecheck → vite build
- `npm run test` / `npm run lint` / `npm run typecheck`
- `npx playwright test` — E2E + axe + gallery screenshots
