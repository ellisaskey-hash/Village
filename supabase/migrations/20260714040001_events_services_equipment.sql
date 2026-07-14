-- 20260714040001 — M4 entities (spec 03): events (+rsvps), services, skills, equipment_items.
-- created_by / owner / profile columns default auth.uid() (the fix learned in 030001).

create table public.events (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  as_business_id uuid references public.businesses(id) on delete set null,
  as_organisation_id uuid references public.organisations(id) on delete set null,
  constraint events_one_actor check (as_business_id is null or as_organisation_id is null),
  title text not null,
  description text,
  category text not null check (category in ('community','school','sport','club','church','market','other')),
  place_id uuid references public.places(id) on delete set null,
  location_text text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  recurrence jsonb,
  parent_event_id uuid references public.events(id) on delete cascade,
  rsvp_mode text not null default 'open' check (rsvp_mode in ('none','open','capacity')),
  capacity integer,
  photos text[] not null default '{}',
  source text not null default 'member' check (source in ('seed','member')),
  hidden_at timestamptz, hidden_reason text,
  search_document tsvector generated always as
    (to_tsvector('english', title || ' ' || coalesce(description,'') || ' ' || category)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_upcoming_idx on public.events (community_id, starts_at) where hidden_at is null;
create index events_search_idx on public.events using gin (search_document);

create table public.event_rsvps (
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  status text not null default 'going' check (status in ('going','maybe','waitlist','cancelled')),
  party_size smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  as_business_id uuid references public.businesses(id) on delete set null,
  title text not null,
  category text not null,
  description text,
  serves_adjacent boolean not null default true,
  photos text[] not null default '{}',
  active boolean not null default true,
  hidden_at timestamptz, hidden_reason text,
  search_document tsvector generated always as
    (to_tsvector('english', title || ' ' || coalesce(description,'') || ' ' || category)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_search_idx on public.services using gin (search_document);
create index services_community_idx on public.services (community_id) where hidden_at is null;

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  profile_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  skill text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (community_id, profile_id, skill)
);

create table public.equipment_items (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  owner_profile_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null,
  category text not null check (category in ('garden','diy','transport','kitchen','events','sports','other')),
  note text,
  photos text[] not null default '{}',
  lend_terms text,
  available boolean not null default true,
  hidden_at timestamptz, hidden_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index equipment_community_idx on public.equipment_items (community_id) where hidden_at is null;

create trigger events_updated before update on public.events for each row execute function public.set_updated_at();
create trigger event_rsvps_updated before update on public.event_rsvps for each row execute function public.set_updated_at();
create trigger services_updated before update on public.services for each row execute function public.set_updated_at();
create trigger equipment_updated before update on public.equipment_items for each row execute function public.set_updated_at();
