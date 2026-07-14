-- 20260714000003 — the RLS vocabulary (spec 03 §Helper functions). Every policy is written
-- in terms of these security-definer, stable functions; never inline a join to memberships in
-- a policy. `can_act_as` lands in M2 alongside the businesses / organisations tables.

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

-- Communities linked to one of my communities (adjacency read branch, spec 03 P1).
create or replace function public.linked_communities()
returns setof uuid language sql stable security definer set search_path = public as $$
  select case when cl.a = mine.community_id then cl.b else cl.a end
  from community_links cl
  join (
    select community_id from memberships where profile_id = auth.uid() and status = 'active'
  ) mine on mine.community_id in (cl.a, cl.b)
  where cl.share <> 'none';
$$;

-- Does the target profile share at least one active community with me? (profile visibility)
create or replace function public.co_member(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
    where profile_id = pid and status = 'active' and community_id in (select member_communities())
  );
$$;
