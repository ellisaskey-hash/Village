-- 20260714020002 — threads, participants, messages, notifications (spec 03, D5). Threads are
-- the universal conversation container; the only thread-creation path is the open_thread RPC.

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  context text not null check (context in ('listing','request','event','business','organisation','direct')),
  context_id uuid,
  title text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index threads_inbox_idx on public.threads (last_message_at desc);

create table public.thread_participants (
  thread_id uuid not null references public.threads(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  as_business_id uuid references public.businesses(id) on delete set null,
  as_organisation_id uuid references public.organisations(id) on delete set null,
  last_read_at timestamptz not null default now(),
  muted boolean not null default false,
  left_at timestamptz,
  primary key (thread_id, profile_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  attachments jsonb not null default '[]'::jsonb,
  hidden_at timestamptz, hidden_reason text,
  created_at timestamptz not null default now()
);
create index messages_thread_idx on public.messages (thread_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  community_id uuid references public.communities(id) on delete cascade,
  category text not null,
  title text not null,
  body text,
  deep_link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_unread_idx on public.notifications (profile_id, created_at desc) where read_at is null;

-- Thread bump + notification fan-out on new message (spec 03 §Triggers).
create or replace function public.on_message_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update threads set last_message_at = now() where id = new.thread_id;
  insert into notifications (profile_id, community_id, category, title, body, deep_link)
  select tp.profile_id, th.community_id, 'message',
         coalesce(th.title, 'New message'), left(coalesce(new.body,''), 140),
         '/inbox/t/' || th.id
  from thread_participants tp
  join threads th on th.id = new.thread_id
  where tp.thread_id = new.thread_id and tp.profile_id <> new.sender_id and tp.left_at is null and tp.muted = false;
  return new;
end; $$;
create trigger message_inserted after insert on public.messages
  for each row execute function public.on_message_insert();

-- First response to a request flips it open -> answered (spec 03).
create or replace function public.on_request_thread()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.context = 'request' and new.context_id is not null then
    update requests set status = 'answered' where id = new.context_id and status = 'open';
  end if;
  return new;
end; $$;
create trigger request_thread_opened after insert on public.threads
  for each row execute function public.on_request_thread();

-- Realtime: messages + notifications + threads stream to the client (spec 09).
do $$
begin
  alter publication supabase_realtime add table public.messages;
  alter publication supabase_realtime add table public.notifications;
  alter publication supabase_realtime add table public.threads;
exception when others then null; -- publication already carries them, or is managed elsewhere
end $$;
