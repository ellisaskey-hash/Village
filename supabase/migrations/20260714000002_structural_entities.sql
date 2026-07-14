-- 20260714000002 — structural entities: communities, community_links, profiles,
-- memberships, invites, vouches. Verbatim from spec 03 §Structural entities.

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  type text not null default 'village'
    check (type in ('village','estate','block','retirement','park','student','town')),
  region text,
  postcode_districts text[] not null default '{}',
  boundary geography(multipolygon, 4326),
  centre geography(point, 4326),
  skin text not null default 'village',
  config jsonb not null default '{}'::jsonb,
  status text not null default 'seeding' check (status in ('seeding','launched','archived')),
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_links (
  a uuid not null references public.communities(id) on delete cascade,
  b uuid not null references public.communities(id) on delete cascade,
  share text not null default 'directory'
    check (share in ('none','directory','directory_and_requests','full')),
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  avatar_url text,
  bio text,
  date_of_birth date not null,
  platform_role text check (platform_role in ('admin','support')),
  dm_privacy text not null default 'members'
    check (dm_privacy in ('members','contacts','nobody')),
  people_directory_opt_in boolean not null default true,
  quiet_hours jsonb,
  notification_prefs jsonb not null default '{}'::jsonb,
  search_document tsvector generated always as
    (to_tsvector('english', coalesce(display_name,'') || ' ' || coalesce(bio,''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint adults_only check (date_of_birth <= (current_date - interval '16 years'))
);
create index profiles_search_idx on public.profiles using gin (search_document);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  trust_level smallint not null default 0 check (trust_level between 0 and 3),
  joined_via text not null check (joined_via in ('postcode','invite','vouch','seed','admin')),
  invited_by uuid references public.profiles(id),
  postcode_given text,
  address_verified_at timestamptz,
  identities text[] not null default '{}',
  status text not null default 'active' check (status in ('active','suspended','left')),
  suspended_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, community_id)
);
create index memberships_community_idx on public.memberships (community_id, status);

create table public.invites (
  code text primary key,
  community_id uuid not null references public.communities(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  max_uses integer not null default 10,
  uses integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index invites_community_idx on public.invites (community_id);

create table public.vouches (
  voucher_id uuid not null references public.profiles(id) on delete cascade,
  vouched_id uuid not null references public.profiles(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (voucher_id, vouched_id, community_id)
);

-- updated_at triggers
create trigger communities_updated before update on public.communities
  for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger memberships_updated before update on public.memberships
  for each row execute function public.set_updated_at();
