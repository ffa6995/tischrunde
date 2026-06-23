-- ============================================================
-- Realtime für Live-Sitzplätze (CLAUDE.md §5.5).
-- Fügt die Tabellen zur supabase_realtime-Publication hinzu (idempotent).
-- Einmal im Supabase SQL-Editor ausführen.
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'participants'
  ) then
    alter publication supabase_realtime add table participants;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_searches'
  ) then
    alter publication supabase_realtime add table game_searches;
  end if;
end $$;
