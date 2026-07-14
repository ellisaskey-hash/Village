# RLS Patterns

The security model for Local (spec 03 §RLS). RLS is the highest-severity bug class in this
product. Every table has RLS enabled; every policy is written in terms of the helper
functions (migration `..0003_rls_helpers`), never an inline join to `memberships`. Every
migration that adds a policy ships a matching test file in `supabase/tests/` asserting the
four canonical isolation properties.

## Helper vocabulary (SECURITY DEFINER, STABLE)

- `member_communities()` → set of community ids the caller is an active member of.
- `trust_in(cid)` → caller's trust level in `cid` (−1 if not a member).
- `is_platform_admin()` → caller has `platform_role='admin'`.
- `linked_communities()` → communities adjacent to mine via `community_links` (share ≠ none).
- `co_member(pid)` → do I share an active community with profile `pid`?
- `can_act_as(biz, org)` → **added in M2** with the businesses/organisations tables.

## The four canonical policy shapes

- **P1 — community read.** `community_id in (select member_communities())` and (for hideable
  content) `(hidden_at is null or created_by = auth.uid() or is_platform_admin())`. Adjacent
  read adds `or community_id in (select linked_communities())`.
- **P2 — trust-gated insert.** `created_by = auth.uid()` + `community_id in
  (select member_communities())` + `can_act_as(...)` + a trust/cap branch. Caps for trust-0
  are also enforced server-side in the write RPCs.
- **P3 — author update / admin all.** `using (created_by = auth.uid() or is_platform_admin())`.
  Status transitions and `hidden_*` go through RPCs; a trigger rejects illegal direct changes.
- **P4 — participant read.** `thread_id in (select thread_id from thread_participants where
  profile_id = auth.uid() and left_at is null)`. Reports: reporter + admin. Notifications:
  `profile_id = auth.uid()`.

## Privileged-column guard

Membership `trust_level` / `status` / `community_id` change only via a SECURITY DEFINER RPC
(which sets `app.rpc='true'`) or a platform admin. `memberships_guard` (a BEFORE UPDATE
trigger) rejects any other path. This is why trust cannot be self-elevated even though a
member may update their own membership's ordinary fields (identities, etc.).

## The four test assertions (per migration)

Written **before** the policies:
- (a) a member of community A cannot read community B's rows;
- (b) trust-0 caps hold server-side;
- (c) hidden rows are invisible to third parties;
- (d) acting-as cannot be forged.

M1 tables are structural, so `rls_m1.sql` covers (a) plus the M1-specific gates (16+ refusal,
invite grants trust 1). (b)/(c)/(d) arrive with the content + business/org tables in
`rls_m2.sql` / `rls_m3.sql`.

## Execution status

⚠️ **Not yet executed.** No database exists in the build environment (no cloud Supabase
project; Docker unavailable so no local stack). Policies and tests are written to spec and
checked in; run `supabase db reset` + `supabase test db` once a project/local stack exists.
No RLS test is reported as passing until then (BLOCKED, see PROGRESS.md).
