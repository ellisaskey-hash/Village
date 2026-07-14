-- 20260714020003 — RLS for listings, requests, threads, participants, messages, notifications
-- (spec 03 P1/P2/P4). Trust-0 create caps are enforced here AND in the write RPCs. Threads are
-- created only by open_thread (SECURITY DEFINER) — there is no client insert policy on threads.

alter table public.listings            enable row level security;
alter table public.requests            enable row level security;
alter table public.threads             enable row level security;
alter table public.thread_participants enable row level security;
alter table public.messages            enable row level security;
alter table public.notifications       enable row level security;

-- listings
create policy "read listings" on public.listings for select using (
  community_id in (select member_communities())
  and (hidden_at is null or created_by = auth.uid() or is_platform_admin())
);
create policy "create listings" on public.listings for insert with check (
  created_by = auth.uid()
  and community_id in (select member_communities())
  and can_act_as(as_business_id, as_organisation_id)
  and (
    trust_in(community_id) >= 1
    or (select count(*) from listings l
        where l.created_by = auth.uid() and l.community_id = listings.community_id and l.status = 'active')
       < coalesce((select (config->>'listingCapT0')::int from communities c where c.id = community_id), 2)
  )
);
create policy "update listings" on public.listings for update using (
  created_by = auth.uid() or is_platform_admin()
);

-- requests
create policy "read requests" on public.requests for select using (
  (
    community_id in (select member_communities())
    or (visibility = 'adjacent' and community_id in (select linked_communities()))
  )
  and (hidden_at is null or created_by = auth.uid() or is_platform_admin())
);
create policy "create requests" on public.requests for insert with check (
  created_by = auth.uid()
  and community_id in (select member_communities())
  and (
    trust_in(community_id) >= 1
    or (select count(*) from requests r
        where r.created_by = auth.uid() and r.community_id = requests.community_id and r.status = 'open')
       < coalesce((select (config->>'requestCapT0')::int from communities c where c.id = community_id), 1)
  )
);
create policy "update requests" on public.requests for update using (
  created_by = auth.uid() or is_platform_admin()
);

-- threads (P4 read; created only via open_thread RPC)
create policy "read threads" on public.threads for select using (
  id in (select thread_id from thread_participants where profile_id = auth.uid() and left_at is null)
  or is_platform_admin()
);

-- thread_participants
create policy "read participants" on public.thread_participants for select using (
  thread_id in (select thread_id from thread_participants where profile_id = auth.uid() and left_at is null)
  or is_platform_admin()
);
create policy "update own participant" on public.thread_participants for update using (
  profile_id = auth.uid()
);

-- messages (P4 read; active participant may send)
create policy "read messages" on public.messages for select using (
  thread_id in (select thread_id from thread_participants where profile_id = auth.uid() and left_at is null)
  and (hidden_at is null or sender_id = auth.uid() or is_platform_admin())
);
create policy "send messages" on public.messages for insert with check (
  sender_id = auth.uid()
  and thread_id in (select thread_id from thread_participants where profile_id = auth.uid() and left_at is null)
);

-- notifications (own only)
create policy "read own notifications" on public.notifications for select using (profile_id = auth.uid());
create policy "update own notifications" on public.notifications for update using (profile_id = auth.uid());
