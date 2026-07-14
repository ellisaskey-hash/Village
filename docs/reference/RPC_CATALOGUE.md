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

## M2 (migration 20260714010003)

### `issue_claim_link(business_id uuid) → text`
Admin only. Stamps a random `claim_link_token` on the business and returns it. Powers the seeding console's pre-launch claim links.

### `claim_business(business_id uuid, evidence text, link_token text default null) → business_claims`
Authenticated, trust 1+ in the business's community, business unclaimed. Inserts a claim. If `link_token` matches the business's `claim_link_token`, the claim is auto-approved and ownership is set in one step (the "sign up, tap claim, done" pre-launch flow, spec 08). DECISION-MADE: claim links are a token column, not a separate table.

### `decide_claim(claim_id uuid, approve boolean) → void`
Admin only. Marks the claim approved/rejected; on approval sets `owner_profile_id` + `claimed_at`. (Claimant notify lands with the M3 notifications table.)

### `accept_seed_proposal(proposal_id uuid) → uuid`
Admin only. Materialises a pending `seed_proposals` row into `places` / `businesses` / `organisations` (events land in M4), marks it accepted, links `merged_into`. Returns the new row id.

### `launch_community(id uuid) → void`
Admin only. Flips a `seeding` community to `launched`, stamps `launched_at`. (Welcome notice lands with M3 notifications.)

## Planned (later milestones)

`open_thread` · `set_listing_status` · `set_request_status` · `post_alert` · `report_target` · `admin_moderate` · `global_search`.
