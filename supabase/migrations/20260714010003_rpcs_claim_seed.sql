-- 20260714010003 — M2 RPCs: claiming (self-serve + pre-launch claim links) and the seeding
-- pipeline's accept/launch. Multi-table writes only; RLS unchanged (spec 03 §RPCs, 08).

-- Pre-launch claim links live on the business as a token (DECISION-MADE, PROGRESS.md): a
-- claim link is "sign up, tap claim, done" in one RPC rather than a separate tokens table.
alter table public.businesses add column claim_link_token text;

-- issue_claim_link(business_id) → token (admin only, for the seeding console).
create or replace function public.issue_claim_link(business_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare tok text;
begin
  if not public.is_platform_admin() then raise exception 'admin only'; end if;
  tok := encode(gen_random_bytes(9), 'base64');
  tok := replace(replace(replace(tok, '/', ''), '+', ''), '=', '');
  update businesses set claim_link_token = tok where id = business_id;
  return tok;
end;
$$;

-- claim_business — self-serve pending claim, OR one-step approval when a valid link token is
-- supplied (spec 08). Requires trust 1+ in the business's community.
create or replace function public.claim_business(business_id uuid, evidence text, link_token text default null)
returns public.business_claims
language plpgsql security definer set search_path = public as $$
declare
  b public.businesses;
  cl public.business_claims;
  auto boolean := false;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into b from businesses where id = business_id;
  if not found then raise exception 'business not found'; end if;
  if public.trust_in(b.community_id) < 1 then raise exception 'you need trust level 1 to claim'; end if;
  if b.owner_profile_id is not null then raise exception 'this page is already claimed'; end if;

  auto := link_token is not null and b.claim_link_token is not null and link_token = b.claim_link_token;

  insert into business_claims (business_id, claimant_id, evidence, status, decided_by, decided_at)
  values (business_id, auth.uid(), evidence,
          case when auto then 'approved' else 'pending' end,
          case when auto then auth.uid() else null end,
          case when auto then now() else null end)
  returning * into cl;

  if auto then
    update businesses
      set owner_profile_id = auth.uid(), claimed_at = now(), source = 'self', claim_link_token = null
      where id = business_id;
  end if;

  return cl;
end;
$$;

-- decide_claim(claim_id, approve) — admin decision on a pending claim.
create or replace function public.decide_claim(claim_id uuid, approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare cl public.business_claims;
begin
  if not public.is_platform_admin() then raise exception 'admin only'; end if;
  select * into cl from business_claims where id = claim_id;
  if not found then raise exception 'claim not found'; end if;
  update business_claims set status = case when approve then 'approved' else 'rejected' end,
    decided_by = auth.uid(), decided_at = now() where id = claim_id;
  if approve then
    update businesses set owner_profile_id = cl.claimant_id, claimed_at = now(), source = 'self'
      where id = cl.business_id;
  end if;
  -- notify claimant: added with the notifications table (M3).
end;
$$;

-- accept_seed_proposal(proposal_id) — materialise a pending proposal into the live table.
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
  else
    raise exception 'unsupported proposal kind %', p.kind;  -- events land in M4
  end if;

  update seed_proposals set status = 'accepted', decided_by = auth.uid(), decided_at = now(),
    merged_into = new_id where id = proposal_id;
  return new_id;
end;
$$;

-- launch_community(id) — flip a seeding community live.
create or replace function public.launch_community(id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'admin only'; end if;
  update communities set status = 'launched', launched_at = now() where communities.id = launch_community.id;
  -- founding welcome notice: added with the notifications table (M3).
end;
$$;

grant execute on function public.issue_claim_link(uuid) to authenticated;
grant execute on function public.claim_business(uuid, text, text) to authenticated;
grant execute on function public.decide_claim(uuid, boolean) to authenticated;
grant execute on function public.accept_seed_proposal(uuid) to authenticated;
grant execute on function public.launch_community(uuid) to authenticated;
