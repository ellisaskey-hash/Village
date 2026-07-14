-- 20260714030001 — MIGRATION FIX (found wiring the real DB): content inserts from the client
-- omit created_by (the app relied on the mock to set it). On real Postgres created_by is NOT
-- NULL with no default, so the insert fails. Defaulting to auth.uid() fixes the app's insert
-- path and keeps the RLS check (created_by = auth.uid()) intact. See PROGRESS.md.

alter table public.listings alter column created_by set default auth.uid();
alter table public.requests alter column created_by set default auth.uid();
alter table public.places   alter column created_by set default auth.uid();
