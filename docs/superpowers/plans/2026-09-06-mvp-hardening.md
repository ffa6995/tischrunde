# MVP-Absicherung: Implementierungsplan

> Umsetzung mit GPT-5.6 Terra, reasoning medium. Der Nutzer hat Planung und anschließende Implementierung der Review-Punkte 1–6 beauftragt.

**Ziel:** Rechte, Buchungen, Aktivitätsdaten und Live-Anzeige des bestehenden Event-Companions zuverlässig machen.
**Ansatz:** Bestehende UI/Hook/DB-Trennung behalten; kritische Schreiboperationen in transaktionale Postgres-RPCs verschieben. Kein neues Einladungssystem.
**Scope:** Lokale Implementierung und Prüfung, keine Änderung einer entfernten Datenbank, kein Deployment oder Push.

## Ein zusammenhängendes Arbeitspaket: Punkte 1–6

- [ ] Rollen: Selbständerungen von role/verification_status verhindern, sichere Profilanlage und erlaubte Namens-/Avataränderungen erhalten. Admin/Moderator-Berechtigungen dürfen nicht selbst erlangt werden. Regeln für INSERT und UPDATE sowie direkte API-Aufrufe absichern.
- [ ] Teilnahme: Atomare RPC mit Sperre auf Runde, Kapazitätsprüfung, nur beitretbare öffentliche/offene Runde, keine Wiederaufnahme entfernter Teilnehmer. Eigene Teilnahme darf keine Hostrolle oder beliebigen Status erhalten. Aktive/geschlossene/abgesagte Runden dürfen durch Status-Trigger nicht wieder geöffnet werden; Statuswechsel validieren. Sämtliche Teilnehmermutationen müssen dieselbe Synchronisierung nutzen.
- [ ] Privatsphäre: Einladungsauswahl aus Wizard entfernen; öffentliche Teilnehmer nur bei tatsächlich öffentlich zugänglichen Runden lesen. Ersteller müssen ihre bestehenden nichtöffentlichen Runden lesen können, ohne neue Einladungsfunktion. Kein Leck über private/unveröffentlichte Events. Regeln gegen rekursive RLS-Abfragen prüfen.
- [ ] Atomarität: Runde + Host + round_created, Join + round_joined, Check-in/Hostbestätigung + Aktivität in Transaktionen. Direkte Schreibpfade schließen, die diese Regeln umgehen. Authentität der activity_events durch DB erzwingen; sichere search_path und minimal nötige EXECUTE-Rechte für SECURITY DEFINER. Leave/Remove/Status ebenfalls berechtigt und konsistent durchführen.
- [ ] Trust: Selbst- und Hostbestätigung zählen pro Runde höchstens einmal. Wiederholte Aktionen idempotent, vorhandene Duplikate berücksichtigen. Beitritt nicht als Erscheinen bezeichnen. Spielmitbringen an bestätigte Teilnahme knüpfen oder klar als Zusage bezeichnen. Demo und echte Daten fachlich konsistent. Kein geografischer Anwesenheitsnachweis versprochen.
- [ ] Live/Fehler: Eventübersicht und Event-Rundenliste aktualisieren bei Runden-/Teilnehmeränderungen; Detail auch bei reinen Statusänderungen. Reconnect bzw. Fokus sinnvoll behandeln; eigene Aktivitätsdaten nach Hosten/Bestätigung aktualisieren. Sichtbare Query- und Mutationfehler mit Wiederholung für Join/Leave/Check-in/Host-Aktionen; Fehler nicht als leere Liste/404 darstellen.
- [ ] Migration/Setup: Versionierte Migration für bestehendes Schema, frisches Setup konsistent, alte SQL-Hilfsdateien dürfen Regeln nicht wieder aufweichen. Deployment-Reihenfolge und manuelle Prüfungen dokumentieren. Vorhandene Daten nicht destruktiv bereinigen.
- [ ] Regressionstests: Insbesondere Rechte-Eskalation, letzte freie Plätze, geschlossene/private Runde, entfernter Teilnehmer, Transaktionsrollback, doppelte Check-ins, Hostbestätigung und Live-/Fehlerverhalten. Echte lokale Postgres-Tests bevorzugen, sofern Runtime verfügbar; fehlende Integrationsprüfung klar benennen, reine SQL-Texttests sind kein Sicherheitsnachweis.
- [ ] Verifikation: Vitest, ESLint, Next-Produktionsbuild. Drei bestehende Lintfehler in offline/page.tsx, BoardView.tsx und ThemeToggle.tsx klein beheben, damit Gesamtprüfung grün wird. Keine sonstigen Aufräumarbeiten.

## Relevante Dateien

`supabase/schema.sql`, `supabase/host-rls.sql`, `supabase/admin-rls.sql`, neue Migration und DB-Tests; `lib/db/rounds.ts`, `participants.ts`, `profiles.ts`; `lib/hooks/useRounds.ts`, `useHostActions.ts`, `useRealtimeRound.ts`, `useActivity.ts`; `lib/trust.ts` + Tests; `components/HomeView.tsx`; EventDetailView, CreateRoundWizard und BoardView in `app/`.

## Ausgangslage

Basis-Commit: 1e14e69. 16 Unit-Tests bestanden, Produktionsbuild bestanden, ESLint drei Fehler. SQL-Sicherheit bisher nur im Repository geprüft, entfernte Supabase-Konfiguration unbekannt.

## Abnahme

Diff auf die sechs Anforderungen prüfen; Testergebnisse und Grenzen dokumentieren. Bericht in `docs/superpowers/plans/2026-09-06-mvp-hardening-report.md` mit geänderten Dateien, Entscheidungen, ausgeführten Tests und offenen Punkten. Keine unbelegten Aussagen über Live-Datenbank oder Browser-E2E.
