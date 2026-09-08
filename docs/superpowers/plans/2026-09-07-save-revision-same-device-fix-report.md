# Same-device save-revision false-rejection fix

## What changed and why

`lib/hooks/useNotepad.ts`, `useNotepadActions`:

- Added `const lastOwnRevisionRef = useRef<number | null>(null);` at the top
  of the hook, alongside the `save` mutation. It records the revision that
  this device's own last *successful* save produced, and is never touched by
  anything else (no foreign write, no other hook instance, since a route
  change to a different `sheetId` remounts the component and creates a fresh
  ref).
- Inside `save`'s `mutationFn`, at the very start:
  `const effectiveExpectedRevision = lastOwnRevisionRef.current ?? expectedRevision;`
  This is computed at *execution* time (when the `mutationFn` body actually
  runs, after any wait in the `scope` queue), not at dispatch time — so a
  queued sibling call sees whatever the ref holds by the time its turn comes.
- Both branches (`!configured` demo-mode and the real `saveEntries` call) now
  use `effectiveExpectedRevision` as what's sent/used for the write, and both
  set `lastOwnRevisionRef.current = next` right after computing `next`,
  before `mutationFn` returns.
- The returned value (`next`) is untouched — `commitSave` in
  `SheetPageView.tsx` still receives exactly the server/demo-computed new
  revision and calls `setBaseRevision(next)` exactly as before. No changes
  were made to `SheetPageView.tsx`.

Demo-mode also updates `lastOwnRevisionRef`, per the instructions in the task:
demo mode can't actually race (single in-memory cache, no concurrent writer),
but keeping the ref updated there avoids a second, divergent mental model for
the two branches and costs nothing.

## Trace 1 — same-device back-to-back saves (the regression)

State: `sheet.revision = 5`, `baseRevision = 5`, `lastOwnRevisionRef.current = null` (no own save yet this session).

1. Edit 1's debounce fires → `commitSave` reads `baseRevision = 5` →
   `save.mutateAsync({ entries: e1, expectedRevision: 5 })` is dispatched.
   `mutationFn` starts immediately (queue was empty). It computes
   `effectiveExpectedRevision = lastOwnRevisionRef.current (null) ?? 5 = 5`.
   Sends `expectedRevision: 5` to `saveEntries`. RPC is in flight.
2. Before it resolves, edit 2's debounce fires → `commitSave` reads
   `baseRevision` — React hasn't re-rendered from edit 1's eventual
   `setBaseRevision` yet, so it's still `5` → dispatches
   `save.mutateAsync({ entries: e2, expectedRevision: 5 })`. Because of
   `scope: { id: notepad-save-${sheetId} }`, this second `mutationFn` call is
   queued and does **not** start executing yet.
3. Save 1's RPC resolves: server accepts (its stored revision was 5),
   returns `next = 6`. Inside `mutationFn` for save 1: `patchSheet(...,
   revision: 6)`, then `lastOwnRevisionRef.current = 6`, then returns `6`.
   `mutateAsync` for save 1 resolves in `commitSave`, which calls
   `setBaseRevision(6)`.
4. Only now, because save 1's `mutationFn` promise has fully settled, does
   save 2's queued `mutationFn` body start executing. It computes
   `effectiveExpectedRevision = lastOwnRevisionRef.current (6) ?? expectedRevision (5) = 6`
   — it ignores the stale captured `5` and uses `6`. Sends `expectedRevision:
   6` to `saveEntries`. The server's stored revision is indeed 6 (from save
   1), so it accepts, returns `next = 7`. `lastOwnRevisionRef.current = 7`,
   `patchSheet(..., revision: 7)`, `commitSave` calls `setBaseRevision(7)`.

Result: no spurious rejection. Save 2 succeeds using the fresh
post-save-1 revision, even though it was dispatched using stale
component state.

## Trace 2 — cross-device conflict must still be detected

State: `sheet.revision = 5`, `baseRevision = 5`, `lastOwnRevisionRef.current = null` (writer device A has not saved yet this session — the worst case, since once A has its own ref it's even less likely to coincide with a foreign revision).

1. Device A's user types; debounce fires → `commitSave` reads
   `baseRevision = 5` → dispatches `save.mutateAsync({ entries: eA,
   expectedRevision: 5 })`. `mutationFn` starts, computes
   `effectiveExpectedRevision = null ?? 5 = 5`. RPC in flight.
2. Meanwhile, foreign device B (same writer identity, e.g. second tab/phone)
   saves independently and succeeds server-side, bumping the server's stored
   revision from 5 to 6. This happens entirely outside device A's hook
   instance — device A's `lastOwnRevisionRef` is untouched, because only
   device A's own successful `mutationFn` executions ever write to *its*
   ref. (Realtime may eventually patch device A's cache's `sheet.revision`
   to 6, which is what powers `hasConflict` in `SheetPageView.tsx` — but
   that is a *separate* mechanism from `lastOwnRevisionRef` and isn't
   touched by this fix.)
3. Device A's RPC for `eA` (still `expectedRevision: 5`, since
   `effectiveExpectedRevision` was computed once at the very start of that
   `mutationFn` invocation, before B's write happened) reaches the server.
   The server's actual stored revision is now 6, so it correctly rejects
   with a conflict, because 5 ≠ 6.
4. `save.mutateAsync` rejects; `commitSave`'s `await` throws, `baseRevision`
   is NOT advanced (stays 5, per the existing "only advance base on success"
   logic in `commitSave`). Meanwhile `sheet.revision` in the cache advances
   to 6 via realtime. Now `hasConflict = isWriter && draft !== null &&
   baseRevision(5) !== null && sheet.revision(6) > baseRevision(5)` → `true`.
   The conflict banner and "Neuere Version übernehmen" flow fire exactly as
   before this change.

Result: the original cross-device bug fix is intact.
`lastOwnRevisionRef` only ever reflects this device's own completed writes,
so it cannot mask a foreign write — a foreign write never sets it, and this
device's next save (dispatched before the foreign write happened) still
carries the stale expected revision that the server correctly rejects.

## Verification performed

- `npx tsc --noEmit` — clean, no errors.
- `npx eslint app lib` — clean, no warnings/errors (ran to completion, ~2+
  minutes, no output).
- `npm test` — `Test Files 11 passed (11)`, `Tests 81 passed (81)` — matches
  baseline.
- `npm run build` — `next build` compiled successfully, TypeScript pass
  finished, all 14 routes generated with no errors.

## Files changed

- `C:\Users\ffalco\Documents\dev\tischrunde\lib\hooks\useNotepad.ts` — added
  `useRef` import, `lastOwnRevisionRef`, `effectiveExpectedRevision`
  computation, and ref updates in both the demo and configured branches of
  `save`'s `mutationFn`.

No changes to `app/n/[sheetId]/SheetPageView.tsx`, `updatePlayers`/
`playersDraft`, or any SQL/RPC.

## Concerns

- None identified that affect correctness. One minor accepted trade-off: if
  a save ever legitimately fails validation-wise after `lastOwnRevisionRef`
  has been set from an earlier successful save, later retries will use that
  cached ref value rather than the caller's `expectedRevision` — this is
  intentional and matches the design (the ref is strictly more current than
  component state for this device's own writes), and a failed `mutationFn`
  never updates the ref (it only updates in the success path before
  returning), so a failed save doesn't corrupt it either.
