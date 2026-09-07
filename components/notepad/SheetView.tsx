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
