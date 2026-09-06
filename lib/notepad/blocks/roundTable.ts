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
