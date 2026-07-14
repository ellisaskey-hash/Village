-- 20260714020001 — listings + requests (spec 03). Content with a status machine and
-- auto-expiry (D6). Cron sweeps expiry in M8; the columns + statuses land now.

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  as_business_id uuid references public.businesses(id) on delete set null,
  as_organisation_id uuid references public.organisations(id) on delete set null,
  constraint listings_one_actor check (as_business_id is null or as_organisation_id is null),
  kind text not null check (kind in ('sell','free','wanted','lend')),
  title text not null,
  description text,
  category text not null,
  price_pence integer,
  condition text check (condition in ('new','likeNew','good','fair','spares')),
  photos text[] not null default '{}',
  status text not null default 'active'
    check (status in ('active','reserved','completed','expired','withdrawn')),
  expires_at timestamptz not null default (now() + interval '30 days'),
  completed_with uuid references public.profiles(id),
  hidden_at timestamptz, hidden_reason text,
  search_document tsvector generated always as
    (to_tsvector('english', title || ' ' || coalesce(description,'') || ' ' || category)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listings_browse_idx on public.listings (community_id, status, created_at desc) where hidden_at is null;
create index listings_search_idx on public.listings using gin (search_document);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text not null check (category in ('trades','childcare','lifts','recommendations',
    'borrow','help','pets','other')),
  needed_by timestamptz,
  status text not null default 'open'
    check (status in ('open','answered','fulfilled','expired','withdrawn')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  visibility text not null default 'community' check (visibility in ('community','adjacent')),
  fulfilled_by uuid references public.profiles(id),
  hidden_at timestamptz, hidden_reason text,
  search_document tsvector generated always as
    (to_tsvector('english', title || ' ' || coalesce(description,'') || ' ' || category)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index requests_open_idx on public.requests (community_id, status, created_at desc) where hidden_at is null;
create index requests_search_idx on public.requests using gin (search_document);

create trigger listings_updated before update on public.listings for each row execute function public.set_updated_at();
create trigger requests_updated before update on public.requests for each row execute function public.set_updated_at();
