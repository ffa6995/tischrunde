-- ============================================================
-- Release 1/2 — Admin-Basis (Konzept §14.3).
-- Gibt role 'admin'/'moderator' volle Rechte auf Events & Locations.
-- Einmal im Supabase SQL-Editor ausführen.
-- ============================================================

drop policy if exists "events admin all" on events;
create policy "events admin all" on events for all
  using (
    exists (select 1 from profiles p
            where p.id = auth.uid() and p.role in ('admin','moderator'))
  )
  with check (
    exists (select 1 from profiles p
            where p.id = auth.uid() and p.role in ('admin','moderator'))
  );

drop policy if exists "locations admin all" on locations;
create policy "locations admin all" on locations for all
  using (
    exists (select 1 from profiles p
            where p.id = auth.uid() and p.role in ('admin','moderator'))
  )
  with check (
    exists (select 1 from profiles p
            where p.id = auth.uid() and p.role in ('admin','moderator'))
  );

-- Dich selbst zum Admin machen: User-ID aus Authentication → Users kopieren.
-- update profiles set role = 'admin' where id = 'DEINE-USER-UUID';
