-- 20260714010001 — directory entities (spec 03): places, businesses (+ items, claims),
-- organisations (+ members, posts). Places and businesses reference each other, so the
-- cross FKs are added by ALTER once both tables exist.

-- MIGRATION FIX: spec 03 uses array_to_string() inside a generated column, but that function
-- is STABLE (not IMMUTABLE) on Postgres, so it is rejected in a generation expression. This
-- wrapper is declared IMMUTABLE (its output depends only on its input) so the FTS column on
-- businesses.categories can be built. See PROGRESS.md.
create or replace function public.imm_array_to_string(arr text[])
returns text language sql immutable as $$ select array_to_string(arr, ' ') $$;

create table public.places (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('shop','pub','cafe','church','hall','school','green','sports',
    'health','service','landmark','transport','utility','other')),
  description text,
  location geography(point,4326),
  address text,
  opening_hours jsonb,
  photos text[] not null default '{}',
  business_id uuid,
  organisation_id uuid,
  source text not null default 'seed' check (source in ('seed','member','claimed')),
  created_by uuid references public.profiles(id) on delete set null,
  hidden_at timestamptz, hidden_reason text,
  search_document tsvector generated always as
    (to_tsvector('english', name || ' ' || coalesce(description,'') || ' ' || kind)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  categories text[] not null default '{}',
  description text,
  place_id uuid references public.places(id) on delete set null,
  contact jsonb not null default '{}'::jsonb,
  opening_hours jsonb,
  photos text[] not null default '{}',
  is_home_business boolean not null default false,
  serves_adjacent boolean not null default true,
  source text not null default 'seed' check (source in ('seed','self')),
  claimed_at timestamptz,
  verified_at timestamptz,
  hidden_at timestamptz, hidden_reason text,
  search_document tsvector generated always as (to_tsvector('english',
    name || ' ' || coalesce(description,'') || ' ' || public.imm_array_to_string(categories))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('council','school','pta','church','club','charity','group','other')),
  description text,
  place_id uuid references public.places(id) on delete set null,
  contact jsonb not null default '{}'::jsonb,
  photos text[] not null default '{}',
  verified_source boolean not null default false,
  source text not null default 'seed' check (source in ('seed','self')),
  hidden_at timestamptz, hidden_reason text,
  search_document tsvector generated always as
    (to_tsvector('english', name || ' ' || coalesce(description,'') || ' ' || kind)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- cross FKs now that both target tables exist
alter table public.places
  add constraint places_business_fk foreign key (business_id) references public.businesses(id) on delete set null,
  add constraint places_organisation_fk foreign key (organisation_id) references public.organisations(id) on delete set null;

create table public.business_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null check (kind in ('product','service','offer')),
  title text not null,
  description text,
  price_pence integer,
  offer_ends_at timestamptz,
  photos text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_claims (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  claimant_id uuid not null references public.profiles(id) on delete cascade,
  evidence text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.organisation_members (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member','officer','admin')),
  created_at timestamptz not null default now(),
  primary key (organisation_id, profile_id)
);

create table public.organisation_posts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('announcement','document')),
  title text not null,
  body text,
  document_path text,
  audience text not null default 'community' check (audience in ('community','members')),
  hidden_at timestamptz, hidden_reason text,
  created_at timestamptz not null default now()
);

-- FTS + browse indexes
create index places_search_idx on public.places using gin (search_document);
create index businesses_search_idx on public.businesses using gin (search_document);
create index organisations_search_idx on public.organisations using gin (search_document);
create index places_community_idx on public.places (community_id) where hidden_at is null;
create index businesses_community_idx on public.businesses (community_id) where hidden_at is null;
create index organisations_community_idx on public.organisations (community_id) where hidden_at is null;

-- updated_at triggers
create trigger places_updated before update on public.places for each row execute function public.set_updated_at();
create trigger businesses_updated before update on public.businesses for each row execute function public.set_updated_at();
create trigger organisations_updated before update on public.organisations for each row execute function public.set_updated_at();
create trigger business_items_updated before update on public.business_items for each row execute function public.set_updated_at();
