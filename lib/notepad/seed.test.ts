import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDefinition } from "./registry";

const sql = readFileSync("supabase/migrations/20260906010000_notepad.sql", "utf8");

/**
 * Zieht Template-Id und '{...}'::jsonb-Definition aus jeder Seed-Zeile.
 * Die Id wird bewusst mitextrahiert (statt die Templates z. B. über einen
 * Config-Wert wie `limit === 100` zu unterscheiden) — Adressierung über einen
 * fachlich unterscheidenden Wert ist genau die Fragilität, die dieser Test
 * beheben soll. Das koppelt diese Funktion an die Zeilenform in der Migration
 * `('<vier feste Ids ...440[1-4]>', ... , '{"schemaVersion":...}'::jsonb)`;
 * ändert sich dort das Format, muss dieser Test mitgepflegt werden.
 */
function seededRows(): Array<{ id: string; definition: unknown }> {
  const pattern =
    /\('(44444444-4444-4444-4444-44444444440[1-4])',[\s\S]*?'(\{"schemaVersion".*?\})'::jsonb\)/g;
  return [...sql.matchAll(pattern)].map((m) => ({ id: m[1], definition: JSON.parse(m[2]) }));
}

function parsedBlocks(id: string) {
  const row = seededRows().find((r) => r.id === id);
  if (!row) throw new Error(`No seeded row found for id ${id}`);
  return parseDefinition(row.definition).blocks;
}

describe("seeded system templates", () => {
  it("seeds exactly the four system templates", () => {
    expect(seededRows()).toHaveLength(4);
  });

  it("parses every seeded definition through the block registry", () => {
    for (const { definition } of seededRows()) {
      expect(() => parseDefinition(definition)).not.toThrow();
    }
  });

  it("Runden-Zettel (…4401): round_table, highest wins, no limit", () => {
    const blocks = parsedBlocks("44444444-4444-4444-4444-444444444401");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("round_table");
    // Diese Werte entsprechen zufällig den Block-Defaults — genau deshalb hier
    // explizit prüfen, sonst würde ein verschluckter Key unbemerkt bleiben.
    expect(blocks[0].config).toEqual({
      scoreDirection: "highest_wins",
      limit: null,
      limitBehavior: "none",
      allowNegative: true,
    });
  });

  it("Skyjo (…4402): round_table, lowest wins, limit 100 mit Spielende", () => {
    const blocks = parsedBlocks("44444444-4444-4444-4444-444444444402");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("round_table");
    expect(blocks[0].config).toEqual({
      scoreDirection: "lowest_wins",
      limit: 100,
      limitBehavior: "end_at",
      allowNegative: true,
    });
  });

  it("Jass-Tafel (Schieber) (…4403): jass_board auf 2500 mit Weis, plus Notiz-Block", () => {
    const blocks = parsedBlocks("44444444-4444-4444-4444-444444444403");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("jass_board");
    expect(blocks[0].config).toEqual({
      targetScore: 2500,
      weisEnabled: true,
      matchBonus: 100,
      strokeStyle: "swiss",
      teamALabel: "Wir",
      teamBLabel: "Ihr",
    });
    expect(blocks[1].type).toBe("text");
    expect(blocks[1].config).toEqual({
      placeholder: "Wer gibt, Trumpf-Abmachungen …",
    });
  });

  it("Strichliste (…4404): tally, Schrittweite 1, keine Minuswerte", () => {
    const blocks = parsedBlocks("44444444-4444-4444-4444-444444444404");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("tally");
    expect(blocks[0].config).toEqual({
      step: 1,
      allowNegative: false,
    });
  });
});
