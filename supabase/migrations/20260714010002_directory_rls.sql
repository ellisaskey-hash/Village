-- 20260714010002 — can_act_as helper, seed_proposals table, and RLS for all directory
-- entities. Policies use helper functions only (spec 03 §RLS). Seeded rows are written by
-- SECURITY DEFINER RPCs (accept_seed_proposal), so member-facing insert policies stay tight.

-- Acting-as guard (spec 03) — now that businesses / organisation_members exist.
create or replace function public.can_act_as(biz uuid, org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    (biz is null or exists (select 1 from businesses b where b.id = biz and b.owner_profile_id = auth.uid()))
    and
    (org is null or exists (select 1 from organisation_members om
        where om.organisation_id = org and om.profile_id = auth.uid()
        and om.role in ('officer','admin')));
$$;

-- Seeding proposals (spec 08): ingestion writes ONLY here; nothing auto-publishes.
create table public.seed_proposals (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  kind text not null check (kind in ('place','business','organisation','event')),
  source text not null check (source in ('overpass','companies_house','fhrs','gias','url_extract','manual')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','merged')),
  merged_into uuid,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index seed_proposals_queue_idx on public.seed_proposals (community_id, status, created_at);

alter table public.places              enable row level security;
alter table public.businesses          enable row level security;
alter table public.organisations       enable row level security;
alter table public.business_items      enable row level security;
alter table public.business_claims     enable row level security;
alter table public.organisation_members enable row level security;
alter table public.organisation_posts  enable row level security;
alter table public.seed_proposals      enable row level security;

-- ---- places (P1 read; member create at trust 1; author/admin update) ----
create policy "read places" on public.places for select using (
  community_id in (select member_communities())
  and (hidden_at is null or created_by = auth.uid() or is_platform_admin())
);
create policy "create places" on public.places for insert with check (
  created_by = auth.uid() and community_id in (select member_communities()) and trust_in(community_id) >= 1
);
create policy "update places" on public.places for update using (
  created_by = auth.uid() or is_platform_admin()
);

-- ---- businesses (P1 read + adjacency; owner create at trust 1; owner/admin update) ----
create policy "read businesses" on public.businesses for select using (
  (
    community_id in (select member_communities())
    or (serves_adjacent and community_id in (select linked_communities()))
  )
  and (hidden_at is null or owner_profile_id = auth.uid() or is_platform_admin())
);
create policy "create businesses" on public.businesses for insert with check (
  owner_profile_id = auth.uid()
  and community_id in (select member_communities())
  and trust_in(community_id) >= 1
  and source = 'self'
);
create policy "update businesses" on public.businesses for update using (
  owner_profile_id = auth.uid() or is_platform_admin()
);

-- ---- organisations (P1 read; create at trust 2; officer/admin update) ----
create policy "read organisations" on public.organisations for select using (
  community_id in (select member_communities())
  and (hidden_at is null or is_platform_admin())
);
create policy "create organisations" on public.organisations for insert with check (
  community_id in (select member_communities()) and trust_in(community_id) >= 2 and source = 'self'
);
create policy "update organisations" on public.organisations for update using (
  is_platform_admin()
  or exists (select 1 from organisation_members om
             where om.organisation_id = id and om.profile_id = auth.uid() and om.role in ('officer','admin'))
);

-- ---- business_items (read follows parent business; owner writes) ----
create policy "read business items" on public.business_items for select using (
  exists (select 1 from businesses b where b.id = business_id
    and (b.community_id in (select member_communities())
         or (b.serves_adjacent and b.community_id in (select linked_communities())))
    and (b.hidden_at is null or b.owner_profile_id = auth.uid() or is_platform_admin()))
);
create policy "write business items" on public.business_items for all using (
  exists (select 1 from businesses b where b.id = business_id and (b.owner_profile_id = auth.uid() or is_platform_admin()))
) with check (
  exists (select 1 from businesses b where b.id = business_id and (b.owner_profile_id = auth.uid() or is_platform_admin()))
);

-- ---- business_claims (claimant sees own; admin all; claimant creates via RPC) ----
create policy "read own claims" on public.business_claims for select using (
  claimant_id = auth.uid() or is_platform_admin()
);

-- ---- organisation_members (community members read; officers/admin manage) ----
create policy "read org members" on public.organisation_members for select using (
  exists (select 1 from organisations o where o.id = organisation_id and o.community_id in (select member_communities()))
  or is_platform_admin()
);

-- ---- organisation_posts (P1 read with audience; officer create) ----
create policy "read org posts" on public.organisation_posts for select using (
  exists (select 1 from organisations o where o.id = organisation_id
    and o.community_id in (select member_communities())
    and (hidden_at is null or is_platform_admin()))
  and (
    audience = 'community'
    or exists (select 1 from organisation_members om where om.organisation_id = organisation_id and om.profile_id = auth.uid())
    or is_platform_admin()
  )
);
create policy "create org posts" on public.organisation_posts for insert with check (
  created_by = auth.uid()
  and exists (select 1 from organisation_members om
              where om.organisation_id = organisation_id and om.profile_id = auth.uid() and om.role in ('officer','admin'))
);

-- ---- seed_proposals (platform admin only) ----
create policy "admin seed proposals" on public.seed_proposals for all using (is_platform_admin())
  with check (is_platform_admin());
