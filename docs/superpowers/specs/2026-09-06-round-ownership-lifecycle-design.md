# Round Ownership and Lifecycle Design

**Date:** 2026-09-06

## Goal

Give round hosts a safe, durable lifecycle for their own rounds while keeping participant membership and public visibility consistent across clients.

## Decisions

1. Closed rounds are archived instead of hard-deleted. Archived rounds are excluded from public event lists and cannot accept new participants.
2. Host management is authorized by the identity that created the round. The existing guest flow remains supported; a guest host can manage the round from the same browser identity.
3. Participant lifecycle remains explicit: a participant can join and leave themselves, a host can remove a participant, and a removed participant cannot silently rejoin the same round.
4. The behavior is enforced in database RPCs and RLS, exposed through focused client functions and UI actions, and covered by unit plus manual acceptance tests.

## Architecture

The database remains the source of truth. A new archive RPC will lock the round, verify that the caller is the stored host identity, require a closed round, set an archive timestamp, and emit one activity event. Public event and round queries will filter archived rows. Existing join, leave, check-in, remove, and status RPCs will keep their identity checks and lifecycle rules; only the client UI and tests will be extended where the new archived state matters.

The round management surface will show an archive action only to the host after the round is closed. The action will use the same mutation feedback pattern as the existing lifecycle actions. Archived rounds will render a clear archived state when opened by a direct link, while no longer appearing in public open-round lists.

## Data model

- Add `archived_at timestamptz null` to `public.game_searches`.
- Add an index that supports event-scoped filtering of non-archived rounds.
- Add `public.archive_round(uuid)` as a `SECURITY DEFINER` function with an explicit search path.
- The RPC returns the archived round row and rejects non-host callers, open/full rounds, already archived rounds, and missing rounds.
- The activity event type is `round_archived` and references the round.

## Authorization and visibility

- Only the stored round host identity may call `archive_round` or other host management RPCs.
- A round with `archived_at is not null` is never joinable or publicly listed.
- Existing participant visibility rules remain unchanged: public participation is visible according to the current policy, while self and host management access remains scoped to the round.
- Archived rows remain readable to the host through a direct round link so the host can understand the final state.

## Client behavior

- Add `archiveRound` to the round database client module and host action hook.
- Add an archive button with a confirmation step in the host management area when the round is closed.
- Disable join and participant mutations for archived rounds and show the archived status.
- Invalidate the round and event queries after archive completion so all open clients update promptly.
- Surface RPC errors using the existing mutation error UI.

## Testing and verification

- Add a failing unit contract test for the archive RPC name, input, and lifecycle result before implementation.
- Add client tests for archive action wiring and archived query filtering where existing test seams permit.
- Run the focused unit tests first, then the complete Vitest suite, ESLint, Next production build, and `git diff --check`.
- Run live manual acceptance against the deployed project with two browser identities: host archive authorization, participant leave/remove behavior, public list filtering, direct archived-link visibility, and realtime refresh.

## Out of scope

- Hard deletion of rounds or participants.
- A new account or email-authentication system.
- Restoring archived rounds.
- Changes to event ownership or location administration.
