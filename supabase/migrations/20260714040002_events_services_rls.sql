-- 20260714040002 — RLS for M4 entities (spec 03 P1/P2/P3). RSVP writes go through the
-- set_rsvp RPC (capacity/waitlist), so event_rsvps has read-only member policies here.

alter table public.events          enable row level security;
alter table public.event_rsvps     enable row level security;
alter table public.services        enable row level security;
alter table public.skills          enable row level security;
alter table public.equipment_items enable row level security;

-- events (create at eventsRequireTrust, default 1)
create policy "read events" on public.events for select using (
  community_id in (select member_communities())
  and (hidden_at is null or created_by = auth.uid() or is_platform_admin())
);
create policy "create events" on public.events for insert with check (
  created_by = auth.uid()
  and community_id in (select member_communities())
  and can_act_as(as_business_id, as_organisation_id)
  and trust_in(community_id) >= coalesce((select (config->>'eventsRequireTrust')::int from communities c where c.id = community_id), 1)
);
create policy "update events" on public.events for update using (
  created_by = auth.uid() or is_platform_admin()
);

-- event_rsvps (members read rsvps for events in their community; writes via set_rsvp RPC)
create policy "read rsvps" on public.event_rsvps for select using (
  exists (select 1 from events e where e.id = event_id and e.community_id in (select member_communities()))
);

-- services (P1 read + adjacency; create at trust 1; author/admin update)
create policy "read services" on public.services for select using (
  (community_id in (select member_communities()) or (serves_adjacent and community_id in (select linked_communities())))
  and (hidden_at is null or created_by = auth.uid() or is_platform_admin())
);
create policy "create services" on public.services for insert with check (
  created_by = auth.uid() and community_id in (select member_communities())
  and can_act_as(as_business_id, null) and trust_in(community_id) >= 1
);
create policy "update services" on public.services for update using (
  created_by = auth.uid() or is_platform_admin()
);

-- skills (community read; own create/delete at trust 1)
create policy "read skills" on public.skills for select using (
  community_id in (select member_communities())
);
create policy "create skills" on public.skills for insert with check (
  profile_id = auth.uid() and community_id in (select member_communities()) and trust_in(community_id) >= 1
);
create policy "delete own skills" on public.skills for delete using (profile_id = auth.uid());

-- equipment (P1 read; own create at trust 1; owner/admin update)
create policy "read equipment" on public.equipment_items for select using (
  community_id in (select member_communities())
  and (hidden_at is null or owner_profile_id = auth.uid() or is_platform_admin())
);
create policy "create equipment" on public.equipment_items for insert with check (
  owner_profile_id = auth.uid() and community_id in (select member_communities()) and trust_in(community_id) >= 1
);
create policy "update equipment" on public.equipment_items for update using (
  owner_profile_id = auth.uid() or is_platform_admin()
);
