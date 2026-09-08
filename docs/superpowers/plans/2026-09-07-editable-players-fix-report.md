# Editable Sheet Players — Review Fixes

Fixes for the two Important (non-blocking) findings from the review of the
editable sheet players feature (backend `0d5297d`, frontend `9b9853b`).

## Finding 1 — missing RPC contract test

Added a test in `lib/db/rpc-contract.test.ts` for `updateSheetPlayers`
(`lib/db/notepad.ts`), matching the existing style (`rpcClient()` double,
exact `{ name, args }` assertion via `toEqual`).

New test: `"updates sheet players without smuggling in an extra identity
field"`. It calls `updateSheetPlayers(client, "sheet-1", [...])` and asserts:

```ts
expect(calls).toEqual([
  {
    name: "update_notepad_sheet_players",
    args: { p_sheet_id: "sheet-1", p_players: [{ id: "p1", label: "Ann", participant_id: null }] },
  },
]);
```

Because `toEqual` pins the full key set (not `toMatchObject` /
`not.objectContaining`), it fails if any extra key (e.g. a client-supplied
owner/user id) is ever added to the call args, consistent with the other
tests in this file.

## Finding 2 — stale player list flash after save

`lib/hooks/useNotepad.ts`: `updatePlayers`'s `onSuccess` only invalidated
queries, leaving a window where the UI showed the pre-edit player list until
the refetch landed. Applied the same `patchSheet` optimistic-write pattern
already used by `save` for `entries`:

```ts
onSuccess: (_result, players) => {
  if (!configured) return;
  patchSheet(qc, sheetId, (s) => ({ ...s, players }));
  qc.invalidateQueries({ queryKey: ["notepad-sheet", sheetId] });
  if (searchId) qc.invalidateQueries({ queryKey: ["notepad-sheets", searchId] });
},
```

`onSuccess`'s second argument is the mutation variable (the saved player
list), so no extra state threading was needed.

## Verification

- `npx tsc --noEmit` — clean, no output.
- `npx eslint lib app` — clean, no output.
- `npm test` — 81/81 passing (was 80/80 before this change; the new
  `updateSheetPlayers` contract test accounts for the +1).
- `npm run build` — `next build` compiled successfully, all routes
  generated.

## Files changed

- `lib/db/rpc-contract.test.ts`
- `lib/hooks/useNotepad.ts`
