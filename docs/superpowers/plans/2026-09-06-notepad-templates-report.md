# Notepad templates implementation report

Spec: `docs/superpowers/specs/2026-09-06-notepad-templates-design.md`
Plan: `docs/superpowers/plans/2026-09-06-notepad-templates.md`
Ledger: `.superpowers/sdd/2026-09-06-notepad-templates/progress.md`

## Delivered

- **Block catalogue and pure scoring logic** (`lib/notepad/`): a definition schema (`schema.ts`) with a
  block-module registry (`registry.ts`) for four block types — `round_table`, `jass_board`, `tally`,
  `text` — each with its own parser, entry validation, and pure `compute` function. A `skin` slot is
  reserved on both block and definition but not yet used by any renderer. Helpers in `helpers.ts` cover
  forking a definition for adoption, editing block lists (`addBlock`/`removeBlock`/`moveBlock`/
  `updateBlockConfig`), and deriving a player list from round participants or free-text names.
- **Database schema and RPCs** (`supabase/migrations/20260906010000_notepad.sql`, mirrored in
  `supabase/schema.sql`): `notepad_templates` and `notepad_sheets` tables with row-level security,
  direct browser writes revoked, and six `SECURITY DEFINER` RPCs as the only write path —
  `create_notepad_sheet`, `save_notepad_entries`, `set_notepad_sheet_status`, `transfer_notepad_writer`,
  `save_notepad_template`, `delete_notepad_template`. Four system templates (Runden-Zettel, Skyjo,
  Jass-Tafel (Schieber), Strichliste) plus a Skyjo game row are seeded; a test cross-checks every seeded
  definition's keys against each block module's own config-key set so a typo in the SQL cannot pass
  silently (see "Deviations" below for why this took two fix rounds).
- **Client data layer** (`lib/db/notepad.ts`, `lib/hooks/useNotepad*.ts`): typed wrappers for all six
  RPCs plus reads, contract tests pinning every RPC's argument list against the SQL signatures, query
  hooks with a realtime subscription on `notepad_sheets` and a full demo-mode path (no Supabase
  configured) that seeds and follows an in-memory cache instead of erasing it.
- **UI**: four accessible block renderers (`components/notepad/blocks/`) composed by `SheetView`, the
  sheet route `app/n/[sheetId]/` with realtime score-following for readers and a debounced,
  revision-checked save path for the single writer (including stale-write rejection and writer
  handover), a round entry point gating the "start a notepad" action to participants/creators, and the
  template library, builder, and adoption flow under `app/vorlagen/`.
- **This task**: the manual acceptance SQL (`supabase/tests/notepad-manual.sql`), the `supabase/README.md`
  section documenting the new migration and the required `enable-realtime.sql` re-run, and this report.

## Verification (this task)

All four gate commands were run from a fresh shell with Node put on `PATH` via NVS. Actual output below,
unedited except for trimming ANSI color codes.

### `npm test`

```
> tischrunde@0.1.0 test
> vitest run

 Test Files  11 passed (11)
      Tests  76 passed (76)
   Start at  08:54:26
   Duration  1.72s (transform 1.47s, setup 0ms, import 2.99s, tests 223ms, environment 8ms)
```

Result: **pass** — 11 files, 76 tests. (Vitest also printed a one-time warning about the config loader
and CommonJS/ESM interop in `vitest.config.ts`; this is pre-existing tooling noise, not a test failure.)

### `npm run lint`

```
> tischrunde@0.1.0 lint
> eslint
```

Result: **pass** — no warnings or errors, no output beyond the script banner.

### `npm run build`

```
> tischrunde@0.1.0 build
> next build

▲ Next.js 16.2.9 (Turbopack)
✓ Compiled successfully in 22.2s
  Running TypeScript ...
  Finished TypeScript in 11.0s ...
✓ Generating static pages using 11 workers (12/12) in 1221ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /admin
├ ƒ /auth/confirm
├ ƒ /e/[eventId]
├ ƒ /e/[eventId]/runde-neu
├ ○ /icon.svg
├ ○ /manifest.webmanifest
├ ○ /me
├ ƒ /n/[sheetId]
├ ○ /offline
├ ƒ /r/[searchId]
├ ○ /vorlagen
├ ƒ /vorlagen/[templateId]
└ ○ /vorlagen/uebernehmen
```

Result: **pass**. This is the first time the notepad feature's routes and components have been compiled
and type-checked by Next — all thirteen tasks so far had only `vitest`/`tsc`-level and manual review
coverage on the UI layer. The build compiled cleanly, type-checked with no errors, and generated all 12
routes, including the three new notepad routes (`/n/[sheetId]`, `/vorlagen`, `/vorlagen/[templateId]`,
`/vorlagen/uebernehmen`).

### `git diff --check`

```
warning: in the working copy of 'supabase/README.md', LF will be replaced by CRLF the next time Git touches it
```

Result: **pass** — exit code 0. The only output is Git's line-ending conversion notice (same as seen in
the MVP hardening report), not a whitespace-error report.

All four gate commands are green.

## SQL checks: brief vs. the built migration

The brief's six checks were verified against `supabase/migrations/20260906010000_notepad.sql` before
writing `supabase/tests/notepad-manual.sql`, rather than copied verbatim:

- Table/RLS names, the two policy names (`notepad templates read`, `notepad sheets read accessible`),
  the `revoke insert, update, delete` grant on both tables, the six RPC names, and the "4 seeded system
  templates, `owner_id` null" expectation all matched the migration exactly. No behavioral disagreement
  found.
- **One correction made**: the brief's check 2 selects `polname` from `pg_policies`. `pg_policies` is a
  Postgres system view whose column is named `policyname` (`polname` is a column of the lower-level
  `pg_policy` catalog, not of this view); `select polname from pg_policies` would fail with
  `column "polname" does not exist`. The acceptance file uses `policyname` instead. This is a defect in
  the brief's example query, not in the migration.
- The realtime check (point 6) is intentionally about a separate file: `enable-realtime.sql` already
  includes an idempotent `notepad_sheets` block (added in an earlier task), so the check documents what
  a human must re-run and then verify, not something asserted by the migration itself.

## Live acceptance checklist (outstanding — requires a deployed project)

**Not attempted.** This environment has no local Postgres/Supabase runtime and no dev server was
started; the following ten items require a deployed Supabase project, the migration and
`enable-realtime.sql` applied, and two real browser identities (one anonymous guest, one signed-in). The
project owner should work through them in order and record pass/fail for each:

1. **Round-bound sheet visibility.** As the writer, create a sheet from a round (`/e/[eventId]` →
   round → "Punkte mitschreiben"). Open `/n/<id>` as the other identity. Expected: the sheet is visible
   and rendered read-only (no editable inputs).
2. **Realtime score-following.** As the writer, type a score into any block. Expected: within about a
   second, the reader's browser tab shows the same value and any computed totals update without a
   manual reload.
3. **Reader cannot write.** As the reader, attempt to click/focus/type into a score input. Expected:
   inputs are disabled (not merely visually dimmed), and the network tab shows no `save_notepad_entries`
   call is attempted.
4. **Non-participant on a hidden round.** As a third identity that is not a participant of a private or
   otherwise non-visible round, navigate to that round's sheet URL. Expected: a "not available" state,
   not the sheet's contents.
5. **Standalone sheet privacy.** As the writer, go to `/vorlagen` → pick a template → "Blatt starten"
   without attaching it to a round. Expected: the second identity, given the same sheet URL, cannot see
   it (a standalone sheet has no `search_id` and is private to its owner).
6. **Stale write / lost-update protection.** Open the same sheet in two tabs as the writer (same
   identity, e.g. two windows). Enter different values in each and save both. Expected: the first save
   succeeds; the second fails with a revision/"changed elsewhere" message, and the values typed in the
   second tab remain visible on screen rather than being silently discarded or overwritten.
7. **Writer handover.** As the current writer, hand over writing rights to another participant.
   Expected: the new writer can now type and save; the previous writer's inputs become disabled.
8. **Template adoption independence.** Adopt the "Jass-Tafel (Schieber)" system template, change the
   target score from 2500 to 1000, and save the resulting sheet/template. Expected: the original system
   template still reads target 2500 (adoption forks the definition rather than mutating the shared
   system row).
9. **Skyjo limit note.** On a Skyjo sheet, enter round totals that bring a player's cumulative score to
   100 or above. Expected: the limit note/end-of-game indicator described by the Skyjo template's
   `limitBehavior: "end_at"` configuration is shown.
10. **Guest identity parity.** Repeat items 1-9 (or at least the write-path-relevant ones: 1, 2, 3, 6, 7)
    with the anonymous guest identity as the acting user in place of a signed-in account. Expected: no
    behavior differs — guest and signed-in users are both ordinary `auth.uid()` identities to the RPCs.

## Deliberately not done / known limitations

- **No component, hook, or page test harness in this repo.** `vitest.config.ts` restricts its `include`
  to `lib/**/*.test.ts` running in a Node environment; there is no React Testing Library, jsdom, or
  Playwright setup wired in. Consequently:
  - The four block renderers (`components/notepad/blocks/*`) and `SheetView` are covered by the Task 11
    implementer/reviewer round (accessible names, read-only wiring, overflow handling) and by this
    task's `npm run build` type-check, but not by any automated render or interaction test.
  - The query hooks in `lib/hooks/useNotepad*.ts` (realtime subscription, demo-mode cache seeding,
    mutation `scope` serialization for same-writer saves) are covered by the Task 10 review's manual
    trace against the TanStack Query source, not by a hook-testing harness.
  - The pages under `app/n/[sheetId]/` and `app/vorlagen/` and the template builder are covered by
    review and reading (Tasks 12-13), plus successful static/dynamic route generation in this task's
    build, not by rendered UI tests.
  - Everything under `lib/notepad/` (block parsing, scoring, helpers) and the RPC parameter contracts in
    `lib/db/rpc-contract.test.ts` **are** covered by automated `vitest` tests (76 passing), since that
    code lives under `lib/**/*.test.ts`.
- **No SQL has been executed anywhere.** `supabase/migrations/20260906010000_notepad.sql`, the
  `supabase/schema.sql` mirror, and `supabase/tests/notepad-manual.sql` have only been read and
  reasoned about against each other; there is no local Postgres/Supabase instance in this environment.
  The migration has not been applied to any staging or production project, and none of the six checks in
  the acceptance file, nor the ten-point live checklist above, have actually been run.
- **The live acceptance checklist (previous section) is entirely outstanding**, for the reason stated in
  its own heading: it requires a deployed project and two real browser identities, neither available
  here.

## Files changed (this task)

- `supabase/tests/notepad-manual.sql` (new)
- `supabase/README.md` (added the "Notizblöcke" section)
- `docs/superpowers/plans/2026-09-06-notepad-templates-report.md` (this file)
