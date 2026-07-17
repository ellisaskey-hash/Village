-- 20260717130001 — enrich the inbox list. The client-side threads.mine() couldn't compute the
-- other participant's name, a message preview, or unread in one round-trip, so the live inbox
-- showed the thread title twice with no preview. This RPC returns each of the caller's threads
-- with: the other participant's display name, the latest (non-hidden) message snippet + sender,
-- and whether there's anything unread since their last read. SECURITY DEFINER, but scoped to the
-- caller via auth.uid() on the participant join, so it only ever returns your own threads.
create or replace function public.my_threads()
returns table (
  id uuid,
  context text,
  context_id uuid,
  title text,
  other_name text,
  last_message_at timestamptz,
  last_snippet text,
  last_sender_is_me boolean,
  unread boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.context,
    t.context_id,
    t.title,
    coalesce(op.display_name, 'Community') as other_name,
    t.last_message_at,
    lm.body as last_snippet,
    coalesce(lm.sender_id = auth.uid(), false) as last_sender_is_me,
    exists (
      select 1 from public.messages m
      where m.thread_id = t.id
        and m.sender_id <> auth.uid()
        and m.hidden_at is null
        and m.created_at > coalesce(me.last_read_at, 'epoch'::timestamptz)
    ) as unread
  from public.threads t
  join public.thread_participants me
    on me.thread_id = t.id and me.profile_id = auth.uid() and me.left_at is null
  left join lateral (
    select p.profile_id
    from public.thread_participants p
    where p.thread_id = t.id and p.profile_id <> auth.uid() and p.left_at is null
    limit 1
  ) otherp on true
  left join public.profiles op on op.id = otherp.profile_id
  left join lateral (
    select m.body, m.sender_id
    from public.messages m
    where m.thread_id = t.id and m.hidden_at is null
    order by m.created_at desc
    limit 1
  ) lm on true
  order by t.last_message_at desc;
$$;

grant execute on function public.my_threads() to authenticated;
