-- 20260715090001 — accept_seed_proposal gains an event branch. Events land in M4; the seeding
-- pipeline (spec 08) can propose events from the URL-extract, so accepting one materialises an
-- events row (created_by = the accepting admin). Place/business/organisation branches unchanged.
create or replace function public.accept_seed_proposal(proposal_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  p public.seed_proposals;
  new_id uuid;
  d jsonb;
begin
  if not public.is_platform_admin() then raise exception 'admin only'; end if;
  select * into p from seed_proposals where id = proposal_id;
  if not found then raise exception 'proposal not found'; end if;
  if p.status <> 'pending' then raise exception 'proposal already decided'; end if;
  d := p.payload;

  if p.kind = 'place' then
    insert into places (community_id, name, kind, description, address, source)
      values (p.community_id, d->>'name', coalesce(d->>'kind','other'), d->>'description', d->>'address', 'seed')
      returning id into new_id;
  elsif p.kind = 'business' then
    insert into businesses (community_id, name, categories, description, source)
      values (p.community_id, d->>'name',
              coalesce((select array_agg(value::text) from jsonb_array_elements_text(coalesce(d->'categories','[]'::jsonb))), '{}'),
              d->>'description', 'seed')
      returning id into new_id;
  elsif p.kind = 'organisation' then
    insert into organisations (community_id, name, kind, description, verified_source, source)
      values (p.community_id, d->>'name', coalesce(d->>'kind','group'), d->>'description',
              coalesce((d->>'verified_source')::boolean, false), 'seed')
      returning id into new_id;
  elsif p.kind = 'event' then
    insert into events (community_id, created_by, title, description, category, location_text, starts_at, ends_at, rsvp_mode)
      values (p.community_id, auth.uid(), d->>'title', d->>'description', coalesce(d->>'category','community'),
              d->>'location_text', (d->>'starts_at')::timestamptz, nullif(d->>'ends_at','')::timestamptz, 'open')
      returning id into new_id;
  else
    raise exception 'unsupported proposal kind %', p.kind;
  end if;

  update seed_proposals set status = 'accepted', decided_by = auth.uid(), decided_at = now(),
    merged_into = new_id where id = proposal_id;
  return new_id;
end;
$$;
