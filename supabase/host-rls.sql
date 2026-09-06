-- Superseded by migrations/20260906000000_mvp_hardening.sql.
-- Do not run this legacy helper after the hardened migration: it would restore
-- direct participant writes. Apply the versioned migration instead.
/*

-- Host darf Teilnehmer SEINER Runde verwalten (bestätigen/entfernen).
drop policy if exists "participants host manage" on participants;
create policy "participants host manage" on participants for update
  using (
    exists (
      select 1 from game_searches s
      where s.id = participants.search_id and s.creator_id = auth.uid()
    )
  );

-- Selbst-Insert härten: nur eigene Zeile, kein erschlichener Host-Status.
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

-- Auto-Status: Runde 'full', wenn alle Plätze belegt sind, sonst 'open'.
-- Geschlossene/abgesagte Runden bleiben unangetastet. security definer, damit
-- der Trigger game_searches trotz RLS aktualisieren darf.
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
*/
