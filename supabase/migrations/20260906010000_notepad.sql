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

-- ============================================================
-- Verifikation (Ergebnisse prüfen, nicht nur Ausführung)
-- ============================================================
-- select tablename, rowsecurity from pg_tables
--  where schemaname = 'public' and tablename in ('notepad_templates','notepad_sheets');
-- select polname from pg_policies
--  where schemaname = 'public' and tablename in ('notepad_templates','notepad_sheets');
-- select proname, prosecdef from pg_proc
--  where pronamespace = 'public'::regnamespace and proname like 'notepad%' or proname like '%notepad%';
-- select proname, has_function_privilege('authenticated', oid, 'execute') as authenticated_can_execute
--   from pg_proc where pronamespace = 'public'::regnamespace and proname like '%notepad%';
-- select has_table_privilege('authenticated', 'notepad_sheets', 'insert') as should_be_false;

-- ============================================================
-- SEED: System-Vorlagen (kind='system', owner_id null)
-- ============================================================
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
