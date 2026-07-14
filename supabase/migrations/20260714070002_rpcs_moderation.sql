-- 20260714070002 — M7 moderation RPCs (spec 03/04). report_target (auto-hide thresholds),
-- decide_report, admin_moderate (hide/remove/suspend/trustChange/...), first-post delay
-- trigger (config-gated), release_delayed (cron), and GDPR export/delete.

-- Community of a moderatable target.
create or replace function public.mod_community(p_kind text, p_id uuid)
returns uuid language plpgsql stable security definer set search_path = public as $$
begin
  return case p_kind
    when 'listing' then (select community_id from listings where id = p_id)
    when 'request' then (select community_id from requests where id = p_id)
    when 'event' then (select community_id from events where id = p_id)
    when 'alert' then (select community_id from alerts where id = p_id)
    when 'business' then (select community_id from businesses where id = p_id)
    when 'organisation' then (select community_id from organisations where id = p_id)
    when 'place' then (select community_id from places where id = p_id)
    when 'service' then (select community_id from services where id = p_id)
    when 'equipment' then (select community_id from equipment_items where id = p_id)
    when 'organisation_post' then (select o.community_id from organisation_posts op join organisations o on o.id = op.organisation_id where op.id = p_id)
    when 'message' then (select th.community_id from messages m join threads th on th.id = m.thread_id where m.id = p_id)
    else null end;
end; $$;

-- Set/clear hidden on the right table for a target kind.
create or replace function public.mod_set_hidden(p_kind text, p_id uuid, p_hide boolean, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare h timestamptz := case when p_hide then now() else null end; r text := case when p_hide then p_reason else null end;
begin
  case p_kind
    when 'listing' then update listings set hidden_at = h, hidden_reason = r where id = p_id;
    when 'request' then update requests set hidden_at = h, hidden_reason = r where id = p_id;
    when 'event' then update events set hidden_at = h, hidden_reason = r where id = p_id;
    when 'alert' then update alerts set hidden_at = h, hidden_reason = r where id = p_id;
    when 'business' then update businesses set hidden_at = h, hidden_reason = r where id = p_id;
    when 'organisation' then update organisations set hidden_at = h, hidden_reason = r where id = p_id;
    when 'place' then update places set hidden_at = h, hidden_reason = r where id = p_id;
    when 'service' then update services set hidden_at = h, hidden_reason = r where id = p_id;
    when 'equipment' then update equipment_items set hidden_at = h, hidden_reason = r where id = p_id;
    when 'organisation_post' then update organisation_posts set hidden_at = h, hidden_reason = r where id = p_id;
    when 'message' then update messages set hidden_at = h, hidden_reason = r where id = p_id;
    else null;
  end case;
end; $$;

-- report_target — insert report, enforce the daily cap, auto-hide at threshold, notify admins.
create or replace function public.report_target(p_kind text, p_id uuid, p_reason text, p_note text default null)
returns public.reports language plpgsql security definer set search_path = public as $$
declare cid uuid; thr int; cnt int; rep public.reports;
begin
  perform set_config('app.rpc', 'true', true);
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if (select count(*) from reports where reporter_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'you have reached the daily report limit';
  end if;
  cid := public.mod_community(p_kind, p_id);
  if cid is null then raise exception 'that item was not found'; end if;
  if public.trust_in(cid) < 0 then raise exception 'you are not a member of this community'; end if;

  insert into reports (community_id, reporter_id, target_kind, target_id, reason, note, priority)
    values (cid, auth.uid(), p_kind, p_id, p_reason, p_note, p_reason = 'unsafe')
    on conflict (reporter_id, target_kind, target_id) do update set reason = excluded.reason, note = excluded.note
    returning * into rep;

  thr := case when p_kind = 'message' then 2
              else coalesce((select (config->>'autoHideReportThreshold')::int from communities c where c.id = cid), 3) end;
  if public.trust_in(cid) >= 3 or public.is_platform_admin() then thr := 1; end if;  -- a steward/admin report is decisive

  cnt := (select count(*) from reports where target_kind = p_kind and target_id = p_id and status = 'open');
  if cnt >= thr then
    perform public.mod_set_hidden(p_kind, p_id, true, 'auto-hidden after reports');
    insert into moderation_actions (community_id, actor_id, target_kind, target_id, action, detail)
      values (cid, null, p_kind, p_id, 'autoHide', jsonb_build_object('reports', cnt));
    insert into notifications (profile_id, community_id, category, title, body, deep_link)
      select id, cid, 'moderation.autohide', 'Content auto-hidden', p_kind || ' hidden after ' || cnt || ' reports', '/admin/reports'
      from profiles where platform_role = 'admin';
  end if;
  return rep;
end; $$;

-- decide_report — admin/steward uphold (hide) or dismiss.
create or replace function public.decide_report(p_report_id uuid, p_uphold boolean)
returns void language plpgsql security definer set search_path = public as $$
declare rep public.reports;
begin
  perform set_config('app.rpc', 'true', true);
  select * into rep from reports where id = p_report_id;
  if not found then raise exception 'report not found'; end if;
  if not (public.is_platform_admin() or public.trust_in(rep.community_id) >= 3) then raise exception 'not allowed'; end if;
  update reports set status = case when p_uphold then 'upheld' else 'dismissed' end, decided_by = auth.uid(), decided_at = now() where id = p_report_id;
  if p_uphold then
    perform public.mod_set_hidden(rep.target_kind, rep.target_id, true, 'upheld by moderator');
    insert into moderation_actions (community_id, actor_id, target_kind, target_id, action, detail)
      values (rep.community_id, auth.uid(), rep.target_kind, rep.target_id, 'hide', jsonb_build_object('report', p_report_id));
  end if;
end; $$;

-- admin_moderate — platform admin (any action) or steward (hide/unhide in their community).
create or replace function public.admin_moderate(p_action text, p_kind text, p_id uuid, p_detail jsonb default '{}')
returns void language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  perform set_config('app.rpc', 'true', true);
  if p_action in ('suspend','unsuspend','trustChange') then cid := (p_detail->>'community_id')::uuid;
  else cid := public.mod_community(p_kind, p_id); end if;
  if cid is null then raise exception 'target community unknown'; end if;
  if not (public.is_platform_admin() or (p_action in ('hide','unhide') and public.trust_in(cid) >= 3)) then
    raise exception 'not allowed';
  end if;

  case p_action
    when 'hide' then perform public.mod_set_hidden(p_kind, p_id, true, coalesce(p_detail->>'reason', 'hidden by moderator'));
    when 'unhide' then perform public.mod_set_hidden(p_kind, p_id, false, null);
    when 'remove' then perform public.mod_set_hidden(p_kind, p_id, true, 'removed');
    when 'suspend' then update memberships set suspended_until = now() + make_interval(days => coalesce((p_detail->>'days')::int, 7)), status = 'suspended' where profile_id = p_id and community_id = cid;
    when 'unsuspend' then update memberships set suspended_until = null, status = 'active' where profile_id = p_id and community_id = cid;
    when 'trustChange' then update memberships set trust_level = coalesce((p_detail->>'level')::int, trust_level) where profile_id = p_id and community_id = cid;
    when 'warn' then null;
    when 'note' then null;
    else raise exception 'unknown action %', p_action;
  end case;

  if p_action in ('hide','remove') then
    update reports set status = 'upheld', decided_by = auth.uid(), decided_at = now()
      where target_kind = p_kind and target_id = p_id and status = 'open';
  end if;
  insert into moderation_actions (community_id, actor_id, target_kind, target_id, action, detail)
    values (cid, auth.uid(), p_kind, p_id, p_action, p_detail);
end; $$;

-- trust-0 first-post delay (config-gated; off by default so existing flows are unaffected).
create or replace function public.first_post_delay_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare mins int; cnt int;
begin
  select coalesce((config->>'firstPostDelayMinutes')::int, 0) into mins from communities where id = new.community_id;
  if mins <= 0 or public.trust_in(new.community_id) >= 1 then return new; end if;
  execute format('select count(*) from %I where created_by = $1 and community_id = $2', tg_table_name)
    into cnt using new.created_by, new.community_id;
  if cnt >= 1 then return new; end if;   -- not their first of this kind
  new.hidden_at := now();
  new.hidden_reason := 'first-post review';
  insert into first_post_delays (profile_id, community_id, content_kind, content_id, release_at)
    values (new.created_by, new.community_id, tg_table_name, new.id, now() + make_interval(mins => mins));
  return new;
end; $$;
create trigger listings_first_post before insert on public.listings for each row execute function public.first_post_delay_trigger();
create trigger requests_first_post before insert on public.requests for each row execute function public.first_post_delay_trigger();

-- release_delayed — cron: un-hide delayed posts whose time has come.
create or replace function public.release_delayed()
returns int language plpgsql security definer set search_path = public as $$
declare d record; n int := 0;
begin
  if not public.is_platform_admin() then raise exception 'admin only'; end if;
  for d in select * from first_post_delays where released_at is null and release_at <= now() loop
    perform public.mod_set_hidden(d.content_kind::text, d.content_id, false, null);
    update first_post_delays set released_at = now() where id = d.id;
    n := n + 1;
  end loop;
  return n;
end; $$;

-- GDPR export — the caller's own data as JSON.
create or replace function public.export_account()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'profile', (select jsonb_build_object('id', p.id, 'display_name', p.display_name, 'email', p.email,
                  'bio', p.bio, 'date_of_birth', p.date_of_birth, 'created_at', p.created_at)
                from profiles p where p.id = auth.uid()),
    'memberships', coalesce((select jsonb_agg(to_jsonb(m)) from memberships m where m.profile_id = auth.uid()), '[]'::jsonb),
    'listings', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'title', l.title, 'created_at', l.created_at)) from listings l where l.created_by = auth.uid()), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'created_at', r.created_at)) from requests r where r.created_by = auth.uid()), '[]'::jsonb),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', msg.id, 'body', msg.body, 'created_at', msg.created_at)) from messages msg where msg.sender_id = auth.uid()), '[]'::jsonb)
  );
$$;

-- GDPR delete — anonymise authorship (content survives), remove PII + push/notifications.
-- Hard auth deletion is a separate admin step (it would cascade-delete content).
create or replace function public.delete_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.rpc', 'true', true);
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update profiles set display_name = 'Former neighbour', email = 'deleted+' || id::text || '@removed.invalid',
    bio = null, avatar_url = null, people_directory_opt_in = false where id = auth.uid();
  delete from push_subscriptions where profile_id = auth.uid();
  delete from notifications where profile_id = auth.uid();
end; $$;

grant execute on function public.report_target(text, uuid, text, text) to authenticated;
grant execute on function public.decide_report(uuid, boolean) to authenticated;
grant execute on function public.admin_moderate(text, text, uuid, jsonb) to authenticated;
grant execute on function public.release_delayed() to authenticated;
grant execute on function public.export_account() to authenticated;
grant execute on function public.delete_account() to authenticated;
