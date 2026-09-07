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
