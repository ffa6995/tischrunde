-- ============================================================
-- Notizblöcke: Vorlagen + Punkteblätter
-- Spec: docs/superpowers/specs/2026-09-06-notepad-templates-design.md
-- Idempotent; im Supabase SQL-Editor ausführbar.
-- ============================================================

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
drop policy if exists "notepad templates read" on notepad_templates;
create policy "notepad templates read" on notepad_templates for select using (
  kind = 'system' or owner_id = auth.uid()
);

-- Blätter: Schreiber immer; Runden-Blätter für alle, die die Runde sehen dürfen
-- (gleiche Bedingung wie "searches read accessible"). Blätter ohne Runde bleiben privat.
drop policy if exists "notepad sheets read accessible" on notepad_sheets;
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
