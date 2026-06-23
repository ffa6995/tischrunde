-- ============================================================
-- Release 2 — Location + Spielbestand für das Seed-Event.
-- Einmal im Supabase SQL-Editor ausführen (ergänzt den ursprünglichen Seed).
-- ============================================================

-- RLS: Spielbestand öffentlich lesbar (Starter — vor Produktion verschärfen).
drop policy if exists "location_games read" on location_games;
create policy "location_games read" on location_games for select using (true);

-- Location „Jugendhaus Dornbirn" (öffentliches Venue).
insert into locations (id, name, type, address_public, region_label, website, status, is_verified)
values (
  '33333333-3333-3333-3333-333333333301',
  'Jugendhaus Dornbirn',
  'event_host',
  'Jugendhaus, Schulgasse 1, Dornbirn',
  'Dornbirn',
  'https://example.org/jugendhaus',
  'public',
  true
)
on conflict (id) do nothing;

-- Event mit der Location verknüpfen.
update events
  set location_id = '33333333-3333-3333-3333-333333333301'
  where id = '22222222-2222-2222-2222-222222222201';

-- Spielbestand der Location (vor Ort verfügbar).
insert into location_games (location_id, game_id, status) values
  ('33333333-3333-3333-3333-333333333301','11111111-1111-1111-1111-111111111101','available'), -- Catan
  ('33333333-3333-3333-3333-333333333301','11111111-1111-1111-1111-111111111102','available'), -- Carcassonne
  ('33333333-3333-3333-3333-333333333301','11111111-1111-1111-1111-111111111103','available'), -- Wingspan
  ('33333333-3333-3333-3333-333333333301','11111111-1111-1111-1111-111111111104','available')  -- Azul
on conflict do nothing;
