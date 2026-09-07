"use client";

import { blockModule } from "@/lib/notepad/registry";
import type { RoundTableEntries } from "@/lib/notepad/blocks/roundTable";
import type { BlockRendererProps } from "./registry";

export function RoundTableBlock({
  block,
  players,
  entries,
  result,
  readOnly,
  onChange,
}: BlockRendererProps) {
  const mod = blockModule("round_table");
  const data = mod.parseEntries(entries, block.config, players) as RoundTableEntries;

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
                    className="min-h-[44px] w-full rounded-[var(--radius-sm)] border border-line bg-surface px-2 text-right text-ink outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-green-deep disabled:opacity-70"
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
        <p className="mt-2 rounded-[var(--radius-sm)] border border-line bg-surface-2 px-3 py-2 text-sm font-bold text-ink">
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
