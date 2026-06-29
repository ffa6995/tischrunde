-- ============================================================
-- Optionale Notiz beim Mitbringen (z. B. Erweiterung).
-- Einmal im Supabase SQL-Editor ausführen.
-- ============================================================
alter table participants add column if not exists brings_note text;
