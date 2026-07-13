# LOCAL — Build Package

Working name: **Local** (brand slot open — see 01 § Naming). Platform name: **LocalOS**.

This package is the complete specification for building Local: a location-centric community platform, launching first in Horsmonden, Kent, designed from day one to serve any community type (village, estate, apartment block, retirement community, town) from the same architecture.

## How to use this package

1. Create a new repository.
2. Copy this entire `local-build-package/` directory into the repo at `/docs/spec/`.
3. Copy the **Elevra audit** (`/audit/` — the 14 files: DESIGN_TOKENS, tokens.json, COMPONENT_INVENTORY, MOTION_AND_ANIMATION, PATTERNS, THEMING_ARCHITECTURE, ACCESSIBILITY, TECH_STACK, PLATFORM_AUDIT, DATA_MODEL, BACKEND_ARCHITECTURE, PERFORMANCE, ARCHITECTURE_DECISIONS, WEAKNESSES) into the repo at `/docs/reference/elevra-audit/`. This package cross-references it constantly — the audit is the visual and infrastructural DNA; this package is the new organism.
4. Work through `10_BUILD_PLAN_AND_PROMPTS.md` milestone by milestone. Each milestone has an execution prompt for Claude Code and acceptance criteria that must pass before the next milestone starts.

## File index

| File | Contents |
|---|---|
| `00_README.md` | This file. |
| `01_PRODUCT_BRIEF.md` | Vision, principles, scope, phasing, success criteria, naming. |
| `02_ARCHITECTURE.md` | Stack, the Elevra inheritance table (copy / fix / replace), core architectural decisions. |
| `03_DATA_MODEL.md` | Full Postgres schema: communities, people, trust, all ten entities, RLS patterns, RPCs, indexes. |
| `04_TRUST_MODERATION_SAFETY.md` | Trust levels, verification, alert tiers, reporting, auto-moderation, admin powers, 16+ policy. |
| `05_DESIGN_SYSTEM.md` | The Local visual language: Elevra's system inherited, the Local skin defined, fixes applied. |
| `06_tokens.local.json` | Machine-readable design tokens for Local (structure mirrors Elevra's tokens.json). |
| `07_SCREENS_AND_NAVIGATION.md` | Shell, tabs, every screen, scaffold assignments, empty states. |
| `08_SEEDING_AND_ADMIN.md` | The seeding/ingestion system, claim flows, admin console, launch checklist. |
| `09_PLATFORM_SERVICES.md` | Auth, sessions, push, offline, realtime, search, telemetry, cron, email. |
| `10_BUILD_PLAN_AND_PROMPTS.md` | Nine milestones with acceptance criteria + the Claude Code prompt for each. |

## Non-negotiable rules for the build

These override convenience at every decision point:

1. **Entities are first-class; features are not.** Every feature derives from the ten entities (People, Businesses, Organisations, Places, Events, Listings, Requests, Services, Alerts, Messages) plus the two structural entities (Communities, Memberships). If a feature seems to need a new top-level concept, stop and re-derive it.
2. **Community-scoped by default.** Every content row carries `community_id`. Every RLS policy scopes reads to active members. No exceptions without a written note in the schema.
3. **The app must be useful at one user.** Every screen has a designed seeded/empty state that delivers value before any user-generated content exists.
4. **Copy Elevra's feel, not its scale mistakes.** The design tokens, motion choreographies, and component patterns are inherited near-verbatim. The fix-list in `02_ARCHITECTURE.md § Fixes` is mandatory, not advisory.
5. **Configuration over forks.** Anything that differs between community types (village vs estate vs retirement) is a row in `communities.config` or a token in a skin — never an `if (isVillage)` in feature code.
6. **No em-dashes in user-facing copy.** Inherited from Elevra's voice rules; enforced by a CI grep. Plain verbs, sentence case, "we'll" not "the system will".
