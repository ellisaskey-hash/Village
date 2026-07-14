-- RLS tests for M2 (directory content). Written BEFORE the policies. Covers the remaining
-- three of the four canonical assertions now that content + business/org tables exist:
-- (a) cross-community isolation, (c) hidden rows invisible to third parties, (d) acting-as
-- cannot be forged. (Trust-0 create caps (b) are exercised against listings in rls_m3.sql,
-- where the capped content lives; M2's create policies are covered here for businesses.)
--
-- STATUS: NOT YET EXECUTED (no database in this environment). Run: supabase test db.

begin;
select plan(7);

set local role postgres;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000a2001', 'amy@example.com'),
  ('00000000-0000-0000-0000-0000000b2001', 'bob@example.com'),
  ('00000000-0000-0000-0000-0000000f2001', 'fen@example.com'); -- forger

insert into public.profiles (id, display_name, email, date_of_birth) values
  ('00000000-0000-0000-0000-0000000a2001', 'Amy A', 'amy@example.com', '1990-01-01'),
  ('00000000-0000-0000-0000-0000000b2001', 'Bob B', 'bob@example.com', '1990-01-01'),
  ('00000000-0000-0000-0000-0000000f2001', 'Fen F', 'fen@example.com', '1990-01-01');

insert into public.communities (id, slug, name, type, postcode_districts, status) values
  ('00000000-0000-0000-0000-000000c2a111', 'c2a', 'C2A', 'village', array['AA1'], 'launched'),
  ('00000000-0000-0000-0000-000000c2b222', 'c2b', 'C2B', 'village', array['BB2'], 'launched');

insert into public.memberships (profile_id, community_id, trust_level, joined_via) values
  ('00000000-0000-0000-0000-0000000a2001', '00000000-0000-0000-0000-000000c2a111', 2, 'postcode'),
  ('00000000-0000-0000-0000-0000000b2001', '00000000-0000-0000-0000-000000c2b222', 2, 'postcode'),
  ('00000000-0000-0000-0000-0000000f2001', '00000000-0000-0000-0000-000000c2a111', 1, 'postcode');

-- Amy owns a claimed business in C2A; one visible place and one hidden place exist in C2A.
insert into public.businesses (id, community_id, owner_profile_id, name, source, claimed_at)
values ('00000000-0000-0000-0000-0000000biz01', '00000000-0000-0000-0000-000000c2a111',
        '00000000-0000-0000-0000-0000000a2001', 'Amy Bakery', 'self', now());

insert into public.places (id, community_id, name, kind, source) values
  ('00000000-0000-0000-0000-000000plc01', '00000000-0000-0000-0000-000000c2a111', 'Village Green', 'green', 'seed'),
  ('00000000-0000-0000-0000-000000plc02', '00000000-0000-0000-0000-000000c2a111', 'Hidden Spot', 'other', 'seed');
update public.places set hidden_at = now(), hidden_reason = 'test' where id = '00000000-0000-0000-0000-000000plc02';

create or replace function tests.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
end; $$;

-- (a) cross-community isolation
select tests.as_user('00000000-0000-0000-0000-0000000b2001'); -- Bob, community C2B
select is((select count(*)::int from public.businesses where community_id = '00000000-0000-0000-0000-000000c2a111'), 0,
  'Bob cannot read C2A businesses');
select is((select count(*)::int from public.places where community_id = '00000000-0000-0000-0000-000000c2a111'), 0,
  'Bob cannot read C2A places');

-- (c) hidden rows invisible to third parties (but visible to community members otherwise)
select tests.as_user('00000000-0000-0000-0000-0000000f2001'); -- Fen, member of C2A, not the author
select is((select count(*)::int from public.places where id = '00000000-0000-0000-0000-000000plc02'), 0,
  'a hidden place is invisible to a third party in the same community');
select is((select count(*)::int from public.places where id = '00000000-0000-0000-0000-000000plc01'), 1,
  'a visible place is readable by a community member');

-- (d) acting-as cannot be forged: Fen cannot post an organisation_post or content as Amy Bakery.
select throws_ok(
  $$ insert into public.organisation_posts (organisation_id, created_by, kind, title)
     select o.id, '00000000-0000-0000-0000-0000000f2001', 'announcement', 'Forged'
     from public.organisations o limit 1 $$,
  null, null,
  'Fen cannot post as an organisation he does not officer (no org / RLS denies)'
);
-- Fen tries to create a listing acting-as Amy Bakery (can_act_as must be false for him).
select throws_ok(
  $$ insert into public.businesses (community_id, owner_profile_id, name, source)
     values ('00000000-0000-0000-0000-000000c2b222', '00000000-0000-0000-0000-0000000f2001', 'Wrong Community', 'self') $$,
  null, null,
  'Fen cannot create a business in a community he does not belong to'
);

-- Amy CAN act as her own business (sanity).
select tests.as_user('00000000-0000-0000-0000-0000000a2001');
select ok(public.can_act_as('00000000-0000-0000-0000-0000000biz01', null),
  'Amy can act as her own business');

select * from finish();
rollback;
