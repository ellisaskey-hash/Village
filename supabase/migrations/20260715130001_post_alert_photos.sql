-- 20260715130001 — post_alert gains a photos param so lost-pet / found-item alerts can carry
-- an image (spec 04). Body identical to the original, plus p_photos into the insert.
create or replace function public.post_alert(
  p_community uuid, p_tier text, p_category text, p_title text,
  p_body text default null, p_as_org uuid default null, p_photos text[] default '{}')
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

  insert into alerts (community_id, created_by, as_organisation_id, tier, category, title, body, photos)
    values (p_community, auth.uid(), p_as_org, p_tier, p_category, p_title, p_body, coalesce(p_photos, '{}'))
    returning * into a;

  k := public.alert_notif_key(p_tier, p_category);

  insert into notifications (profile_id, community_id, category, title, body, deep_link)
    select m.profile_id, p_community, k, p_title, p_body, '/'
    from memberships m join profiles p on p.id = m.profile_id
    where m.community_id = p_community and m.status = 'active' and m.profile_id <> auth.uid()
      and (k = 'alert.emergency' or coalesce((p.notification_prefs->>k)::boolean, true));

  insert into push_fanout_queue (community_id, alert_id, category, title, body, deep_link, bypass_quiet_hours)
    values (p_community, a.id, k, p_title, p_body, '/', k = 'alert.emergency');

  return a;
end; $$;

grant execute on function public.post_alert(uuid, text, text, text, text, uuid, text[]) to authenticated;
