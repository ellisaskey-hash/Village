-- 20260714000005 — M1 RPCs (spec 03 §RPCs). Multi-table writes go through RPCs (fix #21;
-- catalogued in docs/reference/RPC_CATALOGUE.md). Each sets app.rpc so memberships_guard
-- permits the privileged writes it makes.

-- discover_communities(postcode) — pre-membership discovery for /welcome. SECURITY DEFINER
-- because a non-member has no RLS read on communities. Returns only public card fields for
-- launched/seeding communities whose postcode district matches. (DECISION-MADE: PROGRESS.md.)
create or replace function public.discover_communities(postcode text)
returns table (id uuid, slug text, name text, type text, region text, status text)
language sql stable security definer set search_path = public as $$
  select c.id, c.slug, c.name, c.type, c.region, c.status
  from communities c
  where c.status in ('seeding','launched')
    and public.postcode_district(postcode) = any (
      select upper(d) from unnest(c.postcode_districts) d
    );
$$;

-- join_community — validates 16+ (already enforced by profiles.adults_only), postcode-district
-- match or valid invite; creates membership (trust 0, or 1 if invited); increments invite uses.
create or replace function public.join_community(slug text, postcode text, invite_code text default null)
returns public.memberships
language plpgsql security definer set search_path = public as $$
declare
  c       public.communities;
  inv     public.invites;
  m       public.memberships;
  v_trust smallint;
  v_via   text;
  v_inviter uuid;
begin
  perform set_config('app.rpc', 'true', true);

  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into c from communities where communities.slug = join_community.slug;
  if not found then raise exception 'community not found'; end if;
  if c.status = 'archived' then raise exception 'community is archived'; end if;

  if exists (select 1 from memberships where profile_id = auth.uid() and community_id = c.id) then
    raise exception 'already a member of this community';
  end if;

  if invite_code is not null then
    select * into inv from invites where code = invite_code and community_id = c.id;
    if not found then raise exception 'invalid invite code'; end if;
    if inv.expires_at is not null and inv.expires_at < now() then raise exception 'invite has expired'; end if;
    if inv.uses >= inv.max_uses then raise exception 'invite has no uses left'; end if;
    v_trust := 1; v_via := 'invite'; v_inviter := inv.created_by;
    update invites set uses = uses + 1 where code = invite_code;
  else
    if postcode is null then raise exception 'postcode or invite code required'; end if;
    if not exists (
      select 1 from unnest(c.postcode_districts) d where upper(d) = public.postcode_district(postcode)
    ) then
      raise exception 'that postcode is not in this community';
    end if;
    v_trust := 0; v_via := 'postcode'; v_inviter := null;
  end if;

  insert into memberships (profile_id, community_id, trust_level, joined_via, invited_by, postcode_given)
  values (auth.uid(), c.id, v_trust, v_via, v_inviter, postcode)
  returning * into m;

  return m;
end;
$$;

-- vouch_for — records a vouch; promotes the vouched member per spec 04 (1 vouch from a
-- level-2+ member -> trust 1; 2 vouches -> trust 2). Only a trust-2+ member may vouch.
create or replace function public.vouch_for(vouched uuid, community uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  perform set_config('app.rpc', 'true', true);

  if public.trust_in(community) < 2 then raise exception 'you need trust level 2 to vouch'; end if;
  if vouched = auth.uid() then raise exception 'you cannot vouch for yourself'; end if;
  if not exists (select 1 from memberships where profile_id = vouched and community_id = community) then
    raise exception 'that person is not a member of this community';
  end if;

  insert into vouches (voucher_id, vouched_id, community_id)
  values (auth.uid(), vouched, community)
  on conflict do nothing;

  select count(*) into v_count from vouches where vouched_id = vouched and community_id = community;

  update memberships
    set trust_level = greatest(trust_level, case when v_count >= 2 then 2 else 1 end)
    where profile_id = vouched and community_id = community;
end;
$$;

-- Only authenticated users may call these; discovery is callable by anon (join flow).
revoke all on function public.join_community(text, text, text) from public, anon;
grant execute on function public.join_community(text, text, text) to authenticated;
revoke all on function public.vouch_for(uuid, uuid) from public, anon;
grant execute on function public.vouch_for(uuid, uuid) to authenticated;
grant execute on function public.discover_communities(text) to anon, authenticated;
