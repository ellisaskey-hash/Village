# DATA_MODEL.md

Complete data model. Every entity, field, index, constraint, and migration history. Source of truth: `supabase/migrations/*.sql` (112 migrations from `0001_init_schema.sql` to `0112_chat_documents_bucket.sql`).

## Database

- **Engine:** Postgres 15 (Supabase-managed).
- **Extensions enabled:** `pgcrypto` (UUID generation), `pg_trgm` (trigram search on large text columns; enabled in a later migration).
- **Auth schema:** `auth.users` managed by Supabase Auth. All domain tables FK to `public.profiles.id` which 1:1 mirrors `auth.users.id`.
- **Type conventions:**
  - IDs are UUIDs (`uuid`, `default gen_random_uuid()` unless FK to `auth.users`).
  - `createdAt` / `updatedAt` are `timestamptz not null default now()`.
  - Date-only fields (log dates, birthdays) are `date`.
  - JSONB for deeply-nested shapes that are never queried by inner fields (goals, intakes, business branding, set arrays).
  - Enums use text + check constraint (never Postgres `create type`).

## Identity model

```
auth.users  (1:1) → profiles       (id shared)
                       ↓
                       role: 'coach' | 'client'
                       ↓
                       coaches      (profile_id, business, tier, ...)
                       clients      (profile_id, coach_id, goal, intake, ...)
```

### `profiles` — every signed-in user

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('coach', 'client')),
  display_name text not null,
  email text not null,
  avatar_url text,
  pronouns text,
  bio text,
  timezone text,
  use_initials boolean not null default false,
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);
```

### `coaches`

```sql
create table public.coaches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  business jsonb not null default '{}'::jsonb,
  tier text not null default 'core' check (tier in ('core', 'plus', 'pro')),
  client_band integer not null default 10 check (client_band in (10, 50, 150)),
  billing_cycle text check (billing_cycle in ('monthly', 'annual')),
  subscription_status text check (subscription_status in ('trialing', 'active', 'cancelling', 'cancelled')),
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  digest_time text not null default '08:00',
  quiet_hours jsonb,
  linked_coach_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `clients`

```sql
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete restrict,
  joined_at timestamptz not null default now(),
  frequency text not null check (frequency in ('weekly','fortnightly','monthly','quarterly','onlineOnly')),
  goal jsonb not null default '{}'::jsonb,
  intake jsonb not null default '{}'::jsonb,
  lifestyle jsonb,
  wearable jsonb,
  cycle jsonb,
  units jsonb not null default '{"weight":"kg","length":"cm"}'::jsonb,
  push_enabled boolean not null default false,
  installed_pwa boolean not null default false,
  check_in_day smallint not null default 0,
  archived_at timestamptz,
  location_ids uuid[] not null default '{}',
  current_location_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_coach_id_idx on public.clients (coach_id);
create index clients_archived_at_idx on public.clients (archived_at);
```

### `invite_codes` — coach-issued client invites

```sql
create table public.invite_codes (
  code text primary key,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  email text not null,
  name text not null,
  consumed_at timestamptz,
  consumed_by uuid references public.profiles(id),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
```

## Programmes & exercise library

### `exercises`

```sql
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_coach_id uuid references public.coaches(id) on delete cascade,   -- null = built-in library
  name text not null,
  muscle_groups text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  equipment text[] not null default '{}',
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  category text not null check (category in ('push','pull','hinge','squat','lunge','carry','core','cardio','mobility')),
  force text check (force in ('push', 'pull', 'static')),
  instructions text[] not null default '{}',
  images text[] not null default '{}',                                   -- [startFrameUrl, endFrameUrl]
  video_url text,
  youtube_url text,
  thumbnail_url text,
  cues text[] not null default '{}',
  alternative_ids uuid[] not null default '{}',
  required_equipment jsonb,                                              -- structured EquipmentRequirement
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

The bundled corpus of 873 built-in exercises has `owner_coach_id = null`. Coach-authored exercises FK to their creating coach.

### `programmes`

```sql
create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,        -- null = template
  name text not null,
  scheduling text not null check (scheduling in ('pinned', 'floating')),
  block_weeks integer,
  start_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `programme_weeks`

```sql
create table public.programme_weeks (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  week_index integer not null,
  note text,
  created_at timestamptz not null default now()
);
```

### `sessions`

```sql
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  programme_week_id uuid not null references public.programme_weeks(id) on delete cascade,
  name text not null,
  focus text not null,
  pinned_weekday smallint,
  created_at timestamptz not null default now()
);
```

### `exercise_prescriptions`

```sql
create table public.exercise_prescriptions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  sets jsonb not null default '[]'::jsonb,        -- Set[]: { targetReps, targetKg, targetRir, ... }
  rest_seconds integer not null default 60,
  tempo text,
  rpe_target numeric,
  hr_zone smallint check (hr_zone between 1 and 5),
  note text,
  superset_group text,
  auto_progressed_kg numeric,
  position integer not null default 0
);
```

## Workout logging

### `workout_logs`

```sql
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,     -- null after prog. deleted
  date date not null,
  rpe numeric,
  note text,
  coach_note text,
  completion_ratio numeric not null default 0,
  hr jsonb,                                       -- heart-rate summary
  duration_minutes integer,
  created_at timestamptz not null default now()
);
```

### `exercise_logs`

```sql
create table public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.workout_logs(id) on delete cascade,
  prescription_id uuid not null,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  sets jsonb not null default '[]'::jsonb,        -- SetLog[]: { reps, kg, rir, ... }
  skipped jsonb,
  swapped_to_exercise_id uuid references public.exercises(id),
  comment_to_coach text,
  position integer not null default 0
);
```

## Body data & progress

### `weight_entries`
```sql
create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null,
  kg numeric not null,
  created_at timestamptz not null default now(),
  unique (client_id, date)                    -- one weight per day per client
);
```

### `measurements`
```sql
create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null,
  entered_by text not null check (entered_by in ('coach', 'client')),
  waist_cm numeric, hips_cm numeric, chest_cm numeric, bicep_cm numeric,
  quad_cm numeric, calf_cm numeric, body_fat_pct numeric,
  edited jsonb,                                 -- edit history
  created_at timestamptz not null default now()
);
```

### `progress_photos`
```sql
create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null,
  angle text not null check (angle in ('front', 'side', 'back')),
  url text not null,
  created_at timestamptz not null default now()
);
```

### `performance_entries`
```sql
create table public.performance_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null,
  kind text not null check (kind in ('run5k', 'pr')),
  time_seconds integer,                         -- for run5k
  exercise_id uuid references public.exercises(id) on delete set null,   -- for pr
  weight_kg numeric,
  reps integer,
  created_at timestamptz not null default now()
);
```

## Habits

### `habits`
```sql
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  set_by text not null check (set_by in ('coach', 'client')),
  active_days smallint[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `habit_logs`
```sql
create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  done boolean not null,
  created_at timestamptz not null default now(),
  unique (habit_id, date)                       -- one log per habit per day
);
```

## Food logging

```sql
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  at timestamptz not null,
  meal_tag text not null check (meal_tag in ('breakfast', 'lunch', 'dinner', 'snack')),
  photo_url text,
  note text,
  hunger smallint check (hunger between 1 and 5),
  coach_comment jsonb,
  reactions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
```

Migration `0089_food_logs_estimate.sql` adds `estimate jsonb` for Claude-derived macros.

## Check-ins

```sql
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  due_date date not null,
  submitted_at timestamptz,
  form jsonb,                                   -- answers keyed by field id
  in_person_summary jsonb,                      -- coach recap for in-person check-ins
  coach_response jsonb,                         -- reply + audio + video
  ladder jsonb not null default '{"stage":"scheduled"}'::jsonb,   -- lifecycle state machine
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Migration `0010_checkin_lifecycle.sql` introduces the `ladder` state machine: `scheduled → sent → submitted → reviewed → closed`. Migration `0095_checkin_submit_not_before_due.sql` adds a check to prevent submission before due date. Migration `0105_client_owned_checkins.sql` shifts ownership so clients can create their own check-ins.

## Wellbeing / wearables / cycle

### `pulse_entries` — daily 4-metric pulse
```sql
create table public.pulse_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null,
  sleep_quality smallint not null check (sleep_quality between 1 and 5),
  energy smallint not null check (energy between 1 and 5),
  stress smallint not null check (stress between 1 and 5),
  soreness smallint not null check (soreness between 1 and 5),
  manual_sleep_hours numeric,
  created_at timestamptz not null default now(),
  unique (client_id, date)
);
```

Migration `0019_pulse_entries_scale_1_to_10.sql` changed the metric scales — currently 1-10 (documented behaviour drift; see WEAKNESSES.md).

### `wearable_connections`, `wearable_days`
```sql
create table public.wearable_connections (
  client_id uuid primary key references public.clients(id) on delete cascade,
  provider text not null check (provider in ('appleHealth','healthConnect','whoop','garmin','fitbit','oura','polar','demo')),
  connected_at timestamptz not null,
  last_sync_at timestamptz not null,
  sharing jsonb not null default '{}'::jsonb
);

create table public.wearable_days (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null,
  steps integer,
  active_minutes integer,
  sleep_minutes integer,
  sleep_score integer,
  resting_hr integer,
  hrv_ms integer,
  recovery_score integer,
  calories_out integer,
  sleep_stages jsonb,                           -- REM / deep / light / awake segments
  created_at timestamptz not null default now(),
  unique (client_id, date)
);
```

### `cycle_settings`, `cycle_logs`
```sql
create table public.cycle_settings (
  client_id uuid primary key references public.clients(id) on delete cascade,
  enabled boolean not null default false,
  mode text not null check (mode in ('natural','hormonalContraception','irregularPCOS','perimenopause','pregnancyPostnatal')),
  share_with_coach boolean not null default false,
  avg_cycle_length integer,
  updated_at timestamptz not null default now()
);

create table public.cycle_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null,
  period_start boolean,
  symptoms text[],
  energy smallint check (energy between 1 and 5),
  created_at timestamptz not null default now(),
  unique (client_id, date)
);
```

Migration `0096_cycle_flow_symptoms_v2.sql` widens symptom taxonomy + adds flow intensity.

## Messaging

### `messages`
```sql
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_client_id uuid not null references public.clients(id) on delete cascade,
  from_role text not null check (from_role in ('coach', 'client')),
  sender_id uuid references public.profiles(id),
  at timestamptz not null default now(),
  read_at timestamptz,
  text text,
  photo_url text,
  voice_url text,
  attachments jsonb not null default '[]'::jsonb,      -- [{ kind, url, meta }]
  context jsonb not null default '{"kind":"plain"}'::jsonb,   -- {kind: 'plain'|'checkin'|'nudge'|...}
  reactions jsonb not null default '[]'::jsonb
);
create index messages_thread_at_idx on public.messages (thread_client_id, at desc);
```

Migration `0031_messages_extended.sql` widens the `attachments` schema. `0103_qa_habits_messages_sender_edit_guard.sql` adds a policy so a sender can only edit their own messages.

### `thread_meta`
```sql
create table public.thread_meta (
  client_id uuid primary key references public.clients(id) on delete cascade,
  archived_at timestamptz
);
```

### `message_templates`
```sql
create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  name text not null,
  body text not null,
  category text not null check (category in ('general','check-in','session-prep','nudge','milestone')),
  visibility text not null default 'coaches-only' check (visibility in ('coaches-only', 'team')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Migration `0018_seed_starter_message_templates.sql` seeds a starter set on new coach onboarding.

## Alerts & notifications

### `alerts` — coach-facing signals
```sql
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  kind text not null,               -- 'missed_checkin', 'low_pulse_3d', 'streak_break', ...
  severity text not null check (severity in ('high', 'medium', 'low', 'positive')),
  created_at timestamptz not null default now(),
  reason text not null,
  suggested_action text not null,
  state text not null default 'new' check (state in ('new', 'inDigest', 'actioned', 'snoozed', 'dismissed')),
  action_outcome text,
  follow_up_at timestamptz
);
create index alerts_coach_state_idx on public.alerts (coach_id, state);
create index alerts_client_id_idx on public.alerts (client_id);
```

### `app_notifications` — user-facing notifications
```sql
create table public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  at timestamptz not null default now(),
  title text not null,
  body text not null,
  deep_link text not null,
  read_at timestamptz,
  pushed boolean not null default false
);
```

Migration `0093_fix_notification_deep_links.sql` migrates legacy deep links onto the new route table.

## Booking / business

### `availability_blocks`, `bookings`, `session_packs`

```sql
create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  from_time text not null,            -- 'HH:mm'
  to_time text not null
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  type_id text not null check (type_id in ('pt60', 'pt30', 'assessment', 'online')),
  starts_at timestamptz not null,
  status text not null default 'booked' check (status in ('booked', 'completed', 'cancelled', 'noShow')),
  rescheduled_from timestamptz,
  notes text,
  no_show_reason text,
  no_show_note text,
  no_show_marked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.session_packs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  size integer not null,
  remaining integer not null,
  purchased_at timestamptz not null default now()
);
```

Migration `0091_bookings_note_visibility_split.sql` splits `notes` into `client_note` + `coach_note`.

## Reports, challenges, notes

```sql
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  generated_at timestamptz not null default now(),
  coach_note text,
  sent_at timestamptz,
  metrics jsonb not null default '{}'::jsonb
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  type text not null check (type in ('steps', 'sessionsCompleted', 'streak')),
  name text not null,
  description text,
  start_date date not null,
  weeks smallint not null check (weeks between 1 and 4),
  goal jsonb not null,
  participants jsonb not null default '[]'::jsonb,     -- [{ clientId, joinedAt, progress }]
  visibility text not null default 'invited' check (visibility in ('invited', 'public')),
  allow_late_joiners boolean not null default false,
  published_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  text text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_pinned_idx on public.notes (coach_id, pinned) where pinned;
```

## Gyms / locations (Phase 4.5)

```sql
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('commercialGym','homeGym','hotelOrTravel','studio','outdoor','bodyweightOnly')),
  geo jsonb,                             -- {lat, lng, name} or null
  is_primary boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.equipment_snapshots (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  effective_from timestamptz not null default now(),
  superseded_by uuid references public.equipment_snapshots(id) on delete set null,
  source text not null check (source in ('photoScan','quickAdd','manual','inheritedFromOwnHistory')),
  confirmed_by uuid not null references public.clients(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,           -- structured EquipmentItem[]
  notes text,
  created_at timestamptz not null default now()
);

create table public.gym_scans (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  photo_ids text[] not null default '{}',
  raw_detections jsonb not null default '[]'::jsonb,  -- Claude vision output
  resulting_snapshot_id uuid references public.equipment_snapshots(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','processing','awaitingConfirmation','confirmed','failed'))
);
```

## Telemetry

```sql
create table public.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,                    -- 'app.installed', 'nav.today', 'feature.food_estimate_run', ...
  data jsonb not null default '{}'::jsonb
);
create index telemetry_events_user_at_idx on public.telemetry_events (user_id, at desc);
create index telemetry_events_kind_idx on public.telemetry_events (kind);
```

## `updated_at` trigger

Applied to `profiles`, `coaches`, `clients`, `exercises`, `programmes`, `check_ins`, `habits`, `cycle_settings`, `message_templates`, `notes`, `locations`.

```sql
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
-- attached per table via BEFORE UPDATE trigger
```

## Row-Level Security (RLS)

Every table has RLS enabled. Policies defined in `0002_rls_policies.sql` and extended per feature migration.

**Client-scoped tables** (weight_entries, measurements, progress_photos, etc.):
```sql
create policy "client sees own"
  on public.weight_entries for select
  using (client_id in (select id from public.clients where profile_id = auth.uid()));

create policy "coach sees clients'"
  on public.weight_entries for select
  using (client_id in (select id from public.clients where coach_id in (select id from public.coaches where profile_id = auth.uid())));
```

**Coach-scoped tables** (bookings, alerts, message_templates, etc.):
similar shape — coach sees own via `coach_id in (select id from public.coaches where profile_id = auth.uid())`.

**Public-lookup tables** (built-in exercise library where `owner_coach_id is null`):
```sql
create policy "read built-ins" on public.exercises for select using (owner_coach_id is null);
```

## RPCs (stored procedures)

Complex multi-table writes use RPCs to keep them atomic:

- `save_programme(programme_input jsonb)` — writes programme + weeks + sessions + prescriptions in one transaction. See `0006_save_programme_rpc.sql`, refined in `0007`.
- `redeem_invite_code(code text)` — validates + marks consumed + creates client row.
- `create_invite(input jsonb)` — issues an invite code, emails it via `pg_net` or an edge function.

## Fan-out triggers

`0003_functions_and_triggers.sql` and `0012_more_fanout_triggers.sql` install triggers that materialise events:
- New alert → insert into `app_notifications` for the coach + enqueue push.
- New message → mark `thread_meta.archived_at = null`.
- Check-in submitted → set ladder stage to 'submitted' + create coach alert.
- Booking marked no_show → create coach alert.

## Migration history overview

Migrations follow `NNNN_short_name.sql` with sequential integer prefixes. 112 total from `0001` to `0112`.

Notable milestones:
- 0001: init schema (this doc's foundation).
- 0002: RLS policies.
- 0003: functions + triggers.
- 0004-0005, 0011: invite signup, FK cleanup.
- 0006-0007: save_programme RPC.
- 0008-0009: storage buckets (progress photos, exercise videos).
- 0010, 0095, 0105: check-in lifecycle iterations.
- 0013: push_subscriptions.
- 0019: pulse scale change.
- 0022: client context enrichment.
- 0025-0026, 0106-0108: habits + habit metadata.
- 0027-0031: progress + performance + messages extensions.
- 0032: coach availability + presence.
- 0080-0090: ad-hoc workouts, block ladder, food estimate, workout ratings.
- 0091-0112: bug fixes + intake normalisation + coach ratings + Anthropic usage + chat documents.

## ER diagram (text form)

```
auth.users --1:1-- profiles --1:1-- coaches --1:N-- clients
                       |                 |            |
                       |                 |            +--< weight_entries
                       |                 |            +--< measurements
                       |                 |            +--< progress_photos
                       |                 |            +--< performance_entries
                       |                 |            +--< habits --< habit_logs
                       |                 |            +--< food_logs
                       |                 |            +--< check_ins
                       |                 |            +--< pulse_entries
                       |                 |            +--< cycle_settings + cycle_logs
                       |                 |            +--< wearable_connections + wearable_days
                       |                 |            +--< messages (via thread_client_id)
                       |                 |            +--< workout_logs --< exercise_logs
                       |                 |            +--< bookings
                       |                 |            +--< session_packs
                       |                 |            +--< notes (via coach_id + client_id)
                       |                 |            +--< challenges (via participants JSON)
                       |                 |            +--< locations --< equipment_snapshots + gym_scans
                       |                 |            +--< alerts
                       |                 |            +--< reports
                       |                 |
                       |                 +--< exercises (owner) + built-ins (owner NULL)
                       |                 +--< programmes --< programme_weeks --< sessions --< exercise_prescriptions
                       |                 +--< invite_codes
                       |                 +--< message_templates
                       |                 +--< availability_blocks
                       |
                       +--< app_notifications
                       +--< telemetry_events
```

## Storage buckets (Supabase Storage)

From migrations `0008`, `0009`, `0088`, `0112`:

- `progress-photos` — private, signed-URL access.
- `exercise-media` — public read for owner + coach; upload gated by RLS.
- `food-photos` — private.
- `avatars` — public read.
- `chat-documents` — private, signed-URL. Introduced 0112.
- `voice-notes` — private.
- `gym-scans` — private, cleaned by cron once processed.

## Anthropic usage table

Migration `0111_anthropic_usage.sql` adds:
```sql
create table public.anthropic_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  at timestamptz not null default now(),
  kind text not null,               -- 'food_estimate' | 'gym_scan' | 'template_draft' | ...
  input_tokens integer not null,
  output_tokens integer not null,
  cost_usd numeric not null
);
```

Tracks per-user Claude API cost for future billing / rate-limiting.
