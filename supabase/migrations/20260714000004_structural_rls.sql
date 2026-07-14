-- 20260714000004 — RLS for the structural entities. Enable RLS on every table; policies use
-- only the helper functions from migration 0003 (spec 03 §RLS patterns). Privileged
-- membership columns (trust_level, status, community_id) can only change via a SECURITY
-- DEFINER RPC (which sets app.rpc) or a platform admin — enforced by memberships_guard.

alter table public.communities     enable row level security;
alter table public.community_links enable row level security;
alter table public.profiles        enable row level security;
alter table public.memberships     enable row level security;
alter table public.invites         enable row level security;
alter table public.vouches         enable row level security;

-- communities: members read their own; admin reads all. Pre-membership discovery goes
-- through the discover_communities() SECURITY DEFINER RPC, not a broad select policy.
create policy "members read communities" on public.communities for select using (
  id in (select member_communities())
  or id in (select linked_communities())
  or is_platform_admin()
);

-- community_links: visible to members of either side.
create policy "members read links" on public.community_links for select using (
  a in (select member_communities()) or b in (select member_communities()) or is_platform_admin()
);

-- profiles: own, co-members', or admin. Insert/update limited to own row.
create policy "read visible profiles" on public.profiles for select using (
  id = auth.uid() or is_platform_admin() or co_member(id)
);
create policy "insert own profile" on public.profiles for insert with check (id = auth.uid());
create policy "update own profile" on public.profiles for update using (id = auth.uid());

-- memberships: read co-members within my communities; admin all. Insert only via RPC
-- (join_community, security definer). Update own membership's non-privileged fields.
create policy "read community memberships" on public.memberships for select using (
  community_id in (select member_communities()) or is_platform_admin()
);
create policy "update own membership" on public.memberships for update using (
  profile_id = auth.uid() or is_platform_admin()
);

-- invites: creator reads own; trust-1+ members create.
create policy "read own invites" on public.invites for select using (
  created_by = auth.uid() or is_platform_admin()
);
create policy "create invites" on public.invites for insert with check (
  created_by = auth.uid() and trust_in(community_id) >= 1
);

-- vouches: parties + admin read; trust-2+ members vouch (also enforced by vouch_for RPC).
create policy "read own vouches" on public.vouches for select using (
  voucher_id = auth.uid() or vouched_id = auth.uid() or is_platform_admin()
);
create policy "create vouches" on public.vouches for insert with check (
  voucher_id = auth.uid() and trust_in(community_id) >= 2
);

-- Guard privileged membership columns.
create or replace function public.memberships_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.rpc', true), '') = 'true' or public.is_platform_admin() then
    return new;
  end if;
  if new.trust_level  is distinct from old.trust_level
     or new.status       is distinct from old.status
     or new.community_id  is distinct from old.community_id
     or new.profile_id    is distinct from old.profile_id
     or new.address_verified_at is distinct from old.address_verified_at then
    raise exception 'privileged membership columns change only via RPC or admin';
  end if;
  return new;
end;
$$;
create trigger memberships_guard before update on public.memberships
  for each row execute function public.memberships_guard();
