-- 20260714040003 — M4 RPCs: set_rsvp (capacity + waitlist + promotion) and expand_recurrence
-- (DST-correct instance generation). Recurrence expansion also runs from cron-tick (spec 09).

-- Promote earliest waitlisted RSVPs into freed capacity (spec 04/10).
create or replace function public.promote_waitlist(p_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare cap int; used int; r record; cid uuid; etitle text;
begin
  select capacity, community_id, title into cap, cid, etitle from events where id = p_event_id;
  select coalesce(sum(party_size), 0) into used from event_rsvps where event_id = p_event_id and status = 'going';
  for r in select profile_id, party_size from event_rsvps
           where event_id = p_event_id and status = 'waitlist' order by created_at loop
    if used + r.party_size <= coalesce(cap, 0) then
      update event_rsvps set status = 'going' where event_id = p_event_id and profile_id = r.profile_id;
      used := used + r.party_size;
      insert into notifications (profile_id, community_id, category, title, body, deep_link)
        values (r.profile_id, cid, 'event.reminder', 'A spot opened up', etitle, '/events/' || p_event_id);
    end if;
  end loop;
end;
$$;

-- set_rsvp — going/maybe/waitlist/cancelled with capacity enforcement and waitlist promotion.
create or replace function public.set_rsvp(p_event_id uuid, p_status text, p_party_size smallint default 1)
returns public.event_rsvps language plpgsql security definer set search_path = public as $$
declare e public.events; going_total int; my public.event_rsvps;
begin
  perform set_config('app.rpc', 'true', true);
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into e from events where id = p_event_id;
  if not found then raise exception 'event not found'; end if;
  if public.trust_in(e.community_id) < 0 then raise exception 'you are not a member of this community'; end if;
  if e.rsvp_mode = 'none' then raise exception 'this event does not take RSVPs'; end if;
  if p_status not in ('going', 'maybe', 'waitlist', 'cancelled') then raise exception 'illegal RSVP status'; end if;

  insert into event_rsvps (event_id, profile_id, status, party_size)
    values (p_event_id, auth.uid(), p_status, greatest(p_party_size, 1))
    on conflict (event_id, profile_id) do update set status = excluded.status, party_size = excluded.party_size;

  -- capacity: if going would overflow, drop to waitlist
  if e.rsvp_mode = 'capacity' and p_status = 'going' then
    select coalesce(sum(party_size), 0) into going_total
      from event_rsvps where event_id = p_event_id and status = 'going' and profile_id <> auth.uid();
    if going_total + greatest(p_party_size, 1) > coalesce(e.capacity, 0) then
      update event_rsvps set status = 'waitlist' where event_id = p_event_id and profile_id = auth.uid();
    end if;
  end if;

  -- freeing a spot promotes the waitlist
  if e.rsvp_mode = 'capacity' and p_status in ('cancelled', 'maybe', 'waitlist') then
    perform public.promote_waitlist(p_event_id);
  end if;

  select * into my from event_rsvps where event_id = p_event_id and profile_id = auth.uid();
  return my;
end;
$$;

-- expand_recurrence — generate future instances from a parent's recurrence, DST-correct by
-- computing in the community wall-clock (Europe/London) before converting back to timestamptz.
create or replace function public.expand_recurrence(p_parent_id uuid, p_count int default 8)
returns int language plpgsql security definer set search_path = public as $$
declare
  e public.events; tz text := 'Europe/London'; freq text; step int; i int;
  base timestamp; nxt timestamptz; dur interval; existing int;
begin
  if not (public.is_platform_admin() or exists (select 1 from events where id = p_parent_id and created_by = auth.uid())) then
    raise exception 'not allowed';
  end if;
  select * into e from events where id = p_parent_id;
  if e.recurrence is null then raise exception 'event has no recurrence'; end if;
  freq := coalesce(e.recurrence->>'freq', 'weekly');
  step := coalesce((e.recurrence->>'interval')::int, 1);
  dur := coalesce(e.ends_at - e.starts_at, interval '0');
  base := (e.starts_at at time zone tz);
  select count(*) into existing from events where parent_event_id = p_parent_id;

  for i in (existing + 1)..(existing + p_count) loop
    if freq = 'daily' then nxt := (base + make_interval(days => step * i)) at time zone tz;
    elsif freq = 'weekly' then nxt := (base + make_interval(weeks => step * i)) at time zone tz;
    elsif freq = 'monthly' then nxt := (base + make_interval(months => step * i)) at time zone tz;
    else raise exception 'unsupported recurrence freq %', freq; end if;

    insert into events (community_id, created_by, title, description, category, place_id, location_text,
                        starts_at, ends_at, rsvp_mode, capacity, source, parent_event_id)
      values (e.community_id, e.created_by, e.title, e.description, e.category, e.place_id, e.location_text,
              nxt, case when e.ends_at is not null then nxt + dur else null end,
              e.rsvp_mode, e.capacity, e.source, p_parent_id);
  end loop;
  return p_count;
end;
$$;

grant execute on function public.set_rsvp(uuid, text, smallint) to authenticated;
grant execute on function public.expand_recurrence(uuid, int) to authenticated;
