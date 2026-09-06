/**
 * Jass-Tafel: zwei Teams, Zielpunkte, optional Weis und Match-Bonus.
 * Die Strich-/Bogen-Optik ist reine Darstellung (components/notepad) —
 * hier steckt nur die Arithmetik.
 */
import type { BlockModule, BlockResult, FieldSpec } from "../schema";

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

function compute(rawEntries: unknown, rawConfig: unknown): BlockResult {
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
