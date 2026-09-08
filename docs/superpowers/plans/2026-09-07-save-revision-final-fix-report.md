# Save-revision protocol: final fix (lastOwnRevisionRef resync deadlock)

## What changed

`lib/hooks/useNotepad.ts`, `save` mutation's `mutationFn` (inside `useNotepadActions`).

Before:
```ts
const effectiveExpectedRevision = lastOwnRevisionRef.current ?? expectedRevision;
```

After:
```ts
const effectiveExpectedRevision = Math.max(
  lastOwnRevisionRef.current ?? expectedRevision,
  expectedRevision,
);
```

No other lines changed. `SheetPageView.tsx` was not touched, per the constraint — the whole
point of `Math.max` is to make the fix local to `useNotepad.ts` instead of exposing
`lastOwnRevisionRef` across the hook boundary.

## Why this is safe: could `Math.max` ever send an inflated value the server would wrongly accept?

Traced both inputs to their write sites:

- `lastOwnRevisionRef.current` is written in exactly two places, both inside `mutationFn`,
  both assigning the `next` value returned by a *successful* save (`saveEntries`'s return value
  in the configured branch, or the locally-incremented `revision + 1` in the demo branch). It is
  never written from anything else, so at the moment it is set it can never exceed true server
  state — it either equals it (configured branch, straight from the server's response) or *is*
  the server state (demo branch, no separate server to diverge from).
- `expectedRevision` (the caller's `baseRevision` in `SheetPageView.tsx`) only advances via
  `commitSave`'s `setBaseRevision(revision)` after a successful save (same server-confirmed
  value), or via `takeNewerVersion`'s `setBaseRevision(sheet.revision)`, which copies the
  cache's `sheet.revision` — itself populated only by the initial fetch or by realtime updates
  driven by actual server writes. So `expectedRevision` also can never be ahead of true server
  state.

Since both operands are independently bounded above by true server state, `Math.max` of the two
is also bounded above by true server state. It cannot produce a value that overshoots what the
server actually holds, so it cannot cause the server to *incorrectly accept* a save that should
have been rejected as a conflict. Answer: **no**, there is no inflation hole.

## Trace 1 — the `takeNewerVersion` deadlock (this bug)

1. This device's own save succeeds once this session → `lastOwnRevisionRef.current = 4`.
2. A foreign device (or another tab) saves; server revision → 5; realtime updates
   `sheet.revision` in the cache; `hasConflict` becomes true (`sheet.revision(5) > baseRevision`,
   still stale at whatever it was, say 4).
3. Writer clicks "Neuere Version übernehmen" → `takeNewerVersion()` runs
   `setBaseRevision(sheet.revision)` → `baseRevision = 5`. `lastOwnRevisionRef.current` is
   untouched by this — still `4`.
4. Writer edits again → `commitSave` dispatches `expectedRevision: 5` (from the now-updated
   `baseRevision`). `mutationFn` computes
   `effectiveExpectedRevision = Math.max(4, 5) = 5` — matches the server's true current
   revision. Save succeeds instead of looping forever.

**Fixed.**

## Trace 2 — same-device back-to-back saves (fix from `9cef418`, must not regress)

1. Save 1 (dispatched with `expectedRevision` = whatever `baseRevision` was, say 5) succeeds →
   server revision becomes 6 → `lastOwnRevisionRef.current = 6`.
2. Save 2 was dispatched earlier (debounce fired twice before save 1 returned), captured
   `expectedRevision = 5` at dispatch time — React hadn't re-rendered with the new
   `baseRevision` yet. It runs `mutationFn` *after* save 1 finished (serialized by the mutation
   `scope`), so it reads the now-updated ref.
3. `effectiveExpectedRevision = Math.max(6, 5) = 6` — still picks the fresher ref value over the
   stale dispatch-time `expectedRevision`. Save 2 still succeeds.

**Not broken** — `Math.max` picks the same winner (`6`) that the old `?? ` logic did, because the
ref was non-null and larger.

## Trace 3 — original cross-device silent-overwrite bug (fix from `5c3a5e2`, must not regress)

1. No own save has succeeded yet this session → `lastOwnRevisionRef.current = null`.
2. A foreign device writes; cache's `sheet.revision` advances (via realtime), but this device's
   `baseRevision`/`expectedRevision` stays stale (say `5`) — nothing updates it except an
   explicit `takeNewerVersion`, which hasn't happened here.
3. `effectiveExpectedRevision = Math.max(null ?? 5 = 5, 5) = 5` — still sends the stale value
   `5`. The server's true revision has already advanced past `5` (foreign write happened), so
   the RPC still correctly rejects this as a conflict. Conflict banner still appears.

**Not broken.**

## Verification performed

- `npx tsc --noEmit` → clean, no output, exit 0.
- `npx eslint app lib` → clean, no output, exit 0 (allowed up to 300s; finished well within that).
- `npm test` → `Test Files 11 passed (11)`, `Tests 81 passed (81)`.
- `npm run build` → `✓ Compiled successfully`, TypeScript pass, all 14 routes generated, no errors.

All four match the stated baseline (81/81, lint clean, build passing) with the fix applied.

## Files changed

- `lib/hooks/useNotepad.ts` — one computation changed (`effectiveExpectedRevision`), plus an
  explanatory comment above it.

## Concerns

None. The change is a pure widening of which of two independently-safe-or-stale values is
selected; both traces of the two prior fixes (`5c3a5e2`, `9cef418`) still hold, and the new
`takeNewerVersion` deadlock trace resolves cleanly. No test harness exists for this hook (per
constraint, none was added) — verification here is manual trace plus the existing
type-check/lint/unit-test/build suite, none of which exercise this exact interaction directly
since it lives in a React hook with no component test harness in this repo.
