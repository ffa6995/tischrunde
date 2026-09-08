-- ============================================================
-- Tischrunde — MVP Schema (Supabase / Postgres)
-- Im Supabase SQL-Editor ausführen. RLS-Policies sind STARTER,
-- vor Produktion verschärfen. Enum-Werte stehen als Kommentar an
-- der Spalte (bewusst TEXT + CHECK statt Postgres-Enums = flexibler).
-- ============================================================

-- ---------- PROFILES ----------
create table if not exists profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null,
  avatar_url    text,
  role          text not null default 'player',   -- guest|player|verified|owner|moderator|admin
  verification_status text not null default 'none', -- none|email|phone|trusted|venue_verified
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- GAMES (global, kanonisch) ----------
create table if not exists games (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  min_players   int  not null default 2,
  max_players   int  not null default 4,
  theme         text not null default 'standard', -- standard|catan|jassen|tcg|party|other
  image_url     text,
  bgg_id        int,
  created_by    uuid references profiles (id),
  status        text not null default 'approved', -- draft|approved|rejected
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- LOCATIONS (ab Release 2 aktiv) ----------
create table if not exists locations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          text not null default 'event_host', -- venue|event_host|home|shop
  address_public text,           -- nur für öffentliche Venues
  region_label  text,            -- grobe Region für private Orte
  geo           jsonb,
  socials       jsonb,
  website       text,
  owner_id      uuid references profiles (id),
  claimed_by    uuid references profiles (id),
  status        text not null default 'pending',   -- private|pending|public|archived
  is_verified   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- LOCATION_GAMES (Bestand, ab Release 2) ----------
create table if not exists location_games (
  location_id   uuid references locations (id) on delete cascade,
  game_id       uuid references games (id) on delete cascade,
  status        text not null default 'available', -- available|maybe|archived
  created_at    timestamptz not null default now(),
  primary key (location_id, game_id)
);

-- ---------- EVENTS ----------
create table if not exists events (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  location_id   uuid references locations (id),
  description   text,
  host_id       uuid references profiles (id),
  event_url     text,
  socials       jsonb,
  visibility    text not null default 'public',    -- public|private|unlisted
  status        text not null default 'published',  -- draft|published|cancelled|archived
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- GAME_SEARCHES (= Runden) ----------
create table if not exists game_searches (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid references events (id) on delete cascade,
  location_id      uuid references locations (id),
  game_id          uuid references games (id),
  creator_id       uuid references profiles (id),
  title            text,
  seats_total      int  not null default 4,
  visibility       text not null default 'public', -- public|invite|unlisted
  join_mode        text not null default 'open',   -- open|approval
  game_source      text not null default 'on_site',-- on_site|needed|brought_by_player|host_brings
  beginner_friendly boolean not null default false,
  desired_level    text not null default 'any',    -- any|beginner|advanced|learning|tournament_like
  status           text not null default 'open',   -- open|full|active|closed|cancelled
  archived_at      timestamptz null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------- PARTICIPANTS ----------
create table if not exists participants (
  id            uuid primary key default gen_random_uuid(),
  search_id     uuid not null references game_searches (id) on delete cascade,
  user_id       uuid not null references profiles (id) on delete cascade,
  joined_at     timestamptz not null default now(),
  role          text not null default 'player',    -- host|player
  skill_level   text not null default 'any',       -- beginner|advanced|learning|teaches|any
  brings_game   boolean not null default false,
  brings_note   text,                               -- optionale Notiz (z. B. Erweiterung)
  status        text not null default 'joined',    -- requested|joined|confirmed|removed|left|no_show
  unique (search_id, user_id)
);

-- ---------- ACTIVITY_EVENTS (Quelle für Stats/Trust/Badges) ----------
-- NICHT hart aggregieren — Stats/Trust/Karten-Evolution daraus ABLEITEN.
create table if not exists activity_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles (id) on delete cascade,
  type          text not null,  -- round_created|round_joined|checked_in|host_confirmed|game_brought|respect_given|no_show_reported|match_confirmed
  source_type   text,           -- event|game_search|match|profile|location
  source_id     uuid,
  metadata      jsonb,
  created_by    uuid references profiles (id),
  created_at    timestamptz not null default now()
);

create index if not exists idx_searches_event on game_searches (event_id);
create index if not exists idx_participants_search on participants (search_id);
create index if not exists idx_activity_user on activity_events (user_id);

-- ============================================================
-- RLS (STARTER — vor Produktion verschärfen)
-- ============================================================
alter table profiles       enable row level security;
alter table games          enable row level security;
alter table events         enable row level security;
alter table game_searches  enable row level security;
alter table participants   enable row level security;
alter table activity_events enable row level security;
alter table locations      enable row level security;
alter table location_games enable row level security;

-- Profiles: öffentlich lesbar (für Karten); nur self editierbar
create policy "profiles read"   on profiles for select using (true);
create policy "profiles update" on profiles for update using (auth.uid() = id);
create policy "profiles insert" on profiles for insert with check (auth.uid() = id);

-- Games: lesbar für alle; anlegen durch eingeloggte Nutzer
create policy "games read"   on games for select using (true);
create policy "games insert" on games for insert with check (auth.uid() is not null);

-- Events: öffentliche/veröffentlichte lesbar; Schreiben vorerst nur Service-Role/Dashboard
create policy "events read public" on events for select
  using (visibility = 'public' and status = 'published');

-- Runden: öffentliche lesbar; Ersteller darf eigene ändern; anlegen durch eingeloggte
create policy "searches read public" on game_searches for select
  using (visibility = 'public');
create policy "searches insert" on game_searches for insert
  with check (auth.uid() = creator_id);
create policy "searches update own" on game_searches for update
  using (auth.uid() = creator_id);

-- Teilnehmer: lesbar für alle in einer öffentlichen Runde; eigene Zeile verwalten
-- (Host-darf-entfernen kommt als verschärfte Policy in Release 3)
create policy "participants read" on participants for select using (true);
create policy "participants insert self" on participants for insert
  with check (auth.uid() = user_id);
create policy "participants update self" on participants for update
  using (auth.uid() = user_id);

-- Activity: nur eigene schreiben/lesen
create policy "activity insert self" on activity_events for insert
  with check (auth.uid() = user_id or auth.uid() = created_by);
create policy "activity read self" on activity_events for select
  using (auth.uid() = user_id);

-- Locations (Release 2): nur public lesbar (private/pending später feiner)
create policy "locations read public" on locations for select
  using (status = 'public');

-- ---------- NOTEPAD_TEMPLATES ----------
create table if not exists notepad_templates (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  description         text,
  kind                text not null default 'user',      -- system|user
  owner_id            uuid references profiles (id) on delete cascade,
  game_id             uuid references games (id) on delete set null,
  origin_template_id  uuid references notepad_templates (id) on delete set null,
  schema_version      int  not null default 1,
  definition          jsonb not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint notepad_templates_kind_owner check (
    (kind = 'system' and owner_id is null) or (kind = 'user' and owner_id is not null)
  )
);

-- ---------- NOTEPAD_SHEETS ----------
create table if not exists notepad_sheets (
  id             uuid primary key default gen_random_uuid(),
  title          text,
  search_id      uuid references game_searches (id) on delete cascade,
  owner_id       uuid not null references profiles (id) on delete cascade,
  template_id    uuid references notepad_templates (id) on delete set null,
  schema_version int  not null default 1,
  definition     jsonb not null,
  players        jsonb not null default '[]'::jsonb,
  entries        jsonb not null default '{}'::jsonb,
  revision       int  not null default 0,
  status         text not null default 'active',          -- active|finished
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint notepad_sheets_status check (status in ('active', 'finished'))
);

create index if not exists idx_notepad_sheets_search on notepad_sheets (search_id);
create index if not exists idx_notepad_sheets_owner on notepad_sheets (owner_id);
create index if not exists idx_notepad_templates_owner on notepad_templates (owner_id);
create index if not exists idx_notepad_templates_system_game
  on notepad_templates (game_id) where kind = 'system';

alter table notepad_templates enable row level security;
alter table notepad_sheets    enable row level security;

-- Vorlagen: System-Vorlagen für alle, eigene nur für sich selbst.
create policy "notepad templates read" on notepad_templates for select using (
  kind = 'system' or owner_id = auth.uid()
);

-- Blätter: Schreiber immer; Runden-Blätter für alle, die die Runde sehen dürfen
-- (gleiche Bedingung wie "searches read accessible"). Blätter ohne Runde bleiben privat.
create policy "notepad sheets read accessible" on notepad_sheets for select using (
  owner_id = auth.uid()
  or (
    search_id is not null
    and exists (
      select 1 from game_searches s
      join events e on e.id = s.event_id
      where s.id = notepad_sheets.search_id
        and (
          s.creator_id = auth.uid()
          or (
            s.archived_at is null
            and s.visibility = 'public'
            and e.visibility = 'public'
            and e.status = 'published'
          )
        )
    )
  )
);

-- Schreiben ausschliesslich über die RPCs (Task 7).
revoke insert, update, delete on notepad_templates, notepad_sheets from anon, authenticated;

-- ============================================================
-- RPCs (einziger Schreibweg aus dem Browser)
-- ============================================================

create or replace function public.create_notepad_sheet(
  p_search_id uuid,
  p_template_id uuid,
  p_definition jsonb,
  p_players jsonb,
  p_title text
) returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_user_id uuid := auth.uid(); v_sheet_id uuid; v_allowed boolean;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_definition is null or jsonb_typeof(p_definition) <> 'object' then
    raise exception 'Definition must be a JSON object';
  end if;
  if p_players is null or jsonb_typeof(p_players) <> 'array' then
    raise exception 'Players must be a JSON array';
  end if;

  if p_search_id is not null then
    select exists (
      select 1 from game_searches s
      where s.id = p_search_id
        and s.archived_at is null
        and (
          s.creator_id = v_user_id
          or exists (
            select 1 from participants pa
            where pa.search_id = s.id
              and pa.user_id = v_user_id
              and pa.status not in ('left', 'removed', 'no_show')
          )
        )
    ) into v_allowed;
    if not v_allowed then
      raise exception 'Only participants of this round can start a notepad';
    end if;
  end if;

  insert into notepad_sheets (
    title, search_id, owner_id, template_id, schema_version, definition, players, entries
  ) values (
    nullif(btrim(coalesce(p_title, '')), ''),
    p_search_id,
    v_user_id,
    p_template_id,
    coalesce((p_definition ->> 'schemaVersion')::int, 1),
    p_definition,
    p_players,
    '{}'::jsonb
  )
  returning id into v_sheet_id;

  return v_sheet_id;
end;
$$;

create or replace function public.save_notepad_entries(
  p_sheet_id uuid,
  p_entries jsonb,
  p_expected_revision int
) returns int
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_user_id uuid := auth.uid(); v_owner uuid; v_revision int; v_status text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_entries is null or jsonb_typeof(p_entries) <> 'object' then
    raise exception 'Entries must be a JSON object';
  end if;

  select owner_id, revision, status into v_owner, v_revision, v_status
  from notepad_sheets where id = p_sheet_id for update;
  if not found then raise exception 'Notepad not found'; end if;
  if v_owner <> v_user_id then raise exception 'Only the notepad writer can save'; end if;
  if v_status <> 'active' then raise exception 'This notepad is finished'; end if;
  if p_expected_revision is not null and p_expected_revision <> v_revision then
    raise exception 'Notepad was changed elsewhere (revision %)', v_revision;
  end if;

  update notepad_sheets
     set entries = p_entries, revision = v_revision + 1, updated_at = now()
   where id = p_sheet_id;

  return v_revision + 1;
end;
$$;

create or replace function public.set_notepad_sheet_status(p_sheet_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_status not in ('active', 'finished') then raise exception 'Unsupported status: %', p_status; end if;
  update notepad_sheets set status = p_status, updated_at = now()
   where id = p_sheet_id and owner_id = v_user_id;
  if not found then raise exception 'Only the notepad writer can change the status'; end if;
end;
$$;

create or replace function public.transfer_notepad_writer(p_sheet_id uuid, p_to_user_id uuid)
returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_user_id uuid := auth.uid(); v_search_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select search_id into v_search_id
  from notepad_sheets where id = p_sheet_id and owner_id = v_user_id for update;
  if not found then raise exception 'Only the notepad writer can hand over'; end if;
  if v_search_id is null then raise exception 'A notepad without a round cannot be handed over'; end if;
  if not exists (
    select 1 from participants pa
    where pa.search_id = v_search_id
      and pa.user_id = p_to_user_id
      and pa.status not in ('left', 'removed', 'no_show')
  ) then
    raise exception 'The new writer must be a participant of this round';
  end if;

  update notepad_sheets set owner_id = p_to_user_id, updated_at = now() where id = p_sheet_id;
end;
$$;

create or replace function public.save_notepad_template(
  p_template_id uuid,
  p_name text,
  p_description text,
  p_game_id uuid,
  p_definition jsonb,
  p_origin_template_id uuid
) returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare v_user_id uuid := auth.uid(); v_id uuid; v_name text := nullif(btrim(coalesce(p_name, '')), '');
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if v_name is null then raise exception 'A template needs a name'; end if;
  if p_definition is null or jsonb_typeof(p_definition) <> 'object' then
    raise exception 'Definition must be a JSON object';
  end if;

  if p_template_id is null then
    insert into notepad_templates (
      name, description, kind, owner_id, game_id, origin_template_id, schema_version, definition
    ) values (
      v_name,
      nullif(btrim(coalesce(p_description, '')), ''),
      'user',
      v_user_id,
      p_game_id,
      p_origin_template_id,
      coalesce((p_definition ->> 'schemaVersion')::int, 1),
      p_definition
    )
    returning id into v_id;
    return v_id;
  end if;

  update notepad_templates
     set name = v_name,
         description = nullif(btrim(coalesce(p_description, '')), ''),
         game_id = p_game_id,
         schema_version = coalesce((p_definition ->> 'schemaVersion')::int, 1),
         definition = p_definition,
         updated_at = now()
   where id = p_template_id and owner_id = v_user_id and kind = 'user'
  returning id into v_id;
  if v_id is null then raise exception 'Only your own templates can be changed'; end if;
  return v_id;
end;
$$;

create or replace function public.delete_notepad_template(p_template_id uuid)
returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  delete from notepad_templates
   where id = p_template_id and owner_id = v_user_id and kind = 'user';
  if not found then raise exception 'Only your own templates can be deleted'; end if;
end;
$$;

revoke all on function
  public.create_notepad_sheet(uuid,uuid,jsonb,jsonb,text),
  public.save_notepad_entries(uuid,jsonb,int),
  public.set_notepad_sheet_status(uuid,text),
  public.transfer_notepad_writer(uuid,uuid),
  public.save_notepad_template(uuid,text,text,uuid,jsonb,uuid),
  public.delete_notepad_template(uuid)
from public;

grant execute on function
  public.create_notepad_sheet(uuid,uuid,jsonb,jsonb,text),
  public.save_notepad_entries(uuid,jsonb,int),
  public.set_notepad_sheet_status(uuid,text),
  public.transfer_notepad_writer(uuid,uuid),
  public.save_notepad_template(uuid,text,text,uuid,jsonb,uuid),
  public.delete_notepad_template(uuid)
to authenticated;

-- Supabase erteilt neuen Funktionen per Default-Privileges direkt EXECUTE an anon;
-- `revoke ... from public` entfernt eine direkte Rollen-Erteilung NICHT. Daher
-- explizit fuer anon entziehen: Gast-Identitaeten melden sich anonym an und sind
-- damit `authenticated` — `anon` braucht auf diesen Funktionen nie Rechte.
revoke execute on function
  public.create_notepad_sheet(uuid,uuid,jsonb,jsonb,text),
  public.save_notepad_entries(uuid,jsonb,int),
  public.set_notepad_sheet_status(uuid,text),
  public.transfer_notepad_writer(uuid,uuid),
  public.save_notepad_template(uuid,text,text,uuid,jsonb,uuid),
  public.delete_notepad_template(uuid)
from anon;

-- ============================================================
-- Notizblöcke: Spielerliste bleibt nach dem Anlegen editierbar
-- Spec: docs/superpowers/specs/2026-09-06-notepad-templates-design.md
--       ("Player list": "stay editable (someone at the table may not
--       use the app)").
-- Mirrors supabase/migrations/20260907000000_notepad_editable_players.sql
-- ============================================================

create or replace function public.update_notepad_sheet_players(
  p_sheet_id uuid,
  p_players jsonb
) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner uuid;
  v_status text;
  v_player jsonb;
  v_id text;
  v_label text;
  v_seen_ids text[] := '{}';
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_players is null or jsonb_typeof(p_players) <> 'array' then
    raise exception 'Players must be a JSON array';
  end if;
  if jsonb_array_length(p_players) = 0 then
    raise exception 'A notepad needs at least one player';
  end if;

  select owner_id, status into v_owner, v_status
  from notepad_sheets where id = p_sheet_id for update;
  if not found then raise exception 'Notepad not found'; end if;
  if v_owner <> v_user_id then raise exception 'Only the notepad writer can edit players'; end if;
  if v_status <> 'active' then raise exception 'This notepad is finished'; end if;

  -- Jeden Spieler einzeln validieren: id/label sind Pflicht-Strings
  -- (nach Trim nicht leer), participant_id ist optional (String oder
  -- null). Absichtlich NUR players validieren/schreiben — entries
  -- bleibt unangetastet, damit bereits erfasste Punkte eines entfernten
  -- Spielers erhalten bleiben und nur nicht mehr angezeigt werden.
  for v_player in select * from jsonb_array_elements(p_players)
  loop
    if jsonb_typeof(v_player) <> 'object' then
      raise exception 'Each player must be a JSON object';
    end if;
    if jsonb_typeof(v_player -> 'id') <> 'string' then
      raise exception 'Each player needs a string id';
    end if;
    v_id := btrim(v_player ->> 'id');
    if v_id = '' then raise exception 'Each player needs a non-empty id'; end if;
    if jsonb_typeof(v_player -> 'label') <> 'string' then
      raise exception 'Each player needs a string label';
    end if;
    v_label := btrim(v_player ->> 'label');
    if v_label = '' then raise exception 'Each player needs a non-empty label'; end if;
    if v_player ? 'participant_id' and jsonb_typeof(v_player -> 'participant_id') not in ('string', 'null') then
      raise exception 'participant_id must be a string or null';
    end if;
    if v_id = any(v_seen_ids) then
      raise exception 'Duplicate player id: %', v_id;
    end if;
    v_seen_ids := array_append(v_seen_ids, v_id);
  end loop;

  -- Nur players (+ updated_at) schreiben — entries bleibt bewusst aussen vor.
  update notepad_sheets
     set players = p_players, updated_at = now()
   where id = p_sheet_id;
end;
$$;

revoke all on function
  public.update_notepad_sheet_players(uuid,jsonb)
from public;

grant execute on function
  public.update_notepad_sheet_players(uuid,jsonb)
to authenticated;

-- Supabase erteilt neuen Funktionen per Default-Privileges direkt EXECUTE an anon;
-- `revoke ... from public` entfernt eine direkte Rollen-Erteilung NICHT. Daher
-- explizit fuer anon entziehen: Gast-Identitaeten melden sich anonym an und sind
-- damit `authenticated` — `anon` braucht auf dieser Funktion nie Rechte.
revoke execute on function
  public.update_notepad_sheet_players(uuid,jsonb)
from anon;

-- ============================================================
-- SEED (Walking Skeleton — ein Event + Spiele + offene Runden)
-- creator_id/host_id bleiben NULL, da noch keine Auth-User existieren.
-- Echte Teilnahmen entstehen zur Laufzeit über participants.
-- ============================================================
insert into games (id, name, min_players, max_players, theme) values
  ('11111111-1111-1111-1111-111111111101','Catan',3,4,'catan'),
  ('11111111-1111-1111-1111-111111111102','Carcassonne',2,5,'catan'),
  ('11111111-1111-1111-1111-111111111103','Wingspan',1,5,'standard'),
  ('11111111-1111-1111-1111-111111111104','Azul',2,4,'standard'),
  ('11111111-1111-1111-1111-111111111105','7 Wonders',3,7,'standard'),
  ('11111111-1111-1111-1111-111111111106','Jassen',4,4,'jassen')
on conflict do nothing;

insert into games (id, name, min_players, max_players, theme) values
  ('11111111-1111-1111-1111-111111111107','Skyjo',2,8,'standard')
on conflict (id) do nothing;

insert into notepad_templates (id, name, description, kind, owner_id, game_id, schema_version, definition) values
  ('44444444-4444-4444-4444-444444444401',
   'Runden-Zettel',
   'Zeile = Runde, Spalte = Spieler, Summe automatisch.',
   'system', null, null, 1,
   '{"schemaVersion":1,"blocks":[{"id":"table","type":"round_table","title":"Punkte","config":{"scoreDirection":"highest_wins","limit":null,"limitBehavior":"none","allowNegative":true}}]}'::jsonb),

  ('44444444-4444-4444-4444-444444444402',
   'Skyjo',
   'Niedrigste Summe gewinnt, Spielende bei 100 Punkten.',
   'system', null, '11111111-1111-1111-1111-111111111107', 1,
   '{"schemaVersion":1,"blocks":[{"id":"table","type":"round_table","title":"Punkte","config":{"scoreDirection":"lowest_wins","limit":100,"limitBehavior":"end_at","allowNegative":true}}]}'::jsonb),

  ('44444444-4444-4444-4444-444444444403',
   'Jass-Tafel (Schieber)',
   'Zwei Teams auf 2500, Weis wird mitgezählt.',
   'system', null, '11111111-1111-1111-1111-111111111106', 1,
   '{"schemaVersion":1,"blocks":[{"id":"board","type":"jass_board","title":"Tafel","config":{"targetScore":2500,"weisEnabled":true,"matchBonus":100,"strokeStyle":"swiss","teamALabel":"Wir","teamBLabel":"Ihr"}},{"id":"note","type":"text","title":"Notiz","config":{"placeholder":"Wer gibt, Trumpf-Abmachungen …"}}]}'::jsonb),

  ('44444444-4444-4444-4444-444444444404',
   'Strichliste',
   'Ein Zähler pro Spieler — Stiche, Siege, Chips.',
   'system', null, null, 1,
   '{"schemaVersion":1,"blocks":[{"id":"tally","type":"tally","title":"Striche","config":{"step":1,"allowNegative":false}}]}'::jsonb)
on conflict (id) do nothing;

-- ============================================================
insert into events (id, title, starts_at, ends_at, description, event_url, visibility, status) values
  ('22222222-2222-2222-2222-222222222201',
   'Spielerei Dornbirn',
   now() + interval '3 days',
   now() + interval '3 days 4 hours',
   'Offener Brett- & Kartenspiel-Nachmittag. Alle Einnahmen gehen an die Pfadfinder.',
   'https://example.org/spielerei',
   'public','published')
on conflict do nothing;

insert into game_searches (event_id, game_id, seats_total, game_source, beginner_friendly, desired_level, status, title) values
  ('22222222-2222-2222-2222-222222222201','11111111-1111-1111-1111-111111111101',4,'on_site',false,'advanced','open','Aufbau-Strategen gesucht'),
  ('22222222-2222-2222-2222-222222222201','11111111-1111-1111-1111-111111111106',4,'on_site',false,'advanced','open','Differenzler zu viert'),
  ('22222222-2222-2222-2222-222222222201','11111111-1111-1111-1111-111111111103',5,'on_site',true,'beginner','open','Anfänger willkommen'),
  ('22222222-2222-2222-2222-222222222201','11111111-1111-1111-1111-111111111102',4,'needed',true,'any','open','Wer bringt es mit?')
on conflict do nothing;

-- ---------- Release 2: Location + Spielbestand ----------
create policy "location_games read" on location_games for select using (true);

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

update events set location_id = '33333333-3333-3333-3333-333333333301'
  where id = '22222222-2222-2222-2222-222222222201';

insert into location_games (location_id, game_id, status) values
  ('33333333-3333-3333-3333-333333333301','11111111-1111-1111-1111-111111111101','available'),
  ('33333333-3333-3333-3333-333333333301','11111111-1111-1111-1111-111111111102','available'),
  ('33333333-3333-3333-3333-333333333301','11111111-1111-1111-1111-111111111103','available'),
  ('33333333-3333-3333-3333-333333333301','11111111-1111-1111-1111-111111111104','available')
on conflict do nothing;

-- ---------- Realtime: Live-Sitzplätze (§5.5) ----------
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

-- ---------- Release 2: Host-Moderation, RLS-Härtung & Auto-Status ----------
drop policy if exists "participants host manage" on participants;
create policy "participants host manage" on participants for update
  using (
    exists (
      select 1 from game_searches s
      where s.id = participants.search_id and s.creator_id = auth.uid()
    )
  );

drop policy if exists "participants insert self" on participants;
create policy "participants insert self" on participants for insert
  with check (
    auth.uid() = user_id
    and (
      role = 'player'
      or exists (
        select 1 from game_searches s
        where s.id = search_id and s.creator_id = auth.uid()
      )
    )
  );

create or replace function tr_update_search_status() returns trigger
language plpgsql security definer as $$
declare
  sid uuid := coalesce(new.search_id, old.search_id);
  total int;
  cur text;
  cnt int;
begin
  select seats_total, status into total, cur from game_searches where id = sid;
  if cur is null or cur in ('closed','cancelled') then
    return null;
  end if;
  select count(*) into cnt from participants
    where search_id = sid and status not in ('left','removed','no_show');
  update game_searches
    set status = case when cnt >= total then 'full' else 'open' end,
        updated_at = now()
    where id = sid and status not in ('closed','cancelled');
  return null;
end;
$$;

drop trigger if exists trg_participants_status on participants;
create trigger trg_participants_status
  after insert or update or delete on participants
  for each row execute function tr_update_search_status();

-- ---------- Admin-Basis: role admin/moderator darf Events & Locations verwalten (§14.3) ----------
drop policy if exists "events admin all" on events;
create policy "events admin all" on events for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','moderator')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','moderator')));

drop policy if exists "locations admin all" on locations;
create policy "locations admin all" on locations for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','moderator')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','moderator')));

-- Re-apply MVP hardening after the legacy setup sections above. Keep this block
-- in sync with migrations/20260906000000_mvp_hardening.sql.
alter table profiles alter column role set default 'guest';

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'moderator')
  );
$$;

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() = old.id
     and (new.role is distinct from old.role
       or new.verification_status is distinct from old.verification_status) then
    raise exception 'Role and verification status cannot be changed by the profile owner';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_privileges on profiles;
create trigger trg_guard_profile_privileges
before update on profiles
for each row execute function public.guard_profile_privileges();

drop policy if exists "profiles update" on profiles;
drop policy if exists "profiles insert" on profiles;
drop policy if exists "profiles update safe fields" on profiles;
drop policy if exists "profiles insert guest" on profiles;
create policy "profiles update safe fields" on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
create policy "profiles insert guest" on profiles for insert
  with check (
    auth.uid() = id
    and role = 'guest'
    and verification_status = 'none'
  );

-- Do not make a private round discoverable through its participants. Creators
-- retain access to their own private/unlisted rounds for operational purposes.
drop policy if exists "searches read public" on game_searches;
drop policy if exists "searches insert" on game_searches;
drop policy if exists "searches update own" on game_searches;
drop policy if exists "searches read accessible" on game_searches;
create policy "searches read accessible" on game_searches for select using (
  creator_id = auth.uid()
  or (
    visibility = 'public'
    and exists (
      select 1 from events e
      where e.id = game_searches.event_id
        and e.visibility = 'public'
        and e.status = 'published'
    )
  )
);

drop policy if exists "participants read" on participants;
drop policy if exists "participants update self" on participants;
drop policy if exists "participants insert self" on participants;
drop policy if exists "participants host manage" on participants;
drop policy if exists "participants read accessible" on participants;
create policy "participants read accessible" on participants for select using (
  user_id = auth.uid()
  or exists (
    select 1 from game_searches s
    join events e on e.id = s.event_id
    where s.id = participants.search_id
      and s.creator_id = auth.uid()
  )
  or exists (
    select 1 from game_searches s
    join events e on e.id = s.event_id
    where s.id = participants.search_id
      and s.visibility = 'public'
      and e.visibility = 'public'
      and e.status = 'published'
  )
);

drop policy if exists "activity insert self" on activity_events;
drop policy if exists "activity read self" on activity_events;
create policy "activity read self" on activity_events for select using (auth.uid() = user_id);

drop policy if exists "events admin all" on events;
create policy "events admin all" on events for all
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "locations admin all" on locations;
create policy "locations admin all" on locations for all
  using (public.is_staff()) with check (public.is_staff());

-- Participant changes may affect availability, but must never reopen an active,
-- closed, or cancelled round.
create or replace function public.recalculate_search_status(p_search_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_total int;
  v_status text;
  v_count int;
begin
  select seats_total, status into v_total, v_status
  from game_searches where id = p_search_id for update;
  if not found or v_status not in ('open', 'full') then return; end if;
  select count(*) into v_count from participants
  where search_id = p_search_id and status not in ('left', 'removed', 'no_show');
  update game_searches set status = case when v_count >= v_total then 'full' else 'open' end,
    updated_at = now() where id = p_search_id;
end;
$$;

create or replace function public.tr_update_search_status()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.recalculate_search_status(coalesce(new.search_id, old.search_id));
  return null;
end;
$$;

drop trigger if exists trg_participants_status on participants;
create trigger trg_participants_status after insert or update or delete on participants
for each row execute function public.tr_update_search_status();

create or replace function public.log_round_activity(
  p_user_id uuid, p_type text, p_search_id uuid, p_metadata jsonb default null,
  p_created_by uuid default null
) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (
    select 1 from activity_events
    where user_id = p_user_id and type = p_type and source_type = 'game_search'
      and source_id = p_search_id
  ) then
    insert into activity_events (user_id, type, source_type, source_id, metadata, created_by)
    values (p_user_id, p_type, 'game_search', p_search_id, p_metadata, p_created_by);
  end if;
end;
$$;

create or replace function public.create_round(
  p_event_id uuid, p_game_id uuid, p_title text, p_seats_total int,
  p_game_source text, p_desired_level text, p_beginner_friendly boolean,
  p_visibility text
) returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_search_id uuid; v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_seats_total < 2 or p_seats_total > 20 then raise exception 'Seat count must be between 2 and 20'; end if;
  if p_visibility not in ('public', 'unlisted') then raise exception 'Unsupported round visibility'; end if;
  if p_game_source not in ('on_site','needed','brought_by_player','host_brings')
     or p_desired_level not in ('any','beginner','advanced','learning','tournament_like') then
    raise exception 'Invalid round settings';
  end if;
  if not exists (select 1 from events where id = p_event_id and visibility = 'public' and status = 'published') then
    raise exception 'Event is not open for rounds';
  end if;
  if not exists (select 1 from games where id = p_game_id and status = 'approved') then
    raise exception 'Game is not available';
  end if;
  insert into game_searches (event_id, game_id, creator_id, title, seats_total, game_source, desired_level, beginner_friendly, visibility)
  values (p_event_id, p_game_id, v_user_id, nullif(trim(p_title), ''), p_seats_total, p_game_source, p_desired_level, p_beginner_friendly, p_visibility)
  returning id into v_search_id;
  insert into participants (search_id, user_id, role, status, brings_game)
  values (v_search_id, v_user_id, 'host', 'joined', p_game_source = 'host_brings');
  perform public.log_round_activity(v_user_id, 'round_created', v_search_id, null, v_user_id);
  return v_search_id;
end;
$$;

create or replace function public.join_round(
  p_search_id uuid, p_skill_level text, p_brings_game boolean,
  p_brings_note text default null, p_game_name text default null
) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_user_id uuid := auth.uid(); v_total int; v_status text; v_visibility text;
  v_join_mode text; v_count int; v_participant_status text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_skill_level not in ('beginner','advanced','learning','teaches','any') then raise exception 'Invalid skill level'; end if;
  select s.seats_total, s.status, s.visibility, s.join_mode into v_total, v_status, v_visibility, v_join_mode
  from game_searches s join events e on e.id = s.event_id
  where s.id = p_search_id and e.visibility = 'public' and e.status = 'published'
  for update of s;
  if not found or v_visibility <> 'public' or v_join_mode <> 'open' or v_status <> 'open' then
    raise exception 'Round is not open for joining';
  end if;
  select status into v_participant_status from participants where search_id = p_search_id and user_id = v_user_id for update;
  if found then
    if v_participant_status in ('left', 'removed', 'no_show') then raise exception 'This participation cannot be resumed'; end if;
    return;
  end if;
  select count(*) into v_count from participants where search_id = p_search_id and status not in ('left','removed','no_show');
  if v_count >= v_total then raise exception 'Round is full'; end if;
  insert into participants (search_id, user_id, role, skill_level, brings_game, brings_note, status)
  values (p_search_id, v_user_id, 'player', p_skill_level, p_brings_game, case when p_brings_game then nullif(trim(p_brings_note), '') end, 'joined');
  perform public.log_round_activity(v_user_id, 'round_joined', p_search_id,
    jsonb_build_object('brings_game_promise', p_brings_game, 'game_name', p_game_name, 'skill', p_skill_level), v_user_id);
end;
$$;

create or replace function public.leave_round(p_search_id uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_user_id uuid := auth.uid(); v_role text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select role into v_role from participants where search_id = p_search_id and user_id = v_user_id for update;
  if not found then raise exception 'Participation not found'; end if;
  if v_role = 'host' then raise exception 'The host cannot leave their own round'; end if;
  update participants set status = 'left' where search_id = p_search_id and user_id = v_user_id and status not in ('left','removed','no_show');
end;
$$;

create or replace function public.check_in_round(
  p_search_id uuid, p_game_name text default null, p_event_id uuid default null, p_event_name text default null
) returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_user_id uuid := auth.uid(); v_brings_game boolean;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select brings_game into v_brings_game from participants
    where search_id = p_search_id and user_id = v_user_id and status in ('joined','confirmed') for update;
  if not found then raise exception 'Only joined participants can check in'; end if;
  update participants set status = 'confirmed' where search_id = p_search_id and user_id = v_user_id;
  perform public.log_round_activity(v_user_id, 'checked_in', p_search_id,
    jsonb_build_object('game_name', p_game_name, 'event_id', p_event_id, 'event_name', p_event_name), v_user_id);
  if v_brings_game then perform public.log_round_activity(v_user_id, 'game_brought', p_search_id, jsonb_build_object('game_name', p_game_name), v_user_id); end if;
end;
$$;

create or replace function public.confirm_participant(p_search_id uuid, p_target_user_id uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_host_id uuid := auth.uid(); v_brings_game boolean;
begin
  if v_host_id is null or not exists (select 1 from participants where search_id = p_search_id and user_id = v_host_id and role = 'host') then
    raise exception 'Only the round host can confirm participants';
  end if;
  select brings_game into v_brings_game from participants
    where search_id = p_search_id and user_id = p_target_user_id and status in ('joined','confirmed') for update;
  if not found then raise exception 'Participant is not eligible for confirmation'; end if;
  update participants set status = 'confirmed' where search_id = p_search_id and user_id = p_target_user_id;
  perform public.log_round_activity(p_target_user_id, 'host_confirmed', p_search_id, null, v_host_id);
  if v_brings_game then perform public.log_round_activity(p_target_user_id, 'game_brought', p_search_id, null, v_host_id); end if;
end;
$$;

create or replace function public.remove_participant(p_search_id uuid, p_target_user_id uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_host_id uuid := auth.uid();
begin
  if v_host_id is null or not exists (select 1 from participants where search_id = p_search_id and user_id = v_host_id and role = 'host') then raise exception 'Only the round host can remove participants'; end if;
  update participants set status = 'removed' where search_id = p_search_id and user_id = p_target_user_id and role <> 'host' and status not in ('removed','left','no_show');
  if not found then raise exception 'Participant is not eligible for removal'; end if;
end;
$$;

create or replace function public.set_round_status(p_search_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_user_id uuid := auth.uid(); v_current text; v_total int; v_count int;
begin
  if p_status not in ('open','active','closed','cancelled') then raise exception 'Invalid target status'; end if;
  select status, seats_total into v_current, v_total
  from game_searches where id = p_search_id and creator_id = v_user_id for update;
  if not found then raise exception 'Only the round host can change status'; end if;
  if v_current = 'cancelled' then raise exception 'Cancelled rounds cannot be reopened'; end if;
  if v_current = 'active' and p_status in ('open','full') then raise exception 'Active rounds cannot be reopened'; end if;
  if p_status = 'open' then
    select count(*) into v_count from participants
      where search_id = p_search_id and status not in ('left', 'removed', 'no_show');
    p_status := case when v_count >= v_total then 'full' else 'open' end;
  end if;
  update game_searches set status = p_status, updated_at = now() where id = p_search_id;
end;
$$;

revoke insert, update, delete on game_searches, participants, activity_events from anon, authenticated;
grant select, insert, update on profiles to anon, authenticated;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;
revoke all on function public.create_round(uuid,uuid,text,int,text,text,boolean,text), public.join_round(uuid,text,boolean,text,text), public.leave_round(uuid), public.check_in_round(uuid,text,uuid,text), public.confirm_participant(uuid,uuid), public.remove_participant(uuid,uuid), public.set_round_status(uuid,text) from public;
grant execute on function public.create_round(uuid,uuid,text,int,text,text,boolean,text), public.join_round(uuid,text,boolean,text,text), public.leave_round(uuid), public.check_in_round(uuid,text,uuid,text), public.confirm_participant(uuid,uuid), public.remove_participant(uuid,uuid), public.set_round_status(uuid,text) to authenticated;

-- Re-apply round ownership/lifecycle archiving after the legacy setup sections
-- above. Keep this block in sync with migrations/20260906000000_mvp_hardening.sql.
alter table game_searches add column if not exists archived_at timestamptz null;
create index if not exists idx_searches_event_archived on game_searches (event_id, archived_at);

drop policy if exists "searches read accessible" on game_searches;
create policy "searches read accessible" on game_searches for select using (
  creator_id = auth.uid()
  or (
    archived_at is null
    and visibility = 'public'
    and exists (
      select 1 from events e
      where e.id = game_searches.event_id
        and e.visibility = 'public'
        and e.status = 'published'
    )
  )
);

drop policy if exists "participants read accessible" on participants;
create policy "participants read accessible" on participants for select using (
  user_id = auth.uid()
  or exists (
    select 1 from game_searches s
    join events e on e.id = s.event_id
    where s.id = participants.search_id
      and s.creator_id = auth.uid()
  )
  or exists (
    select 1 from game_searches s
    join events e on e.id = s.event_id
    where s.id = participants.search_id
      and s.archived_at is null
      and s.visibility = 'public'
      and e.visibility = 'public'
      and e.status = 'published'
  )
);

create or replace function public.join_round(
  p_search_id uuid, p_skill_level text, p_brings_game boolean,
  p_brings_note text default null, p_game_name text default null
) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_user_id uuid := auth.uid(); v_total int; v_status text; v_visibility text;
  v_join_mode text; v_count int; v_participant_status text; v_archived timestamptz;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_skill_level not in ('beginner','advanced','learning','teaches','any') then raise exception 'Invalid skill level'; end if;
  select s.seats_total, s.status, s.visibility, s.join_mode, s.archived_at into v_total, v_status, v_visibility, v_join_mode, v_archived
  from game_searches s join events e on e.id = s.event_id
  where s.id = p_search_id and e.visibility = 'public' and e.status = 'published'
  for update of s;
  if not found or v_archived is not null or v_visibility <> 'public' or v_join_mode <> 'open' or v_status <> 'open' then
    raise exception 'Round is not open for joining';
  end if;
  select status into v_participant_status from participants where search_id = p_search_id and user_id = v_user_id for update;
  if found then
    if v_participant_status in ('left', 'removed', 'no_show') then raise exception 'This participation cannot be resumed'; end if;
    return;
  end if;
  select count(*) into v_count from participants where search_id = p_search_id and status not in ('left','removed','no_show');
  if v_count >= v_total then raise exception 'Round is full'; end if;
  insert into participants (search_id, user_id, role, skill_level, brings_game, brings_note, status)
  values (p_search_id, v_user_id, 'player', p_skill_level, p_brings_game, case when p_brings_game then nullif(trim(p_brings_note), '') end, 'joined');
  perform public.log_round_activity(v_user_id, 'round_joined', p_search_id,
    jsonb_build_object('brings_game_promise', p_brings_game, 'game_name', p_game_name, 'skill', p_skill_level), v_user_id);
end;
$$;

create or replace function public.archive_round(p_search_id uuid) returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_user_id uuid := auth.uid(); v_status text; v_archived timestamptz;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select status, archived_at into v_status, v_archived
  from game_searches where id = p_search_id and creator_id = v_user_id for update;
  if not found then raise exception 'Only the round host can archive this round'; end if;
  if v_archived is not null then raise exception 'Round is already archived'; end if;
  if v_status <> 'closed' then raise exception 'Only a closed round can be archived'; end if;
  update game_searches set archived_at = now(), updated_at = now() where id = p_search_id;
  perform public.log_round_activity(v_user_id, 'round_archived', p_search_id, null, v_user_id);
end;
$$;

revoke all on function public.archive_round(uuid) from public;
grant execute on function public.archive_round(uuid) to authenticated;
