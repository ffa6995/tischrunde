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
  const mod = blockModule(type);
  return {
    ...definition,
    blocks: [
      ...definition.blocks,
      { id: makeId(), type, config: mod.parseConfig(mod.defaultConfig) },
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

/**
 * Setzt den Titel eines Blocks. Ein leerer (oder nur aus Leerzeichen
 * bestehender) Titel wird zurück auf `undefined` gesetzt statt als leerer
 * String gespeichert zu werden — sonst würde `SheetView` eine leere
 * Überschrift rendern statt gar keine.
 */
export function updateBlockTitle(
  definition: SheetDefinition,
  blockId: string,
  title: string,
): SheetDefinition {
  const cleared = title.trim() === "";
  return {
    ...definition,
    blocks: definition.blocks.map((block) =>
      block.id === blockId ? { ...block, title: cleared ? undefined : title } : block,
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
