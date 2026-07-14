-- 20260714020004 — M3 RPCs. open_thread is the single point of thread-creation truth (D5):
-- no client-side thread inserts anywhere. Status RPCs enforce legal transitions.

create or replace function public.open_thread(
  p_context text, p_context_id uuid, p_recipient uuid, p_first_message text)
returns public.threads
language plpgsql security definer set search_path = public as $$
declare
  v_cid uuid;
  v_other uuid;
  v_title text;
  v_dm_min int;
  v_privacy text;
  v_existing uuid;
  t public.threads;
begin
  perform set_config('app.rpc', 'true', true);
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if coalesce(p_first_message, '') = '' then raise exception 'a first message is required'; end if;

  if p_context = 'direct' then
    if p_recipient is null then raise exception 'recipient required'; end if;
    v_other := p_recipient;
    select community_id into v_cid from (
      select community_id from memberships where profile_id = auth.uid() and status = 'active'
      intersect
      select community_id from memberships where profile_id = v_other and status = 'active'
    ) s limit 1;
    if v_cid is null then raise exception 'you have no community in common'; end if;

    -- Cold-DM gate, unless the pair already share any thread (in-context contact established).
    if not exists (
      select 1 from thread_participants tp1
      join thread_participants tp2 on tp1.thread_id = tp2.thread_id
      where tp1.profile_id = auth.uid() and tp2.profile_id = v_other
    ) then
      v_dm_min := coalesce((select (config->>'coldDmMinTrust')::int from communities where id = v_cid), 1);
      if public.trust_in(v_cid) < v_dm_min then raise exception 'you need more trust to message directly'; end if;
      select dm_privacy into v_privacy from profiles where id = v_other;
      if v_privacy in ('nobody', 'contacts') then raise exception 'this person is not accepting new messages'; end if;
    end if;

  else
    if p_context = 'listing' then
      select community_id, created_by, title into v_cid, v_other, v_title from listings where id = p_context_id;
    elsif p_context = 'request' then
      select community_id, created_by, title into v_cid, v_other, v_title from requests where id = p_context_id;
    elsif p_context = 'business' then
      select community_id, owner_profile_id, name into v_cid, v_other, v_title from businesses where id = p_context_id;
    elsif p_context = 'organisation' then
      select community_id, null::uuid, name into v_cid, v_other, v_title from organisations where id = p_context_id;
    else
      raise exception 'unsupported thread context %', p_context;
    end if;
    if v_cid is null then raise exception 'that item was not found'; end if;
    if public.trust_in(v_cid) < 0 then raise exception 'you are not a member of this community'; end if;
  end if;

  -- Dedupe: reuse an existing thread rather than spawning a second.
  if p_context = 'direct' then
    select th.id into v_existing from threads th
      join thread_participants a on a.thread_id = th.id and a.profile_id = auth.uid()
      join thread_participants b on b.thread_id = th.id and b.profile_id = v_other
      where th.context = 'direct' limit 1;
  else
    select th.id into v_existing from threads th
      join thread_participants tp on tp.thread_id = th.id and tp.profile_id = auth.uid()
      where th.context = p_context and th.context_id is not distinct from p_context_id limit 1;
  end if;

  if v_existing is not null then
    insert into messages (thread_id, sender_id, body) values (v_existing, auth.uid(), p_first_message);
    select * into t from threads where id = v_existing;
    return t;
  end if;

  insert into threads (community_id, context, context_id, title, created_by)
    values (v_cid, p_context, case when p_context = 'direct' then null else p_context_id end, v_title, auth.uid())
    returning * into t;
  insert into thread_participants (thread_id, profile_id) values (t.id, auth.uid());
  if v_other is not null and v_other <> auth.uid() then
    insert into thread_participants (thread_id, profile_id) values (t.id, v_other) on conflict do nothing;
  end if;
  insert into messages (thread_id, sender_id, body) values (t.id, auth.uid(), p_first_message);
  return t;
end;
$$;

-- set_listing_status — author/admin, legal transitions only.
create or replace function public.set_listing_status(p_id uuid, p_status text, p_completed_with uuid default null)
returns public.listings language plpgsql security definer set search_path = public as $$
declare cur text; row public.listings;
begin
  select status into cur from listings where id = p_id;
  if not found then raise exception 'listing not found'; end if;
  if not exists (select 1 from listings where id = p_id and (created_by = auth.uid() or is_platform_admin())) then
    raise exception 'not your listing';
  end if;
  if cur in ('completed','expired','withdrawn') then raise exception 'this listing is closed'; end if;
  if p_status not in ('active','reserved','completed','withdrawn') then raise exception 'illegal status'; end if;
  update listings set status = p_status,
    completed_with = case when p_status = 'completed' then p_completed_with else completed_with end
    where id = p_id returning * into row;
  return row;
end;
$$;

-- set_request_status — author/admin, legal transitions only.
create or replace function public.set_request_status(p_id uuid, p_status text, p_fulfilled_by uuid default null)
returns public.requests language plpgsql security definer set search_path = public as $$
declare cur text; row public.requests;
begin
  select status into cur from requests where id = p_id;
  if not found then raise exception 'request not found'; end if;
  if not exists (select 1 from requests where id = p_id and (created_by = auth.uid() or is_platform_admin())) then
    raise exception 'not your request';
  end if;
  if cur in ('fulfilled','expired','withdrawn') then raise exception 'this request is closed'; end if;
  if p_status not in ('open','answered','fulfilled','withdrawn') then raise exception 'illegal status'; end if;
  update requests set status = p_status,
    fulfilled_by = case when p_status = 'fulfilled' then p_fulfilled_by else fulfilled_by end
    where id = p_id returning * into row;
  return row;
end;
$$;

grant execute on function public.open_thread(text, uuid, uuid, text) to authenticated;
grant execute on function public.set_listing_status(uuid, text, uuid) to authenticated;
grant execute on function public.set_request_status(uuid, text, uuid) to authenticated;
