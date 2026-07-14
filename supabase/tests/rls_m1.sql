-- RLS tests for M1 (structural entities). Written BEFORE the policies, per CLAUDE.md rule 4.
--
-- STATUS: NOT YET EXECUTED. There is no database in this environment (no cloud Supabase
-- project, Docker unavailable so no local stack). Run with:
--   supabase test db            # once a local stack or project exists
-- These assert the M1-relevant subset of the four canonical isolation assertions from
-- spec 03. Assertions (b) trust-0 caps, (c) hidden invisible, (d) acting-as forgery need
-- the content + business/org tables, so they arrive with M2/M3 in rls_m2.sql / rls_m3.sql.
--
-- pgTAP + Supabase RLS convention: policies only apply to the `authenticated` role, so each
-- case sets the role and the JWT `sub` (which auth.uid() reads) to impersonate a user.

begin;
select plan(9);

-- ---------------------------------------------------------------------------
-- Fixture: two communities, two members (one each), one invite in community A.
-- Created as the table owner (RLS bypassed) so the fixture itself is unconditional.
-- ---------------------------------------------------------------------------
set local role postgres;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'ava@example.com'),
  ('00000000-0000-0000-0000-00000000b001', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000c001', 'newcomer@example.com');

insert into public.profiles (id, display_name, email, date_of_birth) values
  ('00000000-0000-0000-0000-00000000a001', 'Ava Green',  'ava@example.com', '1990-01-01'),
  ('00000000-0000-0000-0000-00000000b001', 'Ben Stone',  'ben@example.com', '1988-05-05');

insert into public.communities (id, slug, name, type, postcode_districts, status) values
  ('00000000-0000-0000-0000-0000000c0a11', 'community-a', 'Community A', 'village', array['AA1'], 'launched'),
  ('00000000-0000-0000-0000-0000000c0b22', 'community-b', 'Community B', 'village', array['BB2'], 'launched');

insert into public.memberships (profile_id, community_id, trust_level, joined_via) values
  ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000c0a11', 1, 'postcode'),
  ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000c0b22', 1, 'postcode');

insert into public.invites (code, community_id, created_by, max_uses) values
  ('INVITEA', '00000000-0000-0000-0000-0000000c0a11', '00000000-0000-0000-0000-00000000a001', 10);

-- helper: become an authenticated user
create or replace function tests.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
end; $$;

-- ---------------------------------------------------------------------------
-- (a) Cross-community isolation: Ava (community A) cannot read community B's rows.
-- ---------------------------------------------------------------------------
select tests.as_user('00000000-0000-0000-0000-00000000a001');

select is(
  (select count(*)::int from public.memberships where community_id = '00000000-0000-0000-0000-0000000c0b22'),
  0,
  'Ava cannot read community B memberships'
);
select is(
  (select count(*)::int from public.memberships where community_id = '00000000-0000-0000-0000-0000000c0a11'),
  1,
  'Ava can read her own community A memberships'
);
select is(
  (select count(*)::int from public.communities where id = '00000000-0000-0000-0000-0000000c0b22'),
  0,
  'Ava cannot read community B (not a member)'
);
select ok(
  exists (select 1 from public.communities where id = '00000000-0000-0000-0000-0000000c0a11'),
  'Ava can read her own community A'
);

-- Ben (community B) mirror check
select tests.as_user('00000000-0000-0000-0000-00000000b001');
select is(
  (select count(*)::int from public.memberships where community_id = '00000000-0000-0000-0000-0000000c0a11'),
  0,
  'Ben cannot read community A memberships'
);

-- ---------------------------------------------------------------------------
-- (16+) DOB refusal: a sub-16 profile violates the adults_only check constraint.
-- ---------------------------------------------------------------------------
set local role postgres;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'teen@example.com');
select throws_ok(
  $$ insert into public.profiles (id, display_name, email, date_of_birth)
     values ('00000000-0000-0000-0000-0000000000d1', 'Too Young', 'teen@example.com', (current_date - interval '15 years')::date) $$,
  '23514',
  null,
  'A 15-year-old DOB is refused by the adults_only check'
);

-- ---------------------------------------------------------------------------
-- Invite path grants trust 1 (join_community RPC).
-- ---------------------------------------------------------------------------
select tests.as_user('00000000-0000-0000-0000-00000000c001');
-- newcomer needs a profile first (created at signup); create via owner for the test
set local role postgres;
insert into public.profiles (id, display_name, email, date_of_birth)
  values ('00000000-0000-0000-0000-00000000c001', 'Cara New', 'newcomer@example.com', '1995-03-03');
select tests.as_user('00000000-0000-0000-0000-00000000c001');

select lives_ok(
  $$ select public.join_community('community-a', null, 'INVITEA') $$,
  'newcomer can join community A via invite'
);
select is(
  (select trust_level from public.memberships
     where profile_id = '00000000-0000-0000-0000-00000000c001'
       and community_id = '00000000-0000-0000-0000-0000000c0a11'),
  1::smallint,
  'invite path grants trust level 1'
);

-- Postcode path grants trust 0 (mismatched postcode refused, matched gives trust 0)
select is(
  (select uses from public.invites where code = 'INVITEA'),
  1,
  'join_community incremented invite uses'
);

select * from finish();
rollback;
