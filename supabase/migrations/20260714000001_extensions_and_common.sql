-- 20260714000001 — extensions + shared trigger + postcode helper.
-- Conventions (spec 03): UUID PKs, timestamptz audit columns, text+CHECK enums (never
-- create type), RLS on every table. Timestamped migration filename.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists postgis with schema extensions;

-- Shared updated_at trigger (attached to every table with an updated_at column).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- UK postcode outward code (district). 'TN12 8AA' / 'tn128aa' -> 'TN12'. The inward code is
-- always the final three characters; the outward code is everything before it.
create or replace function public.postcode_district(p text)
returns text language sql immutable as $$
  select case
    when p is null then null
    when length(regexp_replace(p, '\s', '', 'g')) <= 3 then upper(regexp_replace(p, '\s', '', 'g'))
    else upper(left(regexp_replace(p, '\s', '', 'g'), length(regexp_replace(p, '\s', '', 'g')) - 3))
  end;
$$;
