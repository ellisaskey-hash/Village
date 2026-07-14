# RPC Catalogue

Every Postgres RPC: name, input schema, output schema, side effects. Updated with every migration that adds one. Planned set in /docs/spec/03_DATA_MODEL.md.

## M1 (migration 20260714000005)

### `discover_communities(postcode text)`
- **Security:** DEFINER (a non-member has no RLS read on communities). Granted to `anon` + `authenticated`.
- **In:** `postcode` — any UK postcode; only the outward district is used.
- **Out:** rows `{ id, slug, name, type, region, status }` for `seeding`/`launched` communities whose `postcode_districts` contains the district.
- **Side effects:** none. Powers the `/welcome` community picker before membership exists.
- **Decision:** added beyond the spec's listed M1 RPCs because the strict members-only RLS on `communities` forbids pre-membership discovery; a narrow definer read is the spec-consistent way (mirrors the helper-function discipline). Logged DECISION-MADE in PROGRESS.md.

### `join_community(slug text, postcode text, invite_code text default null) → memberships`
- **Security:** DEFINER; `authenticated` only. Sets `app.rpc` so `memberships_guard` permits the insert.
- **In:** community `slug`; `postcode` (postcode path) or `invite_code` (invite path).
- **Validates:** caller authenticated; community exists and not archived; not already a member; invite valid/unexpired/has uses, OR postcode district ∈ `postcode_districts`. (16+ enforced upstream by `profiles.adults_only`.)
- **Out:** the created `memberships` row.
- **Side effects:** inserts membership (trust 1 + `joined_via='invite'` on the invite path, else trust 0 + `joined_via='postcode'`); increments `invites.uses` on the invite path.

### `vouch_for(vouched uuid, community uuid) → void`
- **Security:** DEFINER; `authenticated` only. Sets `app.rpc`.
- **Validates:** caller `trust_in(community) >= 2`; not vouching for self; target is a member.
- **Out:** none.
- **Side effects:** inserts a `vouches` row (idempotent); promotes the vouched member's `trust_level` — 1 vouch → trust 1, 2+ vouches → trust 2 (spec 04).

## Planned (later milestones)

`open_thread` · `set_listing_status` · `set_request_status` · `post_alert` · `claim_business` · `decide_claim` · `report_target` · `admin_moderate` · `global_search` · `seed_community` · `launch_community`.
