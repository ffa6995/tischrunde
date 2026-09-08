# Save-revision race fix — report

## What changed and why

`lib/hooks/useNotepad.ts`'s `save` mutation used to read the "expected revision"
to send to the server from the TanStack Query cache (`qc.getQueryData(["notepad-sheet",
sheetId])?.revision`) at the moment `mutationFn` actually ran — not from the
`baseRevision` that `SheetPageView.tsx` tracks as "the revision this draft is
actually based on". Between a keystroke arming the 600ms debounce timer and the
timer firing, `useRealtimeSheet` can advance the cache's `sheet.revision` because
a second device (same writer identity) saved in the meantime. When the timer then
fired, `mutationFn` read the *already-advanced* cache revision, sent it to the RPC
as `expectedRevision`, the RPC saw it matched the server's actual current
revision, accepted the write, and the stale draft silently clobbered the other
device's just-saved data — exactly the class of bug "Fix 2" (the `baseRevision`
vs `sheet.revision` conflict banner) was meant to prevent, reopened through this
timing gap.

The fix: `save`'s `mutationFn` input type changed from `Record<string, unknown>`
to `{ entries: Record<string, unknown>; expectedRevision: number }`. The
mutation now uses the passed-in `expectedRevision` for the `saveEntries(...,
{ expectedRevision })` call instead of reading the cache. The caller
(`SheetPageView.tsx`'s `commitSave`) already tracks the correct value in its own
`baseRevision` state and now passes it explicitly:
`save.mutateAsync({ entries: value, expectedRevision: baseRevision })`.

Everything else about the mutation — the `scope: { id: \`notepad-save-${sheetId}\` }`
serialization comment/behavior, the `patchSheet` call on success, the return
value (`next`, the new revision) — is unchanged.

## Demo-mode reasoning

The demo-mode branch (`!configured`) has no real server and therefore no real
optimistic-concurrency check to enforce — there's nothing to compare
`expectedRevision` against except the same local cache we already read for the
new `revision + 1` computation. Concurrency between two "devices" isn't
meaningfully simulable in that path (no Supabase Realtime, no RPC). So the
parameter is accepted (for type consistency — the mutation has one input type
for both branches) but intentionally ignored: the branch keeps reading
`current?.revision ?? 0` from the cache and incrementing it locally, exactly as
before. This is called out explicitly in the code comment on the `mutationFn`.

## Files changed

- `lib/hooks/useNotepad.ts` — `save` mutation input type and `mutationFn` body.
- `app/n/[sheetId]/SheetPageView.tsx` — `commitSave` now passes
  `{ entries: value, expectedRevision: baseRevision }`, with a runtime guard
  (throws if `baseRevision` is `null`) to satisfy the `number | null` type
  without weakening the invariant. A comment explains why `baseRevision` is
  always non-null in practice at this call site (it's only reached from
  writer-only branches after `sheet` has loaded, i.e. after the one-time
  render-phase initialization of `baseRevision` from `sheet.revision`).

## Numbered failure-then-fix trace (verified against the actual diff)

Failure sequence this fix closes (matches the bug report):

1. Writer types. `handleChange` runs: `setDraft(next)`, `pendingRef.current = next`,
   and a 600ms timer is armed. At this point `baseRevision` = 5 (say), matching
   the server revision the draft was built on.
2. Before the timer fires, a second device with the same writer identity saves.
   `useRealtimeSheet` refetches and `qc.setQueryData(["notepad-sheet", sheetId], ...)`
   updates the cache so `sheet.revision` becomes 6. `baseRevision` in this
   component instance is untouched by that (it only updates via `setBaseRevision`
   inside `commitSave`/`takeNewerVersion`), so it is still 5.
3. The armed timer fires, calls `commitSave(value)` from inside `handleChange`'s
   `setTimeout` callback.
4. **Before the fix**: `commitSave` called `save.mutateAsync(value)`, and
   `mutationFn` read `qc.getQueryData(...)?.revision` — now 6 — and sent
   `expectedRevision: 6` to `saveEntries`. The RPC's current revision actually
   *is* 6 (from the other device's save), so the precondition matches, the RPC
   accepts the write, and the stale draft overwrites the other device's data
   silently. Bug reproduced.
5. **After the fix**: `commitSave` reads its own `baseRevision` state (still 5,
   because nothing in this component updated it) and calls
   `save.mutateAsync({ entries: value, expectedRevision: 5 })`. `mutationFn` now
   uses that passed `expectedRevision` (5) directly, ignoring the cache's
   already-advanced value. `saveEntries(supabase, { sheetId, entries,
   expectedRevision: 5 })` sends `p_expected_revision: 5` to the RPC, which
   compares it against the server's actual current revision (6) — mismatch — and
   the RPC rejects the write as a genuine conflict (matching how it already
   rejects conflicts in the non-race case Fix 2 handles).
6. `save.mutateAsync` rejects; `commitSave`'s `await` throws, so `setBaseRevision(revision)`
   is never reached — `baseRevision` correctly stays at 5 (the pre-existing
   "don't advance the base on failure" behavior in `commitSave`, unchanged by
   this fix). `save.isError` becomes true on the shared mutation object.
7. On the next render, `hasConflict` is computed as `isWriter && draft !== null &&
   baseRevision !== null && sheet.revision > baseRevision`. Since `sheet.revision`
   (6, refreshed by `useRealtimeSheet` in step 2, already in the cache/query data
   that drives this component's `sheet` prop) is greater than `baseRevision` (5,
   unchanged in step 6), `hasConflict` is `true`.
8. The render branch `isWriter && hasConflict && (...)` takes priority over the
   `isWriter && !hasConflict && save.isError && (...)` branch (they're mutually
   exclusive via the `!hasConflict` guard on the error banner). So the writer
   sees the existing "Neuere Version übernehmen" conflict banner, not a generic
   "Speichern fehlgeschlagen" error — the correct, already-shipped Fix 2 UI, now
   reachable from the timing gap that used to bypass it entirely.

This confirms the fix closes the hole: the server now sees the *stale* revision
the draft was actually built on, not a cache value that happened to already
reflect the very write we need to detect as a conflict.

## Verification performed (actual output)

- `npx tsc --noEmit` — no output, exit clean (0 errors).
- `npx eslint app lib` — no output, exit clean (0 problems).
- `npm test` — `Test Files 11 passed (11)`, `Tests 81 passed (81)` (matches
  81/81 baseline).
- `npm run build` — `✓ Compiled successfully in 19.5s`, `Finished TypeScript`,
  all 12 routes generated, no errors.

## Concerns

- None found that weaken the fix. The one design choice worth flagging
  explicitly: `commitSave` now throws synchronously if `baseRevision` is `null`
  rather than silently no-op'ing or falling back to some other value. Given the
  documented invariant (only writer branches call it, only after the one-time
  `if (sheet && baseRevision === null) setBaseRevision(sheet.revision)`
  initialization on the same render pass sheet first loads), this should never
  actually throw in practice; it exists purely to satisfy TypeScript's
  `number | null` type honestly rather than using a non-null assertion (`!`) or
  a silent `?? 0` fallback that could mask a real bug if the invariant is ever
  violated by a future change.
- Demo mode (`!configured`) still has no real conflict detection — this was
  true before the fix too and is out of scope (no server to conflict against).
