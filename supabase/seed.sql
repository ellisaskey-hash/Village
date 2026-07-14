-- Seed data (spec 08 launch + M1 "seed a horsmonden community row").
-- Communities carry no auth dependency, so they seed cleanly. Members/content are created
-- through the auth + join flow (or the M2 seeding console), never hard-seeded here.

insert into public.communities (slug, name, type, region, postcode_districts, skin, status)
values
  ('horsmonden', 'Horsmonden', 'village', 'Kent, England', array['TN12'], 'village', 'seeding'),
  -- dev fixture: a launched community for local review, matches district DV1
  ('dev-village', 'Dev Village', 'village', 'Testshire', array['DV1'], 'village', 'launched')
on conflict (slug) do nothing;
