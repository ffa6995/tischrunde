-- ============================================================
-- Notizblöcke: Spielerliste bleibt nach dem Anlegen editierbar
-- Spec: docs/superpowers/specs/2026-09-06-notepad-templates-design.md
--       ("Player list": "stay editable (someone at the table may not
--       use the app)").
-- Additiver Folge-Migrationsschritt zu 20260906010000_notepad.sql;
-- diese Datei bleibt unangetastet. Idempotent; im Supabase
-- SQL-Editor ausführbar.
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
-- Verifikation (Ergebnisse prüfen, nicht nur Ausführung)
-- ============================================================
-- select proname, prosecdef from pg_proc
--  where pronamespace = 'public'::regnamespace and proname = 'update_notepad_sheet_players';
-- select has_function_privilege('authenticated', 'public.update_notepad_sheet_players(uuid,jsonb)', 'execute') as authenticated_can_execute;
-- select has_function_privilege('anon', 'public.update_notepad_sheet_players(uuid,jsonb)', 'execute') as should_be_false;
