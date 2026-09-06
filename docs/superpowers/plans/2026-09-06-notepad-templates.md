# Notepad Templates and Score Sheets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Players can keep score at the table on a pad that fits the game — a rounds-by-players table, a Jass board, a tally, a note — built from a fixed block catalogue, shipped as system templates, buildable as own templates, and adoptable from a table.

**Architecture:** A pad definition is versioned declarative JSON. Block *types* are code (pure logic in `lib/notepad/`, renderers in `components/notepad/`); everything else is data. A sheet freezes a snapshot of the definition, has exactly one writer, and syncs to readers through the existing Supabase Realtime path. All browser writes go through `SECURITY DEFINER` RPCs, mirroring the round RPCs.

**Tech Stack:** Next.js 16 App Router, TypeScript, TanStack Query, Supabase/Postgres (RLS + RPC + Realtime), Tailwind v4 with design tokens, Vitest (node env), ESLint, Next build.

**Spec:** `docs/superpowers/specs/2026-09-06-notepad-templates-design.md`

## Global Constraints

- Supabase access only in `lib/db/*` and `lib/hooks/*`; components stay pure (CLAUDE.md §2).
- `vitest.config.ts` runs only `lib/**/*.test.ts` in a **node** environment. Nothing under `lib/notepad/` or `lib/db/` may import React. There is no component test harness in this repo — do not invent one for this feature.
- No hardcoded colours or sizes; use tokens from `app/design-tokens.css` (CLAUDE.md §3).
- Status and result must never be communicated by colour alone; icon buttons need `aria-label`; tap targets at least 44px; respect `prefers-reduced-motion` (CLAUDE.md §5).
- Every browser-originated write goes through an RPC that is `security definer` with `set search_path = public, auth`, `revoke all ... from public`, `grant execute ... to authenticated` — matching `supabase/migrations/20260906000000_mvp_hardening.sql`.
- No client-supplied owner/user id may be passed to any RPC; identity comes from `auth.uid()`.
- Scores must not write to `activity_events`, trust signals, or the profile card.
- Everything must work with the anonymous guest identity and must not crash in demo mode (`isSupabaseConfigured() === false`).
- Every new SQL object goes into a new migration file **and** is mirrored into `supabase/schema.sql` so a fresh install matches an upgraded project.
- German UI copy, English code, comments and docs — as in the existing codebase.

---

## Task 1: Definition schema and structural parser

**Files:**
- Create: `lib/notepad/schema.ts`
- Create: `lib/notepad/schema.test.ts`
- Modify: `lib/types.ts` (append notepad row types)

**Interfaces:**
- Consumes: nothing.
- Produces: `NOTEPAD_SCHEMA_VERSION`, `BlockType`, `SheetBlock`, `SheetDefinition`, `SheetPlayer`, `FieldSpec`, `BlockResult`, `BlockModule`, `NotepadSchemaError`, `parseDefinitionShape(raw): SheetDefinition`, `emptyResult(): BlockResult`. Row types `NotepadTemplate`, `NotepadSheet` in `lib/types.ts`.

- [ ] **Step 1: Write the failing test**

Create `lib/notepad/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  NOTEPAD_SCHEMA_VERSION,
  NotepadSchemaError,
  parseDefinitionShape,
} from "./schema";

const valid = {
  schemaVersion: 1,
  blocks: [{ id: "b1", type: "round_table", config: { limit: 100 } }],
};

describe("parseDefinitionShape", () => {
  it("accepts a minimal definition and keeps block config untouched", () => {
    const def = parseDefinitionShape(valid);
    expect(def.schemaVersion).toBe(NOTEPAD_SCHEMA_VERSION);
    expect(def.blocks).toHaveLength(1);
    expect(def.blocks[0]).toMatchObject({ id: "b1", type: "round_table" });
    expect(def.blocks[0].config).toEqual({ limit: 100 });
  });

  it("keeps the reserved skin slot on definition and block level", () => {
    const def = parseDefinitionShape({
      ...valid,
      skin: { variant: "parchment" },
      blocks: [{ ...valid.blocks[0], skin: { variant: "wood" } }],
    });
    expect(def.skin).toEqual({ variant: "parchment" });
    expect(def.blocks[0].skin).toEqual({ variant: "wood" });
  });

  it("rejects a definition that is not an object", () => {
    expect(() => parseDefinitionShape(null)).toThrow(NotepadSchemaError);
  });

  it("rejects an unsupported schema version", () => {
    expect(() => parseDefinitionShape({ ...valid, schemaVersion: 99 })).toThrow(
      /schema version/i,
    );
  });

  it("rejects an unknown block type", () => {
    expect(() =>
      parseDefinitionShape({ schemaVersion: 1, blocks: [{ id: "b1", type: "nope", config: {} }] }),
    ).toThrow(/unknown block type/i);
  });

  it("rejects duplicate block ids because entries are keyed by them", () => {
    expect(() =>
      parseDefinitionShape({
        schemaVersion: 1,
        blocks: [
          { id: "b1", type: "text", config: {} },
          { id: "b1", type: "tally", config: {} },
        ],
      }),
    ).toThrow(/duplicate block id/i);
  });

  it("rejects a definition without any block", () => {
    expect(() => parseDefinitionShape({ schemaVersion: 1, blocks: [] })).toThrow(
      /at least one block/i,
    );
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run lib/notepad/schema.test.ts`
Expected: FAIL — cannot resolve `./schema`.

- [ ] **Step 3: Write the schema module**

Create `lib/notepad/schema.ts`:

```ts
/**
 * Notizblock-Schema (Spec: docs/superpowers/specs/2026-09-06-notepad-templates-design.md).
 * Reine Typen + strukturelle Validierung — kennt bewusst KEINE Block-Konfigurationen,
 * damit `lib/notepad/registry.ts` darauf aufbauen kann, ohne Zyklus.
 * Muss React-frei bleiben (vitest läuft in node env über lib/**).
 */

export const NOTEPAD_SCHEMA_VERSION = 1;

export const BLOCK_TYPES = ["round_table", "jass_board", "tally", "text"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

/** Reserviert für spätere Optik-Varianten; v1 rendert immer die Default-Variante. */
export interface BlockSkin {
  variant?: string;
}

export interface SheetBlock {
  id: string;
  type: BlockType;
  title?: string;
  config: Record<string, unknown>;
  skin?: BlockSkin;
}

export interface SheetDefinition {
  schemaVersion: number;
  skin?: BlockSkin;
  blocks: SheetBlock[];
}

export interface SheetPlayer {
  id: string;
  label: string;
  participant_id?: string | null;
}

export type FieldSpec =
  | { key: string; kind: "number"; label: string; help?: string; min?: number; max?: number; nullable?: boolean }
  | { key: string; kind: "boolean"; label: string; help?: string }
  | { key: string; kind: "text"; label: string; help?: string; maxLength?: number }
  | { key: string; kind: "select"; label: string; help?: string; options: Array<{ value: string; label: string }> };

/** Ergebnis eines Blocks. Keys sind Spieler-IDs bzw. Team-IDs ("a" | "b"). */
export interface BlockResult {
  totals: Record<string, number>;
  leader: string | null;
  target: number | null;
  remaining: Record<string, number> | null;
  targetReached: boolean;
}

export function emptyResult(): BlockResult {
  return { totals: {}, leader: null, target: null, remaining: null, targetReached: false };
}

/**
 * Ein Blocktyp im Katalog. Alle Eingänge nehmen `unknown`, weil Definition und
 * Einträge aus jsonb kommen: jeder Block parst defensiv selbst.
 */
export interface BlockModule {
  type: BlockType;
  label: string;
  defaultConfig: Record<string, unknown>;
  configFields: FieldSpec[];
  parseConfig(raw: unknown): Record<string, unknown>;
  emptyEntries(config: unknown, players: SheetPlayer[]): unknown;
  parseEntries(raw: unknown, config: unknown, players: SheetPlayer[]): unknown;
  compute(entries: unknown, config: unknown, players: SheetPlayer[]): BlockResult;
}

export class NotepadSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotepadSchemaError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSkin(raw: unknown): BlockSkin | undefined {
  if (!isRecord(raw)) return undefined;
  const variant = raw.variant;
  return typeof variant === "string" ? { variant } : {};
}

/**
 * Strukturelle Prüfung: Version, Blockliste, eindeutige IDs, bekannte Typen.
 * Block-`config` bleibt hier unangetastet — das macht der jeweilige Blocktyp.
 */
export function parseDefinitionShape(raw: unknown): SheetDefinition {
  if (!isRecord(raw)) throw new NotepadSchemaError("Definition must be an object");
  if (raw.schemaVersion !== NOTEPAD_SCHEMA_VERSION) {
    throw new NotepadSchemaError(
      `Unsupported schema version: ${String(raw.schemaVersion)}`,
    );
  }
  if (!Array.isArray(raw.blocks) || raw.blocks.length === 0) {
    throw new NotepadSchemaError("Definition needs at least one block");
  }

  const seen = new Set<string>();
  const blocks = raw.blocks.map((entry, index) => {
    if (!isRecord(entry)) throw new NotepadSchemaError(`Block ${index} must be an object`);
    const id = entry.id;
    if (typeof id !== "string" || id.length === 0) {
      throw new NotepadSchemaError(`Block ${index} needs a non-empty id`);
    }
    if (seen.has(id)) throw new NotepadSchemaError(`Duplicate block id: ${id}`);
    seen.add(id);
    if (!BLOCK_TYPES.includes(entry.type as BlockType)) {
      throw new NotepadSchemaError(`Unknown block type: ${String(entry.type)}`);
    }
    const block: SheetBlock = {
      id,
      type: entry.type as BlockType,
      config: isRecord(entry.config) ? entry.config : {},
    };
    if (typeof entry.title === "string") block.title = entry.title;
    const skin = parseSkin(entry.skin);
    if (skin) block.skin = skin;
    return block;
  });

  const definition: SheetDefinition = { schemaVersion: NOTEPAD_SCHEMA_VERSION, blocks };
  const skin = parseSkin(raw.skin);
  if (skin) definition.skin = skin;
  return definition;
}
```

- [ ] **Step 4: Append the row types**

Append to `lib/types.ts`:

```ts
export type NotepadTemplateKind = "system" | "user";
export type NotepadSheetStatus = "active" | "finished";

export interface NotepadTemplate {
  id: string;
  name: string;
  description: string | null;
  kind: NotepadTemplateKind;
  owner_id: string | null;
  game_id: string | null;
  origin_template_id: string | null;
  schema_version: number;
  definition: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NotepadSheet {
  id: string;
  title: string | null;
  search_id: string | null;
  owner_id: string;
  template_id: string | null;
  schema_version: number;
  definition: Record<string, unknown>;
  players: Array<{ id: string; label: string; participant_id?: string | null }>;
  entries: Record<string, unknown>;
  revision: number;
  status: NotepadSheetStatus;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 5: Run the test and verify it passes**

Run: `npx vitest run lib/notepad/schema.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/notepad/schema.ts lib/notepad/schema.test.ts lib/types.ts
git commit -m "Add notepad definition schema and structural parser"
```

---

## Task 2: `round_table` block module

**Files:**
- Create: `lib/notepad/blocks/roundTable.ts`
- Create: `lib/notepad/blocks/roundTable.test.ts`

**Interfaces:**
- Consumes: `BlockModule`, `BlockResult`, `FieldSpec`, `SheetPlayer` from `lib/notepad/schema.ts`.
- Produces: `roundTableBlock: BlockModule`, `RoundTableConfig`, `RoundTableEntries` (`{ rounds: Array<Record<string, number | null>> }`).

- [ ] **Step 1: Write the failing test**

Create `lib/notepad/blocks/roundTable.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { roundTableBlock } from "./roundTable";
import type { SheetPlayer } from "../schema";

const players: SheetPlayer[] = [
  { id: "p1", label: "Ann" },
  { id: "p2", label: "Bo" },
];

const skyjo = roundTableBlock.parseConfig({
  scoreDirection: "lowest_wins",
  limit: 100,
  limitBehavior: "end_at",
  allowNegative: true,
});

describe("roundTableBlock.parseConfig", () => {
  it("fills defaults for missing and invalid fields", () => {
    expect(roundTableBlock.parseConfig({})).toEqual(roundTableBlock.defaultConfig);
    expect(roundTableBlock.parseConfig({ scoreDirection: "sideways" })).toMatchObject({
      scoreDirection: "highest_wins",
    });
  });

  it("treats a non-numeric limit as no limit", () => {
    expect(roundTableBlock.parseConfig({ limit: "viel" })).toMatchObject({ limit: null });
  });
});

describe("roundTableBlock.parseEntries", () => {
  it("keeps only known players and coerces junk to null", () => {
    const entries = roundTableBlock.parseEntries(
      { rounds: [{ p1: 12, p2: "x", ghost: 5 }] },
      skyjo,
      players,
    ) as { rounds: Array<Record<string, number | null>> };
    expect(entries.rounds).toEqual([{ p1: 12, p2: null }]);
  });

  it("drops negative values when the config forbids them", () => {
    const config = roundTableBlock.parseConfig({ allowNegative: false });
    const entries = roundTableBlock.parseEntries({ rounds: [{ p1: -3, p2: 4 }] }, config, players) as {
      rounds: Array<Record<string, number | null>>;
    };
    expect(entries.rounds).toEqual([{ p1: null, p2: 4 }]);
  });
});

describe("roundTableBlock.compute", () => {
  it("sums columns and ignores empty cells", () => {
    const result = roundTableBlock.compute(
      { rounds: [{ p1: 10, p2: null }, { p1: 5, p2: 7 }] },
      skyjo,
      players,
    );
    expect(result.totals).toEqual({ p1: 15, p2: 7 });
  });

  it("names the lowest total as leader when lowest wins", () => {
    const result = roundTableBlock.compute({ rounds: [{ p1: 10, p2: 7 }] }, skyjo, players);
    expect(result.leader).toBe("p2");
  });

  it("names the highest total as leader when highest wins", () => {
    const config = roundTableBlock.parseConfig({ scoreDirection: "highest_wins" });
    const result = roundTableBlock.compute({ rounds: [{ p1: 10, p2: 7 }] }, config, players);
    expect(result.leader).toBe("p1");
  });

  it("reports no leader on a tie", () => {
    const result = roundTableBlock.compute({ rounds: [{ p1: 7, p2: 7 }] }, skyjo, players);
    expect(result.leader).toBeNull();
  });

  it("reports the limit as reached at exactly the limit and exposes the remainder", () => {
    const result = roundTableBlock.compute({ rounds: [{ p1: 100, p2: 40 }] }, skyjo, players);
    expect(result.target).toBe(100);
    expect(result.targetReached).toBe(true);
    expect(result.remaining).toEqual({ p1: 0, p2: 60 });
  });

  it("never reports a target when no limit is configured", () => {
    const config = roundTableBlock.parseConfig({ limit: null });
    const result = roundTableBlock.compute({ rounds: [{ p1: 999, p2: 1 }] }, config, players);
    expect(result.target).toBeNull();
    expect(result.remaining).toBeNull();
    expect(result.targetReached).toBe(false);
  });

  it("returns zero totals for a sheet without rounds", () => {
    const result = roundTableBlock.compute(roundTableBlock.emptyEntries(skyjo, players), skyjo, players);
    expect(result.totals).toEqual({ p1: 0, p2: 0 });
    expect(result.leader).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run lib/notepad/blocks/roundTable.test.ts`
Expected: FAIL — cannot resolve `./roundTable`.

- [ ] **Step 3: Write the module**

Create `lib/notepad/blocks/roundTable.ts`:

```ts
/**
 * Zeile = Runde, Spalte = Spieler, Spaltensumme automatisch.
 * Deckt Skyjo (niedrigste Summe, Limit 100), Wizard, Rommé ab.
 */
import type { BlockModule, BlockResult, FieldSpec, SheetPlayer } from "../schema";

export type ScoreDirection = "lowest_wins" | "highest_wins";
export type LimitBehavior = "none" | "end_at" | "highlight";

export interface RoundTableConfig {
  scoreDirection: ScoreDirection;
  limit: number | null;
  limitBehavior: LimitBehavior;
  allowNegative: boolean;
}

export interface RoundTableEntries {
  rounds: Array<Record<string, number | null>>;
}

const DEFAULT_CONFIG: RoundTableConfig = {
  scoreDirection: "highest_wins",
  limit: null,
  limitBehavior: "none",
  allowNegative: true,
};

const CONFIG_FIELDS: FieldSpec[] = [
  {
    key: "scoreDirection",
    kind: "select",
    label: "Wer gewinnt",
    options: [
      { value: "highest_wins", label: "Höchste Summe gewinnt" },
      { value: "lowest_wins", label: "Niedrigste Summe gewinnt" },
    ],
  },
  { key: "limit", kind: "number", label: "Punktelimit", help: "Leer lassen für kein Limit.", min: 1, nullable: true },
  {
    key: "limitBehavior",
    kind: "select",
    label: "Beim Limit",
    options: [
      { value: "none", label: "Nichts tun" },
      { value: "highlight", label: "Nur hervorheben" },
      { value: "end_at", label: "Spielende anzeigen" },
    ],
  },
  { key: "allowNegative", kind: "boolean", label: "Minuspunkte erlauben" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asConfig(raw: unknown): RoundTableConfig {
  return parseConfig(raw) as unknown as RoundTableConfig;
}

function parseConfig(raw: unknown): Record<string, unknown> {
  const input = isRecord(raw) ? raw : {};
  const limit = typeof input.limit === "number" && Number.isFinite(input.limit) && input.limit > 0
    ? Math.floor(input.limit)
    : null;
  return {
    scoreDirection:
      input.scoreDirection === "lowest_wins" ? "lowest_wins" : DEFAULT_CONFIG.scoreDirection,
    limit,
    limitBehavior:
      input.limitBehavior === "end_at" || input.limitBehavior === "highlight"
        ? input.limitBehavior
        : DEFAULT_CONFIG.limitBehavior,
    allowNegative: input.allowNegative !== false,
  } satisfies RoundTableConfig as unknown as Record<string, unknown>;
}

function parseCell(value: unknown, config: RoundTableConfig): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (!config.allowNegative && value < 0) return null;
  return value;
}

function parseEntries(raw: unknown, rawConfig: unknown, players: SheetPlayer[]): RoundTableEntries {
  const config = asConfig(rawConfig);
  const rows = isRecord(raw) && Array.isArray(raw.rounds) ? raw.rounds : [];
  return {
    rounds: rows.map((row) => {
      const source = isRecord(row) ? row : {};
      const parsed: Record<string, number | null> = {};
      for (const player of players) parsed[player.id] = parseCell(source[player.id], config);
      return parsed;
    }),
  };
}

function compute(rawEntries: unknown, rawConfig: unknown, players: SheetPlayer[]): BlockResult {
  const config = asConfig(rawConfig);
  const entries = parseEntries(rawEntries, config, players);

  const totals: Record<string, number> = {};
  for (const player of players) {
    totals[player.id] = entries.rounds.reduce((sum, row) => sum + (row[player.id] ?? 0), 0);
  }

  const ranked = players.map((p) => totals[p.id]);
  const best = config.scoreDirection === "lowest_wins" ? Math.min(...ranked) : Math.max(...ranked);
  const bestIds = players.filter((p) => totals[p.id] === best).map((p) => p.id);
  const leader = players.length > 0 && bestIds.length === 1 ? bestIds[0] : null;

  const target = config.limit;
  const remaining = target === null
    ? null
    : Object.fromEntries(players.map((p) => [p.id, Math.max(0, target - totals[p.id])]));
  const targetReached =
    target !== null && config.limitBehavior !== "none" && players.some((p) => totals[p.id] >= target);

  return { totals, leader, target, remaining, targetReached };
}

export const roundTableBlock: BlockModule = {
  type: "round_table",
  label: "Runden-Tabelle",
  defaultConfig: DEFAULT_CONFIG as unknown as Record<string, unknown>,
  configFields: CONFIG_FIELDS,
  parseConfig,
  emptyEntries: () => ({ rounds: [] } satisfies RoundTableEntries),
  parseEntries,
  compute,
};
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx vitest run lib/notepad/blocks/roundTable.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/notepad/blocks/roundTable.ts lib/notepad/blocks/roundTable.test.ts
git commit -m "Add round_table notepad block with scoring rules"
```

---

## Task 3: `jass_board` block module

**Files:**
- Create: `lib/notepad/blocks/jassBoard.ts`
- Create: `lib/notepad/blocks/jassBoard.test.ts`

**Interfaces:**
- Consumes: `BlockModule`, `BlockResult`, `FieldSpec`, `SheetPlayer` from `lib/notepad/schema.ts`.
- Produces: `jassBoardBlock: BlockModule`, `JassConfig`, `JassEntries`, `JASS_TEAMS = ["a", "b"] as const`, `JassTeamId`. Totals and remaining are keyed by team id `"a"`/`"b"`, not by player id.

- [ ] **Step 1: Write the failing test**

Create `lib/notepad/blocks/jassBoard.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { jassBoardBlock } from "./jassBoard";

const config = jassBoardBlock.parseConfig({
  targetScore: 2500,
  weisEnabled: true,
  matchBonus: 100,
});

describe("jassBoardBlock.parseConfig", () => {
  it("defaults to a 1000-point Schieber without match bonus", () => {
    expect(jassBoardBlock.parseConfig({})).toEqual(jassBoardBlock.defaultConfig);
    expect(jassBoardBlock.defaultConfig).toMatchObject({ targetScore: 1000, matchBonus: 0 });
  });

  it("falls back to the default target for a nonsense value", () => {
    expect(jassBoardBlock.parseConfig({ targetScore: -5 })).toMatchObject({ targetScore: 1000 });
  });
});

describe("jassBoardBlock.compute", () => {
  it("sums plain points per team", () => {
    const result = jassBoardBlock.compute(
      { rows: [{ a: 80, b: 77 }, { a: 60, b: 97 }] },
      config,
      [],
    );
    expect(result.totals).toEqual({ a: 140, b: 174 });
    expect(result.leader).toBe("b");
  });

  it("adds Weis only when Weis is enabled", () => {
    const withWeis = jassBoardBlock.compute({ rows: [{ a: 80, aWeis: 50, b: 77 }] }, config, []);
    expect(withWeis.totals.a).toBe(130);

    const off = jassBoardBlock.parseConfig({ targetScore: 2500, weisEnabled: false });
    const withoutWeis = jassBoardBlock.compute({ rows: [{ a: 80, aWeis: 50, b: 77 }] }, off, []);
    expect(withoutWeis.totals.a).toBe(80);
  });

  it("adds the match bonus once per marked row", () => {
    const result = jassBoardBlock.compute({ rows: [{ a: 157, aMatch: true, b: 0 }] }, config, []);
    expect(result.totals.a).toBe(257);
  });

  it("reports the remaining points to the target per team", () => {
    const result = jassBoardBlock.compute({ rows: [{ a: 500, b: 300 }] }, config, []);
    expect(result.target).toBe(2500);
    expect(result.remaining).toEqual({ a: 2000, b: 2200 });
    expect(result.targetReached).toBe(false);
  });

  it("reports the target as reached at exactly the target score", () => {
    const result = jassBoardBlock.compute({ rows: [{ a: 2500, b: 300 }] }, config, []);
    expect(result.targetReached).toBe(true);
    expect(result.remaining).toEqual({ a: 0, b: 2200 });
  });

  it("reports no leader while both teams are level", () => {
    const result = jassBoardBlock.compute({ rows: [{ a: 100, b: 100 }] }, config, []);
    expect(result.leader).toBeNull();
  });

  it("starts an empty board at zero for both teams", () => {
    const result = jassBoardBlock.compute(jassBoardBlock.emptyEntries(config, []), config, []);
    expect(result.totals).toEqual({ a: 0, b: 0 });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run lib/notepad/blocks/jassBoard.test.ts`
Expected: FAIL — cannot resolve `./jassBoard`.

- [ ] **Step 3: Write the module**

Create `lib/notepad/blocks/jassBoard.ts`:

```ts
/**
 * Jass-Tafel: zwei Teams, Zielpunkte, optional Weis und Match-Bonus.
 * Die Strich-/Bogen-Optik ist reine Darstellung (components/notepad) —
 * hier steckt nur die Arithmetik.
 */
import type { BlockModule, BlockResult, FieldSpec, SheetPlayer } from "../schema";

export const JASS_TEAMS = ["a", "b"] as const;
export type JassTeamId = (typeof JASS_TEAMS)[number];

export interface JassConfig {
  targetScore: number;
  weisEnabled: boolean;
  matchBonus: number;
  strokeStyle: "swiss" | "plain";
  teamALabel: string;
  teamBLabel: string;
}

export interface JassRow {
  a: number | null;
  b: number | null;
  aWeis: number | null;
  bWeis: number | null;
  aMatch: boolean;
  bMatch: boolean;
}

export interface JassEntries {
  rows: JassRow[];
}

const DEFAULT_CONFIG: JassConfig = {
  targetScore: 1000,
  weisEnabled: true,
  matchBonus: 0,
  strokeStyle: "swiss",
  teamALabel: "Wir",
  teamBLabel: "Ihr",
};

const CONFIG_FIELDS: FieldSpec[] = [
  { key: "targetScore", kind: "number", label: "Zielpunkte", help: "Üblich: 1000 oder 2500.", min: 1 },
  { key: "weisEnabled", kind: "boolean", label: "Weis mitzählen" },
  { key: "matchBonus", kind: "number", label: "Match-Bonus", help: "0 = kein Bonus.", min: 0 },
  {
    key: "strokeStyle",
    kind: "select",
    label: "Darstellung",
    options: [
      { value: "swiss", label: "Striche und Bögen" },
      { value: "plain", label: "Nur Zahlen" },
    ],
  },
  { key: "teamALabel", kind: "text", label: "Team 1", maxLength: 24 },
  { key: "teamBLabel", kind: "text", label: "Team 2", maxLength: 24 },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function label(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, 24) : fallback;
}

function parseConfig(raw: unknown): Record<string, unknown> {
  const input = isRecord(raw) ? raw : {};
  return {
    targetScore: positiveInt(input.targetScore, DEFAULT_CONFIG.targetScore),
    weisEnabled: input.weisEnabled !== false,
    matchBonus:
      typeof input.matchBonus === "number" && Number.isFinite(input.matchBonus) && input.matchBonus >= 0
        ? Math.floor(input.matchBonus)
        : DEFAULT_CONFIG.matchBonus,
    strokeStyle: input.strokeStyle === "plain" ? "plain" : DEFAULT_CONFIG.strokeStyle,
    teamALabel: label(input.teamALabel, DEFAULT_CONFIG.teamALabel),
    teamBLabel: label(input.teamBLabel, DEFAULT_CONFIG.teamBLabel),
  } satisfies JassConfig as unknown as Record<string, unknown>;
}

function asConfig(raw: unknown): JassConfig {
  return parseConfig(raw) as unknown as JassConfig;
}

function points(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function parseEntries(raw: unknown): JassEntries {
  const rows = isRecord(raw) && Array.isArray(raw.rows) ? raw.rows : [];
  return {
    rows: rows.map((row) => {
      const source = isRecord(row) ? row : {};
      return {
        a: points(source.a),
        b: points(source.b),
        aWeis: points(source.aWeis),
        bWeis: points(source.bWeis),
        aMatch: source.aMatch === true,
        bMatch: source.bMatch === true,
      };
    }),
  };
}

function teamTotal(entries: JassEntries, team: JassTeamId, config: JassConfig): number {
  return entries.rows.reduce((sum, row) => {
    const base = (team === "a" ? row.a : row.b) ?? 0;
    const weis = config.weisEnabled ? (team === "a" ? row.aWeis : row.bWeis) ?? 0 : 0;
    const match = (team === "a" ? row.aMatch : row.bMatch) ? config.matchBonus : 0;
    return sum + base + weis + match;
  }, 0);
}

function compute(rawEntries: unknown, rawConfig: unknown, _players: SheetPlayer[]): BlockResult {
  const config = asConfig(rawConfig);
  const entries = parseEntries(rawEntries);

  const totals: Record<string, number> = {
    a: teamTotal(entries, "a", config),
    b: teamTotal(entries, "b", config),
  };
  const leader = totals.a === totals.b ? null : totals.a > totals.b ? "a" : "b";
  const target = config.targetScore;

  return {
    totals,
    leader,
    target,
    remaining: { a: Math.max(0, target - totals.a), b: Math.max(0, target - totals.b) },
    targetReached: totals.a >= target || totals.b >= target,
  };
}

export const jassBoardBlock: BlockModule = {
  type: "jass_board",
  label: "Jass-Tafel",
  defaultConfig: DEFAULT_CONFIG as unknown as Record<string, unknown>,
  configFields: CONFIG_FIELDS,
  parseConfig,
  emptyEntries: () => ({ rows: [] } satisfies JassEntries),
  parseEntries: (raw) => parseEntries(raw),
  compute,
};
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx vitest run lib/notepad/blocks/jassBoard.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/notepad/blocks/jassBoard.ts lib/notepad/blocks/jassBoard.test.ts
git commit -m "Add jass_board notepad block with team scoring"
```

---

## Task 4: `tally` and `text` blocks plus the registry

**Files:**
- Create: `lib/notepad/blocks/tally.ts`
- Create: `lib/notepad/blocks/text.ts`
- Create: `lib/notepad/registry.ts`
- Create: `lib/notepad/registry.test.ts`

**Interfaces:**
- Consumes: `roundTableBlock`, `jassBoardBlock`, schema types.
- Produces: `tallyBlock`, `textBlock`, `BLOCK_MODULES: Record<BlockType, BlockModule>`, `blockModule(type): BlockModule`, `parseDefinition(raw): SheetDefinition` (shape check **plus** per-block config parsing), `migrateDefinition(raw): unknown`, `emptySheetEntries(def, players): Record<string, unknown>`, `computeSheet(def, entries, players): Record<string, BlockResult>`.

- [ ] **Step 1: Write the failing test**

Create `lib/notepad/registry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BLOCK_MODULES, computeSheet, emptySheetEntries, parseDefinition } from "./registry";
import { NotepadSchemaError } from "./schema";
import type { SheetPlayer } from "./schema";

const players: SheetPlayer[] = [
  { id: "p1", label: "Ann" },
  { id: "p2", label: "Bo" },
];

const definition = {
  schemaVersion: 1,
  blocks: [
    { id: "table", type: "round_table", config: { scoreDirection: "lowest_wins", limit: 100 } },
    { id: "note", type: "text", config: {} },
  ],
};

describe("BLOCK_MODULES", () => {
  it("covers every block type exactly once", () => {
    expect(Object.keys(BLOCK_MODULES).sort()).toEqual(
      ["jass_board", "round_table", "tally", "text"],
    );
    for (const [type, module] of Object.entries(BLOCK_MODULES)) {
      expect(module.type).toBe(type);
      expect(module.label.length).toBeGreaterThan(0);
    }
  });
});

describe("parseDefinition", () => {
  it("normalises each block config through its own module", () => {
    const def = parseDefinition(definition);
    expect(def.blocks[0].config).toMatchObject({
      scoreDirection: "lowest_wins",
      limit: 100,
      limitBehavior: "none",
      allowNegative: true,
    });
  });

  it("still rejects structurally invalid definitions", () => {
    expect(() => parseDefinition({ schemaVersion: 1, blocks: [{ id: "x", type: "nope" }] })).toThrow(
      NotepadSchemaError,
    );
  });
});

describe("emptySheetEntries", () => {
  it("creates one empty entry container per block, keyed by block id", () => {
    const entries = emptySheetEntries(parseDefinition(definition), players);
    expect(Object.keys(entries).sort()).toEqual(["note", "table"]);
    expect(entries.table).toEqual({ rounds: [] });
  });
});

describe("computeSheet", () => {
  it("returns one result per block and tolerates missing entries", () => {
    const def = parseDefinition(definition);
    const results = computeSheet(def, { table: { rounds: [{ p1: 30, p2: 12 }] } }, players);
    expect(results.table.totals).toEqual({ p1: 30, p2: 12 });
    expect(results.table.leader).toBe("p2");
    expect(results.note.totals).toEqual({});
  });
});

describe("tallyBlock", () => {
  it("counts per player and names the highest count as leader", () => {
    const tally = BLOCK_MODULES.tally;
    const config = tally.parseConfig({ step: 1, allowNegative: false });
    const result = tally.compute({ counts: { p1: 3, p2: 5 } }, config, players);
    expect(result.totals).toEqual({ p1: 3, p2: 5 });
    expect(result.leader).toBe("p2");
  });

  it("clamps counts to zero when negatives are forbidden", () => {
    const tally = BLOCK_MODULES.tally;
    const config = tally.parseConfig({ allowNegative: false });
    const result = tally.compute({ counts: { p1: -4, p2: 0 } }, config, players);
    expect(result.totals).toEqual({ p1: 0, p2: 0 });
  });
});

describe("textBlock", () => {
  it("keeps a string value and computes nothing", () => {
    const text = BLOCK_MODULES.text;
    expect(text.parseEntries({ value: "Hausregel: kein Stapeln" }, {}, players)).toEqual({
      value: "Hausregel: kein Stapeln",
    });
    expect(text.compute({ value: "x" }, {}, players)).toMatchObject({ totals: {}, leader: null });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run lib/notepad/registry.test.ts`
Expected: FAIL — cannot resolve `./registry`.

- [ ] **Step 3: Write the tally block**

Create `lib/notepad/blocks/tally.ts`:

```ts
/** Einfacher Zähler pro Spieler (Stiche, Siege, Chips) — ohne Runden. */
import type { BlockModule, BlockResult, FieldSpec, SheetPlayer } from "../schema";

export interface TallyConfig {
  step: number;
  allowNegative: boolean;
}

export interface TallyEntries {
  counts: Record<string, number>;
}

const DEFAULT_CONFIG: TallyConfig = { step: 1, allowNegative: false };

const CONFIG_FIELDS: FieldSpec[] = [
  { key: "step", kind: "number", label: "Schrittweite", min: 1 },
  { key: "allowNegative", kind: "boolean", label: "Minuswerte erlauben" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseConfig(raw: unknown): Record<string, unknown> {
  const input = isRecord(raw) ? raw : {};
  return {
    step:
      typeof input.step === "number" && Number.isFinite(input.step) && input.step > 0
        ? Math.floor(input.step)
        : DEFAULT_CONFIG.step,
    allowNegative: input.allowNegative === true,
  } satisfies TallyConfig as unknown as Record<string, unknown>;
}

function parseEntries(raw: unknown, rawConfig: unknown, players: SheetPlayer[]): TallyEntries {
  const config = parseConfig(rawConfig) as unknown as TallyConfig;
  const source = isRecord(raw) && isRecord(raw.counts) ? raw.counts : {};
  const counts: Record<string, number> = {};
  for (const player of players) {
    const value = source[player.id];
    const numeric = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : 0;
    counts[player.id] = config.allowNegative ? numeric : Math.max(0, numeric);
  }
  return { counts };
}

function compute(rawEntries: unknown, rawConfig: unknown, players: SheetPlayer[]): BlockResult {
  const { counts } = parseEntries(rawEntries, rawConfig, players);
  const values = players.map((p) => counts[p.id]);
  const best = values.length > 0 ? Math.max(...values) : 0;
  const bestIds = players.filter((p) => counts[p.id] === best).map((p) => p.id);
  return {
    totals: counts,
    leader: players.length > 0 && bestIds.length === 1 ? bestIds[0] : null,
    target: null,
    remaining: null,
    targetReached: false,
  };
}

export const tallyBlock: BlockModule = {
  type: "tally",
  label: "Strichliste",
  defaultConfig: DEFAULT_CONFIG as unknown as Record<string, unknown>,
  configFields: CONFIG_FIELDS,
  parseConfig,
  emptyEntries: (config, players) => parseEntries({}, config, players),
  parseEntries,
  compute,
};
```

- [ ] **Step 4: Write the text block**

Create `lib/notepad/blocks/text.ts`:

```ts
/** Freitext-Notiz (Hausregeln, Erweiterungen, wer gibt) — rechnet nichts. */
import type { BlockModule, FieldSpec } from "../schema";
import { emptyResult } from "../schema";

export interface TextConfig {
  placeholder: string;
}

export interface TextEntries {
  value: string;
}

const DEFAULT_CONFIG: TextConfig = { placeholder: "Notiz …" };

const CONFIG_FIELDS: FieldSpec[] = [
  { key: "placeholder", kind: "text", label: "Platzhalter", maxLength: 60 },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseConfig(raw: unknown): Record<string, unknown> {
  const input = isRecord(raw) ? raw : {};
  return {
    placeholder:
      typeof input.placeholder === "string" && input.placeholder.length > 0
        ? input.placeholder.slice(0, 60)
        : DEFAULT_CONFIG.placeholder,
  } satisfies TextConfig as unknown as Record<string, unknown>;
}

export const textBlock: BlockModule = {
  type: "text",
  label: "Notiz",
  defaultConfig: DEFAULT_CONFIG as unknown as Record<string, unknown>,
  configFields: CONFIG_FIELDS,
  parseConfig,
  emptyEntries: () => ({ value: "" } satisfies TextEntries),
  parseEntries: (raw) => ({
    value: isRecord(raw) && typeof raw.value === "string" ? raw.value : "",
  } satisfies TextEntries),
  compute: () => emptyResult(),
};
```

- [ ] **Step 5: Write the registry**

Create `lib/notepad/registry.ts`:

```ts
/**
 * Block-Katalog: verheiratet Schema und Blocktypen.
 * Ein neuer Notizblock-STIL ist ein neuer Eintrag hier (Code-Deploy),
 * eine neue VORLAGE ist reine Daten (kein Deploy).
 */
import { jassBoardBlock } from "./blocks/jassBoard";
import { roundTableBlock } from "./blocks/roundTable";
import { tallyBlock } from "./blocks/tally";
import { textBlock } from "./blocks/text";
import {
  NOTEPAD_SCHEMA_VERSION,
  NotepadSchemaError,
  parseDefinitionShape,
} from "./schema";
import type { BlockModule, BlockResult, BlockType, SheetDefinition, SheetPlayer } from "./schema";

export const BLOCK_MODULES: Record<BlockType, BlockModule> = {
  round_table: roundTableBlock,
  jass_board: jassBoardBlock,
  tally: tallyBlock,
  text: textBlock,
};

export function blockModule(type: BlockType): BlockModule {
  const module = BLOCK_MODULES[type];
  if (!module) throw new NotepadSchemaError(`Unknown block type: ${type}`);
  return module;
}

/** Platzhalter für spätere Schema-Versionen; v1 reicht die Rohdaten durch. */
export function migrateDefinition(raw: unknown): unknown {
  return raw;
}

/** Vollständiges Parsen: Struktur + Block-Konfiguration je Typ. */
export function parseDefinition(raw: unknown): SheetDefinition {
  const shaped = parseDefinitionShape(migrateDefinition(raw));
  return {
    ...shaped,
    schemaVersion: NOTEPAD_SCHEMA_VERSION,
    blocks: shaped.blocks.map((block) => ({
      ...block,
      config: blockModule(block.type).parseConfig(block.config),
    })),
  };
}

export function emptySheetEntries(
  definition: SheetDefinition,
  players: SheetPlayer[],
): Record<string, unknown> {
  const entries: Record<string, unknown> = {};
  for (const block of definition.blocks) {
    entries[block.id] = blockModule(block.type).emptyEntries(block.config, players);
  }
  return entries;
}

export function computeSheet(
  definition: SheetDefinition,
  entries: Record<string, unknown>,
  players: SheetPlayer[],
): Record<string, BlockResult> {
  const results: Record<string, BlockResult> = {};
  for (const block of definition.blocks) {
    const module = blockModule(block.type);
    results[block.id] = module.compute(entries?.[block.id], block.config, players);
  }
  return results;
}
```

- [ ] **Step 6: Run the test and verify it passes**

Run: `npx vitest run lib/notepad/registry.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 7: Commit**

```bash
git add lib/notepad/blocks/tally.ts lib/notepad/blocks/text.ts lib/notepad/registry.ts lib/notepad/registry.test.ts
git commit -m "Add tally and text notepad blocks with the block registry"
```

---

## Task 5: Fork, draft and player helpers

**Files:**
- Create: `lib/notepad/authoring.ts`
- Create: `lib/notepad/authoring.test.ts`

**Interfaces:**
- Consumes: `parseDefinition`, `blockModule`, `BLOCK_MODULES` from `lib/notepad/registry.ts`; schema types; `ParticipantWithProfile` from `lib/types.ts`.
- Produces:
  - `forkDefinition(raw: unknown, makeId?: () => string): SheetDefinition` — deep copy with fresh block ids.
  - `addBlock(def: SheetDefinition, type: BlockType, makeId?: () => string): SheetDefinition`
  - `removeBlock(def: SheetDefinition, blockId: string): SheetDefinition`
  - `moveBlock(def: SheetDefinition, blockId: string, delta: number): SheetDefinition`
  - `updateBlockConfig(def: SheetDefinition, blockId: string, patch: Record<string, unknown>): SheetDefinition`
  - `emptyDefinition(makeId?: () => string): SheetDefinition`
  - `playersFromParticipants(participants: ParticipantWithProfile[]): SheetPlayer[]`
  - `playersFromNames(names: string[], makeId?: () => string): SheetPlayer[]`

- [ ] **Step 1: Write the failing test**

Create `lib/notepad/authoring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  addBlock,
  emptyDefinition,
  forkDefinition,
  moveBlock,
  playersFromNames,
  playersFromParticipants,
  removeBlock,
  updateBlockConfig,
} from "./authoring";
import type { ParticipantWithProfile } from "@/lib/types";

function ids() {
  let n = 0;
  return () => `id-${++n}`;
}

const source = {
  schemaVersion: 1,
  blocks: [
    { id: "old-1", type: "round_table", config: { limit: 100 } },
    { id: "old-2", type: "text", config: {} },
  ],
};

describe("forkDefinition", () => {
  it("returns a deep copy with fresh block ids", () => {
    const fork = forkDefinition(source, ids());
    expect(fork.blocks.map((b) => b.id)).toEqual(["id-1", "id-2"]);
    expect(fork.blocks[0].config).toMatchObject({ limit: 100 });
  });

  it("shares no references with the source", () => {
    const fork = forkDefinition(source, ids());
    (fork.blocks[0].config as Record<string, unknown>).limit = 7;
    expect(source.blocks[0].config.limit).toBe(100);
  });

  it("normalises the copied config through the block module", () => {
    const fork = forkDefinition(
      { schemaVersion: 1, blocks: [{ id: "x", type: "round_table", config: { limit: "viel" } }] },
      ids(),
    );
    expect(fork.blocks[0].config).toMatchObject({ limit: null });
  });
});

describe("definition editing", () => {
  it("starts an empty definition with a single round table", () => {
    const def = emptyDefinition(ids());
    expect(def.blocks).toHaveLength(1);
    expect(def.blocks[0].type).toBe("round_table");
  });

  it("appends a block with its default config", () => {
    const def = addBlock(emptyDefinition(ids()), "tally", () => "tally-1");
    expect(def.blocks[1]).toMatchObject({ id: "tally-1", type: "tally" });
    expect(def.blocks[1].config).toMatchObject({ step: 1 });
  });

  it("removes a block but never the last one", () => {
    const two = addBlock(emptyDefinition(ids()), "text", () => "note");
    expect(removeBlock(two, "note").blocks).toHaveLength(1);
    expect(() => removeBlock(emptyDefinition(ids()), "id-1")).toThrow(/at least one block/i);
  });

  it("moves a block and clamps at the ends", () => {
    const two = addBlock(emptyDefinition(ids()), "text", () => "note");
    expect(moveBlock(two, "note", -1).blocks.map((b) => b.id)).toEqual(["note", "id-1"]);
    expect(moveBlock(two, "note", +1).blocks.map((b) => b.id)).toEqual(["id-1", "note"]);
  });

  it("patches one block config through its module parser", () => {
    const def = emptyDefinition(ids());
    const patched = updateBlockConfig(def, "id-1", { scoreDirection: "lowest_wins", limit: 100 });
    expect(patched.blocks[0].config).toMatchObject({ scoreDirection: "lowest_wins", limit: 100 });
    expect(def.blocks[0].config).toMatchObject({ scoreDirection: "highest_wins" });
  });
});

describe("player helpers", () => {
  it("builds players from active participants, keeping the link", () => {
    const participants = [
      { id: "pa-1", user_id: "u1", status: "joined", profile: { id: "u1", display_name: "Ann" } },
      { id: "pa-2", user_id: "u2", status: "left", profile: { id: "u2", display_name: "Bo" } },
    ] as unknown as ParticipantWithProfile[];
    expect(playersFromParticipants(participants)).toEqual([
      { id: "u1", label: "Ann", participant_id: "pa-1" },
    ]);
  });

  it("builds players from typed names and drops blanks", () => {
    expect(playersFromNames([" Ann ", "", "Bo"], ids())).toEqual([
      { id: "id-1", label: "Ann", participant_id: null },
      { id: "id-2", label: "Bo", participant_id: null },
    ]);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run lib/notepad/authoring.test.ts`
Expected: FAIL — cannot resolve `./authoring`.

- [ ] **Step 3: Write the module**

Create `lib/notepad/authoring.ts`:

```ts
/**
 * Bearbeiten von Definitionen (Builder) und Übernehmen fremder Vorlagen.
 * Alle Funktionen sind rein und geben neue Objekte zurück.
 */
import { blockModule, parseDefinition } from "./registry";
import { NotepadSchemaError } from "./schema";
import type { BlockType, SheetDefinition, SheetPlayer } from "./schema";
import type { ParticipantWithProfile } from "@/lib/types";

function defaultId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `b-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Übernahme: tiefe Kopie mit frischen Block-IDs, danach durch die Modul-Parser.
 * Frische IDs, weil eine Vorlage nie Einträge eines fremden Blatts referenzieren soll.
 */
export function forkDefinition(raw: unknown, makeId: () => string = defaultId): SheetDefinition {
  const parsed = parseDefinition(raw);
  return {
    ...parsed,
    blocks: parsed.blocks.map((block) => ({
      ...block,
      id: makeId(),
      config: { ...block.config },
      skin: block.skin ? { ...block.skin } : undefined,
    })),
    skin: parsed.skin ? { ...parsed.skin } : undefined,
  };
}

export function emptyDefinition(makeId: () => string = defaultId): SheetDefinition {
  return parseDefinition({
    schemaVersion: 1,
    blocks: [{ id: makeId(), type: "round_table", config: {} }],
  });
}

export function addBlock(
  definition: SheetDefinition,
  type: BlockType,
  makeId: () => string = defaultId,
): SheetDefinition {
  const module = blockModule(type);
  return {
    ...definition,
    blocks: [
      ...definition.blocks,
      { id: makeId(), type, config: module.parseConfig(module.defaultConfig) },
    ],
  };
}

export function removeBlock(definition: SheetDefinition, blockId: string): SheetDefinition {
  const blocks = definition.blocks.filter((block) => block.id !== blockId);
  if (blocks.length === 0) throw new NotepadSchemaError("A notepad needs at least one block");
  return { ...definition, blocks };
}

export function moveBlock(
  definition: SheetDefinition,
  blockId: string,
  delta: number,
): SheetDefinition {
  const index = definition.blocks.findIndex((block) => block.id === blockId);
  if (index < 0) return definition;
  const target = Math.min(definition.blocks.length - 1, Math.max(0, index + delta));
  if (target === index) return definition;
  const blocks = [...definition.blocks];
  const [moved] = blocks.splice(index, 1);
  blocks.splice(target, 0, moved);
  return { ...definition, blocks };
}

export function updateBlockConfig(
  definition: SheetDefinition,
  blockId: string,
  patch: Record<string, unknown>,
): SheetDefinition {
  return {
    ...definition,
    blocks: definition.blocks.map((block) =>
      block.id === blockId
        ? { ...block, config: blockModule(block.type).parseConfig({ ...block.config, ...patch }) }
        : block,
    ),
  };
}

const INACTIVE = new Set(["left", "removed", "no_show"]);

export function playersFromParticipants(participants: ParticipantWithProfile[]): SheetPlayer[] {
  return participants
    .filter((p) => !INACTIVE.has(p.status))
    .map((p) => ({
      id: p.user_id,
      label: p.profile?.display_name ?? "Gast",
      participant_id: p.id,
    }));
}

export function playersFromNames(
  names: string[],
  makeId: () => string = defaultId,
): SheetPlayer[] {
  return names
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .map((label) => ({ id: makeId(), label, participant_id: null }));
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx vitest run lib/notepad/authoring.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Run the whole unit suite and commit**

Run: `npm test`
Expected: all existing tests still pass.

```bash
git add lib/notepad/authoring.ts lib/notepad/authoring.test.ts
git commit -m "Add notepad authoring helpers for fork, editing and players"
```

---

## Task 6: Database tables, RLS and realtime

**Files:**
- Create: `supabase/migrations/20260906010000_notepad.sql`
- Modify: `supabase/schema.sql` (mirror tables and policies)
- Modify: `supabase/enable-realtime.sql` (add `notepad_sheets`)

**Interfaces:**
- Consumes: existing `game_searches`, `participants`, `events`, `profiles`, `games`.
- Produces: tables `notepad_templates`, `notepad_sheets` with the row shape used by `NotepadTemplate` / `NotepadSheet` in `lib/types.ts`.

- [ ] **Step 1: Write the tables and policies**

Create `supabase/migrations/20260906010000_notepad.sql`:

```sql
-- ============================================================
-- Notizblöcke: Vorlagen + Punkteblätter
-- Spec: docs/superpowers/specs/2026-09-06-notepad-templates-design.md
-- Idempotent; im Supabase SQL-Editor ausführbar.
-- ============================================================

create table if not exists notepad_templates (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  description         text,
  kind                text not null default 'user',      -- system|user
  owner_id            uuid references profiles (id) on delete cascade,
  game_id             uuid references games (id) on delete set null,
  origin_template_id  uuid references notepad_templates (id) on delete set null,
  schema_version      int  not null default 1,
  definition          jsonb not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint notepad_templates_kind_owner check (
    (kind = 'system' and owner_id is null) or (kind = 'user' and owner_id is not null)
  )
);

create table if not exists notepad_sheets (
  id             uuid primary key default gen_random_uuid(),
  title          text,
  search_id      uuid references game_searches (id) on delete cascade,
  owner_id       uuid not null references profiles (id) on delete cascade,
  template_id    uuid references notepad_templates (id) on delete set null,
  schema_version int  not null default 1,
  definition     jsonb not null,
  players        jsonb not null default '[]'::jsonb,
  entries        jsonb not null default '{}'::jsonb,
  revision       int  not null default 0,
  status         text not null default 'active',          -- active|finished
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint notepad_sheets_status check (status in ('active', 'finished'))
);

create index if not exists idx_notepad_sheets_search on notepad_sheets (search_id);
create index if not exists idx_notepad_sheets_owner on notepad_sheets (owner_id);
create index if not exists idx_notepad_templates_owner on notepad_templates (owner_id);
create index if not exists idx_notepad_templates_system_game
  on notepad_templates (game_id) where kind = 'system';

alter table notepad_templates enable row level security;
alter table notepad_sheets    enable row level security;

-- Vorlagen: System-Vorlagen für alle, eigene nur für sich selbst.
drop policy if exists "notepad templates read" on notepad_templates;
create policy "notepad templates read" on notepad_templates for select using (
  kind = 'system' or owner_id = auth.uid()
);

-- Blätter: Schreiber immer; Runden-Blätter für alle, die die Runde sehen dürfen
-- (gleiche Bedingung wie "searches read accessible"). Blätter ohne Runde bleiben privat.
drop policy if exists "notepad sheets read accessible" on notepad_sheets;
create policy "notepad sheets read accessible" on notepad_sheets for select using (
  owner_id = auth.uid()
  or (
    search_id is not null
    and exists (
      select 1 from game_searches s
      join events e on e.id = s.event_id
      where s.id = notepad_sheets.search_id
        and (
          s.creator_id = auth.uid()
          or (
            s.archived_at is null
            and s.visibility = 'public'
            and e.visibility = 'public'
            and e.status = 'published'
          )
        )
    )
  )
);

-- Schreiben ausschliesslich über die RPCs (Task 7).
revoke insert, update, delete on notepad_templates, notepad_sheets from anon, authenticated;
```

- [ ] **Step 2: Add the realtime publication entry**

In `supabase/enable-realtime.sql`, inside the existing `do $$ ... end $$;` block, append before `end $$;`:

```sql
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notepad_sheets'
  ) then
    alter publication supabase_realtime add table notepad_sheets;
  end if;
```

- [ ] **Step 3: Mirror into `supabase/schema.sql`**

Append the two `create table if not exists` blocks, the four indexes, both `alter table ... enable row level security` lines and both policies from Step 1 to `supabase/schema.sql`, directly after the `location_games` section and before the RLS block's seed section, keeping the file's comment style (`-- ---------- NOTEPAD_TEMPLATES ---------- `). Do not copy the `revoke` line into `schema.sql`; that belongs with the RPC grants in Task 7.

- [ ] **Step 4: Verify the SQL parses and matches the row types**

Run: `npx tsc --noEmit`
Expected: PASS (this only proves the TS side; the SQL is verified in Task 7's verification block and in the manual acceptance run).

Manually re-read the migration against `lib/types.ts` and confirm every column in `NotepadTemplate` and `NotepadSheet` exists with a matching nullability.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260906010000_notepad.sql supabase/schema.sql supabase/enable-realtime.sql
git commit -m "Add notepad template and sheet tables with RLS"
```

---

## Task 7: Write-path RPCs and grants

**Files:**
- Modify: `supabase/migrations/20260906010000_notepad.sql` (append RPC block)
- Modify: `supabase/schema.sql` (mirror the functions and grants)

**Interfaces:**
- Produces, callable by `authenticated` only:
  - `create_notepad_sheet(p_search_id uuid, p_template_id uuid, p_definition jsonb, p_players jsonb, p_title text) returns uuid`
  - `save_notepad_entries(p_sheet_id uuid, p_entries jsonb, p_expected_revision int) returns int` (new revision)
  - `set_notepad_sheet_status(p_sheet_id uuid, p_status text) returns void`
  - `transfer_notepad_writer(p_sheet_id uuid, p_to_user_id uuid) returns void`
  - `save_notepad_template(p_template_id uuid, p_name text, p_description text, p_game_id uuid, p_definition jsonb, p_origin_template_id uuid) returns uuid`
  - `delete_notepad_template(p_template_id uuid) returns void`

- [ ] **Step 1: Append the RPCs**

Append to `supabase/migrations/20260906010000_notepad.sql`:

```sql
-- ============================================================
-- RPCs (einziger Schreibweg aus dem Browser)
-- ============================================================

create or replace function public.create_notepad_sheet(
  p_search_id uuid,
  p_template_id uuid,
  p_definition jsonb,
  p_players jsonb,
  p_title text
) returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_user_id uuid := auth.uid(); v_sheet_id uuid; v_allowed boolean;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_definition is null or jsonb_typeof(p_definition) <> 'object' then
    raise exception 'Definition must be a JSON object';
  end if;
  if p_players is null or jsonb_typeof(p_players) <> 'array' then
    raise exception 'Players must be a JSON array';
  end if;

  if p_search_id is not null then
    select exists (
      select 1 from game_searches s
      where s.id = p_search_id
        and s.archived_at is null
        and (
          s.creator_id = v_user_id
          or exists (
            select 1 from participants pa
            where pa.search_id = s.id
              and pa.user_id = v_user_id
              and pa.status not in ('left', 'removed', 'no_show')
          )
        )
    ) into v_allowed;
    if not v_allowed then
      raise exception 'Only participants of this round can start a notepad';
    end if;
  end if;

  insert into notepad_sheets (
    title, search_id, owner_id, template_id, schema_version, definition, players, entries
  ) values (
    nullif(btrim(coalesce(p_title, '')), ''),
    p_search_id,
    v_user_id,
    p_template_id,
    coalesce((p_definition ->> 'schemaVersion')::int, 1),
    p_definition,
    p_players,
    '{}'::jsonb
  )
  returning id into v_sheet_id;

  return v_sheet_id;
end;
$$;

create or replace function public.save_notepad_entries(
  p_sheet_id uuid,
  p_entries jsonb,
  p_expected_revision int
) returns int
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_user_id uuid := auth.uid(); v_owner uuid; v_revision int; v_status text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_entries is null or jsonb_typeof(p_entries) <> 'object' then
    raise exception 'Entries must be a JSON object';
  end if;

  select owner_id, revision, status into v_owner, v_revision, v_status
  from notepad_sheets where id = p_sheet_id for update;
  if not found then raise exception 'Notepad not found'; end if;
  if v_owner <> v_user_id then raise exception 'Only the notepad writer can save'; end if;
  if v_status <> 'active' then raise exception 'This notepad is finished'; end if;
  if p_expected_revision is not null and p_expected_revision <> v_revision then
    raise exception 'Notepad was changed elsewhere (revision %)', v_revision;
  end if;

  update notepad_sheets
     set entries = p_entries, revision = v_revision + 1, updated_at = now()
   where id = p_sheet_id;

  return v_revision + 1;
end;
$$;

create or replace function public.set_notepad_sheet_status(p_sheet_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_status not in ('active', 'finished') then raise exception 'Unsupported status: %', p_status; end if;
  update notepad_sheets set status = p_status, updated_at = now()
   where id = p_sheet_id and owner_id = v_user_id;
  if not found then raise exception 'Only the notepad writer can change the status'; end if;
end;
$$;

create or replace function public.transfer_notepad_writer(p_sheet_id uuid, p_to_user_id uuid)
returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_user_id uuid := auth.uid(); v_search_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select search_id into v_search_id
  from notepad_sheets where id = p_sheet_id and owner_id = v_user_id for update;
  if not found then raise exception 'Only the notepad writer can hand over'; end if;
  if v_search_id is null then raise exception 'A notepad without a round cannot be handed over'; end if;
  if not exists (
    select 1 from participants pa
    where pa.search_id = v_search_id
      and pa.user_id = p_to_user_id
      and pa.status not in ('left', 'removed', 'no_show')
  ) then
    raise exception 'The new writer must be a participant of this round';
  end if;

  update notepad_sheets set owner_id = p_to_user_id, updated_at = now() where id = p_sheet_id;
end;
$$;

create or replace function public.save_notepad_template(
  p_template_id uuid,
  p_name text,
  p_description text,
  p_game_id uuid,
  p_definition jsonb,
  p_origin_template_id uuid
) returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare v_user_id uuid := auth.uid(); v_id uuid; v_name text := nullif(btrim(coalesce(p_name, '')), '');
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if v_name is null then raise exception 'A template needs a name'; end if;
  if p_definition is null or jsonb_typeof(p_definition) <> 'object' then
    raise exception 'Definition must be a JSON object';
  end if;

  if p_template_id is null then
    insert into notepad_templates (
      name, description, kind, owner_id, game_id, origin_template_id, schema_version, definition
    ) values (
      v_name,
      nullif(btrim(coalesce(p_description, '')), ''),
      'user',
      v_user_id,
      p_game_id,
      p_origin_template_id,
      coalesce((p_definition ->> 'schemaVersion')::int, 1),
      p_definition
    )
    returning id into v_id;
    return v_id;
  end if;

  update notepad_templates
     set name = v_name,
         description = nullif(btrim(coalesce(p_description, '')), ''),
         game_id = p_game_id,
         schema_version = coalesce((p_definition ->> 'schemaVersion')::int, 1),
         definition = p_definition,
         updated_at = now()
   where id = p_template_id and owner_id = v_user_id and kind = 'user'
  returning id into v_id;
  if v_id is null then raise exception 'Only your own templates can be changed'; end if;
  return v_id;
end;
$$;

create or replace function public.delete_notepad_template(p_template_id uuid)
returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  delete from notepad_templates
   where id = p_template_id and owner_id = v_user_id and kind = 'user';
  if not found then raise exception 'Only your own templates can be deleted'; end if;
end;
$$;

revoke all on function
  public.create_notepad_sheet(uuid,uuid,jsonb,jsonb,text),
  public.save_notepad_entries(uuid,jsonb,int),
  public.set_notepad_sheet_status(uuid,text),
  public.transfer_notepad_writer(uuid,uuid),
  public.save_notepad_template(uuid,text,text,uuid,jsonb,uuid),
  public.delete_notepad_template(uuid)
from public;

grant execute on function
  public.create_notepad_sheet(uuid,uuid,jsonb,jsonb,text),
  public.save_notepad_entries(uuid,jsonb,int),
  public.set_notepad_sheet_status(uuid,text),
  public.transfer_notepad_writer(uuid,uuid),
  public.save_notepad_template(uuid,text,text,uuid,jsonb,uuid),
  public.delete_notepad_template(uuid)
to authenticated;
```

- [ ] **Step 2: Append the verification block**

Append to the same migration file:

```sql
-- ============================================================
-- Verifikation (Ergebnisse prüfen, nicht nur Ausführung)
-- ============================================================
-- select tablename, rowsecurity from pg_tables
--  where schemaname = 'public' and tablename in ('notepad_templates','notepad_sheets');
-- select polname from pg_policies
--  where schemaname = 'public' and tablename in ('notepad_templates','notepad_sheets');
-- select proname, prosecdef from pg_proc
--  where pronamespace = 'public'::regnamespace and proname like 'notepad%' or proname like '%notepad%';
-- select proname, has_function_privilege('authenticated', oid, 'execute') as authenticated_can_execute
--   from pg_proc where pronamespace = 'public'::regnamespace and proname like '%notepad%';
-- select has_table_privilege('authenticated', 'notepad_sheets', 'insert') as should_be_false;
```

- [ ] **Step 3: Mirror into `supabase/schema.sql`**

Append the complete RPC block, the `revoke`/`grant` statements and the `revoke insert, update, delete` line from Task 6 Step 1 to `supabase/schema.sql`, after the policies added in Task 6.

- [ ] **Step 4: Re-read for the identity rule**

Confirm by reading: no RPC takes a caller user id as a parameter; every one derives identity from `auth.uid()`. The only user id parameter anywhere is `transfer_notepad_writer(p_to_user_id)`, which is the *target*, not the caller, and is validated against `participants`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260906010000_notepad.sql supabase/schema.sql
git commit -m "Add notepad RPC write path with writer and revision checks"
```

---

## Task 8: System templates and a Skyjo game seed

**Files:**
- Modify: `supabase/migrations/20260906010000_notepad.sql` (append seed)
- Modify: `supabase/schema.sql` (mirror seed into the seed section)

**Interfaces:**
- Produces four system templates with fixed ids, usable by `listTemplates` in Task 9:
  - `44444444-…-4401` "Runden-Zettel" (generic `round_table`, highest wins, no limit)
  - `44444444-…-4402` "Skyjo" (`round_table`, lowest wins, limit 100, `end_at`) linked to the new Skyjo game
  - `44444444-…-4403` "Jass-Tafel (Schieber)" (`jass_board`, target 2500, Weis on) linked to the seeded `Jassen` game
  - `44444444-…-4404` "Strichliste" (generic `tally`)

- [ ] **Step 1: Append the seed**

Append to `supabase/migrations/20260906010000_notepad.sql`:

```sql
-- ============================================================
-- SEED: System-Vorlagen (kind='system', owner_id null)
-- ============================================================
insert into games (id, name, min_players, max_players, theme) values
  ('11111111-1111-1111-1111-111111111107','Skyjo',2,8,'standard')
on conflict (id) do nothing;

insert into notepad_templates (id, name, description, kind, owner_id, game_id, schema_version, definition) values
  ('44444444-4444-4444-4444-444444444401',
   'Runden-Zettel',
   'Zeile = Runde, Spalte = Spieler, Summe automatisch.',
   'system', null, null, 1,
   '{"schemaVersion":1,"blocks":[{"id":"table","type":"round_table","title":"Punkte","config":{"scoreDirection":"highest_wins","limit":null,"limitBehavior":"none","allowNegative":true}}]}'::jsonb),

  ('44444444-4444-4444-4444-444444444402',
   'Skyjo',
   'Niedrigste Summe gewinnt, Spielende bei 100 Punkten.',
   'system', null, '11111111-1111-1111-1111-111111111107', 1,
   '{"schemaVersion":1,"blocks":[{"id":"table","type":"round_table","title":"Punkte","config":{"scoreDirection":"lowest_wins","limit":100,"limitBehavior":"end_at","allowNegative":true}}]}'::jsonb),

  ('44444444-4444-4444-4444-444444444403',
   'Jass-Tafel (Schieber)',
   'Zwei Teams auf 2500, Weis wird mitgezählt.',
   'system', null, '11111111-1111-1111-1111-111111111106', 1,
   '{"schemaVersion":1,"blocks":[{"id":"board","type":"jass_board","title":"Tafel","config":{"targetScore":2500,"weisEnabled":true,"matchBonus":100,"strokeStyle":"swiss","teamALabel":"Wir","teamBLabel":"Ihr"}},{"id":"note","type":"text","title":"Notiz","config":{"placeholder":"Wer gibt, Trumpf-Abmachungen …"}}]}'::jsonb),

  ('44444444-4444-4444-4444-444444444404',
   'Strichliste',
   'Ein Zähler pro Spieler — Stiche, Siege, Chips.',
   'system', null, null, 1,
   '{"schemaVersion":1,"blocks":[{"id":"tally","type":"tally","title":"Striche","config":{"step":1,"allowNegative":false}}]}'::jsonb)
on conflict (id) do nothing;
```

- [ ] **Step 2: Add a parser test for every seeded definition**

Create `lib/notepad/seed.test.ts` — this is the guard that the SQL seed and the code catalogue cannot drift apart:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDefinition } from "./registry";

const sql = readFileSync("supabase/migrations/20260906010000_notepad.sql", "utf8");

/** Zieht alle '{...}'::jsonb-Literale aus dem Seed-Block. */
function seededDefinitions(): unknown[] {
  return [...sql.matchAll(/'(\{"schemaVersion".*?\})'::jsonb/gs)].map((m) =>
    JSON.parse(m[1]),
  );
}

describe("seeded system templates", () => {
  it("seeds exactly the four system templates", () => {
    expect(seededDefinitions()).toHaveLength(4);
  });

  it("parses every seeded definition through the block registry", () => {
    for (const definition of seededDefinitions()) {
      expect(() => parseDefinition(definition)).not.toThrow();
    }
  });

  it("keeps the Skyjo template at a limit of 100 with lowest wins", () => {
    const skyjo = seededDefinitions()
      .map((d) => parseDefinition(d))
      .find((d) => d.blocks[0].config.limit === 100);
    expect(skyjo?.blocks[0].config).toMatchObject({
      scoreDirection: "lowest_wins",
      limitBehavior: "end_at",
    });
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run lib/notepad/seed.test.ts`
Expected: PASS (3 tests). If it fails on the file path, run Vitest from the repository root — `vitest.config.ts` resolves relative paths from there.

- [ ] **Step 4: Mirror the seed into `supabase/schema.sql`**

Append the same two `insert` statements to the seed section at the end of `supabase/schema.sql`, after the existing `games` seed.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260906010000_notepad.sql supabase/schema.sql lib/notepad/seed.test.ts
git commit -m "Seed notepad system templates and the Skyjo game"
```

---

## Task 9: Database client module

**Files:**
- Create: `lib/db/notepad.ts`
- Modify: `lib/db/rpc-contract.test.ts` (append a notepad describe block)

**Interfaces:**
- Consumes: RPCs from Task 7; `NotepadSheet`, `NotepadTemplate` from `lib/types.ts`.
- Produces:
  - `getSheet(supabase, id): Promise<NotepadSheet | null>`
  - `getSheetsForRound(supabase, searchId): Promise<NotepadSheet[]>`
  - `listTemplates(supabase): Promise<NotepadTemplate[]>`
  - `createSheet(supabase, input: CreateSheetInput): Promise<string>`
  - `saveEntries(supabase, input: SaveEntriesInput): Promise<number>`
  - `setSheetStatus(supabase, sheetId, status): Promise<void>`
  - `transferWriter(supabase, sheetId, toUserId): Promise<void>`
  - `saveTemplate(supabase, input: SaveTemplateInput): Promise<string>`
  - `deleteTemplate(supabase, templateId): Promise<void>`

- [ ] **Step 1: Write the failing test**

Append to `lib/db/rpc-contract.test.ts`:

```ts
import {
  createSheet,
  deleteTemplate,
  saveEntries,
  saveTemplate,
  setSheetStatus,
  transferWriter,
} from "./notepad";

describe("notepad mutation RPC contracts", () => {
  it("creates a sheet without sending an owner id", async () => {
    const { client, calls } = rpcClient({ data: "sheet-1" });

    await expect(
      createSheet(client, {
        searchId: "round-1",
        templateId: "tpl-1",
        definition: { schemaVersion: 1, blocks: [] },
        players: [{ id: "p1", label: "Ann", participant_id: null }],
        title: "Skyjo",
      }),
    ).resolves.toBe("sheet-1");

    expect(calls).toEqual([
      {
        name: "create_notepad_sheet",
        args: {
          p_search_id: "round-1",
          p_template_id: "tpl-1",
          p_definition: { schemaVersion: 1, blocks: [] },
          p_players: [{ id: "p1", label: "Ann", participant_id: null }],
          p_title: "Skyjo",
        },
      },
    ]);
  });

  it("sends the expected revision with every entry save", async () => {
    const { client, calls } = rpcClient({ data: 4 });

    await expect(
      saveEntries(client, { sheetId: "sheet-1", entries: { table: { rounds: [] } }, expectedRevision: 3 }),
    ).resolves.toBe(4);

    expect(calls[0]).toEqual({
      name: "save_notepad_entries",
      args: { p_sheet_id: "sheet-1", p_entries: { table: { rounds: [] } }, p_expected_revision: 3 },
    });
  });

  it("routes the remaining notepad writes through named RPCs", async () => {
    const { client, calls } = rpcClient({ data: "tpl-9" });

    await setSheetStatus(client, "sheet-1", "finished");
    await transferWriter(client, "sheet-1", "user-2");
    await saveTemplate(client, {
      templateId: null,
      name: "Mein Jass",
      description: null,
      gameId: null,
      definition: { schemaVersion: 1, blocks: [] },
      originTemplateId: "tpl-1",
    });
    await deleteTemplate(client, "tpl-9");

    expect(calls.map((c) => c.name)).toEqual([
      "set_notepad_sheet_status",
      "transfer_notepad_writer",
      "save_notepad_template",
      "delete_notepad_template",
    ]);
    expect(calls[2].args).toMatchObject({ p_template_id: null, p_origin_template_id: "tpl-1" });
    expect(calls[2].args).toEqual(expect.not.objectContaining({ p_owner_id: expect.anything() }));
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run lib/db/rpc-contract.test.ts`
Expected: FAIL — cannot resolve `./notepad`.

- [ ] **Step 3: Write the module**

Create `lib/db/notepad.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotepadSheet, NotepadSheetStatus, NotepadTemplate } from "@/lib/types";

export interface CreateSheetInput {
  searchId: string | null;
  templateId: string | null;
  definition: Record<string, unknown>;
  players: Array<{ id: string; label: string; participant_id?: string | null }>;
  title: string | null;
}

export interface SaveEntriesInput {
  sheetId: string;
  entries: Record<string, unknown>;
  expectedRevision: number;
}

export interface SaveTemplateInput {
  templateId: string | null;
  name: string;
  description: string | null;
  gameId: string | null;
  definition: Record<string, unknown>;
  originTemplateId: string | null;
}

export async function getSheet(
  supabase: SupabaseClient,
  id: string,
): Promise<NotepadSheet | null> {
  const { data, error } = await supabase
    .from("notepad_sheets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as NotepadSheet | null) ?? null;
}

export async function getSheetsForRound(
  supabase: SupabaseClient,
  searchId: string,
): Promise<NotepadSheet[]> {
  const { data, error } = await supabase
    .from("notepad_sheets")
    .select("*")
    .eq("search_id", searchId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as NotepadSheet[];
}

/** RLS liefert genau System-Vorlagen plus eigene. */
export async function listTemplates(supabase: SupabaseClient): Promise<NotepadTemplate[]> {
  const { data, error } = await supabase
    .from("notepad_templates")
    .select("*")
    .order("kind", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as NotepadTemplate[];
}

export async function createSheet(
  supabase: SupabaseClient,
  input: CreateSheetInput,
): Promise<string> {
  const { data, error } = await supabase.rpc("create_notepad_sheet", {
    p_search_id: input.searchId,
    p_template_id: input.templateId,
    p_definition: input.definition,
    p_players: input.players,
    p_title: input.title,
  });
  if (error) throw error;
  return data as string;
}

export async function saveEntries(
  supabase: SupabaseClient,
  input: SaveEntriesInput,
): Promise<number> {
  const { data, error } = await supabase.rpc("save_notepad_entries", {
    p_sheet_id: input.sheetId,
    p_entries: input.entries,
    p_expected_revision: input.expectedRevision,
  });
  if (error) throw error;
  return data as number;
}

export async function setSheetStatus(
  supabase: SupabaseClient,
  sheetId: string,
  status: NotepadSheetStatus,
): Promise<void> {
  const { error } = await supabase.rpc("set_notepad_sheet_status", {
    p_sheet_id: sheetId,
    p_status: status,
  });
  if (error) throw error;
}

export async function transferWriter(
  supabase: SupabaseClient,
  sheetId: string,
  toUserId: string,
): Promise<void> {
  const { error } = await supabase.rpc("transfer_notepad_writer", {
    p_sheet_id: sheetId,
    p_to_user_id: toUserId,
  });
  if (error) throw error;
}

export async function saveTemplate(
  supabase: SupabaseClient,
  input: SaveTemplateInput,
): Promise<string> {
  const { data, error } = await supabase.rpc("save_notepad_template", {
    p_template_id: input.templateId,
    p_name: input.name,
    p_description: input.description,
    p_game_id: input.gameId,
    p_definition: input.definition,
    p_origin_template_id: input.originTemplateId,
  });
  if (error) throw error;
  return data as string;
}

export async function deleteTemplate(
  supabase: SupabaseClient,
  templateId: string,
): Promise<void> {
  const { error } = await supabase.rpc("delete_notepad_template", {
    p_template_id: templateId,
  });
  if (error) throw error;
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx vitest run lib/db/rpc-contract.test.ts`
Expected: PASS (all existing round contracts plus 3 new notepad contracts).

- [ ] **Step 5: Commit**

```bash
git add lib/db/notepad.ts lib/db/rpc-contract.test.ts
git commit -m "Add notepad database client with RPC contract tests"
```

---

## Task 10: Query hooks, realtime and demo mode

**Files:**
- Create: `lib/hooks/useNotepad.ts`
- Create: `lib/hooks/useRealtimeSheet.ts`

**Interfaces:**
- Consumes: `lib/db/notepad.ts`, `lib/notepad/registry.ts`, `createClient`, `isSupabaseConfigured`, `useSession`.
- Produces:
  - `useNotepadTemplates(): UseQueryResult<NotepadTemplate[]>` — query key `["notepad-templates"]`
  - `useNotepadSheet(sheetId): UseQueryResult<NotepadSheet | null>` — query key `["notepad-sheet", sheetId]`
  - `useRoundSheets(searchId): UseQueryResult<NotepadSheet[]>` — query key `["notepad-sheets", searchId]`
  - `useNotepadActions(sheetId)` → `{ save, finish, reopen, handOver }` mutations
  - `useCreateSheet()` → mutation taking `CreateSheetInput`, returning the new sheet id
  - `useSaveTemplate()` / `useDeleteTemplate()`
  - `useRealtimeSheet(sheetId)`
- Demo mode (`isSupabaseConfigured() === false`): all reads come from the query cache, `useCreateSheet` writes a locally generated sheet into `["notepad-sheet", id]`, and saves patch the cache. The demo path must never call Supabase.

- [ ] **Step 1: Write the realtime hook**

Create `lib/hooks/useRealtimeSheet.ts`:

```ts
"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Live-Update eines Punkteblatts für Mitleser (Spec §Realtime).
 * Voraussetzung: notepad_sheets ist in der supabase_realtime-Publication
 * (supabase/enable-realtime.sql).
 */
export function useRealtimeSheet(sheetId: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured() || !sheetId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`notepad-${sheetId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notepad_sheets", filter: `id=eq.${sheetId}` },
        () => qc.invalidateQueries({ queryKey: ["notepad-sheet", sheetId] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sheetId, qc]);
}
```

- [ ] **Step 2: Write the query and mutation hooks**

Create `lib/hooks/useNotepad.ts`:

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  createSheet,
  deleteTemplate,
  getSheet,
  getSheetsForRound,
  listTemplates,
  saveEntries,
  saveTemplate,
  setSheetStatus,
  transferWriter,
} from "@/lib/db/notepad";
import type { CreateSheetInput, SaveTemplateInput } from "@/lib/db/notepad";
import type { NotepadSheet, NotepadSheetStatus, NotepadTemplate } from "@/lib/types";

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `local-${Math.random().toString(36).slice(2, 10)}`;
}

function patchSheet(qc: QueryClient, sheetId: string, fn: (s: NotepadSheet) => NotepadSheet) {
  qc.setQueryData<NotepadSheet | null>(["notepad-sheet", sheetId], (s) => (s ? fn(s) : s));
}

export function useNotepadTemplates() {
  const supabase = createClient();
  const configured = isSupabaseConfigured();
  return useQuery<NotepadTemplate[]>({
    queryKey: ["notepad-templates"],
    queryFn: async () => (configured ? listTemplates(supabase) : []),
    staleTime: 60_000,
  });
}

export function useNotepadSheet(sheetId: string) {
  const supabase = createClient();
  const configured = isSupabaseConfigured();
  return useQuery<NotepadSheet | null>({
    queryKey: ["notepad-sheet", sheetId],
    // Demo-Modus: das Blatt liegt nur im Cache (useCreateSheet legt es dort an).
    queryFn: async () => (configured ? getSheet(supabase, sheetId) : null),
    enabled: Boolean(sheetId),
  });
}

export function useRoundSheets(searchId: string | null) {
  const supabase = createClient();
  const configured = isSupabaseConfigured();
  return useQuery<NotepadSheet[]>({
    queryKey: ["notepad-sheets", searchId],
    queryFn: async () => (configured && searchId ? getSheetsForRound(supabase, searchId) : []),
    enabled: Boolean(searchId),
  });
}

export function useCreateSheet() {
  const supabase = createClient();
  const qc = useQueryClient();
  const configured = isSupabaseConfigured();

  return useMutation<string, Error, CreateSheetInput>({
    mutationFn: async (input) => {
      if (!configured) {
        const id = newId();
        const now = new Date().toISOString();
        qc.setQueryData<NotepadSheet>(["notepad-sheet", id], {
          id,
          title: input.title,
          search_id: input.searchId,
          owner_id: "demo-user",
          template_id: input.templateId,
          schema_version: 1,
          definition: input.definition,
          players: input.players,
          entries: {},
          revision: 0,
          status: "active",
          created_at: now,
          updated_at: now,
        });
        return id;
      }
      return createSheet(supabase, input);
    },
    onSuccess: (_id, input) => {
      if (input.searchId) qc.invalidateQueries({ queryKey: ["notepad-sheets", input.searchId] });
    },
  });
}

export function useNotepadActions(sheetId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const configured = isSupabaseConfigured();

  const save = useMutation<number, Error, Record<string, unknown>>({
    mutationFn: async (entries) => {
      const current = qc.getQueryData<NotepadSheet | null>(["notepad-sheet", sheetId]);
      const revision = current?.revision ?? 0;
      if (!configured) {
        patchSheet(qc, sheetId, (s) => ({ ...s, entries, revision: revision + 1 }));
        return revision + 1;
      }
      const next = await saveEntries(supabase, { sheetId, entries, expectedRevision: revision });
      patchSheet(qc, sheetId, (s) => ({ ...s, entries, revision: next }));
      return next;
    },
    // Kein Refetch nach jedem Tastendruck: die Revision wandert optimistisch mit,
    // Mitleser bekommen die Änderung über useRealtimeSheet.
  });

  const setStatus = useMutation<void, Error, NotepadSheetStatus>({
    mutationFn: async (status) => {
      if (!configured) {
        patchSheet(qc, sheetId, (s) => ({ ...s, status }));
        return;
      }
      await setSheetStatus(supabase, sheetId, status);
    },
    onSuccess: () => configured && qc.invalidateQueries({ queryKey: ["notepad-sheet", sheetId] }),
  });

  const handOver = useMutation<void, Error, string>({
    mutationFn: async (toUserId) => {
      if (!configured) {
        patchSheet(qc, sheetId, (s) => ({ ...s, owner_id: toUserId }));
        return;
      }
      await transferWriter(supabase, sheetId, toUserId);
    },
    onSuccess: () => configured && qc.invalidateQueries({ queryKey: ["notepad-sheet", sheetId] }),
  });

  return {
    save,
    finish: () => setStatus.mutate("finished"),
    reopen: () => setStatus.mutate("active"),
    setStatus,
    handOver,
  };
}

export function useSaveTemplate() {
  const supabase = createClient();
  const qc = useQueryClient();
  const configured = isSupabaseConfigured();

  return useMutation<string, Error, SaveTemplateInput>({
    mutationFn: async (input) => {
      if (!configured) return input.templateId ?? newId();
      return saveTemplate(supabase, input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notepad-templates"] }),
  });
}

export function useDeleteTemplate() {
  const supabase = createClient();
  const qc = useQueryClient();
  const configured = isSupabaseConfigured();

  return useMutation<void, Error, string>({
    mutationFn: async (templateId) => {
      if (!configured) return;
      await deleteTemplate(supabase, templateId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notepad-templates"] }),
  });
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/useNotepad.ts lib/hooks/useRealtimeSheet.ts
git commit -m "Add notepad query hooks with realtime and demo-mode paths"
```

---

## Task 11: Block renderers

**Files:**
- Create: `components/notepad/registry.ts`
- Create: `components/notepad/RoundTableBlock.tsx`
- Create: `components/notepad/JassBoardBlock.tsx`
- Create: `components/notepad/TallyBlock.tsx`
- Create: `components/notepad/TextBlock.tsx`
- Create: `components/notepad/SheetView.tsx`

**Interfaces:**
- Consumes: `computeSheet`, `parseDefinition`, `blockModule` from `lib/notepad/registry.ts`; `BlockResult`, `SheetBlock`, `SheetPlayer` from `lib/notepad/schema.ts`.
- Produces:
  - `BlockRendererProps = { block: SheetBlock; players: SheetPlayer[]; entries: unknown; result: BlockResult; readOnly: boolean; onChange: (entries: unknown) => void }`
  - `BLOCK_RENDERERS: Record<BlockType, React.ComponentType<BlockRendererProps>>`
  - `SheetView({ sheet, readOnly, onEntriesChange })` — renders all blocks and the writer/reader state.

- [ ] **Step 1: Write the renderer registry and props type**

Create `components/notepad/registry.ts`:

```ts
import type { ComponentType } from "react";
import type { BlockResult, BlockType, SheetBlock, SheetPlayer } from "@/lib/notepad/schema";
import { JassBoardBlock } from "./JassBoardBlock";
import { RoundTableBlock } from "./RoundTableBlock";
import { TallyBlock } from "./TallyBlock";
import { TextBlock } from "./TextBlock";

export interface BlockRendererProps {
  block: SheetBlock;
  players: SheetPlayer[];
  entries: unknown;
  result: BlockResult;
  readOnly: boolean;
  onChange: (entries: unknown) => void;
}

/**
 * Optik je Blocktyp. Der reservierte `block.skin.variant` wird hier später
 * auf Varianten gemappt — v1 rendert immer die Default-Optik.
 */
export const BLOCK_RENDERERS: Record<BlockType, ComponentType<BlockRendererProps>> = {
  round_table: RoundTableBlock,
  jass_board: JassBoardBlock,
  tally: TallyBlock,
  text: TextBlock,
};
```

- [ ] **Step 2: Write the round table renderer**

Create `components/notepad/RoundTableBlock.tsx`:

```tsx
"use client";

import { blockModule } from "@/lib/notepad/registry";
import type { RoundTableConfig, RoundTableEntries } from "@/lib/notepad/blocks/roundTable";
import type { BlockRendererProps } from "./registry";

export function RoundTableBlock({
  block,
  players,
  entries,
  result,
  readOnly,
  onChange,
}: BlockRendererProps) {
  const module = blockModule("round_table");
  const config = block.config as unknown as RoundTableConfig;
  const data = module.parseEntries(entries, block.config, players) as RoundTableEntries;

  function setCell(roundIndex: number, playerId: string, raw: string) {
    const value = raw.trim() === "" ? null : Number(raw);
    const rounds = data.rounds.map((row, i) =>
      i === roundIndex ? { ...row, [playerId]: Number.isFinite(value as number) ? value : null } : row,
    );
    onChange({ rounds });
  }

  function addRound() {
    onChange({ rounds: [...data.rounds, Object.fromEntries(players.map((p) => [p.id, null]))] });
  }

  function removeRound(index: number) {
    onChange({ rounds: data.rounds.filter((_, i) => i !== index) });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          {block.title ?? "Punkte"} — Runden und Punkte je Spieler
        </caption>
        <thead>
          <tr>
            <th scope="col" className="p-2 text-left text-xs font-black uppercase tracking-wide text-ink-soft">
              Runde
            </th>
            {players.map((player) => (
              <th key={player.id} scope="col" className="p-2 text-right text-xs font-black text-ink">
                {player.label}
              </th>
            ))}
            {!readOnly && <th scope="col" className="w-10"><span className="sr-only">Aktionen</span></th>}
          </tr>
        </thead>
        <tbody>
          {data.rounds.map((row, index) => (
            <tr key={index} className="border-t border-line">
              <th scope="row" className="p-2 text-left text-xs font-bold text-ink-soft">
                {index + 1}
              </th>
              {players.map((player) => (
                <td key={player.id} className="p-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="-?[0-9]*"
                    aria-label={`Runde ${index + 1}, ${player.label}`}
                    disabled={readOnly}
                    value={row[player.id] ?? ""}
                    onChange={(e) => setCell(index, player.id, e.target.value)}
                    className="min-h-[44px] w-full rounded-[var(--radius-sm)] border border-line bg-surface px-2 text-right text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-deep disabled:opacity-70"
                  />
                </td>
              ))}
              {!readOnly && (
                <td className="p-1">
                  <button
                    type="button"
                    aria-label={`Runde ${index + 1} löschen`}
                    onClick={() => removeRound(index)}
                    className="min-h-[44px] min-w-[44px] rounded-[var(--radius-sm)] text-ink-soft hover:text-ink"
                  >
                    ×
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-line">
            <th scope="row" className="p-2 text-left text-xs font-black uppercase tracking-wide text-ink-soft">
              Summe
            </th>
            {players.map((player) => (
              <td key={player.id} className="p-2 text-right text-base font-black text-ink">
                {result.totals[player.id] ?? 0}
                {result.leader === player.id && (
                  <span className="ml-1 text-xs font-bold text-green-deep">· führt</span>
                )}
              </td>
            ))}
            {!readOnly && <td />}
          </tr>
          {result.target !== null && (
            <tr>
              <th scope="row" className="p-2 text-left text-xs font-bold text-ink-soft">
                Bis {result.target}
              </th>
              {players.map((player) => (
                <td key={player.id} className="p-2 text-right text-xs text-ink-soft">
                  {result.remaining?.[player.id] ?? 0}
                </td>
              ))}
              {!readOnly && <td />}
            </tr>
          )}
        </tfoot>
      </table>

      {result.targetReached && (
        <p className="mt-2 rounded-[var(--radius-sm)] border border-line bg-parchment px-3 py-2 text-sm font-bold text-ink">
          Limit von {result.target} erreicht — das Spiel endet.
        </p>
      )}

      {!readOnly && (
        <button
          type="button"
          onClick={addRound}
          className="mt-3 min-h-[44px] w-full rounded-[var(--radius-md)] border border-line bg-surface px-3 font-black text-ink"
        >
          + Runde
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write the Jass, tally and text renderers**

Create `components/notepad/JassBoardBlock.tsx`:

```tsx
"use client";

import { blockModule } from "@/lib/notepad/registry";
import type { JassConfig, JassEntries } from "@/lib/notepad/blocks/jassBoard";
import type { BlockRendererProps } from "./registry";

/** Striche sind Dekoration — die Zahl steht immer daneben (CLAUDE.md §3/§5). */
function Strokes({ total, target }: { total: number; target: number }) {
  const filled = target > 0 ? Math.min(20, Math.floor((total / target) * 20)) : 0;
  return (
    <span aria-hidden className="flex gap-[2px]">
      {Array.from({ length: 20 }, (_, i) => (
        <span
          key={i}
          className={`h-4 w-[2px] rounded-full ${i < filled ? "bg-green-deep" : "bg-line"}`}
        />
      ))}
    </span>
  );
}

export function JassBoardBlock({ block, players, entries, result, readOnly, onChange }: BlockRendererProps) {
  const module = blockModule("jass_board");
  const config = block.config as unknown as JassConfig;
  const data = module.parseEntries(entries, block.config, players) as JassEntries;
  const teams = [
    { id: "a", label: config.teamALabel, points: "a", weis: "aWeis", match: "aMatch" },
    { id: "b", label: config.teamBLabel, points: "b", weis: "bWeis", match: "bMatch" },
  ] as const;

  function setValue(rowIndex: number, key: string, raw: string | boolean) {
    const value = typeof raw === "boolean" ? raw : raw.trim() === "" ? null : Number(raw);
    const rows = data.rows.map((row, i) =>
      i === rowIndex
        ? { ...row, [key]: typeof value === "number" && !Number.isFinite(value) ? null : value }
        : row,
    );
    onChange({ rows });
  }

  function addRow() {
    onChange({
      rows: [...data.rows, { a: null, b: null, aWeis: null, bWeis: null, aMatch: false, bMatch: false }],
    });
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {teams.map((team) => (
          <div key={team.id} className="rounded-[var(--radius-md)] border border-line bg-parchment p-3">
            <p className="text-xs font-black uppercase tracking-wide text-ink-soft">{team.label}</p>
            <p className="text-3xl font-black text-ink">{result.totals[team.id] ?? 0}</p>
            <p className="text-xs text-ink-soft">
              noch {result.remaining?.[team.id] ?? 0} bis {result.target}
            </p>
            {config.strokeStyle === "swiss" && (
              <Strokes total={result.totals[team.id] ?? 0} target={result.target ?? 1} />
            )}
          </div>
        ))}
      </div>

      <table className="mt-3 w-full border-collapse text-sm">
        <caption className="sr-only">Punkte je Spiel und Team</caption>
        <thead>
          <tr>
            <th scope="col" className="p-2 text-left text-xs font-black uppercase text-ink-soft">Spiel</th>
            {teams.map((team) => (
              <th key={team.id} scope="col" className="p-2 text-right text-xs font-black text-ink">
                {team.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, index) => (
            <tr key={index} className="border-t border-line">
              <th scope="row" className="p-2 text-left text-xs font-bold text-ink-soft">{index + 1}</th>
              {teams.map((team) => (
                <td key={team.id} className="p-1">
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label={`Spiel ${index + 1}, ${team.label}, Punkte`}
                      disabled={readOnly}
                      value={(row[team.points as keyof typeof row] as number | null) ?? ""}
                      onChange={(e) => setValue(index, team.points, e.target.value)}
                      className="min-h-[44px] w-16 rounded-[var(--radius-sm)] border border-line bg-surface px-2 text-right text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-deep"
                    />
                    {config.weisEnabled && (
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`Spiel ${index + 1}, ${team.label}, Weis`}
                        disabled={readOnly}
                        value={(row[team.weis as keyof typeof row] as number | null) ?? ""}
                        onChange={(e) => setValue(index, team.weis, e.target.value)}
                        placeholder="Weis"
                        className="min-h-[44px] w-14 rounded-[var(--radius-sm)] border border-dashed border-line bg-surface px-2 text-right text-ink-soft"
                      />
                    )}
                    {config.matchBonus > 0 && (
                      <label className="flex min-h-[44px] items-center gap-1 text-xs text-ink-soft">
                        <input
                          type="checkbox"
                          aria-label={`Spiel ${index + 1}, ${team.label}, Match`}
                          disabled={readOnly}
                          checked={Boolean(row[team.match as keyof typeof row])}
                          onChange={(e) => setValue(index, team.match, e.target.checked)}
                        />
                        Match
                      </label>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {result.targetReached && (
        <p className="mt-2 rounded-[var(--radius-sm)] border border-line bg-parchment px-3 py-2 text-sm font-bold text-ink">
          {result.leader === "a" ? config.teamALabel : config.teamBLabel} hat {result.target} erreicht.
        </p>
      )}

      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          className="mt-3 min-h-[44px] w-full rounded-[var(--radius-md)] border border-line bg-surface px-3 font-black text-ink"
        >
          + Spiel
        </button>
      )}
    </div>
  );
}
```

Create `components/notepad/TallyBlock.tsx`:

```tsx
"use client";

import { blockModule } from "@/lib/notepad/registry";
import type { TallyConfig, TallyEntries } from "@/lib/notepad/blocks/tally";
import type { BlockRendererProps } from "./registry";

export function TallyBlock({ block, players, entries, result, readOnly, onChange }: BlockRendererProps) {
  const module = blockModule("tally");
  const config = block.config as unknown as TallyConfig;
  const data = module.parseEntries(entries, block.config, players) as TallyEntries;

  function bump(playerId: string, direction: 1 | -1) {
    const next = (data.counts[playerId] ?? 0) + direction * config.step;
    onChange({
      counts: { ...data.counts, [playerId]: config.allowNegative ? next : Math.max(0, next) },
    });
  }

  return (
    <ul className="flex flex-col gap-2">
      {players.map((player) => (
        <li key={player.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line bg-surface p-2">
          <span className="font-bold text-ink">
            {player.label}
            {result.leader === player.id && (
              <span className="ml-2 text-xs font-bold text-green-deep">· führt</span>
            )}
          </span>
          <span className="flex items-center gap-2">
            {!readOnly && (
              <button
                type="button"
                aria-label={`${player.label}: minus ${config.step}`}
                onClick={() => bump(player.id, -1)}
                className="min-h-[44px] min-w-[44px] rounded-[var(--radius-sm)] border border-line font-black text-ink"
              >
                −
              </button>
            )}
            <output className="min-w-[3ch] text-center text-xl font-black text-ink">
              {data.counts[player.id] ?? 0}
            </output>
            {!readOnly && (
              <button
                type="button"
                aria-label={`${player.label}: plus ${config.step}`}
                onClick={() => bump(player.id, 1)}
                className="min-h-[44px] min-w-[44px] rounded-[var(--radius-sm)] border border-line font-black text-ink"
              >
                +
              </button>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

Create `components/notepad/TextBlock.tsx`:

```tsx
"use client";

import { blockModule } from "@/lib/notepad/registry";
import type { TextConfig, TextEntries } from "@/lib/notepad/blocks/text";
import type { BlockRendererProps } from "./registry";

export function TextBlock({ block, players, entries, readOnly, onChange }: BlockRendererProps) {
  const module = blockModule("text");
  const config = block.config as unknown as TextConfig;
  const data = module.parseEntries(entries, block.config, players) as TextEntries;

  return (
    <textarea
      aria-label={block.title ?? "Notiz"}
      placeholder={config.placeholder}
      disabled={readOnly}
      value={data.value}
      onChange={(e) => onChange({ value: e.target.value })}
      rows={3}
      className="w-full rounded-[var(--radius-md)] border border-line bg-surface p-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-deep"
    />
  );
}
```

- [ ] **Step 4: Write the sheet composition component**

Create `components/notepad/SheetView.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { computeSheet, parseDefinition } from "@/lib/notepad/registry";
import type { SheetPlayer } from "@/lib/notepad/schema";
import { BLOCK_RENDERERS } from "./registry";

export interface SheetViewProps {
  definition: Record<string, unknown>;
  players: SheetPlayer[];
  entries: Record<string, unknown>;
  readOnly: boolean;
  onEntriesChange: (entries: Record<string, unknown>) => void;
}

export function SheetView({ definition, players, entries, readOnly, onEntriesChange }: SheetViewProps) {
  const parsed = useMemo(() => {
    try {
      return { definition: parseDefinition(definition), error: null as string | null };
    } catch (error) {
      return { definition: null, error: (error as Error).message };
    }
  }, [definition]);

  const results = useMemo(
    () => (parsed.definition ? computeSheet(parsed.definition, entries, players) : {}),
    [parsed.definition, entries, players],
  );

  if (!parsed.definition) {
    return (
      <p role="alert" className="rounded-[var(--radius-md)] border border-line bg-surface p-4 text-ink">
        Dieser Notizblock kann nicht angezeigt werden: {parsed.error}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {parsed.definition.blocks.map((block) => {
        const Renderer = BLOCK_RENDERERS[block.type];
        return (
          <section
            key={block.id}
            className="rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[0_5px_0_var(--line)]"
          >
            {block.title && (
              <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-ink-soft">
                {block.title}
              </h2>
            )}
            <Renderer
              block={block}
              players={players}
              entries={entries?.[block.id]}
              result={results[block.id]}
              readOnly={readOnly}
              onChange={(blockEntries) => onEntriesChange({ ...entries, [block.id]: blockEntries })}
            />
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Type-check, lint and commit**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS. Fix any unused-variable warnings (for example the unused `config` in a renderer) rather than suppressing them.

```bash
git add components/notepad
git commit -m "Add notepad block renderers and sheet view"
```

---

## Task 12: Sheet page and the round entry point

**Files:**
- Create: `app/n/[sheetId]/page.tsx`
- Create: `app/n/[sheetId]/SheetPageView.tsx`
- Create: `components/notepad/TemplatePicker.tsx`
- Modify: `app/r/[searchId]/BoardView.tsx` (add the "Punkte mitschreiben" section)

**Interfaces:**
- Consumes: `useNotepadSheet`, `useNotepadActions`, `useRealtimeSheet`, `useCreateSheet`, `useNotepadTemplates`, `useRoundSheets`, `useSession`; `SheetView`; `playersFromParticipants` from `lib/notepad/authoring.ts`.
- Produces: route `/n/<sheetId>`, and `TemplatePicker({ gameId, onPick })` which calls back with `{ templateId, definition, name }`.

- [ ] **Step 1: Write the sheet route**

Create `app/n/[sheetId]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { SheetPageView } from "./SheetPageView";

export const metadata: Metadata = { title: "Notizblock" };

export default async function NotepadSheetPage({
  params,
}: {
  params: Promise<{ sheetId: string }>;
}) {
  const { sheetId } = await params;
  return <SheetPageView sheetId={sheetId} />;
}
```

- [ ] **Step 2: Write the sheet view**

Create `app/n/[sheetId]/SheetPageView.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SheetView } from "@/components/notepad/SheetView";
import { useNotepadActions, useNotepadSheet } from "@/lib/hooks/useNotepad";
import { useRealtimeSheet } from "@/lib/hooks/useRealtimeSheet";
import { useSession } from "@/lib/hooks/useSession";
import type { SheetPlayer } from "@/lib/notepad/schema";

/** Speichert gebündelt, damit nicht jeder Tastendruck eine RPC auslöst. */
const SAVE_DEBOUNCE_MS = 600;

export function SheetPageView({ sheetId }: { sheetId: string }) {
  const { data: sheet, isLoading } = useNotepadSheet(sheetId);
  const session = useSession();
  const { save, finish, reopen, setStatus } = useNotepadActions(sheetId);
  useRealtimeSheet(sheetId);

  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fremde Änderungen (Realtime) übernehmen, solange nichts Eigenes offen ist.
  useEffect(() => {
    if (sheet && draft === null) setDraft(sheet.entries);
  }, [sheet, draft]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (isLoading) return <p className="p-4 text-ink-soft">Notizblock wird geladen …</p>;
  if (!sheet) {
    return (
      <div className="p-4">
        <p className="text-ink">Dieser Notizblock ist nicht (mehr) verfügbar.</p>
        <Link href="/" className="mt-2 inline-block font-black text-green-deep">Zur Startseite</Link>
      </div>
    );
  }

  const isWriter = session.data?.user?.id === sheet.owner_id;
  const readOnly = !isWriter || sheet.status === "finished";
  const entries = draft ?? sheet.entries;

  function handleChange(next: Record<string, unknown>) {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save.mutate(next), SAVE_DEBOUNCE_MS);
  }

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">{sheet.title ?? "Notizblock"}</h1>
          <p className="text-sm text-ink-soft">
            {isWriter ? "Du schreibst mit." : "Du liest mit — geschrieben wird am anderen Gerät."}
            {sheet.status === "finished" && " · Abgeschlossen"}
          </p>
        </div>
        {sheet.search_id && (
          <Link href={`/r/${sheet.search_id}`} className="text-sm font-black text-green-deep">
            Zur Runde
          </Link>
        )}
      </header>

      {save.isError && (
        <p role="alert" className="rounded-[var(--radius-md)] border border-line bg-surface p-3 text-sm text-ink">
          Speichern fehlgeschlagen: {save.error.message}. Die Eingaben bleiben stehen — nochmal versuchen.
        </p>
      )}

      <SheetView
        definition={sheet.definition}
        players={sheet.players as SheetPlayer[]}
        entries={entries}
        readOnly={readOnly}
        onEntriesChange={handleChange}
      />

      {isWriter && (
        <button
          type="button"
          disabled={setStatus.isPending}
          onClick={() => (sheet.status === "active" ? finish() : reopen())}
          className="min-h-[44px] rounded-[var(--radius-md)] border border-line bg-surface px-4 font-black text-ink"
        >
          {sheet.status === "active" ? "Blatt abschliessen" : "Blatt wieder öffnen"}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write the template picker**

Create `components/notepad/TemplatePicker.tsx`:

```tsx
"use client";

import { useNotepadTemplates } from "@/lib/hooks/useNotepad";
import type { NotepadTemplate } from "@/lib/types";

export interface TemplatePickerProps {
  gameId: string | null;
  onPick: (template: NotepadTemplate) => void;
  pendingId?: string | null;
}

/** Passende Vorlagen zuerst: gleiches Spiel, dann System, dann eigene. */
function sortTemplates(templates: NotepadTemplate[], gameId: string | null): NotepadTemplate[] {
  return [...templates].sort((a, b) => {
    const matchA = a.game_id && a.game_id === gameId ? 0 : 1;
    const matchB = b.game_id && b.game_id === gameId ? 0 : 1;
    if (matchA !== matchB) return matchA - matchB;
    if (a.kind !== b.kind) return a.kind === "system" ? -1 : 1;
    return a.name.localeCompare(b.name, "de");
  });
}

export function TemplatePicker({ gameId, onPick, pendingId }: TemplatePickerProps) {
  const { data: templates, isLoading } = useNotepadTemplates();
  if (isLoading) return <p className="text-sm text-ink-soft">Vorlagen werden geladen …</p>;
  if (!templates || templates.length === 0) {
    return <p className="text-sm text-ink-soft">Noch keine Vorlagen vorhanden.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {sortTemplates(templates, gameId).map((template) => (
        <li key={template.id}>
          <button
            type="button"
            disabled={Boolean(pendingId)}
            onClick={() => onPick(template)}
            className="flex min-h-[44px] w-full flex-col items-start rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-left disabled:opacity-60"
          >
            <span className="font-black text-ink">
              {template.name}
              {template.kind === "user" && (
                <span className="ml-2 text-xs font-bold text-ink-soft">· eigene</span>
              )}
            </span>
            {template.description && (
              <span className="text-xs text-ink-soft">{template.description}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Add the entry point to the board**

In `app/r/[searchId]/BoardView.tsx`, add the imports:

```tsx
import { useRouter } from "next/navigation";
import { TemplatePicker } from "@/components/notepad/TemplatePicker";
import { useCreateSheet, useRoundSheets } from "@/lib/hooks/useNotepad";
import { playersFromParticipants } from "@/lib/notepad/authoring";
```

Inside `BoardView`, after the existing `host` line, add:

```tsx
  const router = useRouter();
  const createSheet = useCreateSheet();
  const { data: sheets } = useRoundSheets(searchId);
  const [pickerOpen, setPickerOpen] = useState(false);
```

Then add this section next to the other `<section>` blocks (after the seats section, before host management):

```tsx
      <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[0_5px_0_var(--line)]">
        <h2 className="font-display text-lg font-black text-ink">Notizblock</h2>

        {sheets && sheets.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-2">
            {sheets.map((sheet) => (
              <li key={sheet.id}>
                <Link
                  href={`/n/${sheet.id}`}
                  className="flex min-h-[44px] items-center justify-between rounded-[var(--radius-md)] border border-line px-3 font-black text-ink"
                >
                  {sheet.title ?? "Punkte"}
                  <span className="text-xs font-bold text-ink-soft">
                    {sheet.status === "finished" ? "abgeschlossen" : "läuft"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">Noch kein Blatt für diese Runde.</p>
        )}

        {!pickerOpen ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-3 min-h-[44px] w-full rounded-[var(--radius-md)] border border-line px-3 font-black text-ink"
          >
            Punkte mitschreiben
          </button>
        ) : (
          <div className="mt-3">
            <TemplatePicker
              gameId={round?.game_id ?? null}
              pendingId={createSheet.isPending ? "pending" : null}
              onPick={(template) =>
                createSheet.mutate(
                  {
                    searchId,
                    templateId: template.id,
                    definition: template.definition,
                    players: playersFromParticipants(round?.participants ?? []),
                    title: template.name,
                  },
                  { onSuccess: (sheetId) => router.push(`/n/${sheetId}`) },
                )
              }
            />
            {createSheet.isError && (
              <p role="alert" className="mt-2 text-sm text-ink">
                {createSheet.error.message}
              </p>
            )}
          </div>
        )}
      </section>
```

Make sure `useState`, `Link` and `round` are already in scope in `BoardView.tsx`; add only the imports that are missing.

- [ ] **Step 5: Verify in the running app**

Run the dev server through the preview tooling (never `npm run dev` in a plain shell) and check, in demo mode:
- `/r/<seeded round id>` shows the new Notizblock section.
- "Punkte mitschreiben" lists the four system templates in demo mode only if Supabase is configured; otherwise it shows the empty-state text without crashing.
- With Supabase configured: picking "Skyjo" navigates to `/n/<id>`, the table accepts numbers, totals update, the limit note appears at 100.

- [ ] **Step 6: Type-check, lint and commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add app/n components/notepad/TemplatePicker.tsx "app/r/[searchId]/BoardView.tsx"
git commit -m "Add notepad sheet route and round entry point"
```

---

## Task 13: Template library, builder and adoption

**Files:**
- Create: `app/vorlagen/page.tsx`
- Create: `app/vorlagen/TemplateLibraryView.tsx`
- Create: `app/vorlagen/[templateId]/page.tsx`
- Create: `app/vorlagen/[templateId]/TemplateBuilderView.tsx`
- Create: `app/vorlagen/uebernehmen/page.tsx`
- Create: `app/vorlagen/uebernehmen/AdoptTemplateView.tsx`
- Create: `components/notepad/ConfigFields.tsx`
- Modify: `components/MeView.tsx` (link to `/vorlagen`)
- Modify: `app/n/[sheetId]/SheetPageView.tsx` (adopt-this-template action)

**Interfaces:**
- Consumes: `useNotepadTemplates`, `useSaveTemplate`, `useDeleteTemplate`, `useCreateSheet`; `addBlock`, `removeBlock`, `moveBlock`, `updateBlockConfig`, `emptyDefinition`, `forkDefinition`, `playersFromNames`; `BLOCK_MODULES`.
- Produces: routes `/vorlagen` and `/vorlagen/<templateId>`; `/vorlagen/neu` is expressed as `templateId === "neu"` inside the builder route; `ConfigFields({ fields, values, onChange })`.

- [ ] **Step 1: Write the generic config form**

Create `components/notepad/ConfigFields.tsx`:

```tsx
"use client";

import type { FieldSpec } from "@/lib/notepad/schema";

export interface ConfigFieldsProps {
  fields: FieldSpec[];
  values: Record<string, unknown>;
  idPrefix: string;
  onChange: (patch: Record<string, unknown>) => void;
}

/**
 * Baut das Konfigurationsformular generisch aus den configFields des Blocktyps.
 * Kein Blocktyp wird hier namentlich erwähnt — genau das macht den Builder erweiterbar.
 */
export function ConfigFields({ fields, values, idPrefix, onChange }: ConfigFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const value = values[field.key];
        return (
          <div key={field.key} className="flex flex-col gap-1">
            <label htmlFor={id} className="text-xs font-black uppercase tracking-wide text-ink-soft">
              {field.label}
            </label>

            {field.kind === "boolean" && (
              <input
                id={id}
                type="checkbox"
                checked={value === true}
                onChange={(e) => onChange({ [field.key]: e.target.checked })}
                className="size-6"
              />
            )}

            {field.kind === "number" && (
              <input
                id={id}
                type="text"
                inputMode="numeric"
                value={value === null || value === undefined ? "" : String(value)}
                onChange={(e) =>
                  onChange({
                    [field.key]: e.target.value.trim() === "" ? null : Number(e.target.value),
                  })
                }
                className="min-h-[44px] rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-ink"
              />
            )}

            {field.kind === "text" && (
              <input
                id={id}
                type="text"
                maxLength={field.maxLength}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange({ [field.key]: e.target.value })}
                className="min-h-[44px] rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-ink"
              />
            )}

            {field.kind === "select" && (
              <select
                id={id}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange({ [field.key]: e.target.value })}
                className="min-h-[44px] rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-ink"
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            )}

            {field.help && <p className="text-xs text-ink-soft">{field.help}</p>}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Write the library page**

Create `app/vorlagen/page.tsx`:

```tsx
import type { Metadata } from "next";
import { TemplateLibraryView } from "./TemplateLibraryView";

export const metadata: Metadata = { title: "Notizblock-Vorlagen" };

export default function TemplatesPage() {
  return <TemplateLibraryView />;
}
```

Create `app/vorlagen/TemplateLibraryView.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCreateSheet, useDeleteTemplate, useNotepadTemplates } from "@/lib/hooks/useNotepad";
import { playersFromNames } from "@/lib/notepad/authoring";

export function TemplateLibraryView() {
  const router = useRouter();
  const { data: templates, isLoading } = useNotepadTemplates();
  const createSheet = useCreateSheet();
  const removeTemplate = useDeleteTemplate();
  const [names, setNames] = useState("");
  const [startId, setStartId] = useState<string | null>(null);

  const chosen = templates?.find((t) => t.id === startId) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4 p-4">
      <header>
        <h1 className="font-display text-2xl font-black text-ink">Notizblöcke</h1>
        <p className="text-sm text-ink-soft">
          Vorlagen für Punkte am Tisch — mitgelieferte und eigene.
        </p>
      </header>

      <Link
        href="/vorlagen/neu"
        className="flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] border border-line bg-surface font-black text-ink"
      >
        Eigene Vorlage bauen
      </Link>

      {isLoading && <p className="text-sm text-ink-soft">Vorlagen werden geladen …</p>}

      <ul className="flex flex-col gap-2">
        {(templates ?? []).map((template) => (
          <li
            key={template.id}
            className="rounded-[var(--radius-md)] border border-line bg-surface p-3"
          >
            <p className="font-black text-ink">
              {template.name}
              {template.kind === "user" && (
                <span className="ml-2 text-xs font-bold text-ink-soft">· eigene</span>
              )}
            </p>
            {template.description && (
              <p className="text-xs text-ink-soft">{template.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStartId(template.id)}
                className="min-h-[44px] rounded-[var(--radius-sm)] border border-line px-3 font-black text-ink"
              >
                Blatt starten
              </button>
              <Link
                href={`/vorlagen/${template.id}`}
                className="flex min-h-[44px] items-center rounded-[var(--radius-sm)] border border-line px-3 font-black text-ink"
              >
                {template.kind === "system" ? "Übernehmen & anpassen" : "Bearbeiten"}
              </Link>
              {template.kind === "user" && (
                <button
                  type="button"
                  onClick={() => removeTemplate.mutate(template.id)}
                  className="min-h-[44px] rounded-[var(--radius-sm)] px-3 font-black text-ink-soft"
                >
                  Löschen
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {chosen && (
        <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-4">
          <h2 className="font-display text-lg font-black text-ink">
            Wer spielt mit? ({chosen.name})
          </h2>
          <label htmlFor="players" className="mt-2 block text-xs font-black uppercase text-ink-soft">
            Namen, eine pro Zeile
          </label>
          <textarea
            id="players"
            rows={4}
            value={names}
            onChange={(e) => setNames(e.target.value)}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-line bg-surface p-3 text-ink"
          />
          <button
            type="button"
            disabled={createSheet.isPending || names.trim().length === 0}
            onClick={() =>
              createSheet.mutate(
                {
                  searchId: null,
                  templateId: chosen.id,
                  definition: chosen.definition,
                  players: playersFromNames(names.split("\n")),
                  title: chosen.name,
                },
                { onSuccess: (sheetId) => router.push(`/n/${sheetId}`) },
              )
            }
            className="mt-3 min-h-[44px] w-full rounded-[var(--radius-md)] border border-line px-3 font-black text-ink disabled:opacity-60"
          >
            Blatt öffnen
          </button>
          {createSheet.isError && (
            <p role="alert" className="mt-2 text-sm text-ink">{createSheet.error.message}</p>
          )}
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write the builder**

Create `app/vorlagen/[templateId]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { TemplateBuilderView } from "./TemplateBuilderView";

export const metadata: Metadata = { title: "Vorlage bearbeiten" };

export default async function TemplateBuilderPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  return <TemplateBuilderView templateId={templateId} />;
}
```

Create `app/vorlagen/[templateId]/TemplateBuilderView.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfigFields } from "@/components/notepad/ConfigFields";
import { SheetView } from "@/components/notepad/SheetView";
import { useNotepadTemplates, useSaveTemplate } from "@/lib/hooks/useNotepad";
import {
  addBlock,
  emptyDefinition,
  forkDefinition,
  moveBlock,
  removeBlock,
  updateBlockConfig,
} from "@/lib/notepad/authoring";
import { BLOCK_MODULES, parseDefinition } from "@/lib/notepad/registry";
import type { BlockType, SheetDefinition, SheetPlayer } from "@/lib/notepad/schema";

const PREVIEW_PLAYERS: SheetPlayer[] = [
  { id: "demo-1", label: "Ann", participant_id: null },
  { id: "demo-2", label: "Bo", participant_id: null },
];

export function TemplateBuilderView({ templateId }: { templateId: string }) {
  const router = useRouter();
  const { data: templates } = useNotepadTemplates();
  const saveTemplate = useSaveTemplate();

  const source = templates?.find((t) => t.id === templateId) ?? null;
  const isNew = templateId === "neu";
  // System-Vorlagen werden nie bearbeitet, sondern übernommen (Fork).
  const isFork = Boolean(source && source.kind === "system");

  const initial = useMemo<SheetDefinition>(() => {
    if (isNew || !source) return emptyDefinition();
    // Fork = frische Block-IDs; eigene Vorlage bearbeiten = IDs unverändert lassen.
    return isFork ? forkDefinition(source.definition) : parseDefinition(source.definition);
  }, [isNew, isFork, source]);

  const [definition, setDefinition] = useState<SheetDefinition>(initial);
  const [name, setName] = useState(
    isNew ? "" : isFork ? `${source?.name ?? ""} (eigene)` : source?.name ?? "",
  );
  const [description, setDescription] = useState(source?.description ?? "");
  const [previewEntries, setPreviewEntries] = useState<Record<string, unknown>>({});

  function save() {
    saveTemplate.mutate(
      {
        templateId: isNew || isFork ? null : templateId,
        name,
        description: description.trim() === "" ? null : description,
        gameId: source?.game_id ?? null,
        definition: definition as unknown as Record<string, unknown>,
        originTemplateId: isFork ? templateId : source?.origin_template_id ?? null,
      },
      { onSuccess: () => router.push("/vorlagen") },
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4 p-4">
      <header>
        <h1 className="font-display text-2xl font-black text-ink">
          {isNew ? "Neue Vorlage" : isFork ? "Vorlage übernehmen" : "Vorlage bearbeiten"}
        </h1>
        {isFork && (
          <p className="text-sm text-ink-soft">
            Du bearbeitest eine Kopie — die Original-Vorlage bleibt unverändert.
          </p>
        )}
      </header>

      <div className="flex flex-col gap-1">
        <label htmlFor="tpl-name" className="text-xs font-black uppercase text-ink-soft">Name</label>
        <input
          id="tpl-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-h-[44px] rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-ink"
        />
        <label htmlFor="tpl-desc" className="mt-2 text-xs font-black uppercase text-ink-soft">
          Beschreibung
        </label>
        <input
          id="tpl-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[44px] rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-ink"
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-black text-ink">Bausteine</h2>
        {definition.blocks.map((block, index) => (
          <div key={block.id} className="rounded-[var(--radius-md)] border border-line bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-black text-ink">{BLOCK_MODULES[block.type].label}</p>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Nach oben"
                  disabled={index === 0}
                  onClick={() => setDefinition(moveBlock(definition, block.id, -1))}
                  className="min-h-[44px] min-w-[44px] rounded-[var(--radius-sm)] border border-line text-ink disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Nach unten"
                  disabled={index === definition.blocks.length - 1}
                  onClick={() => setDefinition(moveBlock(definition, block.id, +1))}
                  className="min-h-[44px] min-w-[44px] rounded-[var(--radius-sm)] border border-line text-ink disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="Baustein entfernen"
                  disabled={definition.blocks.length === 1}
                  onClick={() => setDefinition(removeBlock(definition, block.id))}
                  className="min-h-[44px] min-w-[44px] rounded-[var(--radius-sm)] border border-line text-ink disabled:opacity-40"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="mt-2">
              <ConfigFields
                fields={BLOCK_MODULES[block.type].configFields}
                values={block.config}
                idPrefix={block.id}
                onChange={(patch) => setDefinition(updateBlockConfig(definition, block.id, patch))}
              />
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          {(Object.keys(BLOCK_MODULES) as BlockType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setDefinition(addBlock(definition, type))}
              className="min-h-[44px] rounded-[var(--radius-sm)] border border-line px-3 font-black text-ink"
            >
              + {BLOCK_MODULES[type].label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-black text-ink">Vorschau</h2>
        <div className="mt-2">
          <SheetView
            definition={definition as unknown as Record<string, unknown>}
            players={PREVIEW_PLAYERS}
            entries={previewEntries}
            readOnly={false}
            onEntriesChange={setPreviewEntries}
          />
        </div>
      </section>

      <button
        type="button"
        disabled={saveTemplate.isPending || name.trim().length === 0}
        onClick={save}
        className="min-h-[44px] rounded-[var(--radius-md)] border border-line bg-surface px-4 font-black text-ink disabled:opacity-60"
      >
        Vorlage speichern
      </button>
      {saveTemplate.isError && (
        <p role="alert" className="text-sm text-ink">{saveTemplate.error.message}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add adoption from a sheet and a library link**

In `app/n/[sheetId]/SheetPageView.tsx`, add below the sheet, visible to anyone who can read it:

```tsx
      <Link
        href={`/vorlagen/uebernehmen?sheet=${sheet.id}`}
        className="min-h-[44px] rounded-[var(--radius-md)] border border-line px-4 py-3 text-center font-black text-ink"
      >
        Diese Vorlage übernehmen
      </Link>
```

Create `app/vorlagen/uebernehmen/page.tsx`:

```tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import { AdoptTemplateView } from "./AdoptTemplateView";

export const metadata: Metadata = { title: "Vorlage übernehmen" };

export default function AdoptTemplatePage() {
  return (
    <Suspense fallback={<p className="p-4 text-ink-soft">Wird geladen …</p>}>
      <AdoptTemplateView />
    </Suspense>
  );
}
```

Create `app/vorlagen/uebernehmen/AdoptTemplateView.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useNotepadSheet, useSaveTemplate } from "@/lib/hooks/useNotepad";
import { forkDefinition } from "@/lib/notepad/authoring";

/**
 * Übernahme am Tisch: kopiert den Definitions-Snapshot eines Blatts, das man
 * lesen darf, in eine eigene Vorlage — ohne Lesezugriff auf die Original-Vorlage.
 */
export function AdoptTemplateView() {
  const router = useRouter();
  const sheetId = useSearchParams().get("sheet") ?? "";
  const { data: sheet, isLoading } = useNotepadSheet(sheetId);
  const saveTemplate = useSaveTemplate();
  const started = useRef(false);

  useEffect(() => {
    if (!sheet || started.current) return;
    started.current = true;
    saveTemplate.mutate(
      {
        templateId: null,
        name: `${sheet.title ?? "Notizblock"} (übernommen)`,
        description: null,
        gameId: null,
        definition: forkDefinition(sheet.definition) as unknown as Record<string, unknown>,
        originTemplateId: sheet.template_id,
      },
      { onSuccess: (templateId) => router.replace(`/vorlagen/${templateId}`) },
    );
  }, [sheet, saveTemplate, router]);

  if (!sheetId || (!isLoading && !sheet)) {
    return (
      <div className="p-4">
        <p role="alert" className="text-ink">Dieser Notizblock ist nicht verfügbar.</p>
        <Link href="/vorlagen" className="mt-2 inline-block font-black text-green-deep">
          Zu den Vorlagen
        </Link>
      </div>
    );
  }

  if (saveTemplate.isError) {
    return (
      <div className="p-4">
        <p role="alert" className="text-ink">
          Übernehmen fehlgeschlagen: {saveTemplate.error.message}
        </p>
        <Link href="/vorlagen" className="mt-2 inline-block font-black text-green-deep">
          Zu den Vorlagen
        </Link>
      </div>
    );
  }

  return <p className="p-4 text-ink-soft">Vorlage wird übernommen …</p>;
}
```

In `components/MeView.tsx`, add a link to `/vorlagen` in the existing action list, labelled "Notizblöcke", styled like the neighbouring links.

- [ ] **Step 5: Verify in the running app**

With Supabase configured, through the preview tooling:
- `/vorlagen` lists the four system templates.
- "Übernehmen & anpassen" on the Jass template opens the builder on a copy; changing the target score updates the preview live.
- Saving lands the copy in the library marked "eigene"; the system template is unchanged.
- A user template can be edited and deleted; deleting a system template is not offered.
- From a sheet, "Diese Vorlage übernehmen" produces an own copy.

- [ ] **Step 6: Type-check, lint and commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add app/vorlagen components/notepad/ConfigFields.tsx components/MeView.tsx "app/n/[sheetId]/SheetPageView.tsx"
git commit -m "Add notepad template library, builder and adoption"
```

---

## Task 14: Full verification gate

**Files:**
- Create: `supabase/tests/notepad-manual.sql`
- Modify: `supabase/README.md` (note the new migration and realtime step)

- [ ] **Step 1: Write the manual acceptance SQL**

Create `supabase/tests/notepad-manual.sql` following the style of `supabase/tests/mvp-hardening-manual.sql`:

```sql
-- Manuelle Abnahme Notizblöcke. Im SQL-Editor ausführen und ERGEBNISSE prüfen.

-- 1. Tabellen mit RLS
select tablename, rowsecurity from pg_tables
 where schemaname = 'public' and tablename in ('notepad_templates', 'notepad_sheets');
-- erwartet: beide true

-- 2. Policies vorhanden
select tablename, polname from pg_policies
 where schemaname = 'public' and tablename in ('notepad_templates', 'notepad_sheets');
-- erwartet: "notepad templates read", "notepad sheets read accessible"

-- 3. Direktes Schreiben gesperrt
select has_table_privilege('authenticated', 'notepad_sheets', 'insert')  as sheets_insert_false,
       has_table_privilege('authenticated', 'notepad_templates', 'update') as templates_update_false;
-- erwartet: beide false

-- 4. RPCs sind security definer und nur für authenticated ausführbar
select p.proname, p.prosecdef,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
       has_function_privilege('anon', p.oid, 'execute') as anon_execute
  from pg_proc p
 where p.pronamespace = 'public'::regnamespace
   and p.proname in ('create_notepad_sheet','save_notepad_entries','set_notepad_sheet_status',
                     'transfer_notepad_writer','save_notepad_template','delete_notepad_template');
-- erwartet: prosecdef true, authenticated_execute true, anon_execute false

-- 5. System-Vorlagen geseedet
select id, name, kind, owner_id from notepad_templates where kind = 'system' order by name;
-- erwartet: 4 Zeilen, owner_id null

-- 6. Realtime aktiv
select tablename from pg_publication_tables
 where pubname = 'supabase_realtime' and tablename = 'notepad_sheets';
-- erwartet: eine Zeile
```

- [ ] **Step 2: Document the migration**

Add a section to `supabase/README.md` naming `20260906010000_notepad.sql`, stating that `enable-realtime.sql` must be re-run for `notepad_sheets`, and pointing at `supabase/tests/notepad-manual.sql`.

- [ ] **Step 3: Run the full automated gate**

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: all green. Report the actual output; do not claim success without it.

- [ ] **Step 4: Run the live acceptance checklist**

Against the deployed project with two browser identities (one guest, one signed-in), record the result of each:

1. Writer creates a sheet from a round; the other identity opens `/n/<id>` and sees it read-only.
2. Writer types a score; within a second the reader's totals update (Realtime).
3. Reader cannot type — inputs are disabled and no RPC is attempted.
4. A third identity that is not a participant and cannot see the round gets the not-available state.
5. A standalone sheet (`/vorlagen` → Blatt starten) is invisible to the second identity.
6. Stale write: open the sheet in two writer tabs, save in both — the second save fails with the revision message and the entered values stay on screen.
7. Writer hands over to a participant; the new writer can type, the old one cannot.
8. Adopt the Jass system template, change the target to 1000, save; the system template still reads 2500.
9. Skyjo sheet: entering totals of 100 shows the limit note.
10. Everything above works with the anonymous guest identity.

- [ ] **Step 5: Write the completion report and commit**

Create `docs/superpowers/plans/2026-09-06-notepad-templates-report.md` with: what was implemented, the verification commands and their actual output, the live acceptance results, and anything deliberately skipped (for example component tests, with the reason: no harness in this repo).

```bash
git add supabase/tests/notepad-manual.sql supabase/README.md docs/superpowers/plans/2026-09-06-notepad-templates-report.md
git commit -m "Add notepad acceptance SQL and completion report"
```

---

## Self-Review Notes

Checked against the spec:

- **Decisions 1-4** (declarative schema, fixed catalogue, React-free logic, snapshot) → Tasks 1-5, 6 (`definition jsonb` on the sheet), 7 (`create_notepad_sheet` stores the passed definition).
- **Decision 5** (single writer, live readers, handover) → Task 7 (`save_notepad_entries`, `transfer_notepad_writer`), Task 10 (`useRealtimeSheet`), Task 12 (read-only view).
- **Decision 6** (round-bound or standalone) → Task 6 (`search_id` nullable), Task 7 (participant check only when `search_id` is set), Task 13 (standalone flow).
- **Decision 7** (adoption copies the snapshot) → Task 5 `forkDefinition`, Task 13 Step 4.
- **Decision 8** (notes only) → no task touches `activity_events`; the RPCs deliberately do not call `log_round_activity`.
- **Decision 9** (`skin` reserved) → Task 1 schema, Task 11 renderer registry comment.
- **Block catalogue** → Tasks 2-4. **Data model** → Task 6. **Write path/RLS** → Tasks 6-7. **Realtime** → Tasks 6, 10. **Client structure** → Tasks 9-13. **Player list** → Task 5 helpers, Tasks 12-13 usage. **Accessibility** → Task 11 renderers. **Testing** → Tasks 1-5, 8, 9, 14.

Known deviation to keep in mind while executing: the spec lists `app/vorlagen/[templateId]` for the builder; the plan additionally uses the literal segment `neu` for a new template and adds `app/vorlagen/uebernehmen` for adoption. Both stay inside the same route family.
