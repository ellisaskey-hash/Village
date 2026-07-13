# 08 — Seeding & Launch System

The answer to cold start, built as product (D7). Goal: **any UK community can be brought from nothing to launch-ready in about an hour of admin time**, with the founder's involvement bounded and shrinking per community.

## Pipeline (three stages)

### 1. Ingest (automated)

`api/seed-ingest.mjs` (admin-triggered per community, long-running with progress rows):

- **OpenStreetMap Overpass API** — query by boundary/postcode district for amenities: shops, pubs, cafes, places of worship, schools, halls, pharmacies, vets, sports facilities, postboxes, defibrillators, bus stops, greens. → `places` rows (`source='seed'`) with coordinates, and paired `businesses` stubs (`source='seed'`, `owner_profile_id=null`) where the amenity is commercial. OSM is ODbL: attribution shipped in-app (Settings → About) and on any map surface.
- **Companies House API** (free) — registered businesses by postcode district → enrich/extend business stubs (trading names filtered by heuristic + admin review).
- **GOV.UK / GIAS** — school details. **Food Standards Agency FHRS API** — food businesses + hygiene-rated names (good stub source for cafes/pubs/takeaways).
- **Manual URL importer** — parish council site, church calendar, school term dates: admin pastes URLs; a Claude Haiku extraction function (tool-use forced schema, server-side, metered) proposes `events` and `organisations` rows for review. Nothing auto-publishes; everything lands in the review queue.

Everything ingested is a **proposal** with provenance (`seed_proposals` table: payload JSONB, source, status pending/accepted/rejected/merged) until accepted.

### 2. Review & enrich (admin console, ~1 hour)

Seeding console (`/admin/seeding`): proposal queue with accept/edit/reject/merge-duplicate per row · map view of accepted places (sanity-check pins) · quick-add forms for local knowledge that no dataset has (bin collection pattern → recurring `verified` notices; cricket fixtures; hall booking contact) · gap checklist (the console flags: no school found? no pub? no council?) · recurring-event composer for seeded calendars.

### 3. Pre-launch claiming (human, founder-led for #1)

Community `status='seeding'`: visible only to platform admin + specifically invited members (`joined_via='seed'`). The founder invites the parish council, school, PTA, and 5–10 businesses with **claim links** — a claim link deep-links to their stub with a pre-approved claim (they sign up, tap claim, done; `decide_claim` auto-approves link-based claims). This is how launch day already has verified alert sources and claimed businesses posting offers/events.

`launch_community(id)` RPC: flips status to `launched`, stamps `launched_at`, generates the public join link, and (config) posts the founding platform-tier welcome notice.

## Claim flow (post-launch, self-serve)

Unclaimed business/organisation profiles render fully in the directory with a quiet "Is this yours? Claim this page" affordance → claim sheet (evidence: role + phone/email matching public records, optional doc upload to `claim-evidence`) → admin queue → approve sets `owner_profile_id` + `claimed_at`, notifies, and drops the claimant into a first-run "add your hours, add an offer" checklist. Contested claims (second claim on a claimed profile) escalate to admin with both parties' evidence.

## Per-community launch checklist (rendered live in the console)

- [ ] ≥ 15 places accepted, pinned correctly on map
- [ ] ≥ 10 business stubs (or honest coverage of what exists)
- [ ] School + council + key orgs present; ≥ 2 orgs `verified_source`
- [ ] ≥ 5 upcoming events (seeded or claimed-owner-posted)
- [ ] Bin/recurring notices configured
- [ ] ≥ 3 profiles claimed pre-launch
- [ ] Community standard reviewed for local fit; config reviewed (caps, thresholds)
- [ ] Join link + Facebook/PTA launch copy generated (template in console)
- [ ] Admin push notifications confirmed working on founder's device

## Scaling posture

Horsmonden: founder does stages 2–3 personally (also the moderation-learning period). Villages #2–#5: same pipeline, target ≤ 1 admin-hour each, claim links sent by email from the console. Beyond: stage-2 review becomes delegable to a per-community steward (trust 3) with admin approval — the pipeline is already multi-tenant, only the review labour moves.
