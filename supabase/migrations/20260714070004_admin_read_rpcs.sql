-- 20260714070004 — read RPCs for the admin/steward console (spec 04 §Admin console, spec 07
-- §Admin). Each is SECURITY DEFINER and gated to platform admin, or a steward (trust >= 3) in
-- that community. They return display-ready rows so the console is one round-trip per queue.

-- Human label for a moderated target (best-effort title across the content tables).
create or replace function public.mod_target_label(p_kind text, p_id uuid)
returns text language plpgsql stable security definer set search_path = public as $$
begin
  return case p_kind
    when 'listing' then (select title from listings where id = p_id)
    when 'request' then (select title from requests where id = p_id)
    when 'event' then (select title from events where id = p_id)
    when 'alert' then (select title from alerts where id = p_id)
    when 'business' then (select name from businesses where id = p_id)
    when 'organisation' then (select name from organisations where id = p_id)
    when 'place' then (select name from places where id = p_id)
    when 'service' then (select title from services where id = p_id)
    when 'equipment' then (select name from equipment_items where id = p_id)
    when 'organisation_post' then (select title from organisation_posts where id = p_id)
    when 'message' then (select left(body, 80) from messages where id = p_id)
    when 'profile' then (select display_name from profiles where id = p_id)
    else null end;
end; $$;

create or replace function public.can_moderate(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin() or public.trust_in(cid) >= 3;
$$;

-- Open reports, priority (unsafe) first, with reporter name + target label + live open count.
create or replace function public.admin_reports(p_cid uuid)
returns table (id uuid, community_id uuid, reporter_id uuid, reporter_name text, target_kind text,
  target_id uuid, target_label text, reason text, note text, priority boolean, status text,
  report_count bigint, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.community_id, r.reporter_id, pr.display_name, r.target_kind, r.target_id,
    public.mod_target_label(r.target_kind, r.target_id), r.reason, r.note, r.priority, r.status,
    (select count(*) from reports r2 where r2.target_kind = r.target_kind and r2.target_id = r.target_id and r2.status = 'open'),
    r.created_at
  from reports r join profiles pr on pr.id = r.reporter_id
  where r.community_id = p_cid and r.status = 'open' and public.can_moderate(p_cid)
  order by r.priority desc, r.created_at desc;
$$;

create or replace function public.admin_moderation_log(p_cid uuid)
returns table (id uuid, community_id uuid, actor_id uuid, actor_name text, target_kind text,
  target_id uuid, action text, detail jsonb, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, a.community_id, a.actor_id, coalesce(pr.display_name, 'Automation'), a.target_kind,
    a.target_id, a.action, a.detail, a.created_at
  from moderation_actions a left join profiles pr on pr.id = a.actor_id
  where a.community_id = p_cid and public.can_moderate(p_cid)
  order by a.created_at desc limit 500;
$$;

-- Currently-hidden items across the content tables (union), for the Hidden queue.
create or replace function public.admin_hidden(p_cid uuid)
returns table (kind text, id uuid, title text, reason text, hidden_at timestamptz)
language sql stable security definer set search_path = public as $$
  select * from (
    select 'listing'::text, id, title, hidden_reason, hidden_at from listings where community_id = p_cid and hidden_at is not null
    union all select 'request', id, title, hidden_reason, hidden_at from requests where community_id = p_cid and hidden_at is not null
    union all select 'event', id, title, hidden_reason, hidden_at from events where community_id = p_cid and hidden_at is not null
    union all select 'alert', id, title, hidden_reason, hidden_at from alerts where community_id = p_cid and hidden_at is not null
    union all select 'service', id, title, hidden_reason, hidden_at from services where community_id = p_cid and hidden_at is not null
    union all select 'equipment', id, name, hidden_reason, hidden_at from equipment_items where community_id = p_cid and hidden_at is not null
    union all select 'place', id, name, hidden_reason, hidden_at from places where community_id = p_cid and hidden_at is not null
  ) h
  where public.can_moderate(p_cid)
  order by hidden_at desc;
$$;

create or replace function public.admin_delays(p_cid uuid)
returns table (id uuid, profile_id uuid, profile_name text, content_kind text, content_id uuid,
  release_at timestamptz, released_at timestamptz)
language sql stable security definer set search_path = public as $$
  select d.id, d.profile_id, pr.display_name, d.content_kind, d.content_id, d.release_at, d.released_at
  from first_post_delays d join profiles pr on pr.id = d.profile_id
  where d.community_id = p_cid and public.can_moderate(p_cid)
  order by d.release_at;
$$;

create or replace function public.admin_members(p_cid uuid)
returns table (profile_id uuid, display_name text, avatar_url text, trust_level int, status text,
  suspended_until timestamptz, joined_at timestamptz, upheld_reports bigint)
language sql stable security definer set search_path = public as $$
  select m.profile_id, pr.display_name, pr.avatar_url, m.trust_level, m.status, m.suspended_until, m.created_at,
    (select count(*) from reports r where r.target_kind = 'profile' and r.target_id = m.profile_id and r.status = 'upheld')
  from memberships m join profiles pr on pr.id = m.profile_id
  where m.community_id = p_cid and public.can_moderate(p_cid)
  order by pr.display_name;
$$;

create or replace function public.admin_dashboard(p_cid uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not public.can_moderate(p_cid) then '{}'::jsonb else jsonb_build_object(
    'openReports', (select count(*) from reports where community_id = p_cid and status = 'open'),
    'priorityReports', (select count(*) from reports where community_id = p_cid and status = 'open' and priority),
    'hiddenItems', (select count(*) from admin_hidden(p_cid)),
    'pendingClaims', (select count(*) from businesses where community_id = p_cid and claimed_at is not null and verified_at is null),
    'delayedPosts', (select count(*) from first_post_delays where community_id = p_cid and released_at is null),
    'newMembersToday', (select count(*) from memberships where community_id = p_cid and created_at > now() - interval '1 day'),
    'activeAlerts', (select count(*) from alerts where community_id = p_cid and resolved_at is null)
  ) end;
$$;

-- Community config editor (platform admin only — steward config edits are out of scope).
create or replace function public.admin_set_config(p_cid uuid, p_config jsonb)
returns public.communities language plpgsql security definer set search_path = public as $$
declare c public.communities;
begin
  if not public.is_platform_admin() then raise exception 'admin only'; end if;
  update communities set config = coalesce(config, '{}'::jsonb) || p_config where id = p_cid returning * into c;
  return c;
end; $$;

grant execute on function public.mod_target_label(text, uuid) to authenticated;
grant execute on function public.can_moderate(uuid) to authenticated;
grant execute on function public.admin_reports(uuid) to authenticated;
grant execute on function public.admin_moderation_log(uuid) to authenticated;
grant execute on function public.admin_hidden(uuid) to authenticated;
grant execute on function public.admin_delays(uuid) to authenticated;
grant execute on function public.admin_members(uuid) to authenticated;
grant execute on function public.admin_dashboard(uuid) to authenticated;
grant execute on function public.admin_set_config(uuid, jsonb) to authenticated;
