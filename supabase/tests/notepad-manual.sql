-- Manuelle Abnahme Notizblöcke. Im Supabase SQL-Editor ausführen und ERGEBNISSE prüfen.
-- Voraussetzung: migrations/20260906010000_notepad.sql wurde bereits ausgeführt.
--
-- Diese Prüfungen decken Schema, Policies und RPC-Rechte ab. Sie ersetzen nicht
-- die Live-Abnahme mit zwei Browser-Identitäten (siehe Abnahme-Report).

-- 1. Tabellen mit RLS
select tablename, rowsecurity from pg_tables
 where schemaname = 'public' and tablename in ('notepad_templates', 'notepad_sheets');
-- erwartet: beide true

-- 2. Policies vorhanden
select tablename, policyname from pg_policies
 where schemaname = 'public' and tablename in ('notepad_templates', 'notepad_sheets');
-- erwartet: "notepad templates read", "notepad sheets read accessible"

-- 3. Direktes Schreiben gesperrt
select has_table_privilege('authenticated', 'notepad_sheets', 'insert')  as sheets_insert_false,
       has_table_privilege('authenticated', 'notepad_templates', 'update') as templates_update_false;
-- erwartet: beide false

-- 4. RPCs sind security definer und nur für authenticated ausführbar
select p.proname, p.prosecdef,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
       has_function_privilege('anon', p.oid, 'execute') as anon_execute
  from pg_proc p
 where p.pronamespace = 'public'::regnamespace
   and p.proname in ('create_notepad_sheet','save_notepad_entries','set_notepad_sheet_status',
                     'transfer_notepad_writer','save_notepad_template','delete_notepad_template');
-- erwartet: 6 Zeilen, jeweils prosecdef true, authenticated_execute true, anon_execute false

-- 5. System-Vorlagen geseedet
select id, name, kind, owner_id from notepad_templates where kind = 'system' order by name;
-- erwartet: 4 Zeilen, owner_id null (Runden-Zettel, Skyjo, Jass-Tafel (Schieber), Strichliste)

-- 6. Realtime aktiv (nach erneutem Ausführen von enable-realtime.sql)
select tablename from pg_publication_tables
 where pubname = 'supabase_realtime' and tablename = 'notepad_sheets';
-- erwartet: eine Zeile
