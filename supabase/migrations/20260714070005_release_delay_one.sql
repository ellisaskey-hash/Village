-- 20260714070005 — release a single first-post delay from the admin queue (spec 04). The cron
-- release_delayed() releases everything due; this lets an admin clear one item early after a look.
create or replace function public.release_delay(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare d public.first_post_delays;
begin
  select * into d from first_post_delays where id = p_id;
  if not found then raise exception 'not found'; end if;
  if not public.can_moderate(d.community_id) then raise exception 'not allowed'; end if;
  perform public.mod_set_hidden(d.content_kind::text, d.content_id, false, null);
  update first_post_delays set released_at = now() where id = p_id;
  insert into moderation_actions (community_id, actor_id, target_kind, target_id, action, detail)
    values (d.community_id, auth.uid(), d.content_kind, d.content_id, 'unhide', jsonb_build_object('firstPostRelease', true));
end; $$;
grant execute on function public.release_delay(uuid) to authenticated;
