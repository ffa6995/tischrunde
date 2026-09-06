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
