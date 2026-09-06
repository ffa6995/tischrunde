-- MVP hardening: apply after the original schema.sql on existing Supabase projects.
-- All browser-originated round and participant writes go through the RPCs below.

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
