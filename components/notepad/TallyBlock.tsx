"use client";

import { blockModule } from "@/lib/notepad/registry";
import type { TallyConfig, TallyEntries } from "@/lib/notepad/blocks/tally";
import type { BlockRendererProps } from "./registry";

export function TallyBlock({ block, players, entries, result, readOnly, onChange }: BlockRendererProps) {
  const mod = blockModule("tally");
  const config = block.config as unknown as TallyConfig;
  const data = mod.parseEntries(entries, block.config, players) as TallyEntries;

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
