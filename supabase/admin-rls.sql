-- Superseded by migrations/20260906000000_mvp_hardening.sql, which uses a
-- SECURITY DEFINER helper to avoid profile-policy recursion. Keep this file as
-- a no-op so a later manual run cannot replace the hardened policy.
/*

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
*/
