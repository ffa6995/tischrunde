# MVP hardening implementation report

## Delivered

- Added `supabase/migrations/20260906000000_mvp_hardening.sql`. It hardens profile writes, replaces direct browser writes with authenticated RPCs, and applies public/private participant visibility rules without participant-policy recursion.
- The seven lifecycle RPCs (`create_round`, `join_round`, `leave_round`, `check_in_round`, `confirm_participant`, `remove_participant`, `set_round_status`) derive identity from `auth.uid()`, use `SECURITY DEFINER` with an explicit search path, and write related activity rows in the same transaction.
- Joining locks the round row before checking capacity. It rejects non-public, unavailable, approval-only, full, non-open, and previously left/removed participation. The participant-status trigger recalculates only `open` and `full`, so it cannot reopen active, closed, or cancelled rounds.
- Direct authenticated writes to `game_searches`, `participants`, and `activity_events` are revoked. Profile owners can change presentation fields, while a trigger rejects self-service role or verification changes. Existing legacy RLS helper files are no-ops so they cannot reintroduce direct participant mutation.
- `schema.sql` includes the hardened final state for fresh projects; the migration remains the deployment path for existing databases. `supabase/README.md` documents the order and manual acceptance checks.
- Client data functions call the RPCs. The creation wizard no longer offers invitation-only rounds. A game bring is a promise while joining and becomes the `game_brought` trust signal only after check-in or host confirmation.
- Trust deduplicates self-check-in and host confirmation by round. Added RPC contract unit coverage and a local-Postgres manual acceptance checklist.
- Added event-list and round-status realtime invalidation, query error/retry UI for event, round, and home views, and visible mutation failure feedback on the board.

## Verification

- `node node_modules/vitest/vitest.mjs run` — passed: 4 files, 19 tests.
- `node node_modules/eslint/bin/eslint.js .` — passed with no diagnostics. This includes the previously reported lint paths.
- `node node_modules/next/dist/bin/next build` — passed. Next emitted `.next/BUILD_ID` (`7FEhaCJNy29HMuc1FTw4k`) and production manifests.
- `git diff --check` — passed; only Git CRLF conversion notices were printed.

The verification above was rerun after the follow-up corrections: Vitest still
passed 19 tests, ESLint completed with no warnings or errors, and the Next 16.2.9
production build compiled, type-checked, and generated all 10 static pages.

## Deployment and limits

1. Back up and apply `supabase/migrations/20260906000000_mvp_hardening.sql` to staging, then production.
2. Do not run `host-rls.sql` or `admin-rls.sql` afterwards; both now deliberately do nothing.
3. Run `supabase/tests/mvp-hardening-manual.sql` with separate authenticated users against a disposable local or staging Supabase/Postgres project.

No local Postgres/Supabase runtime was available in this checkout, and no remote database was changed. The SQL and unit tests therefore do not prove live RLS or concurrent lock behavior; the manual acceptance checks cover rights escalation, last-seat contention, private/closed rounds, removed users, rollback, duplicate confirmations, and visibility with real authenticated sessions.

## Follow-up corrections

- `schema.sql` now has exactly one hardening block, after the legacy seed and
  policies, and it is semantically synchronized with the versioned migration.
- Reopening a closed round now locks and counts active participants. A filled
  round resolves to `full`; it never displays as open when no seat can be joined.
- Event-list realtime now listens only to event-scoped `game_searches` changes.
  The participant status trigger updates that round row, so seat changes still
  refresh the matching event without a global participant subscription.
- The lint rerun also fixed the pre-existing unescaped text in Offline and Board,
  the synchronous ThemeToggle effect update, and the obsolete `leaveRound`
  user-ID parameter.
