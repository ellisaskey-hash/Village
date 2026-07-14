-- 20260714070001 — M7 moderation + safety (spec 03/04). reports + moderation_actions +
-- first_post_delays (trust-0 friction, config-gated), is_suspended helper, and suspension
-- enforced on content inserts (writes blocked, reads unaffected).

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  target_kind text not null check (target_kind in ('listing','request','event','alert','message',
    'profile','business','organisation','place','service','equipment','organisation_post')),
  target_id uuid not null,
  reason text not null check (reason in ('scam','spam','abuse','unsafe','wrongInfo','privacy','other')),
  note text,
  priority boolean not null default false,          -- set for 'unsafe' (duty-of-care)
  status text not null default 'open' check (status in ('open','upheld','dismissed')),
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_kind, target_id)
);
create index reports_open_idx on public.reports (community_id, status, created_at desc);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  actor_id uuid references public.profiles(id),      -- null = automation
  target_kind text not null,
  target_id uuid not null,
  action text not null check (action in ('autoHide','hide','unhide','remove','warn','suspend','unsuspend','trustChange','note')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index moderation_actions_idx on public.moderation_actions (community_id, created_at desc);

-- trust-0 first-post delay queue (spec 04). Populated by a trigger only when the community
-- config sets firstPostDelayMinutes > 0 (default off, so existing flows are unaffected).
create table public.first_post_delays (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  community_id uuid not null references public.communities(id) on delete cascade,
  content_kind text not null,
  content_id uuid not null,
  release_at timestamptz not null,
  released_at timestamptz,
  created_at timestamptz not null default now()
);
create index first_post_delays_pending_idx on public.first_post_delays (release_at) where released_at is null;

-- Am I suspended in this community? (status suspended or a live suspended_until)
create or replace function public.is_suspended(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where profile_id = auth.uid() and community_id = cid
      and (status = 'suspended' or (suspended_until is not null and suspended_until > now()))
  );
$$;

-- RLS
alter table public.reports            enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.first_post_delays  enable row level security;

-- reports: reporter reads own; admin all. Inserts go through report_target (SECURITY DEFINER).
create policy "read own reports" on public.reports for select using (
  reporter_id = auth.uid() or is_platform_admin()
);
-- moderation log: admin (all) + stewards (their community).
create policy "read mod log" on public.moderation_actions for select using (
  is_platform_admin() or trust_in(community_id) >= 3
);
create policy "read delays" on public.first_post_delays for select using (
  is_platform_admin() or trust_in(community_id) >= 3
);

-- Suspension enforcement: recreate content-insert policies with `and not is_suspended(...)`.
-- Reads are untouched, so a suspended member can still browse (spec 04).
drop policy if exists "create listings" on public.listings;
create policy "create listings" on public.listings for insert with check (
  created_by = auth.uid() and community_id in (select member_communities())
  and not is_suspended(community_id)
  and can_act_as(as_business_id, as_organisation_id)
  and (trust_in(community_id) >= 1
       or active_listing_count(community_id) < coalesce((select (config->>'listingCapT0')::int from communities c where c.id = community_id), 2))
);
drop policy if exists "create requests" on public.requests;
create policy "create requests" on public.requests for insert with check (
  created_by = auth.uid() and community_id in (select member_communities())
  and not is_suspended(community_id)
  and (trust_in(community_id) >= 1
       or open_request_count(community_id) < coalesce((select (config->>'requestCapT0')::int from communities c where c.id = community_id), 1))
);
drop policy if exists "create events" on public.events;
create policy "create events" on public.events for insert with check (
  created_by = auth.uid() and community_id in (select member_communities())
  and not is_suspended(community_id)
  and can_act_as(as_business_id, as_organisation_id)
  and trust_in(community_id) >= coalesce((select (config->>'eventsRequireTrust')::int from communities c where c.id = community_id), 1)
);
drop policy if exists "create services" on public.services;
create policy "create services" on public.services for insert with check (
  created_by = auth.uid() and community_id in (select member_communities())
  and not is_suspended(community_id) and can_act_as(as_business_id, null) and trust_in(community_id) >= 1
);
drop policy if exists "create equipment" on public.equipment_items;
create policy "create equipment" on public.equipment_items for insert with check (
  owner_profile_id = auth.uid() and community_id in (select member_communities())
  and not is_suspended(community_id) and trust_in(community_id) >= 1
);
drop policy if exists "create places" on public.places;
create policy "create places" on public.places for insert with check (
  created_by = auth.uid() and community_id in (select member_communities())
  and not is_suspended(community_id) and trust_in(community_id) >= 1
);
