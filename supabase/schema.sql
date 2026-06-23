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
