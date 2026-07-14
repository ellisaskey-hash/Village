-- 20260714030002 — POLICY FIX (caught by the live RLS verification): several policies queried
-- their own table, which Postgres rejects at query time as "infinite recursion detected in
-- policy". Replaced with SECURITY DEFINER helpers that read the table outside RLS (owned by
-- postgres, so RLS is bypassed inside them), breaking the cycle. See PROGRESS.md.
--   - listings/requests trust-0 cap counts (self-referential COUNT subquery)
--   - threads / thread_participants / messages participant checks (thread_participants
--     read policy referenced thread_participants)

create or replace function public.active_listing_count(cid uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from listings where created_by = auth.uid() and community_id = cid and status = 'active';
$$;

create or replace function public.open_request_count(cid uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from requests where created_by = auth.uid() and community_id = cid and status = 'open';
$$;

create or replace function public.my_thread_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select thread_id from thread_participants where profile_id = auth.uid() and left_at is null;
$$;

-- listings create (cap via helper)
drop policy if exists "create listings" on public.listings;
create policy "create listings" on public.listings for insert with check (
  created_by = auth.uid()
  and community_id in (select member_communities())
  and can_act_as(as_business_id, as_organisation_id)
  and (
    trust_in(community_id) >= 1
    or active_listing_count(community_id)
       < coalesce((select (config->>'listingCapT0')::int from communities c where c.id = community_id), 2)
  )
);

-- requests create (cap via helper)
drop policy if exists "create requests" on public.requests;
create policy "create requests" on public.requests for insert with check (
  created_by = auth.uid()
  and community_id in (select member_communities())
  and (
    trust_in(community_id) >= 1
    or open_request_count(community_id)
       < coalesce((select (config->>'requestCapT0')::int from communities c where c.id = community_id), 1)
  )
);

-- threads / participants / messages participant checks via helper
drop policy if exists "read threads" on public.threads;
create policy "read threads" on public.threads for select using (
  id in (select my_thread_ids()) or is_platform_admin()
);

drop policy if exists "read participants" on public.thread_participants;
create policy "read participants" on public.thread_participants for select using (
  thread_id in (select my_thread_ids()) or is_platform_admin()
);

drop policy if exists "read messages" on public.messages;
create policy "read messages" on public.messages for select using (
  thread_id in (select my_thread_ids())
  and (hidden_at is null or sender_id = auth.uid() or is_platform_admin())
);

drop policy if exists "send messages" on public.messages;
create policy "send messages" on public.messages for insert with check (
  sender_id = auth.uid() and thread_id in (select my_thread_ids())
);
