-- 20260717120001 — let a neighbour save/bookmark listings, requests and events (spec 07 Me →
-- Saved). Owner-only: you only ever see and change your own saves. target_label is stored so the
-- Saved list is self-describing without re-fetching each item.
create table if not exists public.saved_items (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  target_kind text not null check (target_kind in ('listing', 'request', 'event')),
  target_id uuid not null,
  target_label text,
  created_at timestamptz not null default now(),
  primary key (profile_id, target_kind, target_id)
);

alter table public.saved_items enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='saved_items' and policyname='read own saves') then
    create policy "read own saves" on public.saved_items for select using (profile_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='saved_items' and policyname='insert own saves') then
    create policy "insert own saves" on public.saved_items for insert with check (profile_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='saved_items' and policyname='delete own saves') then
    create policy "delete own saves" on public.saved_items for delete using (profile_id = auth.uid());
  end if;
end $$;
