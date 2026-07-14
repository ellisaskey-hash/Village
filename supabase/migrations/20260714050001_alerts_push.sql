-- 20260714050001 — M5: tiered alerts (spec 03/04 D4) + push tables (spec 09). Alert tier is
-- enforced two ways: a category/tier trigger, and a forgery-blocking insert policy (a verified
-- alert requires acting-as an officer of a verified_source organisation).

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  as_organisation_id uuid references public.organisations(id) on delete set null,
  tier text not null check (tier in ('community','verified','platform')),
  category text not null check (category in ('lostPet','foundItem','lostItem','roadClosure',
    'utilityOutage','weather','safety','notice','emergency')),
  title text not null,
  body text,
  photos text[] not null default '{}',
  location geography(point,4326),
  expires_at timestamptz not null default (now() + interval '3 days'),
  resolved_at timestamptz,
  hidden_at timestamptz, hidden_reason text,
  created_at timestamptz not null default now()
);
create index alerts_live_idx on public.alerts (community_id, expires_at) where resolved_at is null and hidden_at is null;

-- tier <-> category validity (spec 04)
create or replace function public.alerts_tier_check()
returns trigger language plpgsql as $$
begin
  if new.tier = 'community' and new.category not in ('lostPet','foundItem','lostItem','notice') then
    raise exception 'category % is not allowed at the community tier', new.category;
  elsif new.tier = 'verified' and new.category not in ('roadClosure','utilityOutage','safety','notice') then
    raise exception 'category % is not allowed at the verified tier', new.category;
  elsif new.tier = 'platform' and new.category not in ('weather','emergency') then
    raise exception 'category % is not allowed at the platform tier', new.category;
  end if;
  return new;
end; $$;
create trigger alerts_tier before insert or update on public.alerts
  for each row execute function public.alerts_tier_check();

-- Push (spec 09) — subscriptions, fan-out queue (drained by cron in batches), dispatch log.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

create table public.push_fanout_queue (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  alert_id uuid references public.alerts(id) on delete cascade,
  category text not null,          -- alert.community / alert.verified / alert.emergency
  title text not null,
  body text,
  deep_link text,
  bypass_quiet_hours boolean not null default false,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index push_fanout_pending_idx on public.push_fanout_queue (created_at) where processed_at is null;

create table public.push_dispatch_log (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  title text not null,
  status text not null default 'queued' check (status in ('queued','sent','skipped','gone')),
  detail text,
  created_at timestamptz not null default now()
);

alter table public.alerts             enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_fanout_queue  enable row level security;
alter table public.push_dispatch_log  enable row level security;

-- alerts read: community members; hidden invisible to third parties
create policy "read alerts" on public.alerts for select using (
  community_id in (select member_communities())
  and (hidden_at is null or created_by = auth.uid() or is_platform_admin())
);
-- alerts insert: tier-gated (community by trust; verified by verified-org officer; platform by admin)
create policy "create alerts" on public.alerts for insert with check (
  is_platform_admin()
  or (
    community_id in (select member_communities())
    and (
      (tier = 'community' and created_by = auth.uid()
        and trust_in(community_id) >= coalesce((select (config->>'alertsCommunityMinTrust')::int from communities c where c.id = community_id), 1))
      or (tier = 'verified' and as_organisation_id is not null and exists (
            select 1 from organisation_members om join organisations o on o.id = om.organisation_id
            where om.organisation_id = as_organisation_id and om.profile_id = auth.uid()
              and om.role in ('officer','admin') and o.verified_source = true))
    )
  )
);
create policy "update alerts" on public.alerts for update using (
  created_by = auth.uid() or is_platform_admin()
  or (as_organisation_id is not null and exists (
        select 1 from organisation_members om where om.organisation_id = as_organisation_id
          and om.profile_id = auth.uid() and om.role in ('officer','admin')))
);

-- push_subscriptions: own only
create policy "own subscriptions" on public.push_subscriptions for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
-- queue + dispatch log: admin only (fan-out is server-side)
create policy "admin fanout" on public.push_fanout_queue for all using (is_platform_admin()) with check (is_platform_admin());
create policy "own dispatch log" on public.push_dispatch_log for select using (profile_id = auth.uid() or is_platform_admin());
