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
