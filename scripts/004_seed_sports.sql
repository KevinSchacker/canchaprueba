-- =========================================================
-- 004 - Seed inicial de deportes
-- =========================================================
-- Padel arranca activo, los demas quedan listos para activar cuando crezcamos.

insert into public.sports (slug, name, icon, active) values
  ('padel',    'Padel',     'circle-dot',     true),
  ('tenis',    'Tenis',     'circle',         false),
  ('futbol5',  'Futbol 5',  'circle',         false),
  ('basquet',  'Basquet',   'circle',         false),
  ('voley',    'Voley',     'circle',         false)
on conflict (slug) do nothing;
