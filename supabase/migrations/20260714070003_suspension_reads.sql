-- 20260714070003 — suspension must block writes, not reads (spec 04). The prior admin_moderate
-- set memberships.status = 'suspended', but member_communities()/trust_in() filter on
-- status = 'active', so that also stripped the member's read access. Track suspension with
-- suspended_until alone (is_suspended() already reads it); leave status = 'active' so reads work.

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
    -- suspension: set the timer only. Membership stays 'active' so browsing keeps working;
    -- is_suspended(community_id) reads suspended_until and blocks the content-insert policies.
    when 'suspend' then update memberships set suspended_until = now() + make_interval(days => coalesce((p_detail->>'days')::int, 7)) where profile_id = p_id and community_id = cid;
    when 'unsuspend' then update memberships set suspended_until = null where profile_id = p_id and community_id = cid;
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
