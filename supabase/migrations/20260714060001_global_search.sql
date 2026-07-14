-- 20260714060001 — M6 global_search (spec 09). One SQL over the per-table search_document
-- tsvectors with ts_rank + kind weighting (requests/listings boosted above places) and a
-- pg_trgm fuzzy fallback for short/typo queries. SECURITY INVOKER so RLS filters every row to
-- the caller's community automatically.

create or replace function public.global_search(p_community uuid, p_query text, p_kinds text[] default null)
returns table (kind text, id uuid, title text, snippet text, rank real)
language sql stable security invoker set search_path = public, extensions as $$
  with q as (select websearch_to_tsquery('english', p_query) as tsq, p_query as raw)
  select * from (
    select 'business'::text, b.id, b.name, coalesce(b.description,''),
           greatest(ts_rank(b.search_document, q.tsq), similarity(b.name, q.raw))::real
      from businesses b, q
      where b.community_id = p_community and (b.search_document @@ q.tsq or b.name % q.raw)
    union all
    select 'service', s.id, s.title, coalesce(s.description,''),
           greatest(ts_rank(s.search_document, q.tsq), similarity(s.title, q.raw))::real * 1.1
      from services s, q
      where s.community_id = p_community and s.active and (s.search_document @@ q.tsq or s.title % q.raw)
    union all
    select 'place', pl.id, pl.name, coalesce(pl.description,''),
           greatest(ts_rank(pl.search_document, q.tsq), similarity(pl.name, q.raw))::real
      from places pl, q
      where pl.community_id = p_community and (pl.search_document @@ q.tsq or pl.name % q.raw)
    union all
    select 'organisation', o.id, o.name, coalesce(o.description,''),
           greatest(ts_rank(o.search_document, q.tsq), similarity(o.name, q.raw))::real
      from organisations o, q
      where o.community_id = p_community and (o.search_document @@ q.tsq or o.name % q.raw)
    union all
    select 'event', e.id, e.title, coalesce(e.description,''),
           greatest(ts_rank(e.search_document, q.tsq), similarity(e.title, q.raw))::real * 1.1
      from events e, q
      where e.community_id = p_community and (e.search_document @@ q.tsq or e.title % q.raw)
    union all
    select 'listing', l.id, l.title, coalesce(l.description,''),
           greatest(ts_rank(l.search_document, q.tsq), similarity(l.title, q.raw))::real * 1.2
      from listings l, q
      where l.community_id = p_community and l.status = 'active' and (l.search_document @@ q.tsq or l.title % q.raw)
    union all
    select 'request', r.id, r.title, coalesce(r.description,''),
           greatest(ts_rank(r.search_document, q.tsq), similarity(r.title, q.raw))::real * 1.3
      from requests r, q
      where r.community_id = p_community and r.status in ('open','answered') and (r.search_document @@ q.tsq or r.title % q.raw)
  ) results(kind, id, title, snippet, rank)
  where p_kinds is null or kind = any (p_kinds)
  order by rank desc
  limit 40;
$$;

grant execute on function public.global_search(uuid, text, text[]) to authenticated;
