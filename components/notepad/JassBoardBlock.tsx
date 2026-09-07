"use client";

import { blockModule } from "@/lib/notepad/registry";
import type { JassConfig, JassEntries } from "@/lib/notepad/blocks/jassBoard";
import type { BlockRendererProps } from "./registry";

/** Striche sind Dekoration — die Zahl steht immer daneben (CLAUDE.md §3/§5). */
function Strokes({ total, target }: { total: number; target: number }) {
  const filled = target > 0 ? Math.min(20, Math.floor((total / target) * 20)) : 0;
  return (
    <span aria-hidden className="flex gap-[2px]">
      {Array.from({ length: 20 }, (_, i) => (
        <span
          key={i}
          className={`h-4 w-[2px] rounded-full ${i < filled ? "bg-green-deep" : "bg-line"}`}
        />
      ))}
    </span>
  );
}

export function JassBoardBlock({ block, players, entries, result, readOnly, onChange }: BlockRendererProps) {
  const mod = blockModule("jass_board");
  const config = block.config as unknown as JassConfig;
  const data = mod.parseEntries(entries, block.config, players) as JassEntries;
  const teams = [
    { id: "a", label: config.teamALabel, points: "a", weis: "aWeis", match: "aMatch" },
    { id: "b", label: config.teamBLabel, points: "b", weis: "bWeis", match: "bMatch" },
  ] as const;

  function setValue(rowIndex: number, key: string, raw: string | boolean) {
    const value = typeof raw === "boolean" ? raw : raw.trim() === "" ? null : Number(raw);
    const rows = data.rows.map((row, i) =>
      i === rowIndex
        ? { ...row, [key]: typeof value === "number" && !Number.isFinite(value) ? null : value }
        : row,
    );
    onChange({ rows });
  }

  function addRow() {
    onChange({
      rows: [...data.rows, { a: null, b: null, aWeis: null, bWeis: null, aMatch: false, bMatch: false }],
    });
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {teams.map((team) => (
          <div key={team.id} className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-3">
            <p className="text-xs font-black uppercase tracking-wide text-ink-soft">{team.label}</p>
            <p className="text-3xl font-black text-ink">{result.totals[team.id] ?? 0}</p>
            <p className="text-xs text-ink-soft">
              noch {result.remaining?.[team.id] ?? 0} bis {result.target}
            </p>
            {config.strokeStyle === "swiss" && (
              <Strokes total={result.totals[team.id] ?? 0} target={result.target ?? 1} />
            )}
          </div>
        ))}
      </div>

      <table className="mt-3 w-full border-collapse text-sm">
        <caption className="sr-only">Punkte je Spiel und Team</caption>
        <thead>
          <tr>
            <th scope="col" className="p-2 text-left text-xs font-black uppercase text-ink-soft">Spiel</th>
            {teams.map((team) => (
              <th key={team.id} scope="col" className="p-2 text-right text-xs font-black text-ink">
                {team.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, index) => (
            <tr key={index} className="border-t border-line">
              <th scope="row" className="p-2 text-left text-xs font-bold text-ink-soft">{index + 1}</th>
              {teams.map((team) => (
                <td key={team.id} className="p-1">
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label={`Spiel ${index + 1}, ${team.label}, Punkte`}
                      disabled={readOnly}
                      value={(row[team.points as keyof typeof row] as number | null) ?? ""}
                      onChange={(e) => setValue(index, team.points, e.target.value)}
                      className="min-h-[44px] w-16 rounded-[var(--radius-sm)] border border-line bg-surface px-2 text-right text-ink outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-green-deep"
                    />
                    {config.weisEnabled && (
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`Spiel ${index + 1}, ${team.label}, Weis`}
                        disabled={readOnly}
                        value={(row[team.weis as keyof typeof row] as number | null) ?? ""}
                        onChange={(e) => setValue(index, team.weis, e.target.value)}
                        placeholder="Weis"
                        className="min-h-[44px] w-14 rounded-[var(--radius-sm)] border border-dashed border-line bg-surface px-2 text-right text-ink-soft"
                      />
                    )}
                    {config.matchBonus > 0 && (
                      <label className="flex min-h-[44px] items-center gap-1 text-xs text-ink-soft">
                        <input
                          type="checkbox"
                          aria-label={`Spiel ${index + 1}, ${team.label}, Match`}
                          disabled={readOnly}
                          checked={Boolean(row[team.match as keyof typeof row])}
                          onChange={(e) => setValue(index, team.match, e.target.checked)}
                        />
                        Match
                      </label>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {result.targetReached && (
        <p className="mt-2 rounded-[var(--radius-sm)] border border-line bg-surface-2 px-3 py-2 text-sm font-bold text-ink">
          {result.leader === "a" ? config.teamALabel : config.teamBLabel} hat {result.target} erreicht.
        </p>
      )}

      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          className="mt-3 min-h-[44px] w-full rounded-[var(--radius-md)] border border-line bg-surface px-3 font-black text-ink"
        >
          + Spiel
        </button>
      )}
    </div>
  );
}
