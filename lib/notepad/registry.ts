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
  const mod = BLOCK_MODULES[type];
  if (!mod) throw new NotepadSchemaError(`Unknown block type: ${type}`);
  return mod;
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
    const mod = blockModule(block.type);
    results[block.id] = mod.compute(entries?.[block.id], block.config, players);
  }
  return results;
}
