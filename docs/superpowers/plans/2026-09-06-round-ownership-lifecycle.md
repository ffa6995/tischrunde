# Round Ownership and Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Closed rounds can be archived by their creator, disappear from public event listings and joining flows, while their host retains a durable direct view. Host authorization and participant lifecycle rules remain enforced consistently in the database and client.

**Architecture:** Supabase remains the source of truth. Add an `archived_at` timestamp and a SECURITY DEFINER `archive_round` RPC with an explicit `search_path`; public queries and RLS exclude archived rows, while the creator can still read an archived direct link. The client exposes the RPC through the existing rounds DB module and `useHostActions`, then renders an archive action only after closure. Existing RPCs remain the only browser write path.

**Tech Stack:** Next.js App Router, TypeScript, TanStack Query, Supabase/Postgres, Vitest, ESLint, Next build.

**Spec:** `docs/superpowers/specs/2026-09-06-round-ownership-lifecycle-design.md`

## Global Constraints

- Preserve the existing guest identity flow; do not introduce a new auth system.
- Keep direct access to an archived round for its creator, but make archived rounds non-joinable and absent from public event lists.
- Do not add hard deletion, restore, or unrelated event/location administration.
- Keep all browser-originated round and participant writes behind authenticated RPCs.
- Use the existing error and React Query invalidation patterns.

## Task 1: Add the failing RPC contract and lifecycle type coverage

**Files:** `lib/db/rounds.test.ts` (new or extend), `lib/db/rpc-contract.test.ts`, `lib/types.ts`

- [x] Add a failing unit test that calls a new `archiveRound` DB function and expects exactly `archive_round` with `{ p_search_id }`, with no client-supplied creator id.
- [x] Add type coverage for the persisted `archived_at: string | null` field on `GameSearch` and the `round_archived` activity type.
- [x] Add tests that document the client-visible lifecycle contract: archiving is a mutation, and the public round list query must request only non-archived rows once the DB function is implemented.
- [x] Run the focused Vitest file and confirm it fails because the DB function and fields do not yet exist.

## Task 2: Add the database archive model and RPC

**Files:** `supabase/migrations/20260906000000_mvp_hardening.sql` (append a new release block), `supabase/schema.sql`

- [x] Add `archived_at timestamptz null` to `public.game_searches` with an event/archived index suitable for the public list query.
- [x] Update the accessible search policy so public rows require `archived_at is null`, while `creator_id = auth.uid()` continues to allow the creator to read their own archived direct link.
- [x] Update the participant accessible policy so public participant visibility also requires the parent round to be non-archived; keep creator and self visibility intact for direct host access.
- [x] Add `public.archive_round(p_search_id uuid) returns void` (or the project’s established scalar convention) as SECURITY DEFINER with `set search_path = public, auth`.
- [x] In the RPC, require an authenticated caller whose `auth.uid()` equals `creator_id`, lock the round row, require status `closed`, reject already archived/missing rows, set `archived_at = now()` and `updated_at = now()`, and write one `round_archived` activity event for the creator.
- [x] Revoke public execution and grant execution only to `authenticated`, matching the existing RPC grant block.
- [x] Keep `join_round` explicitly rejecting archived rows even if a future policy change exposes a row, and preserve the existing rejection of `left`, `removed`, and `no_show` participants.
- [x] Mirror the final schema/RPC definitions in `supabase/schema.sql` so a fresh install and an upgraded project stay aligned.
- [x] Add SQL verification queries or extend the existing migration verification script for the column, policy, function, and authenticated execute privilege.

## Task 3: Implement the rounds data and host action client contracts

**Files:** `lib/db/rounds.ts`, `lib/hooks/useHostActions.ts`, `lib/db/rpc-contract.test.ts`

- [x] Implement `archiveRound(supabase, searchId)` in `lib/db/rounds.ts`, calling `archive_round` with only `p_search_id` and throwing Supabase errors unchanged.
- [x] Add an `archive` mutation to `useHostActions`, using the existing configured/demo split, and invalidate `['round', searchId]` plus `['rounds', eventId]` after success.
- [x] Ensure host mutations rely on the stored session identity and server-side creator check; no client-provided creator/host id may be sent to the RPC.
- [x] Add focused tests for the new DB function using the existing test doubles (`lib/db/rpc-contract.test.ts`). No hook-level test pattern exists in this repo (no `useHostActions`/`useRounds` tests for any existing mutation), so a new one wasn't invented for `archive` alone — see final report.
- [x] Run the focused client tests and confirm they pass.

## Task 4: Filter archived rounds and represent archived direct access in the UI

**Files:** `lib/db/rounds.ts`, `lib/hooks/useRounds.ts`, `app/e/[eventId]/EventDetailView.tsx`, `app/r/[searchId]/BoardView.tsx`, related component tests if present

- [x] Add `.is('archived_at', null)` to `getRoundsForEvent`, in addition to the existing event/public filters; keep direct `getRound` able to load the creator’s archived row through RLS.
- [x] Treat `round.archived_at !== null` as a terminal, non-joinable state in `BoardView`: hide or disable join controls, check-in, participant management, status changes, and realtime mutations while retaining the host’s read-only board.
- [x] Add a clear archived status label and a host-only archive control in the management section. Show the control only when status is `closed` and `archived_at` is null; disable it while pending and surface mutation errors through the existing alert path.
- [x] After archive success, invalidate the direct round and event list queries so the event page removes the round and the direct page reflects the archived state.
- [x] Keep the creator’s direct archived link readable; non-creators should receive the existing not-found/access behavior through RLS (no client-side changes needed — enforced by the Task 2 RLS policy).
- [ ] Add or update component-level tests for archived controls and public-list filtering where the repository’s current test setup supports them. Skipped: `vitest.config.ts` only runs `lib/**/*.test.ts` under a `node` environment — no jsdom/React Testing Library setup exists for any component in this repo, so none was invented for this alone.
- [x] Run focused UI tests and TypeScript checks.

## Task 5: Verify participant and host lifecycle invariants

**Files:** `supabase/migrations/20260906000000_mvp_hardening.sql`, `supabase/schema.sql`, `lib/db/rpc-contract.test.ts`, `lib/hooks/useRounds.ts`, `app/r/[searchId]/BoardView.tsx`

- [x] Review the final SQL for all host RPCs (`confirm_participant`, `remove_participant`, `set_round_status`, `archive_round`) and verify each checks `auth.uid()` against the stored creator/host identity rather than a request parameter.
- [x] Verify `remove_participant` preserves the participant row with status `removed`, and `join_round` rejects any existing `left`, `removed`, or `no_show` row instead of inserting a duplicate.
- [x] Ensure the client hides removed/left participants from active seat counts while still preventing the same identity from silently rejoining through the server contract.
- [x] Add regression assertions for host leave rejection, removed participant rejoin rejection, archived join rejection, and non-host archive rejection at the SQL verification layer or integration test layer available in the repository.
- [x] Run the focused lifecycle tests and inspect the generated SQL diff for accidental policy or grant regressions.

## Task 6: Full verification, live migration, and deployment

**Files:** repository-wide verification only; no additional scope changes

- [ ] Run `npm test -- --run`, `npm run lint`, and `npm run build` (or the exact package scripts present in `package.json`).
- [ ] Run `git diff --check` and inspect `git status` for unintended files or secrets.
- [ ] Apply the new migration to the configured Supabase project and execute the structural verification queries for the archive column, RPC, policies, and grants.
- [ ] Commit the migration, schema, client, UI, and test changes with a focused message; push to `origin/main`.
- [ ] Confirm the Vercel deployment from `origin/main` succeeds and that production uses the expected public Supabase URL and publishable key.
- [ ] Perform live acceptance with two guest identities: create a round, join as guest, close it as host, archive it as host, confirm it disappears from the event list, confirm the host direct link remains readable, confirm a non-host cannot archive, and confirm a removed participant cannot rejoin.
- [ ] Record the verification commands and live acceptance result in the final response.

## Execution Notes

- Work task-by-task and keep each change small enough to review independently.
- Before any implementation task, load the relevant skill instructions for the selected execution mode (`superpowers:subagent-driven-development` or `superpowers:executing-plans`).
- Follow TDD for each behavior change: write the failing test, run it to observe the expected failure, implement the smallest change, then rerun the focused test before broad verification.
