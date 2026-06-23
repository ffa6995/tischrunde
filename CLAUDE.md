# CLAUDE.md — Tischrunde

> Kontext- & Konventionsdatei für Claude Code. Lies dies zuerst. Vollständige Produkt-Spec: `tischrunde_konzept.md`. Visuelle Referenz: `tischrunde-mockup.html`. Design-Tokens: `design-tokens.css`. DB: `schema.sql`.

## 1. Was ist Tischrunde
Hyperlokale Community-App fürs Dreiländereck (Vorarlberg/Ostschweiz/DACH/FL) für Tabletop, TCG & Jassen. **MVP = Event-Companion / „digitaler Tischplan":** Bei einem echten Spieleevent offene Runden sehen, beitreten oder selbst eröffnen — plus eine Profilkarte, die aus echten Treffen langsam zur Community-Identität wird.

**Leitsatz:** Nicht „das Meetup für Brettspiele", sondern der magische digitale Tischplan für den nächsten Spieleabend. Erst lokale Dichte bei *einem* Event beweisen, dann ausbauen.

## 2. Goldene Regeln (immer einhalten)
1. **MVP schützen.** Nichts aus dem „Später"-Backlog bauen, solange der Walking Skeleton (§5) nicht steht. Backlog siehe `tischrunde_konzept.md` §19/§21.
2. **UI ≠ Datenlogik.** Supabase-Zugriffe nur in `lib/db/*` (reine TS-Funktionen) + `lib/hooks/*` (TanStack Query). Komponenten bleiben rein (Props rein, Events raus), damit ein späterer React-Native-Wechsel möglich bleibt.
3. **Keine magischen Farben/Größen.** Alles über Tokens aus `design-tokens.css` / Tailwind-Theme. Status & Skill nie nur über Farbe (auch Text/Icon).
4. **Trust = positive Signal-Chips, kein numerischer Score** (im MVP). Beispiel: „war 5× dabei", „Host", „bringt Spiele mit".
5. **Accessibility ist Pflicht:** Icon-Buttons mit `aria-label`, freie Slots sind echte `<button>`, sichtbarer Fokus, Tap-Ziel ≥44px, `prefers-reduced-motion` respektieren (Foil/Mythic), Slot-Status für Screenreader.
6. **RLS von Anfang an** (siehe `schema.sql`). Private Runden/Locations/Adressen nie öffentlich lesbar.
7. **Animation sparsam & gezielt** (Framer Motion). Priorität: Foil-Karte, Slot-Einrasten, Erfolg, Stat-Zähler.

## 3. Tech-Stack
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui (stark gebrandet) + Framer Motion
- **Backend:** Supabase (Postgres + Auth + Realtime + Storage + Edge Functions)
- **Server-State:** TanStack Query · **UI-State:** React State/Context (kein Redux; Zustand nur bei echtem Bedarf)
- **Hosting:** Vercel + Supabase · **Auth:** Supabase Auth (Discord-OAuth + Magic-Link + anonyme Gast-Identität)
- **Mobile:** zuerst **PWA**. Native (Expo/RN+Skia) später, nicht jetzt. Backend bleibt frontend-agnostisch.

## 4. Setup (einmalig)
```bash
npx create-next-app@latest tischrunde --typescript --tailwind --app --eslint
cd tischrunde
npm i @supabase/supabase-js @supabase/ssr @tanstack/react-query framer-motion lucide-react clsx tailwind-variants
npx shadcn@latest init
# Supabase-Projekt anlegen (supabase.com) → schema.sql im SQL-Editor ausführen
# .env.local:
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# design-tokens.css in app/globals.css importieren; Tailwind-Theme aus den CSS-Variablen mappen (Snippet unten in design-tokens.css)
```

## 5. Walking Skeleton (ZUERST bauen — vertikaler Schnitt durch alle Schichten)
Ziel: **Der eine magische Pfad** für *ein* echtes Event, live deploybar. Admin am Anfang = du editierst im Supabase-Dashboard.

> Event-Link öffnen → offene Runden sehen → einer beitreten (Skill wählen) → sich selbst im Spielfeld-Slot sehen → eigene Profilkarte (light).

**Reihenfolge:**
1. **Scaffold + Tokens** (Setup oben), Supabase-Client (`lib/supabase/`), QueryClient-Provider, Light/Dark via `data-theme`.
2. **DB + Seed:** `schema.sql` ausführen; 1 Event, ~6 Spiele, 3–4 Runden, ein paar Teilnehmer seeden (Seed-Block am Ende von `schema.sql`).
3. **Auth light:** Magic-Link **oder** anonymer Gast-User; Anzeigename setzen. Profil-Claim später.
4. **Event-Detail** `app/e/[eventId]/page.tsx` (öffentlich, teilbar): Event-Infos + Liste offener Runden (`RoundRow`) + „Neue Runde".
5. **Spielfeld** `app/r/[searchId]/page.tsx`: `Board` + `Seat`s (gefüllt/leer), Beitreten-Flow (Skill-Auswahl + „Ich bringe das Spiel mit"), Realtime-Update der Slots.
6. **Runde erstellen** (3-Schritt-Wizard light): Spiel (Autofill aus `games`) → Spielerzahl/Skill/`game_source` → Sichtbarkeit.
7. **Profil** `app/me/page.tsx`: `TradingCard` (light) mit Signal-Chips (keine Score-Zahl).
8. **Share/QR:** teilbare Links + QR fürs Event (z. B. `qrcode.react`).
9. **Deploy auf Vercel**, an *einem* echten Event mit QR-Plakat testen (Seeding-Playbook: `tischrunde_konzept.md` §20.5).

Erst wenn dieser Pfad rund läuft → restliche Release-1-Politur (siehe Konzept §15) und Release 2.

## 6. Ordnerstruktur (Richtwert)
```
app/
  e/[eventId]/page.tsx        # Event-Detail (öffentlich/teilbar)
  r/[searchId]/page.tsx       # Spielfeld / Runde
  me/page.tsx                 # Profil-Trading-Card
  admin/                      # später; Minimal-Moderation
  globals.css                 # importiert design-tokens.css
components/
  ui/                         # Button, IconButton, Pill, SegmentedControl, Stepper, TextField, EmptyState
  EventCard.tsx  RoundRow.tsx  Board.tsx  Seat.tsx  TradingCard.tsx  ProfileBadge.tsx  ShareCard.tsx  QRCodeBlock.tsx
lib/
  supabase/                   # Client (browser/server)
  db/                         # reine Query-/Mutation-Funktionen (events.ts, rounds.ts, participants.ts, games.ts)
  hooks/                      # TanStack-Query-Hooks (useEvent, useRounds, useJoinRound, ...)
  types.ts                    # aus DB abgeleitete Typen
  adapters/                   # Navigation/Storage/Push/Kamera hinter Interfaces (Portabilität)
```
Komponenten-Varianten via `tailwind-variants` (CVA-Pattern). Storybook/Ladle optional später.

## 7. Datenmodell (Kurzfassung — Details: `schema.sql`)
Kern-Tabellen MVP: `profiles · games · events · game_searches · participants` (+ `locations`, `location_games` ab Release 2). Trust/Stats werden **nicht** hart gespeichert, sondern aus `activity_events` abgeleitet (von Anfang an mitschreiben: `round_joined`, `checked_in`, `game_brought`, `host_confirmed` …). Wichtige Enums siehe Spaltenkommentare in `schema.sql`.

## 8. Design-Direktion (Details: `design-tokens.css` + Mockup)
Verspielt, aber **crafted — nicht kindlich.** Warme, erdige Brettspielwelt: Grün/Holz/Terrakotta/Gold auf Parchment (hell) bzw. dunklem Holz (dunkel), taktile „Stack"-Schatten, Meeple-Motive. Display = **Fraunces**, UI = **Nunito Sans**. **Signature:** Profil als Trading-Card (Foil später). **Spielfeld = ein Layout, austauschbare Themes je Spielkategorie** (standard/catan/jassen/tcg). Emojis nur Platzhalter → später eigene SVG-Kategorie-Icons. Responsive: Phone (1 Spalte, Bottom-Nav) → Tablet (2-spaltig) → Desktop (zentriert ~1100px, Sidebar-Nav, Detail zweispaltig).

## 9. Bewusst NICHT im MVP
Komplexer Trust-Score · Chat · TCG-Tausch · Turniere/Ligen · Leaderboards · Seasons · Skill-Trees · AR-Karten · BGG/Cardmarket-Import · Venue-Abos · Event-Aggregation · vollständiges Match-Ergebnis-System · volle Karten-Evolution. → Backlog (Konzept §19/§21), nichts davon ohne ausdrücklichen Auftrag bauen.

## 10. Definition of Done (pro Feature)
Typisiert · reine Komponente · Tokens statt Hardcoding · responsive (Phone/Tablet/Desktop) · a11y (Fokus/aria/Kontrast/reduced-motion) · RLS greift · Daten-Hook getrennt von UI · funktioniert mit Gast-Identität.
