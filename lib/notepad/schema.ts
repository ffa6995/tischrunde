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
