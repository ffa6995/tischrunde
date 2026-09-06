import { describe, expect, it } from "vitest";
import { BLOCK_MODULES, computeSheet, emptySheetEntries, parseDefinition } from "./registry";
import { NotepadSchemaError } from "./schema";
import type { SheetPlayer } from "./schema";

const players: SheetPlayer[] = [
  { id: "p1", label: "Ann" },
  { id: "p2", label: "Bo" },
];

const definition = {
  schemaVersion: 1,
  blocks: [
    { id: "table", type: "round_table", config: { scoreDirection: "lowest_wins", limit: 100 } },
    { id: "note", type: "text", config: {} },
  ],
};

describe("BLOCK_MODULES", () => {
  it("covers every block type exactly once", () => {
    expect(Object.keys(BLOCK_MODULES).sort()).toEqual(
      ["jass_board", "round_table", "tally", "text"],
    );
    for (const [type, module] of Object.entries(BLOCK_MODULES)) {
      expect(module.type).toBe(type);
      expect(module.label.length).toBeGreaterThan(0);
    }
  });
});

describe("parseDefinition", () => {
  it("normalises each block config through its own module", () => {
    const def = parseDefinition(definition);
    expect(def.blocks[0].config).toMatchObject({
      scoreDirection: "lowest_wins",
      limit: 100,
      limitBehavior: "none",
      allowNegative: true,
    });
  });

  it("still rejects structurally invalid definitions", () => {
    expect(() => parseDefinition({ schemaVersion: 1, blocks: [{ id: "x", type: "nope" }] })).toThrow(
      NotepadSchemaError,
    );
  });
});

describe("emptySheetEntries", () => {
  it("creates one empty entry container per block, keyed by block id", () => {
    const entries = emptySheetEntries(parseDefinition(definition), players);
    expect(Object.keys(entries).sort()).toEqual(["note", "table"]);
    expect(entries.table).toEqual({ rounds: [] });
  });
});

describe("computeSheet", () => {
  it("returns one result per block and tolerates missing entries", () => {
    const def = parseDefinition(definition);
    const results = computeSheet(def, { table: { rounds: [{ p1: 30, p2: 12 }] } }, players);
    expect(results.table.totals).toEqual({ p1: 30, p2: 12 });
    expect(results.table.leader).toBe("p2");
    expect(results.note.totals).toEqual({});
  });
});

describe("tallyBlock", () => {
  it("counts per player and names the highest count as leader", () => {
    const tally = BLOCK_MODULES.tally;
    const config = tally.parseConfig({ step: 1, allowNegative: false });
    const result = tally.compute({ counts: { p1: 3, p2: 5 } }, config, players);
    expect(result.totals).toEqual({ p1: 3, p2: 5 });
    expect(result.leader).toBe("p2");
  });

  it("clamps counts to zero when negatives are forbidden", () => {
    const tally = BLOCK_MODULES.tally;
    const config = tally.parseConfig({ allowNegative: false });
    const result = tally.compute({ counts: { p1: -4, p2: 0 } }, config, players);
    expect(result.totals).toEqual({ p1: 0, p2: 0 });
  });
});

describe("textBlock", () => {
  it("keeps a string value and computes nothing", () => {
    const text = BLOCK_MODULES.text;
    expect(text.parseEntries({ value: "Hausregel: kein Stapeln" }, {}, players)).toEqual({
      value: "Hausregel: kein Stapeln",
    });
    expect(text.compute({ value: "x" }, {}, players)).toMatchObject({ totals: {}, leader: null });
  });
});
