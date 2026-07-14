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

## M3 (migration 20260714020004)

### `open_thread(p_context text, p_context_id uuid, p_recipient uuid, p_first_message text) → threads`
The single point of thread-creation truth (D5) — no client thread inserts anywhere. Derives the community + other party from the context row (listing/request/business/organisation) or, for `direct`, from a shared community. Enforces the cold-DM gate (trust ≥ `coldDmMinTrust` and recipient `dm_privacy` allows) unless the pair already share a thread. Dedupes to an existing thread. Inserts participants + the first message. The request-first-response trigger flips the request `open → answered`.

### `set_listing_status(p_id uuid, p_status text, p_completed_with uuid default null) → listings`
Author/admin only. Legal transitions only (closed listings are terminal). Sets `completed_with` on completion.

### `set_request_status(p_id uuid, p_status text, p_fulfilled_by uuid default null) → requests`
Author/admin only. Legal transitions only. Sets `fulfilled_by` on fulfilment (the mutual-aid loop).

## M4 (migration 20260714040003)

### `set_rsvp(p_event_id uuid, p_status text, p_party_size smallint default 1) → event_rsvps`
Authenticated member. going/maybe/waitlist/cancelled. On a capacity event, a `going` that would overflow is dropped to `waitlist`; freeing a spot (cancel/maybe) runs `promote_waitlist`. Verified live: 12/12 (`scripts/db/verify-m4.mjs`).

### `expand_recurrence(p_parent_id uuid, p_count int default 8) → int`
Author/admin. Generates `p_count` future instances from the parent's `recurrence` JSON. DST-correct: computes in Europe/London wall-clock before converting back to timestamptz, so a weekly 19:00 event stays 19:00 local across the clock change. Also called from cron-tick (spec 09).

### `promote_waitlist(p_event_id uuid) → void`
Internal (called by `set_rsvp`). Promotes earliest waitlisted RSVPs into freed capacity and notifies them.

## M5 (migration 20260714050002)

### `post_alert(p_community, p_tier, p_category, p_title, p_body?, p_as_org?) → alerts`
Tier-validated: community by trust; verified requires acting-as an officer of a `verified_source` org; platform requires admin. Inserts the alert, fans out in-app notifications with a single set-based INSERT (respecting per-member category prefs; emergency ignores prefs), and enqueues a `push_fanout_queue` row. Proven live 15/15 (`scripts/db/verify-m5.mjs`).

### `resolve_alert(p_id) → void`
Author / org-officer / admin. Stamps `resolved_at`, enqueues a resolution push ("… — resolved").

### `drain_fanout(p_batch=100) → int`
Admin/cron. Drains pending queue rows; per row, a set-based insert into `push_dispatch_log` for every subscription of opted-in members, skipping quiet-hours unless the alert bypasses (emergency). 200-subscription fan-out completes in ~200ms (no per-send loop).

### `in_quiet_hours(qh) → boolean` / `alert_notif_key(tier, category) → text`
Helpers used by the fan-out.

## M7 — moderation, safety, admin (proven live 13/13, `scripts/db/verify-m7.mjs`)

### `report_target(p_kind, p_id, p_reason, p_note?) → reports`
The one report path. Enforces the 10/day cap, upserts one report per reporter/target, and auto-hides at the community threshold (default 3; 2 for messages; 1 from a steward/admin), logging an `autoHide` action and notifying platform admins. `unsafe` reason flags the report priority.

### `decide_report(p_report_id, p_uphold) → void`
Platform admin or steward (trust ≥ 3). Uphold hides the target + logs `hide`; dismiss just closes the report.

### `admin_moderate(p_action, p_kind, p_id, p_detail?) → void`
Platform admin (any action) or steward (`hide`/`unhide` in their community). Actions: `hide` / `unhide` / `remove` / `suspend` / `unsuspend` / `trustChange` / `warn` / `note`. **Suspension sets `suspended_until` only, never `status` — so writes are blocked (via `is_suspended()` in the insert policies) but reads keep working** (`member_communities()` filters on `status='active'`). `hide`/`remove` upholds any open reports. Every action is logged to `moderation_actions`.

### `release_delayed() → int` / `release_delay(p_id) → void`
Cron drains all due first-post delays; the single-item form lets an admin release one early from the queue. Both un-hide + mark released + log.

### `first_post_delay_trigger()` (trigger on listings + requests)
Config-gated (`firstPostDelayMinutes`, default 0 = inert). A trust-0 member's first post of a kind is hidden + queued in `first_post_delays` for the configured minutes.

### Admin read RPCs — `admin_reports` · `admin_moderation_log` · `admin_hidden` · `admin_delays` · `admin_members` · `admin_dashboard(jsonb)` · `admin_set_config`
Each is `can_moderate`-gated (platform admin or steward), returns display-ready rows for one console queue in one round-trip. `admin_set_config` is platform-admin-only and merges a JSON patch into `communities.config`.

### `export_account() → jsonb` / `delete_account() → void`
GDPR. Export returns the caller's profile + memberships + listings + requests + messages. Delete anonymises profile PII (name → "Former neighbour", email → `deleted+<id>@removed.invalid`) and removes push subscriptions + notifications; authored content survives (authorship anonymised, not deleted).

### Helpers — `is_suspended(cid)` · `can_moderate(cid)` · `mod_community(kind,id)` · `mod_set_hidden(kind,id,hide,reason)` · `mod_target_label(kind,id)`
The moderation vocabulary the RPCs and RLS are written in terms of (all SECURITY DEFINER, search_path-pinned).
