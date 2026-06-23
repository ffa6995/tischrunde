# Supabase — Setup (Walking Skeleton, Schritt 2 & 3)

Aktuell läuft die App gegen Platzhalter-Keys. So wird sie live:

1. **Projekt anlegen** auf [supabase.com](https://supabase.com).
2. **Schema + Seed:** `schema.sql` im SQL-Editor ausführen (legt Tabellen, RLS-Starter
   und Seed an: 1 Event „Spielerei Dornbirn", 6 Spiele, 4 offene Runden).
3. **Anonyme Anmeldung aktivieren** (für die Gast-Identität, Schritt 3):
   Authentication → Providers → **Anonymous** einschalten.
4. **Keys eintragen** in `.env.local` (Projekt-Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Dev-Server neu starten → Gast-Login funktioniert, DB-Daten werden sichtbar.

> RLS-Policies in `schema.sql` sind bewusst als **Starter** markiert und vor
> Produktion zu verschärfen (CLAUDE.md §6, Konzept §14).
