-- 20260714050002 — M5 RPCs: post_alert (tier-validated, set-based in-app fan-out + push
-- enqueue), resolve_alert (resolution push), drain_fanout (cron-tick, batched, quiet-hours
-- aware, emergency bypass). Spec 04/09.

create or replace function public.alert_notif_key(p_tier text, p_category text)
returns text language sql immutable as $$
  select case
    when p_tier = 'platform' and p_category = 'emergency' then 'alert.emergency'
    when p_tier = 'verified' or p_tier = 'platform' then 'alert.verified'
    else 'alert.community' end;
$$;

-- Is "now" inside the member's quiet-hours window? Null quiet_hours = never quiet.
create or replace function public.in_quiet_hours(qh jsonb)
returns boolean language plpgsql stable as $$
declare tz text; s time; e time; nowt time;
begin
  if qh is null or qh->>'start' is null or qh->>'end' is null then return false; end if;
  tz := coalesce(qh->>'tz', 'Europe/London');
  s := (qh->>'start')::time; e := (qh->>'end')::time;
  nowt := (now() at time zone tz)::time;
  if s <= e then return nowt >= s and nowt <= e;       -- same-day window
  else return nowt >= s or nowt <= e; end if;          -- wraps midnight
end; $$;

-- post_alert — validate authority for the tier, insert, fan out in-app (set-based, no loop),
-- and enqueue the community push. Returns the alert.
create or replace function public.post_alert(
  p_community uuid, p_tier text, p_category text, p_title text,
  p_body text default null, p_as_org uuid default null)
returns public.alerts language plpgsql security definer set search_path = public as $$
declare a public.alerts; k text;
begin
  perform set_config('app.rpc', 'true', true);
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  if public.is_platform_admin() then
    null; -- any tier
  elsif p_tier = 'community' then
    if public.trust_in(p_community) < coalesce((select (config->>'alertsCommunityMinTrust')::int from communities c where c.id = p_community), 1) then
      raise exception 'you need more trust to post a community alert';
    end if;
  elsif p_tier = 'verified' then
    if p_as_org is null or not exists (
      select 1 from organisation_members om join organisations o on o.id = om.organisation_id
      where om.organisation_id = p_as_org and om.profile_id = auth.uid()
        and om.role in ('officer','admin') and o.verified_source = true
    ) then raise exception 'verified alerts require acting as a verified organisation'; end if;
  else
    raise exception 'only platform admins may post platform alerts';
  end if;

  insert into alerts (community_id, created_by, as_organisation_id, tier, category, title, body)
    values (p_community, auth.uid(), p_as_org, p_tier, p_category, p_title, p_body)
    returning * into a;

  k := public.alert_notif_key(p_tier, p_category);

  -- in-app fan-out (single set-based insert; scales without a loop)
  insert into notifications (profile_id, community_id, category, title, body, deep_link)
    select m.profile_id, p_community, k, p_title, p_body, '/'
    from memberships m join profiles p on p.id = m.profile_id
    where m.community_id = p_community and m.status = 'active' and m.profile_id <> auth.uid()
      and (k = 'alert.emergency' or coalesce((p.notification_prefs->>k)::boolean, true));

  -- enqueue the push fan-out (drained by cron)
  insert into push_fanout_queue (community_id, alert_id, category, title, body, deep_link, bypass_quiet_hours)
    values (p_community, a.id, k, p_title, p_body, '/', k = 'alert.emergency');

  return a;
end; $$;

-- resolve_alert — mark resolved and enqueue a resolution push (spec 04 resolution rate metric).
create or replace function public.resolve_alert(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a public.alerts;
begin
  perform set_config('app.rpc', 'true', true);
  select * into a from alerts where id = p_id;
  if not found then raise exception 'alert not found'; end if;
  if not (a.created_by = auth.uid() or public.is_platform_admin()
          or (a.as_organisation_id is not null and exists (
                select 1 from organisation_members om where om.organisation_id = a.as_organisation_id
                  and om.profile_id = auth.uid() and om.role in ('officer','admin')))) then
    raise exception 'not allowed';
  end if;
  update alerts set resolved_at = now() where id = p_id;
  insert into push_fanout_queue (community_id, alert_id, category, title, body, deep_link, bypass_quiet_hours)
    values (a.community_id, a.id, public.alert_notif_key(a.tier, a.category), a.title || ' — resolved', a.body, '/', false);
end; $$;

-- drain_fanout — cron-tick queue drain. Set-based dispatch-log insert per queue row (batched
-- by p_batch), quiet-hours aware unless the alert bypasses. The real web-push send happens in
-- the Vercel function using these rows; here we record intent. Returns rows processed.
create or replace function public.drain_fanout(p_batch int default 100)
returns int language plpgsql security definer set search_path = public as $$
declare q record; n int := 0;
begin
  if not public.is_platform_admin() then raise exception 'admin only'; end if;
  for q in select * from push_fanout_queue where processed_at is null order by created_at limit p_batch loop
    insert into push_dispatch_log (profile_id, category, title, status)
      select ps.profile_id, q.category, q.title, 'sent'
      from push_subscriptions ps
      join memberships m on m.profile_id = ps.profile_id and m.community_id = q.community_id and m.status = 'active'
      join profiles p on p.id = ps.profile_id
      where (q.category = 'alert.emergency' or coalesce((p.notification_prefs->>q.category)::boolean, true))
        and (q.bypass_quiet_hours or not public.in_quiet_hours(p.quiet_hours));
    update push_fanout_queue set processed_at = now() where id = q.id;
    n := n + 1;
  end loop;
  return n;
end; $$;

grant execute on function public.post_alert(uuid, text, text, text, text, uuid) to authenticated;
grant execute on function public.resolve_alert(uuid) to authenticated;
grant execute on function public.drain_fanout(int) to authenticated;
