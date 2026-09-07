import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BLOCK_MODULES, parseDefinition } from "./registry";
import type { BlockType } from "./schema";

const sql = readFileSync("supabase/migrations/20260906010000_notepad.sql", "utf8");

/** Rohe (ungeparste) Block-Form, wie sie direkt aus dem JSON-Seed kommt. */
interface RawBlock {
  id: string;
  type: string;
  title?: string;
  config?: Record<string, unknown>;
}

/**
 * Grenzt den `insert into notepad_templates (...) values ... on conflict (id)
 * do nothing;`-Block der Migration ein, unabhängig von der Anzahl seiner Zeilen.
 */
function seedValuesBlock(): string {
  // Die Spaltenliste beginnt bewusst mit "id," verankert: `save_notepad_template`
  // enthält weiter oben in derselben Datei ein zweites, dynamisches
  // `insert into notepad_templates (...) values` (ohne `id`-Spalte, die Id kommt
  // per `returning id into v_id`) — ohne diesen Anker würde das nicht-gierige
  // Matching am FALSCHEN (früheren) `on conflict (id) do nothing;` enden, das zur
  // `games`-Seed-Zeile gehört, nicht zu den Notizblock-Vorlagen.
  const match = sql.match(
    /insert into notepad_templates \(id,[^)]*\) values\s*([\s\S]*?)\non conflict \(id\) do nothing;/,
  );
  if (!match) {
    throw new Error("No `insert into notepad_templates (id, ...) values` block found in the migration");
  }
  return match[1];
}

/**
 * Zieht Template-Id und '{...}'::jsonb-Definition aus JEDER Seed-Zeile im
 * values-Block — die Id selbst ist eine generische UUID, keine feste Liste
 * bekannter Ids. Ein hartcodierter Id-Bereich (z. B. nur `...440[1-4]`) wäre
 * blind für eine später hinzugefügte fünfte Vorlage: die Zeile würde von
 * keinem Regex erfasst, die Zählung bliebe zufällig richtig, und die neue
 * Definition bekäme keine Prüfung. Adressierung über einen fachlich
 * unterscheidenden Wert (z. B. `limit === 100`) ist genau die Fragilität, die
 * dieser Test vermeiden soll. Das koppelt diese Funktion an die Zeilenform
 * `('<uuid>', ... , '{"schemaVersion":...}'::jsonb)`; ändert sich dort das
 * Format, muss dieser Test mitgepflegt werden.
 */
function seededRows(): Array<{ id: string; definition: { blocks: RawBlock[] } }> {
  const pattern = /\('([0-9a-f-]{36})',[\s\S]*?'(\{"schemaVersion".*?\})'::jsonb\)/g;
  return [...seedValuesBlock().matchAll(pattern)].map((m) => ({ id: m[1], definition: JSON.parse(m[2]) }));
}

/**
 * Zählt die Zeilen im values-Block unabhängig von `seededRows()`: jede Zeile
 * beginnt mit einer in Anführungszeichen gesetzten UUID als erstem
 * Spaltenwert. Diese Zählung teilt sich absichtlich KEINE Logik mit
 * `seededRows()` (die zusätzlich bis zu einer parsebaren jsonb-Definition
 * matchen muss) — nur so ist der Vergleich der beiden Zählungen unten ein
 * echter Gegen-Check und keine Tautologie: würde `seededRows()` eine Zeile
 * verschlucken (z. B. weil ihr jsonb nicht zum Muster passt), fiele das hier auf.
 */
function countSeedRowsInSql(): number {
  const rowStarts = seedValuesBlock().match(/\(\s*'[0-9a-f-]{36}',/g) ?? [];
  return rowStarts.length;
}

function parsedBlocks(id: string) {
  const row = seededRows().find((r) => r.id === id);
  if (!row) throw new Error(`No seeded row found for id ${id}`);
  return parseDefinition(row.definition).blocks;
}

describe("seeded system templates", () => {
  it("seeds at least one system template", () => {
    expect(countSeedRowsInSql()).toBeGreaterThan(0);
  });

  it("extracts every seeded row from the SQL — none silently dropped", () => {
    // Zählt den values-Block auf zwei unabhängigen Wegen (siehe countSeedRowsInSql
    // und seededRows) und vergleicht; die erwartete Zahl steht bewusst nicht als
    // Literal im Test, sondern wird aus der Migration selbst abgeleitet, damit ein
    // fünftes (oder sechstes, …) Seed-Template automatisch mitgeprüft wird.
    expect(seededRows()).toHaveLength(countSeedRowsInSql());
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

describe("seeded config keys match the block catalogue (raw, pre-parse)", () => {
  /**
   * `parseConfig()` ist bewusst defensiv: ein unbekannter/verschriebener Key
   * im rohen Config-Objekt wird stillschweigend verworfen und fällt auf den
   * Default des jeweiligen Blocks zurück (siehe `lib/notepad/blocks/*.ts`).
   * Deshalb kann keine Werte-Prüfung nach dem Parsen einen Tippfehler in einem
   * Feld entdecken, dessen Seed-Wert zufällig dem Default entspricht — genau
   * das ist heute bei allen vier `round_table`-Werten der Runden-Zettel- und
   * beiden `tally`-Werten der Strichliste-Vorlage der Fall. Diese Prüfung
   * arbeitet daher auf dem rohen JSON, VOR dem Parsen, und vergleicht
   * Schlüsselnamen statt Werten.
   *
   * Bewusst als TEILMENGE geprüft (jeder vorhandene Key muss bekannt sein),
   * NICHT als exakte Gleichheit: Ein im Seed fehlender Key ist legitim (dann
   * greift der Default des Blocks), aber ein unbekannter Key im Seed ist
   * immer ein Fehler (Tippfehler oder ein Feld, das es nie gab) und muss
   * hier auffallen, unabhängig davon, ob sein Wert zufällig dem Default
   * entspricht.
   */
  it("every seeded block uses a known type and only known config keys", () => {
    for (const { id, definition } of seededRows()) {
      for (const block of definition.blocks) {
        const label = `template …${id.slice(-4)}, block "${block.id}"`;

        expect(Object.keys(BLOCK_MODULES), `${label}: unknown block type "${block.type}"`).toContain(
          block.type,
        );

        const mod = BLOCK_MODULES[block.type as BlockType];
        if (!mod) continue; // already failed above; avoid a confusing follow-on error

        const expectedKeys = Object.keys(mod.defaultConfig);
        const actualKeys = Object.keys(block.config ?? {});
        const unknownKeys = actualKeys.filter((key) => !expectedKeys.includes(key));
        expect(unknownKeys, `${label} (${block.type}): unrecognized config key(s)`).toEqual([]);
      }
    }
  });
});
