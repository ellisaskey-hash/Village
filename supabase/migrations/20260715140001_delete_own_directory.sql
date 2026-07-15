-- 20260715140001 — let members remove their own directory contributions (spec 07 "My equipment
-- & skills"). Skills already had a delete policy; add equipment + services (owner-only).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='equipment_items' and policyname='delete own equipment') then
    create policy "delete own equipment" on public.equipment_items for delete using (owner_profile_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='services' and policyname='delete own services') then
    create policy "delete own services" on public.services for delete using (created_by = auth.uid());
  end if;
end $$;
