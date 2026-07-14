-- RLS tests for M3 (content lifecycle + threads). Written BEFORE the policies. Completes the
-- four canonical assertions: (b) trust-0 create caps hold server-side, and (P4) participant-only
-- reads, plus the cold-DM gate (spec 03 §threads, 04). NOT YET EXECUTED (no DB): supabase test db.

begin;
select plan(6);

set local role postgres;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000a3001', 'ada@example.com'),
  ('00000000-0000-0000-0000-0000000b3001', 'bea@example.com'),
  ('00000000-0000-0000-0000-0000000c3001', 'cid@example.com');
insert into public.profiles (id, display_name, email, date_of_birth) values
  ('00000000-0000-0000-0000-0000000a3001', 'Ada', 'ada@example.com', '1990-01-01'),
  ('00000000-0000-0000-0000-0000000b3001', 'Bea', 'bea@example.com', '1990-01-01'),
  ('00000000-0000-0000-0000-0000000c3001', 'Cid', 'cid@example.com', '1990-01-01');
insert into public.communities (id, slug, name, type, postcode_districts, status) values
  ('00000000-0000-0000-0000-0000000c3111', 'c3', 'C3', 'village', array['CC3'], 'launched');
insert into public.memberships (profile_id, community_id, trust_level, joined_via) values
  ('00000000-0000-0000-0000-0000000a3001', '00000000-0000-0000-0000-0000000c3111', 0, 'postcode'), -- trust 0
  ('00000000-0000-0000-0000-0000000b3001', '00000000-0000-0000-0000-0000000c3111', 1, 'postcode'),
  ('00000000-0000-0000-0000-0000000c3001', '00000000-0000-0000-0000-0000000c3111', 1, 'postcode');

create or replace function tests.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
end; $$;

-- (b) trust-0 listing cap = 2 (default config). Ada may create two, not three.
select tests.as_user('00000000-0000-0000-0000-0000000a3001');
select lives_ok($$ insert into public.listings (community_id, created_by, kind, title, category)
  values ('00000000-0000-0000-0000-0000000c3111','00000000-0000-0000-0000-0000000a3001','free','One','other') $$,
  'trust-0 first listing allowed');
select lives_ok($$ insert into public.listings (community_id, created_by, kind, title, category)
  values ('00000000-0000-0000-0000-0000000c3111','00000000-0000-0000-0000-0000000a3001','free','Two','other') $$,
  'trust-0 second listing allowed');
select throws_ok($$ insert into public.listings (community_id, created_by, kind, title, category)
  values ('00000000-0000-0000-0000-0000000c3111','00000000-0000-0000-0000-0000000a3001','free','Three','other') $$,
  null, null, 'trust-0 third active listing is capped');

-- (P4) participant-only message reads. Bea opens a thread with Cid; Ada (non-participant) can't read it.
select tests.as_user('00000000-0000-0000-0000-0000000b3001');
-- create a context thread + message directly as owner to set up (bypass RPC in the fixture)
set local role postgres;
insert into public.threads (id, community_id, context, created_by)
  values ('00000000-0000-0000-0000-000000thr01','00000000-0000-0000-0000-0000000c3111','direct','00000000-0000-0000-0000-0000000b3001');
insert into public.thread_participants (thread_id, profile_id) values
  ('00000000-0000-0000-0000-000000thr01','00000000-0000-0000-0000-0000000b3001'),
  ('00000000-0000-0000-0000-000000thr01','00000000-0000-0000-0000-0000000c3001');
insert into public.messages (thread_id, sender_id, body)
  values ('00000000-0000-0000-0000-000000thr01','00000000-0000-0000-0000-0000000b3001','hello');

select tests.as_user('00000000-0000-0000-0000-0000000a3001'); -- Ada, not a participant
select is((select count(*)::int from public.messages where thread_id = '00000000-0000-0000-0000-000000thr01'), 0,
  'a non-participant cannot read a thread''s messages');
select tests.as_user('00000000-0000-0000-0000-0000000c3001'); -- Cid, a participant
select is((select count(*)::int from public.messages where thread_id = '00000000-0000-0000-0000-000000thr01'), 1,
  'a participant can read the thread''s messages');

-- cold-DM gate: a trust-0 member cannot open a direct thread to a stranger (open_thread raises).
select tests.as_user('00000000-0000-0000-0000-0000000a3001');
select throws_ok(
  $$ select public.open_thread('direct', null, '00000000-0000-0000-0000-0000000c3001', 'hi') $$,
  null, null, 'trust-0 cold DM is refused by open_thread');

select * from finish();
rollback;
