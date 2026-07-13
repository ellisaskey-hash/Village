# 03 — Data Model

Postgres 15 on Supabase. Conventions inherited from Elevra's DATA_MODEL.md: UUID PKs (`gen_random_uuid()`), `timestamptz` audit columns with the `set_updated_at()` trigger, text + CHECK constraints for enums (never `create type`), JSONB only for shapes never queried by inner field, RLS on every table, timestamped migration filenames.

Extensions: `pgcrypto`, `pg_trgm`, `postgis`, `unaccent`.

## Helper functions (security definer — the RLS vocabulary)

Every policy below is written in terms of these four. Defining them once keeps policies short, consistent, and plannable (Postgres inlines stable security-definer functions well; all are `stable`).

```sql
create or replace function public.member_communities()
returns setof uuid language sql stable security definer set search_path = public as $$
  select community_id from memberships
  where profile_id = auth.uid() and status = 'active';
$$;

create or replace function public.trust_in(cid uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(max(trust_level), -1) from memberships
  where profile_id = auth.uid() and community_id = cid and status = 'active';
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and platform_role = 'admin');
$$;

-- Acting-as guard: may the current user author content as this business / organisation?
create or replace function public.can_act_as(biz uuid, org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    (biz is null or exists (select 1 from businesses b where b.id = biz and b.owner_profile_id = auth.uid()))
    and
    (org is null or exists (select 1 from organisation_members om
        where om.organisation_id = org and om.profile_id = auth.uid()
        and om.role in ('officer','admin')));
$$;
```

## Structural entities

### `communities`

```sql
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,                      -- 'horsmonden'
  name text not null,                             -- 'Horsmonden'
  type text not null default 'village'
    check (type in ('village','estate','block','retirement','park','student','town')),
  region text,                                    -- 'Kent, England'
  postcode_districts text[] not null default '{}',-- ['TN12'] — join gate
  boundary geography(multipolygon, 4326),         -- optional precise boundary
  centre geography(point, 4326),
  skin text not null default 'village',           -- data-skin value (05)
  config jsonb not null default '{}'::jsonb,      -- per-type feature config, copy overrides
  status text not null default 'seeding' check (status in ('seeding','launched','archived')),
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_links (             -- adjacency (D1)
  a uuid not null references communities(id) on delete cascade,
  b uuid not null references communities(id) on delete cascade,
  share text not null default 'directory'
    check (share in ('none','directory','directory_and_requests','full')),
  created_at timestamptz not null default now(),
  primary key (a, b), check (a < b)
);
```

`config` keys (all optional; defaults in code): `{"coldDmMinTrust":1,"listingCapT0":2,"requestCapT0":1,"eventsRequireTrust":1,"alertsCommunityMinTrust":1,"autoHideReportThreshold":3,"maxPhotoMb":10}`.

### `profiles` — one row per person

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  avatar_url text,
  bio text,
  date_of_birth date not null,                    -- 16+ enforced at signup RPC + check
  platform_role text check (platform_role in ('admin','support')),  -- null = ordinary user
  dm_privacy text not null default 'members'      -- who may cold-DM me
    check (dm_privacy in ('members','contacts','nobody')),
  quiet_hours jsonb,                              -- {start:'21:30', end:'07:30', tz:'Europe/London'}
  notification_prefs jsonb not null default '{}'::jsonb,  -- per-category toggles + frequency caps (09)
  search_document tsvector generated always as
    (to_tsvector('english', coalesce(display_name,'') || ' ' || coalesce(bio,''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint adults_only check (date_of_birth <= (current_date - interval '16 years'))
);
```

### `memberships` — person ↔ community, with trust

```sql
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  community_id uuid not null references communities(id) on delete cascade,
  trust_level smallint not null default 0 check (trust_level between 0 and 3),
  -- 0 new · 1 established · 2 verified resident · 3 steward (per-community elevated; platform admin is global)
  joined_via text not null check (joined_via in ('postcode','invite','vouch','seed','admin')),
  invited_by uuid references profiles(id),
  postcode_given text,
  address_verified_at timestamptz,
  identities text[] not null default '{}',        -- self-declared chips: resident,parent,tradesperson,business,club
  status text not null default 'active' check (status in ('active','suspended','left')),
  suspended_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, community_id)
);
create index memberships_community_idx on memberships (community_id, status);
```

### `invites` and `vouches`

```sql
create table public.invites (
  code text primary key,                          -- short, URL-safe
  community_id uuid not null references communities(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  max_uses integer not null default 10,
  uses integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.vouches (                     -- existing member vouches for a newcomer (04)
  voucher_id uuid not null references profiles(id) on delete cascade,
  vouched_id uuid not null references profiles(id) on delete cascade,
  community_id uuid not null references communities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (voucher_id, vouched_id, community_id)
);
```

## Content entities

All content tables share four authorship/scoping columns; shown once here and marked `-- STD` below:

```sql
  community_id uuid not null references communities(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  as_business_id uuid references businesses(id) on delete set null,
  as_organisation_id uuid references organisations(id) on delete set null,
  constraint one_actor check (as_business_id is null or as_organisation_id is null)
```

And two moderation columns, `-- MOD`:

```sql
  hidden_at timestamptz,        -- set by auto-hide or admin; row invisible to non-authors
  hidden_reason text
```

### `places`

```sql
create table public.places (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('shop','pub','cafe','church','hall','school','green','sports',
    'health','service','landmark','transport','utility','other')),
  description text,
  location geography(point,4326),
  address text,
  opening_hours jsonb,                            -- OSM-style spec
  photos text[] not null default '{}',
  business_id uuid,                               -- FK added after businesses
  organisation_id uuid,
  source text not null default 'seed' check (source in ('seed','member','claimed')),
  created_by uuid references profiles(id) on delete set null,   -- null for seeded
  hidden_at timestamptz, hidden_reason text,
  search_document tsvector generated always as
    (to_tsvector('english', name || ' ' || coalesce(description,'') || ' ' || kind)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `businesses`

```sql
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  owner_profile_id uuid references profiles(id) on delete set null,  -- NULL = unclaimed stub (08)
  name text not null,
  categories text[] not null default '{}',        -- 'butcher','plumber','childcare','crafts',...
  description text,
  place_id uuid references places(id) on delete set null,
  contact jsonb not null default '{}'::jsonb,     -- {phone,email,website} — shown per visibility rules
  opening_hours jsonb,
  photos text[] not null default '{}',
  is_home_business boolean not null default false,
  serves_adjacent boolean not null default true,  -- visible via community_links
  source text not null default 'seed' check (source in ('seed','self')),
  claimed_at timestamptz,
  verified_at timestamptz,                        -- admin-verified ownership
  hidden_at timestamptz, hidden_reason text,
  search_document tsvector generated always as (to_tsvector('english',
    name || ' ' || coalesce(description,'') || ' ' || array_to_string(categories,' '))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_items (              -- products, services, offers — one table, kind-switched
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
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

create table public.business_claims (             -- claim flow (08)
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  claimant_id uuid not null references profiles(id) on delete cascade,
  evidence text,                                  -- free text + optional doc in storage
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
```

### `organisations`

```sql
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('council','school','pta','church','club','charity','group','other')),
  description text,
  place_id uuid references places(id) on delete set null,
  contact jsonb not null default '{}'::jsonb,
  photos text[] not null default '{}',
  verified_source boolean not null default false, -- may post tier-2 alerts (04)
  source text not null default 'seed' check (source in ('seed','self')),
  hidden_at timestamptz, hidden_reason text,
  search_document tsvector generated always as
    (to_tsvector('english', name || ' ' || coalesce(description,'') || ' ' || kind)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organisation_members (
  organisation_id uuid not null references organisations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member','officer','admin')),
  created_at timestamptz not null default now(),
  primary key (organisation_id, profile_id)
);

create table public.organisation_posts (          -- announcements + documents
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('announcement','document')),
  title text not null,
  body text,
  document_path text,                             -- storage path when kind='document'
  audience text not null default 'community' check (audience in ('community','members')),
  hidden_at timestamptz, hidden_reason text,
  created_at timestamptz not null default now()
);
```

### `events`

```sql
create table public.events (
  id uuid primary key default gen_random_uuid(),
  -- STD authorship columns
  community_id uuid not null references communities(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  as_business_id uuid references businesses(id) on delete set null,
  as_organisation_id uuid references organisations(id) on delete set null,
  constraint events_one_actor check (as_business_id is null or as_organisation_id is null),
  title text not null,
  description text,
  category text not null check (category in ('community','school','sport','club','church','market','other')),
  place_id uuid references places(id) on delete set null,
  location_text text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  recurrence jsonb,                               -- RRULE-shaped; expanded by cron into next instances
  parent_event_id uuid references events(id) on delete cascade,  -- recurrence instances
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
create index events_upcoming_idx on events (community_id, starts_at) where hidden_at is null;

create table public.event_rsvps (
  event_id uuid not null references events(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'going' check (status in ('going','maybe','waitlist','cancelled')),
  party_size smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);
```

### `listings` — sell / free / wanted / lend

```sql
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  -- STD authorship columns (as above)
  community_id uuid not null references communities(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  as_business_id uuid references businesses(id) on delete set null,
  as_organisation_id uuid references organisations(id) on delete set null,
  constraint listings_one_actor check (as_business_id is null or as_organisation_id is null),
  kind text not null check (kind in ('sell','free','wanted','lend')),
  title text not null,
  description text,
  category text not null,                         -- flat taxonomy in code; text here
  price_pence integer,                            -- null for free/wanted/lend
  condition text check (condition in ('new','likeNew','good','fair','spares')),
  photos text[] not null default '{}',
  status text not null default 'active'
    check (status in ('active','reserved','completed','expired','withdrawn')),
  expires_at timestamptz not null default (now() + interval '30 days'),
  completed_with uuid references profiles(id),    -- optional: who it went to
  hidden_at timestamptz, hidden_reason text,
  search_document tsvector generated always as
    (to_tsvector('english', title || ' ' || coalesce(description,'') || ' ' || category)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listings_browse_idx on listings (community_id, status, created_at desc) where hidden_at is null;
```

### `requests` — the flagship

```sql
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  title text not null,                            -- 'Need a plumber this week'
  description text,
  category text not null check (category in ('trades','childcare','lifts','recommendations',
    'borrow','help','pets','other')),
  needed_by timestamptz,
  status text not null default 'open'
    check (status in ('open','answered','fulfilled','expired','withdrawn')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  visibility text not null default 'community' check (visibility in ('community','adjacent')),
  fulfilled_by uuid references profiles(id),
  hidden_at timestamptz, hidden_reason text,
  search_document tsvector generated always as
    (to_tsvector('english', title || ' ' || coalesce(description,'') || ' ' || category)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index requests_open_idx on requests (community_id, status, created_at desc) where hidden_at is null;
```

Responses to a request are threads (`threads.context='request'`). `status` moves open → answered when the first response thread is created (trigger), → fulfilled when the author marks it.

### `services`, `skills`, `equipment`

```sql
create table public.services (                    -- tradesperson / professional offering
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  as_business_id uuid references businesses(id) on delete set null,
  title text not null,                            -- 'Plumbing and heating'
  category text not null,                         -- shared trades taxonomy in code
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

create table public.skills (                      -- 'I can help with…' (non-commercial)
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  skill text not null,                            -- 'jump-starting cars', 'sewing repairs'
  note text,
  created_at timestamptz not null default now(),
  unique (community_id, profile_id, skill)
);

create table public.equipment_items (             -- the lending library
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  owner_profile_id uuid not null references profiles(id) on delete cascade,
  name text not null,                             -- 'Pressure washer'
  category text not null check (category in ('garden','diy','transport','kitchen','events','sports','other')),
  note text,
  photos text[] not null default '{}',
  lend_terms text,                                -- 'collect from me, back within 3 days'
  available boolean not null default true,
  hidden_at timestamptz, hidden_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `alerts` — tiered (04)

```sql
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,   -- null for platform-generated
  as_organisation_id uuid references organisations(id) on delete set null,
  tier text not null check (tier in ('community','verified','platform')),
  category text not null check (category in ('lostPet','foundItem','lostItem','roadClosure',
    'utilityOutage','weather','safety','notice','emergency')),
  title text not null,
  body text,
  photos text[] not null default '{}',
  location geography(point,4326),
  expires_at timestamptz not null,
  resolved_at timestamptz,                        -- 'Cat found!' — pushes a resolution update
  hidden_at timestamptz, hidden_reason text,
  created_at timestamptz not null default now()
);
create index alerts_live_idx on alerts (community_id, expires_at) where resolved_at is null and hidden_at is null;
```

Tier/category constraint (trigger): `community` tier permits lostPet/foundItem/lostItem/notice; `verified` adds roadClosure/utilityOutage/safety/notice; `platform` alone may use weather/emergency.

### `threads` + `messages` (D5)

```sql
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  context text not null check (context in ('listing','request','event','business','organisation','direct')),
  context_id uuid,                                -- FK-per-context enforced by trigger; null for 'direct'
  title text,                                     -- denormalised context title for inbox rows
  created_by uuid not null references profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index threads_inbox_idx on threads (last_message_at desc);

create table public.thread_participants (
  thread_id uuid not null references threads(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  as_business_id uuid references businesses(id) on delete set null,
  as_organisation_id uuid references organisations(id) on delete set null,
  last_read_at timestamptz not null default now(),
  muted boolean not null default false,
  left_at timestamptz,
  primary key (thread_id, profile_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text,
  attachments jsonb not null default '[]'::jsonb, -- [{kind:'photo'|'document'|'voice', path, meta}]
  hidden_at timestamptz, hidden_reason text,
  created_at timestamptz not null default now()
);
create index messages_thread_idx on messages (thread_id, created_at desc);
```

Rules enforced in the `open_thread` RPC: context threads are open to any active member (subject to the target's visibility); `direct` threads require `trust_in(cid) >= config.coldDmMinTrust` AND recipient's `dm_privacy` permits, unless the pair already share a context thread.

## Safety, notifications, telemetry

```sql
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_kind text not null check (target_kind in ('listing','request','event','alert','message',
    'profile','business','organisation','place','service','equipment','organisation_post')),
  target_id uuid not null,
  reason text not null check (reason in ('scam','spam','abuse','unsafe','wrongInfo','privacy','other')),
  note text,
  status text not null default 'open' check (status in ('open','upheld','dismissed')),
  decided_by uuid references profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_kind, target_id)
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  actor_id uuid references profiles(id),          -- null = automation
  target_kind text not null,
  target_id uuid not null,
  action text not null check (action in ('autoHide','hide','unhide','remove','warn','suspend','unsuspend','trustChange','note')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (               -- in-app inbox; push mirrors it (09)
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  community_id uuid references communities(id) on delete cascade,
  category text not null,                         -- 'alert.emergency','message','request.response',...
  title text not null,
  body text,
  deep_link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_unread_idx on notifications (profile_id, created_at desc) where read_at is null;

-- push_subscriptions, push_dispatch_log, notification_digest_queue: copy Elevra's schema verbatim.
-- telemetry_events, anthropic_usage: copy Elevra's schema verbatim.
```

## RLS patterns (the security model — D2/D3)

Enable RLS on every table. Four canonical policy shapes; every table uses one of them plus author/admin write rules. Milestone M1 ships these as a documented pattern file; every later migration copies from it.

**P1 — community read** (places, businesses, organisations, events, listings, requests, services, skills, equipment, alerts, organisation_posts where audience='community'):
```sql
create policy "members read" on public.listings for select using (
  community_id in (select member_communities())
  and (hidden_at is null or created_by = auth.uid() or is_platform_admin())
);
```
Adjacent-community read (businesses/services with `serves_adjacent`, requests with `visibility='adjacent'`) adds an `or community_id in (select linked_communities())` branch via a fifth helper reading `community_links`.

**P2 — trust-gated insert** (example: listings):
```sql
create policy "members create" on public.listings for insert with check (
  created_by = auth.uid()
  and community_id in (select member_communities())
  and can_act_as(as_business_id, as_organisation_id)
  and (
    trust_in(community_id) >= 1
    or (select count(*) from listings l where l.created_by = auth.uid()
        and l.community_id = listings.community_id and l.status = 'active')
       < coalesce((select (config->>'listingCapT0')::int from communities c where c.id = community_id), 2)
  )
);
```
Alerts insert additionally checks tier: `tier = 'community' and trust_in(community_id) >= 1`, or `tier = 'verified' and exists (verified org officer check)`, or `is_platform_admin()`.

**P3 — author update / admin all**:
```sql
create policy "author updates" on public.listings for update
  using (created_by = auth.uid() or is_platform_admin());
```
Column-level discipline: status transitions and `hidden_*` changes go through RPCs; direct updates are limited to content fields via a trigger that rejects illegal transitions.

**P4 — participant read** (threads, messages, thread_participants, notifications, reports):
```sql
create policy "participants read" on public.messages for select using (
  thread_id in (select thread_id from thread_participants
                where profile_id = auth.uid() and left_at is null)
);
```
Reports: reporter sees own; platform admin sees all. Notifications: `profile_id = auth.uid()`.

**Explicit warning for the build:** do not write joins to `memberships` inline in policies; always go through the helper functions, and add a pgTAP-style test file per migration asserting (a) a member of community A cannot read community B's rows, (b) trust-0 caps hold, (c) hidden rows are invisible to third parties, (d) acting-as cannot be forged. RLS regressions are the highest-severity bug class in this product.

## RPCs (catalogue — fix #21; every entry gets input/output schemas in `/docs/reference/RPC_CATALOGUE.md`)

- `join_community(slug, postcode, invite_code?)` — validates 16+, postcode-district match or valid invite, creates membership (trust 0, or 1 if invited), increments invite uses. Returns membership.
- `open_thread(context, context_id?, recipient?, first_message)` — all thread-creation rules in one place (context openness, cold-DM gate, dedupe existing thread, insert participants + first message, bump request → answered).
- `set_listing_status(id, status)` / `set_request_status(id, status)` — legal-transition enforcement + side effects (notify watchers, prompt "mark as fulfilled" flows).
- `post_alert(input)` — tier/category/trust validation + fan-out enqueue.
- `claim_business(business_id, evidence)` / `decide_claim(claim_id, approve)` — claim lifecycle; approval sets owner + `claimed_at`, notifies claimant.
- `report_target(kind, id, reason, note)` — inserts report; if open-report count ≥ community threshold → sets `hidden_at`, logs `autoHide`, notifies admin.
- `admin_moderate(action, kind, id, detail)` — platform-admin actions, always writing `moderation_actions`.
- `vouch_for(profile_id, community_id)` — records vouch; promotion to trust 1 when criteria met (04).
- `global_search(community_id, query, kinds?)` — see 09.
- `seed_community(payload)` / `launch_community(id)` — 08.

## Triggers

- `set_updated_at` on every table with `updated_at`.
- Thread bump: message insert → `threads.last_message_at`, participant unread fan-out, notification enqueue.
- Request first-response: thread insert with `context='request'` → parent `status='answered'` if open.
- Report threshold auto-hide (inside `report_target`, not a bare trigger, so it's testable).
- Alert tier/category validation.
- Expiry sweeps are **cron**, not triggers (09): listings/requests/alerts past `expires_at` → `expired`, with a "still available?" nudge 3 days before.

## Storage buckets

`avatars` (public read) · `listing-photos`, `request-photos`, `event-photos`, `alert-photos`, `place-photos`, `business-photos` (community-visible via signed URLs; simpler: one `content-photos` bucket with path prefix per entity) · `org-documents` (private, signed) · `chat-attachments` (private, signed) · `claim-evidence` (admin-only). Upload via Elevra's signed-upload-URL pattern; image transforms + `srcset` on read (fix #25).

## ER summary

```
communities ──< memberships >── profiles ──< skills / equipment_items
     │  └──< community_links                    │
     ├──< places ──(business_id/organisation_id)┐
     ├──< businesses ──< business_items, business_claims
     ├──< organisations ──< organisation_members, organisation_posts
     ├──< events ──< event_rsvps
     ├──< listings
     ├──< requests
     ├──< services
     ├──< alerts
     ├──< threads ──< thread_participants, messages
     ├──< reports, moderation_actions
     └──< notifications (also profile-scoped)
profiles ──< invites, vouches, push_subscriptions, telemetry_events, anthropic_usage
```
