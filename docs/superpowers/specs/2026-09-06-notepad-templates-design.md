# Notepad Templates and Score Sheets Design

**Date:** 2026-09-06

## Goal

Let players keep score at the table with a pad that matches the game they are playing: a Skyjo-style rounds-by-players table, a Jass board with teams and target score, a simple tally, or a free note. Templates ship with the app, players can build their own from a block catalogue, and a template seen in use at a table can be adopted and modified.

## Decisions

1. A pad definition is declarative JSON validated against a versioned schema. Layout and rules are data; only block *types* are code.
2. The block catalogue is fixed and configured through forms. There is no user-authored formula language and no free-form grid.
3. Scoring logic lives in React-free pure functions under `lib/notepad/`, rendering lives under `components/notepad/`. `vitest.config.ts` runs only `lib/**/*.test.ts` in a node environment, so every rule that needs test coverage must be reachable without React.
4. A sheet freezes a snapshot of the definition it was created from. Editing a template never changes sheets already in play.
5. A sheet has exactly one writer. Everyone who can read the round sees updates live through the existing Realtime path. The writer role can be handed over.
6. A sheet may belong to a round (`game_searches`) or stand alone with free-text player names.
7. Adoption ("fork") copies the definition snapshot from the sheet or template being viewed into a new private template owned by the adopter.
8. Sheets are notes. No score, winner, or result is written to `activity_events`, trust signals, or the profile card. This keeps the boundary to the deferred match-result system (CLAUDE.md §9) explicit.
9. The schema reserves a `skin` slot at definition and block level from day one, so later visual variants of a block need no schema migration.

## Architecture

### Definition schema

```
SheetDefinition {
  schemaVersion: 1
  skin?: { variant?: string }        // reserved, ignored by v1 renderers beyond the default
  blocks: Block[]
}

Block {
  id: string                          // stable, referenced by entries
  type: "round_table" | "jass_board" | "tally" | "text"
  title?: string
  config: <type-specific>
  skin?: { variant?: string }         // reserved
}
```

`lib/notepad/schema.ts` owns the type, a tolerant `parseDefinition` (unknown fields dropped, missing config filled from defaults, unknown block types surfaced as an explicit error rather than a crash), and a `migrateDefinition` seam that is a no-op at version 1.

### Block modules

Each block type is one module in `lib/notepad/blocks/<type>.ts` exporting:

- `type`, `label`
- `defaultConfig`
- `configFields`: a declarative field list (`number`, `select`, `boolean`, `text`, with label, help text, bounds) that the builder renders generically — the builder never hard-codes a block's options.
- `parseConfig(raw): Config`
- `emptyEntries(config, players): Entries`
- `compute(entries, config, players): BlockResult` — pure: per-player or per-team totals, leader, whether a target or limit is reached.

`lib/notepad/registry.ts` maps type to module. `components/notepad/registry.ts` maps type to renderer, keeping React out of `lib/`.

### Block catalogue (v1)

- **`round_table`** — rows are rounds, columns are players. Config: `scoreDirection` (`lowest_wins` | `highest_wins`), `limit` (number or null), `limitBehavior` (`none` | `end_at` | `highlight`), `allowNegative`. Computes column totals, running totals, leader, limit reached. Covers Skyjo, Wizard, Rommé.
- **`jass_board`** — two teams, target score, stroke/arc presentation. Config: `targetScore`, `weisEnabled`, `matchBonus`, `strokeStyle`. Computes team totals, remaining points to target, target reached. Two teams only in v1.
- **`tally`** — per-player counter, no rounds. Config: `step`, `allowNegative`.
- **`text`** — free note, no computation.

### Data model

`notepad_templates`
- `id`, `name`, `description`
- `kind` — `system` | `user`
- `owner_id` — null for system templates
- `game_id` — optional link to `games`, used to suggest a template for a round
- `origin_template_id` — provenance of a fork, nullable
- `schema_version int`, `definition jsonb`
- `created_at`, `updated_at`

`notepad_sheets`
- `id`, `title`
- `search_id` — nullable reference to `game_searches`, `on delete cascade`
- `owner_id` — the current writer
- `template_id` — provenance only, nullable, `on delete set null`
- `schema_version int`, `definition jsonb` — frozen snapshot
- `players jsonb` — ordered `{ id, label, participant_id? }`
- `entries jsonb` — keyed by block id
- `revision int` — optimistic concurrency
- `status` — `active` | `finished`
- `created_at`, `updated_at`

Indexes on `notepad_sheets(search_id)` and `notepad_templates(owner_id)`, plus `notepad_templates(game_id) where kind = 'system'`.

### Write path and concurrency

All browser writes go through `SECURITY DEFINER` RPCs with an explicit `search_path`, matching the existing round RPCs:

- `create_notepad_sheet(p_search_id, p_template_id, p_definition, p_players, p_title)` — snapshots the definition, sets caller as writer; if `p_search_id` is given the caller must be a participant or the round creator.
- `save_notepad_entries(p_sheet_id, p_entries, p_expected_revision)` — writer only, rejects a stale revision so a second tab or a late offline retry cannot silently clobber newer data, increments `revision`.
- `set_notepad_sheet_status(p_sheet_id, p_status)` — writer only.
- `transfer_notepad_writer(p_sheet_id, p_to_user_id)` — writer only, target must be a participant of the same round.
- `save_notepad_template(p_template_id, p_name, p_description, p_game_id, p_definition, p_origin_template_id)` — insert or update a template owned by the caller. System templates are never writable from the browser.

RLS:
- `notepad_templates` select: `kind = 'system' or owner_id = auth.uid()`. Insert/update/delete restricted to the owner.
- `notepad_sheets` select: the owner, or anyone who can already read the parent round under the existing round policy. A sheet with `search_id is null` is visible to its owner only.
- Direct table writes are revoked; only the RPCs write.

Adoption never needs read access to someone else's template row: the sheet carries the full definition snapshot, so forking copies from the sheet the adopter can already see.

### Realtime

Add `notepad_sheets` to the `supabase_realtime` publication in `supabase/enable-realtime.sql` (same idempotent pattern as `participants` and `game_searches`). Readers subscribe per sheet and invalidate the sheet query on change, following `lib/hooks/useRealtimeRound.ts`.

### Client structure

- `lib/db/notepad.ts` — pure RPC/query wrappers, no React.
- `lib/hooks/useNotepad.ts` — TanStack Query hooks: sheet, templates, mutations with optimistic entry updates and query invalidation.
- `components/notepad/` — `SheetView`, block renderers, `TemplatePicker`, `TemplateBuilder`, `ConfigField`.
- Routes: `app/n/[sheetId]/page.tsx` (sheet), `app/vorlagen/page.tsx` (own and system templates, start a standalone sheet), `app/vorlagen/[templateId]/page.tsx` (builder, also used for fork-then-edit).
- Entry points: a "Punkte mitschreiben" action in `app/r/[searchId]/BoardView.tsx` that opens the template picker pre-filtered by the round's `game_id`, and a link to `/vorlagen` from the profile area. `BottomNav` stays two items in v1.

### Player list

For a round-bound sheet, players are pre-filled from joined participants and stay editable (someone at the table may not use the app). For a standalone sheet, names are typed in. Players are stored on the sheet, not derived at read time, so the pad stays stable if a participant leaves mid-game.

## Accessibility and design

- Every score cell is a real labelled input with an accessible name that names both player and round; totals are exposed as text, never colour alone (CLAUDE.md §3, §5).
- Number entry uses `inputMode="numeric"`, tap targets stay at least 44px, and the writer's current cell keeps a visible focus ring.
- The Jass board's strokes are decorative; the numeric team total is always present as text.
- Colours and spacing come from design tokens. Block renderers read their look from the token layer so a later `skin` variant is a styling change, not a data change.
- `prefers-reduced-motion` disables total-count animations.

## Testing and verification

- Unit tests (`lib/**/*.test.ts`, node env): `parseDefinition` accepting valid definitions and rejecting unknown block types; per-block `compute` including Skyjo limit behaviour, lowest/highest wins, negative values, an incomplete round, and Jass target/weis/match arithmetic; fork producing an owned copy with provenance and no shared reference.
- RPC contract tests extending `lib/db/rpc-contract.test.ts`: exact RPC names and parameters, and that no client-supplied owner id is sent.
- No component test harness exists in this repo (node env, `lib/**` only), so renderer behaviour is verified manually rather than by inventing a new harness for this feature alone.
- Full gate: focused Vitest, complete Vitest suite, ESLint, Next production build, `git diff --check`.
- Manual acceptance against the deployed project with two identities: writer edits and reader sees the update live; a non-participant cannot read a private sheet; stale-revision write is rejected; writer handover; adopt a template from a table and edit the copy; standalone sheet without a round; guest identity throughout.

## Out of scope

- User-authored formulas, free-form grids, and user-defined block types.
- More than two teams on the Jass board.
- Scores feeding trust, stats, the profile card, or any leaderboard.
- A public community template library, publishing, moderation, or reporting.
- Multiple simultaneous writers and conflict merging.
- Full offline editing with a write queue; v1 keeps optimistic UI plus retry and cached reads.
- Print or PDF export.
