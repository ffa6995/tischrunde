# Tischrunde - aktualisiertes Produkt- und Designkonzept

**Stand:** 21. Juni 2026  
**Arbeitsname:** Tischrunde  
**Produktkategorie:** Hyperlokale Community-Plattform für Tabletop, TCG, Jassen und später weitere lokale Gruppenaktivitäten  
**Regionale Startfläche:** Vorarlberg / Ostschweiz / DACH + Liechtenstein  
**Strategische Leitentscheidung:** Erst Event-Companion und lokaler Runden-Finder, später Plattform.

> **Kanonische Spec.** Dieses Dokument ist die maßgebliche Tischrunde-Spezifikation (löst frühere verstreute Notizen ab).
> **Aktualisierung 21.6.2026:** (1) Profilkarte zeigt im MVP Trust als positive **Signal-Chips**, keinen numerischen Score; (2) **QR-Check-in Light** ins MVP gezogen (Schwungrad für Stats/Retention); (3) **provisorische Gast-Identität** beim Beitritt definiert (§8.3); (4) **Erstes-Event-Seeding-Playbook** ergänzt (§20.5). Begleitende Bau-Dateien: `CLAUDE.md`, `schema.sql`, `design-tokens.css`.

---

## 1. Kurzfazit

Tischrunde hat einen sehr starken Kern: **lokale Spielrunden sichtbar machen, Vertrauen herstellen und aus echten Treffen eine spielerische Community-Identität bauen**.

Die größte Stärke ist nicht, dass Tischrunde eine weitere Event- oder Meetup-App sein könnte. Die Stärke ist die Kombination aus:

- lokaler Dichte im Dreiländereck,
- echtem Offline-Nutzen bei Spieleabenden,
- Runden mit klaren Plätzen und Rollen,
- Vertrauen durch konkrete Verhalten-Signale,
- Profil als sammelbare Trading-Card,
- verspielter, aber hochwertiger Design-Sprache.

Die wichtigste Schärfung: **Das MVP darf nicht versuchen, direkt die komplette Plattform zu sein.**  
Tischrunde sollte zuerst beweisen, dass Menschen bei realen Events darüber Runden finden, erstellen, beitreten und danach wiederkommen.

> **Neue Produktthese:**  
> Tischrunde ist zuerst der digitale Tischplan für lokale Spieleevents: Wer ist da, was wird gespielt, wo ist noch Platz, wem kann ich beitreten?

Alle größeren Ideen wie Trust-Score, TCG-Tausch, Seasons, Leaderboards, AR-Karten, Venue-Abos oder Event-Aggregation bleiben erhalten, werden aber **nicht** in das erste MVP gepackt.

---

## 2. Aktualisierte Positionierung

### 2.1 Vision

Tischrunde wird zur Heimat für lokale Spiel- und später Sport-/Freizeitrunden im Dreiländereck - angefangen beim Spieltisch.

Die Plattform verbindet:

- Entdeckung von Events,
- Mitspielersuche pro Spiel,
- Locations und Venues,
- verlässliche Teilnahme,
- lokale In-Person-Community,
- spielerische Profil-Identität,
- Trust und Reputation,
- später Tausch, Turniere, Ligen und weitere Verticals.

### 2.2 Startpositionierung

Zum Start ist Tischrunde **keine generische Meetup-Plattform**.

Besser:

> **Tischrunde hilft dir beim nächsten Spieleabend, sofort eine passende Runde zu finden oder selbst eine zu eröffnen.**

Das ist konkreter, testbarer und emotionaler.

### 2.3 Warum die Lücke real ist

Bestehende Alternativen sind meistens entweder:

- global/generisch,
- zu wenig lokal,
- visuell/technisch veraltet,
- reine Privatgruppen-Tools,
- auf einzelne Spiele fokussiert,
- reine Versand-/Marktplatzsysteme,
- oder nicht auf echtes In-Person-Vertrauen ausgelegt.

Tischrunde sollte diese Lücke nicht durch maximale Feature-Menge schließen, sondern durch **regionale Dichte + Event-Nähe + Vertrauensmechanik + starke Identität**.

### 2.4 Differenzierung

Die Differenzierung entsteht durch fünf Dinge:

1. **Hyperlokalität**  
   Erst eine Region wirklich dicht machen, statt zu früh DACH-weit zu denken.

2. **Event-Beachhead**  
   Das eigene oder ein erstes Partner-Event bringt sofort Nutzer, echte Runden und Feedback.

3. **Runden als Spielfeld**  
   Die Mitspielersuche ist nicht nur eine Liste, sondern ein sichtbarer Tisch mit Slots.

4. **Profil als Trading-Card**  
   Identität, Trust, Gamification und Sammelgefühl werden in einem Produktmotiv gebündelt.

5. **Trust durch Verhalten statt harte Bewertung**  
   Nicht: "User hat 4,7 Sterne".  
   Sondern: "War 8-mal dabei", "bringt Spiele mit", "erklärt gerne", "Host empfiehlt".

---

## 3. Produktprinzipien

### 3.1 Erst Nutzen, dann Plattform

Das erste Produkt muss in einer konkreten Situation funktionieren:

> Ich bin bei einem Spieleevent, will wissen was läuft, sehe offene Runden und kann beitreten.

Alles, was diesen Moment nicht verbessert, gehört nicht in das MVP.

### 3.2 Lokale Dichte vor Breite

Eine kleine Region ist kein Nachteil, sondern der größte Vorteil. Bei Community-Produkten ist lokale Aktivität wichtiger als theoretische Skalierbarkeit.

Start:

1. ein Event,
2. eine Venue,
3. wenige Spielkategorien,
4. echte Nutzer,
5. wiederkehrende Nutzung.

Erst danach ausweiten.

### 3.3 Trust als positives Signal

Trust darf nicht toxisch oder sozial kalt werden. Keine aggressive Bewertungskultur, keine öffentliche Bloßstellung, keine Ellbogen-Rankings.

Besser:

- Anwesenheit bestätigt,
- Runden gehostet,
- Spiele mitgebracht,
- Anfänger angeleitet,
- von anderen respektiert,
- verifiziert,
- zuverlässig erschienen.

### 3.4 Gamification belohnt echtes Verhalten

Belohnt wird nicht Scrollen, Klicken oder Grind, sondern echtes Community-Verhalten:

- erscheinen,
- spielen,
- mitbringen,
- erklären,
- bestätigen,
- neue Leute integrieren,
- lokale Events besuchen.

### 3.5 Crafted, nicht kindlich

Das Produkt darf verspielt sein, aber nicht nach Kinder-App aussehen. Die visuelle Welt soll hochwertig, warm, haptisch und ein bisschen nerdig-stolz wirken.

---

## 4. Aktualisierter MVP-Fokus

### 4.1 MVP-These

> Bei lokalen Spieleevents hilft Tischrunde, schneller passende Mitspieler zu finden und nach dem Treffen eine sichtbare Community-Identität aufzubauen.

### 4.2 MVP-Ziel

Das MVP soll nicht beweisen, dass Tischrunde irgendwann eine riesige Plattform sein kann. Es soll beweisen:

- Leute öffnen die App beim Event.
- Leute finden offene Runden.
- Leute treten Runden bei.
- Hosts erstellen Runden.
- Teilnehmer erscheinen wirklich.
- Nutzer verstehen und mögen die Profilkarte.
- Nutzer kommen beim nächsten Event wieder.

### 4.3 MVP-Kernumfang

#### Muss ins MVP

1. **Eventliste**  
   Manuell gepflegte Events, zuerst wenige und kuratierte Events.

2. **Eventdetail**  
   Details, Uhrzeit, Ort, Links, offene Runden, CTA "Runde eröffnen".

3. **Offene Runden pro Event**  
   Jede Runde hat Spiel, Spielerzahl, freie Plätze, Skill-Erwartung, Host und Status.

4. **Runde erstellen**  
   Minimaler Flow:
   - Event/Location ist vorausgewählt,
   - Spiel wählen oder neu eintragen,
   - Spielerzahl,
   - Skill-/Lernstatus,
   - Spiel vorhanden / muss jemand mitbringen,
   - Sichtbarkeit.

5. **Runde beitreten**  
   Nutzer wählt Skill-Level und optional "Ich bringe das Spiel mit".

6. **Spielfeld-/Slot-Ansicht**  
   Runde als Tisch mit Host, Spielern und offenen Plätzen.

7. **Profil als Trading-Card, aber light**  
   Optisch stark, aber Stats/Trust anfangs bewusst simpel oder Platzhalter.

8. **Auth / Gastmodus**  
   Registrierung darf nicht bremsen. Gastmodus oder sehr schneller Login ist wichtig.

9. **Admin-Basis**  
   Events anlegen, Runden schließen, User/Runden moderieren, Locations freigeben.

10. **Share-Link / QR-Link**  
   Runde und Event müssen einfach per WhatsApp, Discord, Instagram oder QR teilbar sein.

#### Optional im MVP, falls einfach

- **QR-Check-in (Light) — empfohlen fürs MVP.** „War dabei"-Bestätigung pro Runde/Event. Begründung: Es ist das **Schwungrad** des Produkts — die einzige Brücke zwischen „online beigetreten" und „echt erschienen". Speist `activity_events` → erste Stats → Karten-Identität → Retention-Messung. Ohne Anwesenheits-Wahrheit hat die Profilkarte nichts, woraus sie wächst. Höchster Hebel unter den optionalen Punkten → wenn irgend machbar, rein.
- erste Badge: "Erste Runde", "Host", "Spiel mitgebracht".
- einfache Event-Stamps.

#### Nicht ins MVP

- komplexer Trust-Score,
- TCG-Tausch-Matching,
- Chat pro Runde,
- Turnier-/Liga-System,
- Leaderboards,
- Seasons,
- Skill-Trees,
- AR-Karten,
- Cardmarket-/BGG-Import,
- Venue-Abos,
- Event-Aggregation,
- vollständiges Match-Ergebnis-System.

Diese Ideen bleiben im Backlog, werden aber nicht für den ersten Release versprochen.

---

## 5. MVP-User-Flows

### 5.1 Eventbesucher

1. Nutzer scannt QR-Code am Event oder bekommt Link.
2. Eventdetail öffnet sich.
3. Nutzer sieht offene Runden.
4. Nutzer wählt eine Runde.
5. Nutzer sieht freie Plätze und Skill-Erwartung.
6. Nutzer tritt bei.
7. Optional: Nutzer gibt an, ob er das Spiel mitbringt.
8. Vor Ort bestätigt der Tisch-Code oder Host die Anwesenheit.
9. Nach dem Event sieht der Nutzer seine Profilkarte / ersten Stamp.

### 5.2 Host

1. Host öffnet Eventdetail.
2. Host klickt "Neue Runde".
3. Host wählt Spiel.
4. Host legt Spielerzahl und Erwartung fest.
5. Host entscheidet, ob das Spiel vor Ort ist oder jemand es mitbringen soll.
6. Runde wird sichtbar.
7. Teilnehmer treten bei.
8. Host kann Teilnehmer bestätigen/entfernen.
9. Runde wird bei Start/voll als aktiv markiert.

### 5.3 Admin/Event-Orga

1. Admin legt Event an.
2. Admin pflegt grobe Location und Links.
3. Admin sieht offene Runden.
4. Admin kann problematische Runden schließen.
5. Admin kann Dubletten/Spam entfernen.
6. Admin kann nach dem Event erste Metriken sehen.

---

## 6. MVP-Screens

### 6.1 Events-Liste

Ziel: schnell zeigen, was als Nächstes passiert.

Inhalt:

- Eventkarte,
- Datum/Uhrzeit,
- Location,
- offene Runden,
- kurzer Teaser,
- CTA.

### 6.2 Event-Detail

Ziel: zentrale Landingpage für ein reales Event.

Inhalt:

- Eventinformationen,
- Website/Instagram/Discord-Link,
- offene Runden,
- Button "Neue Runde",
- Hinweise für neue Spieler.

### 6.3 Rundenliste

Ziel: Nutzer versteht sofort, wo noch Platz ist.

Inhalt:

- Spiel,
- freie Plätze,
- Skill-Erwartung,
- Host,
- "Spiel vorhanden" / "Spiel gesucht" / "bringt jemand mit",
- Status offen/voll.

### 6.4 Runde-erstellen-Wizard

Ziel: Host kann ohne Nachdenken eine Runde erstellen.

Schritte:

1. Wo wird gespielt?
2. Was wird gespielt?
3. Wie wird gespielt?

Wichtig: Der Flow darf nicht zu administrativ wirken. Eine Runde zu eröffnen soll sich leicht anfühlen.

### 6.5 Spielfeld-Ansicht

Ziel: Der Kernmoment.

Inhalt:

- Tisch/Board,
- Slots,
- Host,
- Spieler,
- freie Plätze,
- Join-CTA,
- Skill-Hinweis,
- Bring-Hinweis,
- Share/QR.

### 6.6 Profil-Trading-Card

Ziel: emotionale Bindung.

Im MVP:

- Avatar,
- Name,
- Rolle,
- erste Stats,
- **Trust als positive Signal-Chips** (z. B. „war 5× dabei", „Host", „bringt Spiele mit") — **kein numerischer Score** im MVP,
- erste Badges,
- Lieblingsspiele,
- Hinweis: Stats wachsen später automatisch aus echten Runden.

> Hinweis: Das bestehende `tischrunde-mockup.html` zeigt noch einen numerischen „4,9 Trust-Score" — der ist beim Bau durch Signal-Chips zu ersetzen (konsistent mit §9.1).

Noch nicht im MVP:

- komplexe Karten-Evolution,
- Mythic-Animationen,
- umfangreiche Trust-Berechnung,
- sammelbare Skins.

---

## 7. Datenmodell - aktualisiert und MVP-fähig

Das ursprüngliche Zielmodell ist gut, sollte aber in zwei Ebenen gedacht werden:

1. **Datenmodell von Anfang an anbaubar halten.**
2. **Nur wenige Teile im MVP wirklich sichtbar machen.**

### 7.1 Kern-Tabellen für MVP

```sql
profiles
  id
  display_name
  avatar_url
  role                  -- guest | player | verified | owner | moderator | admin
  verification_status   -- none | email | phone | trusted | venue_verified
  created_at
  updated_at

locations
  id
  name
  type                  -- venue | event_host | home | shop
  address_public        -- nur für öffentliche Venues
  region_label          -- grobe Region für private Orte
  geo                   -- optional
  socials jsonb
  website
  owner_id
  claimed_by
  status                -- private | pending | public | archived
  is_verified
  created_at
  updated_at

games
  id
  name
  min_players
  max_players
  theme                 -- standard | catan | jassen | tcg | party | other
  image_url
  bgg_id
  created_by
  status                -- draft | approved | rejected
  created_at
  updated_at

location_games
  location_id
  game_id
  status                -- available | maybe | archived
  created_at
  UNIQUE(location_id, game_id)

events
  id
  title
  starts_at
  ends_at
  location_id
  description
  host_id
  event_url
  socials jsonb
  visibility            -- public | private | unlisted
  status                -- draft | published | cancelled | archived
  created_at
  updated_at

game_searches
  id
  event_id
  location_id
  game_id
  creator_id
  title
  seats_total
  visibility            -- public | invite | unlisted
  join_mode             -- open | approval
  game_source           -- on_site | needed | brought_by_player | host_brings
  beginner_friendly bool
  desired_level         -- any | beginner | advanced | learning | tournament_like
  status                -- open | full | active | closed | cancelled
  created_at
  updated_at

participants
  id
  search_id
  user_id
  joined_at
  role                  -- host | player
  skill_level           -- beginner | advanced | learning | teaches | any
  brings_game bool
  status                -- requested | joined | confirmed | removed | left | no_show
  UNIQUE(search_id, user_id)
```

### 7.2 Event-Log für späteren Trust

Trust und Stats sollten nicht hart als Zahl gepflegt werden. Besser ist ein Event-Log, aus dem später Stats, Badges und Kartenentwicklung abgeleitet werden.

```sql
activity_events
  id
  user_id
  type                  -- round_created | round_joined | checked_in | host_confirmed | game_brought | respect_given | no_show_reported | match_confirmed
  source_type           -- event | game_search | match | profile | location
  source_id
  metadata jsonb
  created_by
  created_at
```

Vorteile:

- nachvollziehbar,
- manipulationsärmer,
- flexibel für neue Badges,
- später gut für Analytics,
- kein frühes Festlegen auf einen fragwürdigen Trust-Algorithmus.

### 7.3 Geschützte Adressen

Die ursprüngliche Idee, private Adressen nicht dauerhaft als Klartext zu speichern, ist richtig. Praktisch sollte sie aber technisch sauber und ehrlich formuliert werden.

Empfehlung:

- Private Adresse verschlüsselt speichern, nicht als Klartext.
- Exakte Adresse erst nach Host-Freigabe und nur für bestätigte Teilnehmer freigeben.
- Vorher nur grobe Region zeigen.
- Zugriff auf Adresse loggen.
- Adresse nach Event optional löschen oder weiter verschlüsselt archivieren.
- Nach aussen ehrlich formulieren:  
  "Die genaue Adresse wird nur an bestätigte Teilnehmer freigegeben und nicht öffentlich angezeigt."

Optional später:

- Client-side Encryption,
- einmalige Adresse-Auslieferung per Edge Function,
- nur Treffpunkt-Pin statt exakter Adresse,
- exakte Adresse über Runden-Chat.

---

## 8. Rollen und Verifizierung

### 8.1 Rollen

#### Gast

Kann:

- Events ansehen,
- Runden ansehen,
- ggf. schnell beitreten,
- später Profil claimen.

#### Spieler

Kann:

- Runden beitreten,
- private Runden erstellen,
- Profil pflegen,
- Spiel mitbringen markieren.

#### Verifizierter Nutzer

Kann:

- öffentliche Runden eröffnen,
- Locations vorschlagen,
- mehr Vertrauen anzeigen,
- ggf. andere Nutzer bürgen.

#### Location-Owner / Venue

Kann später:

- Location beanspruchen,
- Bestand pflegen,
- Events eintragen,
- Öffnungszeiten und Links verwalten,
- später Premium-Funktionen nutzen.

#### Moderator/Admin

Kann:

- Events pflegen,
- Locations freigeben,
- Dubletten mergen,
- User/Runden moderieren,
- Reports bearbeiten,
- problematische Inhalte sperren.

### 8.2 Verifizierungsstufen

Start simpel:

1. E-Mail oder OAuth,
2. Telefon optional,
3. manuelle Verifizierung für Hosts/Venues,
4. später Web-of-Trust durch bestehende verifizierte Nutzer.

Nicht zu früh überkomplizieren. Verifizierung ist wichtig, aber sie darf den Start nicht bremsen.

### 8.3 Gast-Identität (Spannung Reibung ↔ Identität)

„Reibungsloser Gastmodus" und „Profilkarte/Trust/No-Show" ziehen gegeneinander: Ein Sitzplatz bedeutet nur etwas, wenn dahinter eine — wenn auch leichte — Identität steht.

Lösung: **provisorische Identität beim Beitritt, Profil später claimbar.**

- Beitritt verlangt nur einen Anzeigenamen + eine leichtgewichtige Identität: **Magic-Link (E-Mail)** oder **geräte-/cookiebasierter anonymer Supabase-Auth-User**.
- Diese provisorische Identität trägt sofort Sitzplatz, Skill-Angabe und (später) Check-in/Stats.
- **Claim später:** Der Gast kann sein Profil jederzeit über Magic-Link/OAuth (Discord) „übernehmen" — Aktivität/Stats wandern mit.
- So bleibt der Einstieg leicht, aber die Karte kann sich **von der ersten Runde an füllen**, und No-Show/Trust-Signale sind zuordenbar.
- RLS-Konsequenz: Ein provisorischer User darf nur den eigenen Participant-Eintrag/Status sehen und claimen, nichts Fremdes.

---

## 9. Trust- und Fairness-System

### 9.1 Wichtigste Entscheidung

Im MVP kein harter numerischer Trust-Score im Vordergrund.

Stattdessen positive, konkrete Signale:

- "War schon 5-mal dabei",
- "Hat 3 Runden gehostet",
- "Bringt Spiele mit",
- "Erklärt gerne",
- "Bestätigt erschienen",
- "Von Hosts empfohlen",
- "Venue-verifiziert".

### 9.2 Warum kein früher Score?

Ein einzelner Score kann:

- sozial kalt wirken,
- neue Nutzer abschrecken,
- Gruppendruck erzeugen,
- Missbrauch/Drama erzeugen,
- falsche Genauigkeit suggerieren.

Tischrunde sollte eher wie Community wirken, nicht wie Uber für Freundschaften.

### 9.3 Kick- und Moderationsprinzipien

- Kick immer respektvoll.
- Vordefinierte Gründe statt Freitext-Bashing.
- Kein automatischer Trust-Abzug für entfernte Teilnehmer.
- Hosts können Teilnehmer entfernen, aber keine öffentliche Bloßstellung.
- No-Show oder problematisches Verhalten nur über bestätigte Signale/Moderation.

### 9.4 Anfängerfreundlichkeit

Beim Erstellen einer Runde sollten Hosts klar signalisieren können:

- "Anfänger willkommen",
- "Ich erkläre gerne",
- "Regeln sollten bekannt sein",
- "Würde selbst gern lernen",
- "Turniernah / ernst".

Das reduziert Konflikte, bevor sie entstehen.

---

## 10. Gamification - aktualisierte Einordnung

### 10.1 Gute Gamification für Tischrunde

Gamification ist stark, wenn sie echtes Verhalten sichtbar macht:

- Check-ins,
- Event-Stamps,
- Mentor-Badges,
- Spiel-mitgebracht-Badges,
- Profilkarte entwickelt sich langsam,
- Shared Moments nach Runden,
- freundliche Quests.

### 10.2 Schlechte oder riskante Gamification

Vorsicht bei:

- zu frühen Leaderboards,
- Grind-Mechaniken,
- Wettbewerb nur nach Siegen,
- Statusdruck,
- Pay-to-look-cool,
- zu viel Animation vor echtem Nutzen.

### 10.3 Empfohlene Reihenfolge

#### MVP / Release 1

- Profilkarte als visuelles Herzstück.
- Erste sichtbare Stats.
- Erste Badges/Stamps, falls leicht.
- Noch keine komplexe Karten-Evolution.

#### Release 2

- QR-Check-in.
- Event-/Location-Stamps.
- Mentor-Signal.
- "Respect geben" nach einer Runde.
- einfache Aktivitäts-Badges.

#### Release 3

- Karten-Evolution Holz -> Silber -> Gold -> Foil -> Mythic.
- Quests/Challenges.
- Game-History.
- Match-Recaps.
- Gruppenbestätigung für Ergebnisse.

#### Später

- Seasons,
- regionale Titel,
- Leaderboards,
- Hall of Fame,
- Gilden/Stammtische,
- AR-Trading-Card,
- Profilkarten-Tausch.

---

## 11. Signature-Features

### 11.1 Profil als Trading-Card

Die Profilkarte bleibt das Herzstück.

Sie verbindet:

- Avatar,
- Name,
- Titel/Rolle,
- Lieblingsspiele,
- Aktivität,
- Trust-Signale,
- Badges,
- Sammelgefühl,
- spätere Evolution.

Wichtig: Im MVP stark visualisieren, aber nicht zu viel versprechen.

### 11.2 Spielfeld mit Slots

Die Runde als Spielfeld ist das zentrale Interaktionsmuster.

Statt einer trockenen Teilnehmerliste sieht man:

- Tisch,
- freie Plätze,
- Host,
- Spieler,
- offene Slots,
- Spielstatus.

Das passt perfekt zur Marke und ist ein echter Differenzierer.

### 11.3 Bring-Mechanik

Die Idee "Ich bringe das Spiel mit" ist sehr stark und sollte früh rein.

Erweiterung später:

- "Wer kann das Spiel mitbringen?"
- Teilnehmer können Bring-Angebot abgeben.
- Host bestätigt, wer es mitbringt.
- Spielbestand von Locations wird dadurch weniger hart.

### 11.4 Tisch-Code / QR-Check-in

Ein QR-Code pro Runde oder Event verbindet physische und digitale Welt.

Nutzen:

- Anwesenheit bestätigen,
- Stats speisen,
- Trust aufbauen,
- Profilkarte aktualisieren,
- Match-Recap starten,
- neue Leute mit Profil verbinden.

Empfehlung: QR-Check-in als kleines, aber sehr wirkungsvolles Release-2-Feature planen. Wenn es technisch leicht ist, kann eine Light-Version schon ins MVP.

---

## 12. Design-System - Bewertung und Aktualisierung

### 12.1 Gesamtbewertung

Das Design-System ist stark und passt sehr gut zum Produkt.

Stärken:

- eigenständige visuelle Identität,
- klare Farbwelt,
- Light- und Dark-Mode,
- Fraunces + Nunito Sans funktionieren gut,
- Stack-Schatten passen zur Brettspiel-Haptik,
- Trading-Card ist als Signature-Komponente richtig priorisiert,
- Spielfeld-Themes als Skins sind skalierbar,
- responsive Regeln sind bedacht,
- mobile-first passt zur Event-Situation.

### 12.2 Visuelle Richtung

Die Richtung bleibt:

> Verspielt, aber crafted - nicht kindlich.

Kernmotive:

- Brettspiel-Grün,
- Holz/Karamell,
- Terrakotta,
- Gold,
- warme Parchment-Surfaces,
- Filz-/Holz-Texturen,
- Meeple,
- Sammelkarten-Anmutung,
- taktile UI mit Stack-Schatten.

### 12.3 Design-Tokens

Die bestehenden Tokens sind gut und sollten als Grundlage bleiben.

#### Light Mode

- `bg #EADBBE`
- `surface #FBF4E6`
- `ink #2C2018`
- `line #D8C39E`

#### Dark Mode

- `bg #191310`
- `surface #2B2018`
- `ink #F3E8D5`
- `line #43331F`

#### Akzente

- `green #2F7D4F / deep #1E6340`
- `wood #A86B33 / deep #6E4322`
- `terracotta #C8553D`
- `gold #E0A82E`

### 12.4 Verbesserung: Tokens produktionsreifer machen

Für den echten Code sollten Tokens nicht nur visuell existieren, sondern als saubere technische Grundlage:

- CSS Variables als Source of Truth,
- Tailwind Theme aus Tokens generieren,
- Komponentenvarianten typisieren,
- keine magischen Farben in Komponenten,
- Radius/Spacing/Shadows zentral,
- Motion-Tokens zentral,
- zusätzliche semantic tokens für Status und Skill.

Beispiele für fehlende/nützliche semantische Tokens:

```css
--status-open
--status-full
--status-requested
--status-confirmed
--skill-beginner
--skill-learning
--skill-advanced
--trust-verified
--trust-mentor
--danger-soft
--warning-soft
--success-soft
```

### 12.5 Verbesserung: Komponentenstruktur

Der Prototyp darf Inline-Styles und lokale Scaffolding-Klassen nutzen. Für die echte App besser:

- Komponenten in React/TypeScript,
- Styling über Tailwind + CSS Variables,
- Varianten mit CVA oder ähnlichem Pattern,
- reine Komponenten: Props rein, Events raus,
- keine Datenlogik in UI-Komponenten,
- Storybook oder Ladle für Komponentenreview,
- visuelle Regression später optional.

Empfohlene Komponentenbasis:

- `Button`
- `IconButton`
- `Pill`
- `SegmentedControl`
- `Stepper`
- `TextField`
- `EventCard`
- `RoundRow`
- `Seat`
- `Board`
- `TradingCard`
- `ProfileBadge`
- `ShareCard`
- `QRCodeBlock`
- `EmptyState`
- `AdminTable` später

### 12.6 Verbesserung: Accessibility

Das Design ist visuell stark. Deshalb muss Accessibility aktiv mitgedacht werden.

Wichtig:

- Kontraste für Gold/Terracotta prüfen,
- Skill/Status nie nur über Farbe kommunizieren,
- Icon-only Buttons immer mit `aria-label`,
- freie Slots als echte Buttons,
- sichtbarer Tastatur-Fokus,
- reduced-motion für Foil/Mythic,
- Mindest-Tap-Ziel 44px,
- Screenreader-Texte für Slot-Status,
- keine wichtigen Informationen nur im Hover.

### 12.7 Verbesserung: Emojis ersetzen

Emojis sind für Prototyping gut, aber langfristig nicht ideal.

Empfehlung:

- Eigene SVG-Kategorie-Icons für Spielarten,
- einheitlicher Illustrationsstil,
- Emojis nur als frühe Platzhalter,
- Kategorie-Icons statt per-game-Artwork.

Mögliche Kategorien:

- Standard/Meeple,
- Mittelalter/Hex,
- Jassen/Karten-Filz,
- TCG/Foil-Karte,
- Party/Würfel,
- Strategie/Krone,
- Koop/Hände,
- Casual/Sonne.

### 12.8 Verbesserung: Desktop- und Admin-Modus

Das aktuelle Design ist stark für Player Experience. Für Admins und Venues braucht es später eine ruhigere, produktivere Ebene.

Später benötigt:

- Venue-Dashboard,
- Event-Management,
- Spielebestand verwalten,
- Rundenübersicht,
- Check-in-Übersicht,
- Moderation,
- Reports,
- Location-Freigabe,
- Dubletten-Merge.

Diese Views dürfen weniger verspielt sein, sollten aber dieselben Tokens und denselben Markencharakter nutzen.

---

## 13. Technische Architektur

### 13.1 Empfohlener Start-Stack

Der empfohlene Stack bleibt:

- **Frontend:** Next.js App Router + TypeScript
- **Styling:** Tailwind + CSS Variables + shadcn/ui als Basis, aber stark gebrandet
- **Animation:** Framer Motion sparsam und gezielt
- **Backend:** Supabase Postgres + Auth + Storage + Realtime + Edge Functions
- **Server State:** TanStack Query
- **Hosting:** Vercel + Supabase
- **Auth:** Supabase Auth, Discord-OAuth sehr passend
- **State:** React State/Context für UI-State; Zustand nur bei echtem Bedarf

### 13.2 Warum PWA zuerst richtig ist

Eine PWA ist für den Start klar sinnvoller als direkt Expo/React Native.

Gründe:

- schnellerer MVP,
- eine Codebase,
- gute Shareability per Link/QR,
- Event-Kontext funktioniert im Browser sehr gut,
- kein App-Store-Friction,
- Backend bleibt später für Native verwendbar,
- Foil-/Card-Effekte sind auch im Web weit genug möglich.

### 13.3 Spätere Mobile-Entscheidung

#### PWA bleibt ausreichend, wenn:

- Nutzer vor allem über Event-Link/QR kommen,
- Animationen nicht das Hauptprodukt sind,
- kein App-Store-Zwang entsteht,
- Push nur begrenzt wichtig ist.

#### Capacitor ist sinnvoll, wenn:

- App-Store-Präsenz gewünscht ist,
- Web-UI reicht,
- native APIs punktuell gebraucht werden,
- eine Codebase wichtig bleibt.

#### Expo / React Native ist sinnvoll, wenn:

- die Profilkarte wirklich das taktile Produktherz wird,
- Animation, Skia/Foil, Push, Kamera und Native-Feel stark wichtig werden,
- wiederkehrende Power-User eine echte App erwarten.

Nicht jetzt entscheiden. Backend und Logik so bauen, dass der Wechsel später möglich bleibt.

### 13.4 Portabilitätsregeln

Von Anfang an:

- Datenzugriff in reine TypeScript-Schicht,
- Supabase Queries getrennt von UI,
- TanStack Query Hooks getrennt halten,
- Design Tokens zentral,
- Navigation/Storage/Push/Kamera hinter Adapter,
- UI-Komponenten möglichst rein,
- keine DOM-spezifische Logik in Business-Code.

Realistisch: RN würde später UI/Styling neu brauchen. Aber Typen, Queries, Mutations, Validierung und Produktlogik können bleiben.

---

## 14. Supabase- und Security-Empfehlungen

### 14.1 RLS von Anfang an

RLS ist bei Tischrunde kein Nice-to-have.

Wichtige Regeln:

- Private Runden nur für Teilnehmer/Einladungen sichtbar.
- Private Locations nur für Owner und berechtigte Teilnehmer.
- Home-Adressen nie direkt öffentlich lesbar.
- Pending-Locations nur für Creator/Admin sichtbar.
- Participants dürfen ihren eigenen Status nicht beliebig manipulieren.
- Nur Host/Admin darf Teilnehmer entfernen.
- Nur Admin darf öffentliche Locations endgültig freigeben.

### 14.2 Edge Functions

Sinnvolle Edge Functions:

- Adresse freigeben,
- Check-in verarbeiten,
- QR-Code validieren,
- Activity-Event schreiben,
- Trust/Stats neu berechnen,
- Share-Image generieren,
- Discord Webhooks später.

### 14.3 Admin nicht vergessen

Ein Community-Produkt ohne Admin-Panel wird schnell anstrengend.

Minimaler Admin-Bereich für Release 1:

- Events erstellen/bearbeiten,
- Runden anzeigen/schließen,
- User suchen,
- Locations pending/public setzen,
- problematische Inhalte entfernen,
- Teilnehmerstatus korrigieren.

Es muss nicht schön sein, aber es muss funktionieren.

---

## 15. Release-Plan

## Release 1 - Event Companion MVP

### Ziel

Bei einem echten Event Runden sichtbar machen und Beitritt ermöglichen.

### Features

- Events anzeigen,
- Eventdetail,
- offene Runden,
- Runde erstellen,
- Runde beitreten,
- Spielfeld mit Slots,
- Profilkarte light,
- Auth/Gastmodus,
- Share-Link/QR-Link,
- Admin-Basis.

### Design

- Design Tokens,
- Core Components,
- EventCard,
- RoundRow,
- Board/Seat,
- TradingCard Basis,
- responsive Phone/Tablet/Desktop.

### Nicht enthalten

- komplexer Trust,
- Chat,
- Tausch,
- Turniere,
- Leaderboards,
- Venue-Abos,
- AR,
- vollständige Karten-Evolution.

---

## Release 2 - Locations, Bestand und Trust Light

### Ziel

Tischrunde wird nützlicher für wiederkehrende Events und Venues.

### Features

- Locations,
- Location-Spielbestand,
- Runde-erstellen mit Autofill,
- Bring-Mechanik verbessern,
- private Heim-Locations,
- Adressschutz,
- QR-Check-in,
- Activity Events,
- erste Trust-Signale,
- Event-/Location-Stamps,
- Mentor-Signal.

### Design

- Location Cards,
- Check-in UI,
- erste Badge-Komponenten,
- TradingCard mit ersten echten Stats.

---

## Release 3 - Community, Moderation und Gamification

### Ziel

Aus Event-Nutzung entsteht wiederkehrende Community.

### Features

- Rollen/Verifizierung scharf schalten,
- Trust-Signale ausbauen,
- Kick/Fairness-System,
- Chat oder Discord-Integration pro Runde,
- Game-History,
- Match-Recap,
- Gruppenbestätigung für Ergebnisse,
- Respect/Signieren nach Runden,
- Karten-Evolution Holz/Silber/Gold/Foil/Mythic.

### Design

- Karten-Tiers,
- Shared Moment Templates,
- History Timeline,
- Moderationsansichten.

---

## Später - Plattformausbau

### Ideen bleiben erhalten, aber nicht im MVP

- TCG-Tausch-Matching,
- Have/Want lokal+sicher,
- Turnier-/Liga-Tools,
- regionale Rankings,
- Seasons,
- Hall of Fame,
- Stammtische/Gilden,
- Venue-Abos,
- Premium-Eintrag für Shops,
- Tischbuchung,
- Event-Promotion,
- Analytics für Venues,
- Shop-/Affiliate-Integration,
- Event-Ticketing-Cut,
- gesponserte Verlags-Events,
- BGG-Import,
- Cardmarket-Import,
- Eventkalender-Aggregation,
- AR-Trading-Card,
- Profilkarten-Tausch,
- weitere Verticals wie Gaming, Fussball, Volleyball.

---

## 16. Monetarisierung - aktualisierte Einordnung

Monetarisierung ist später relevant, aber nicht im ersten Fokus.

### 16.1 Grundprinzip

Spielerseite bleibt möglichst kostenlos, damit das Netzwerk wachsen kann.

### 16.2 Wahrscheinlich beste Monetarisierung

B2B-first:

- Venue-/Shop-Abos,
- Premium-Eintrag,
- Spielebestand pflegen,
- Tischbuchung,
- Event-Promotion,
- Analytics,
- wiederkehrende Eventtools.

### 16.3 Weitere Optionen

- Ticketing-Cut,
- Shop-/Affiliate-Integration,
- Verlags-Events,
- Sponsoring lokaler Turniere,
- Freemium-Spielerfeatures nur sehr vorsichtig.

### 16.4 Am Anfang vermeiden

- Ads,
- Pay-to-win Status,
- bezahlte Karten-Evolution,
- zu früher Cardmarket-Konkurrenzkampf,
- Monetarisierung bevor lokale Dichte existiert.

---

## 17. Metriken für MVP

Das MVP sollte klar messbar sein.

### 17.1 Event-Funnel

- Wie viele Eventbesucher öffnen die App?
- Wie viele sehen das Eventdetail?
- Wie viele sehen offene Runden?
- Wie viele treten einer Runde bei?
- Wie viele erstellen eine Runde?
- Wie viele Runden werden voll?
- Wie viele erscheinen wirklich?

### 17.2 Retention

- Wie viele Nutzer kommen beim nächsten Event wieder?
- Wie viele Hosts erstellen erneut Runden?
- Wie viele Nutzer aktualisieren/claimen ihr Profil?

### 17.3 Community-Signale

- Wie viele bringen Spiele mit?
- Wie viele markieren "Ich erkläre gerne"?
- Wie viele Anfänger treten bei?
- Wie viele Runden sind anfängerfreundlich?

### 17.4 Shareability

- Wie oft werden Runden geteilt?
- Welche Kanäle funktionieren: WhatsApp, Discord, Instagram, QR?
- Wie viele Nutzer kommen über Share-Link?

---

## 18. Wichtigste Produktentscheidungen

### Entscheidung 1: MVP ist Event-Companion, nicht Vollplattform

Tischrunde startet beim echten Event und nicht als leere regionale Suche.

### Entscheidung 2: Profilkarte bleibt Herzstück

Aber im MVP nur light. Karten-Evolution kommt später.

### Entscheidung 3: Trust startet als konkrete Signale

Kein früher harter Score.

### Entscheidung 4: PWA zuerst

Native App wird vertagt.

### Entscheidung 5: Alte Ideen bleiben im Backlog

Nichts wird verworfen, aber alles wird priorisiert.

### Entscheidung 6: Admin/Moderation früh einplanen

Nicht erst nach Problemen.

### Entscheidung 7: Share/QR ist Kern, nicht Bonus

Lokales Wachstum läuft über echte Events, WhatsApp, Discord, Instagram und QR-Codes.

---

## 19. Aktualisierter Backlog nach Priorität

### Prio 0 - Fundament

- Produktthese finalisieren,
- Datenmodell MVP,
- Supabase Setup,
- RLS-Konzept,
- Design Tokens produktionsreif,
- Auth/Gastmodus-Entscheidung,
- erstes Admin-Minimum.

### Prio 1 - MVP

- Events,
- Eventdetail,
- Runden,
- Runde erstellen,
- Beitritt,
- Spielfeld,
- Profilkarte light,
- Share-Link,
- QR-Link,
- Admin-Basis.

### Prio 2 - Nach MVP

- Locations,
- Spielebestand,
- Bring-Flow verbessern,
- QR-Check-in,
- Activity Events,
- Trust-Signale,
- Stamps,
- Mentor-Signal,
- private Heim-Locations,
- Adressschutz.

### Prio 3 - Community-Ausbau

- Chat/Discord-Integration,
- Game-History,
- Respect geben,
- Match-Recap,
- Gruppenbestätigung,
- Karten-Evolution,
- Badges,
- Quests.

### Prio 4 - Plattform und Monetarisierung

- Venue-Dashboard,
- Shop-/Venue-Abos,
- Turnier-/Liga-Tools,
- TCG-Tausch,
- Imports,
- Event-Aggregation,
- Seasons,
- Leaderboards,
- weitere Verticals.

---

## 20. Konkrete nächste Schritte

### 20.1 Produkt

1. MVP-Scope einfrieren.
2. Einen ersten realen Event-Use-Case definieren.
3. 5-10 Beispielrunden als Dummy-Daten bauen.
4. Event-Funnel testen: Link -> Event -> Runde -> Beitritt.
5. Gastmodus/Registrierung so reibungslos wie möglich machen.

### 20.2 Design

1. Tokens in echte CSS Variables/Tailwind Config überführen.
2. TradingCard finalisieren, aber MVP-light halten.
3. Board/Seat-Komponenten sauber typisieren.
4. EventCard und RoundRow produktionsnah bauen.
5. Accessibility-Check für Farben und Interaktionen.
6. Emojis mittelfristig durch eigene SVG-Kategorie-Icons ersetzen.

### 20.3 Technik

1. Supabase Schema für MVP anlegen.
2. RLS Policies früh definieren.
3. Activity Event Log vorbereiten.
4. Admin-Minimum bauen.
5. Share/QR-Routen bauen.
6. TanStack Query Hooks strukturieren.
7. UI und Datenlogik strikt trennen.

### 20.4 Validierung

1. Mit kleiner Gruppe testen.
2. Bei echtem Event QR-Link verteilen.
3. Beobachten, wo Nutzer hängen bleiben.
4. Nicht nach Feature-Wünschen priorisieren, sondern nach realer Nutzung.
5. Metriken nach dem Event auswerten.

### 20.5 Erstes-Event-Seeding-Playbook (gegen Mini-Cold-Start am Event)

Auch als Event-Companion gibt es am Tag 1 einen Cold-Start: niemand hat die App, niemand hat Runden erstellt. Der erste Besucher darf **keine leere Liste** sehen. Playbook fürs erste echte Event (eure Spielerei):

1. **Vorab seeden:** Du/die Hosts legt 3–6 *echte* Runden vor Event-Beginn an (verschiedene Spiele, einige mit freien Plätzen, „Anfänger willkommen").
2. **QR-Plakat pro Tisch + am Eingang** → öffnet direkt das Event-Detail (`/e/[event]`), kein Suchen, keine Pflicht-Registrierung vorab.
3. **Ein „Kümmerer" vor Ort** (du) erklärt in 10 Sek., hilft beim ersten Beitritt, erstellt live Runden für spontane Tische.
4. **Beitritt = Gast-Identität** (§8.3), ein Anzeigename reicht — Hürde minimal.
5. **Light-Check-in am Tisch** → erste Stamps/Stats entstehen sofort → die Karte „lebt" schon beim ersten Mal.
6. **Nach dem Event:** Profilkarte + Stamp zeigen, nächsten Termin sofort posten (WhatsApp-Kanal) → Retention-Schleife.

---

## 21. Alte Ideen - bewusst erhalten

Diese Ideen bleiben Teil der Vision, werden aber nicht im MVP eingeplant:

### Gamification

- Karten-Evolution Holz -> Silber -> Gold -> Foil -> Mythic,
- Skins/Effekte durch Aktivität,
- Signieren/Respect geben,
- Mentor-/Sensei-System,
- Quests/Challenges,
- QR-Check-in als physisches Ritual,
- Event-/Location-Stamps,
- Shared Moments,
- Match-Recaps,
- Awards wie "größter Bluff" oder "Pechvogel".

### Matches und Ergebnisse

- Match-Ergebnisse,
- Platzierung/Sieger,
- Gruppenbestätigung,
- disputed Status,
- Stats und Leaderboards erst nach Bestätigung.

### Wettbewerb und Community

- Seasons,
- regionale Leaderboards,
- Titel wie "Jass-König Lustenau",
- Hall of Fame,
- Season-Finale,
- Gilden/Stammtische,
- lokale Rivalitäten.

### TCG und Tausch

- Have/Want Matching,
- lokaler sicherer Tausch,
- Tauschhistorie,
- Cardmarket-Import,
- Trust für Tausch.

### Venue und Business

- Venue-Abos,
- Premium-Eintrag,
- Spielebestand,
- Tischbuchung,
- Event-Promotion,
- Analytics,
- Shop-Integration.

### Crazy / Ideenspeicher

- AR-Trading-Card,
- holografische Karte,
- Würfel des Schicksals,
- Profilkarten-Tausch,
- Pokedex der getroffenen Leute.

### Expansion

- Gaming-Runden,
- Fussball,
- Volleyball,
- andere lokale Gruppenaktivitäten,
- gleiche Slot-/Trust-/Gamification-Engine pro Vertical.

---

## 22. Finaler Leitsatz

> Tischrunde sollte zuerst nicht "das Meetup für Brettspiele" bauen, sondern den magischen digitalen Tischplan für den nächsten Spieleabend.

Wenn dieser eine Moment funktioniert - Event öffnen, Runde finden, beitreten, wirklich spielen, danach Profilkarte sehen - dann kann daraus glaubwürdig die größere Plattform wachsen.

---

## 23. Arbeitsversion für die Umsetzung

### MVP in einem Satz

**Tischrunde zeigt bei lokalen Spieleevents offene Runden, freie Plätze und passende Mitspieler - mit einer Profilkarte, die aus echten Treffen langsam zur Community-Identität wird.**

### Release-1-Scope in einem Satz

**Events, Runden, Beitritt, Spielfeld, Profilkarte light, Share/QR und Admin-Minimum.**

### Nicht vergessen

- Alte Ideen nicht löschen.
- Aber MVP schützen.
- Lokale Dichte vor Feature-Breite.
- Vertrauen als positive Signale.
- Design bleibt verspielt, aber hochwertig.
- PWA zuerst.
- QR/Share als Wachstumsmotor.
