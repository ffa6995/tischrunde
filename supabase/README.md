# Supabase — Setup (Walking Skeleton, Schritt 2 & 3)

Aktuell läuft die App gegen Platzhalter-Keys. So wird sie live:

1. **Projekt anlegen** auf [supabase.com](https://supabase.com).
2. **Schema + Seed:** Für ein neues Projekt `schema.sql` im SQL-Editor ausführen.
   Für ein bestehendes Projekt zuerst die vorhandene Schema-Version, dann
   `migrations/20260906000000_mvp_hardening.sql` ausführen. Die Migration schließt
   direkte Browser-Schreibpfade und richtet die notwendigen RPCs ein.
3. **Anonyme Anmeldung aktivieren** (für die Gast-Identität, Schritt 3):
   Authentication → Providers → **Anonymous** einschalten.
4. **Keys eintragen** in `.env.local` (Projekt-Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Dev-Server neu starten → Gast-Login funktioniert, DB-Daten werden sichtbar.

> Nach der Hardening-Migration werden Runden, Teilnahmen und Aktivitätsereignisse
> ausschließlich über RPCs geschrieben. Vor dem Deployment die Migration in einer
> Staging-Datenbank ausführen und mit zwei Testkonten Beitritt, letzten Platz,
> private/geschlossene Runde, Entfernen und doppelte Check-ins prüfen.

## Notizblöcke (Vorlagen + Punkteblätter)

Fügt `migrations/20260906010000_notepad.sql` auf einem bestehenden Projekt nach
der Hardening-Migration hinzu (in dieser Reihenfolge im SQL-Editor ausführen).
Sie legt `notepad_templates` und `notepad_sheets` mit RLS an, sperrt direktes
Schreiben und richtet die sechs Notizblock-RPCs
(`create_notepad_sheet`, `save_notepad_entries`, `set_notepad_sheet_status`,
`transfer_notepad_writer`, `save_notepad_template`, `delete_notepad_template`)
ein. Sie seedt außerdem vier System-Vorlagen (Runden-Zettel, Skyjo, Jass-Tafel,
Strichliste) und die Spiel-Zeile für Skyjo.

Danach **`enable-realtime.sql` erneut ausführen**, damit `notepad_sheets` der
`supabase_realtime`-Publication beitritt — sonst bleiben Live-Updates auf
Punkteblättern aus. Die Datei ist idempotent; ein erneuter Lauf für bereits
enthaltene Tabellen tut nichts.

Manuelle Abnahme (Schema, Policies, RPC-Rechte, Seed, Realtime):
`supabase/tests/notepad-manual.sql` im SQL-Editor ausführen und die Ergebnisse
gegen die dort vermerkten Erwartungen prüfen.
