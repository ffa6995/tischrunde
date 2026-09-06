import { describe, expect, it } from "vitest";
import {
  NOTEPAD_SCHEMA_VERSION,
  NotepadSchemaError,
  parseDefinitionShape,
} from "./schema";

const valid = {
  schemaVersion: 1,
  blocks: [{ id: "b1", type: "round_table", config: { limit: 100 } }],
};

describe("parseDefinitionShape", () => {
  it("accepts a minimal definition and keeps block config untouched", () => {
    const def = parseDefinitionShape(valid);
    expect(def.schemaVersion).toBe(NOTEPAD_SCHEMA_VERSION);
    expect(def.blocks).toHaveLength(1);
    expect(def.blocks[0]).toMatchObject({ id: "b1", type: "round_table" });
    expect(def.blocks[0].config).toEqual({ limit: 100 });
  });

  it("keeps the reserved skin slot on definition and block level", () => {
    const def = parseDefinitionShape({
      ...valid,
      skin: { variant: "parchment" },
      blocks: [{ ...valid.blocks[0], skin: { variant: "wood" } }],
    });
    expect(def.skin).toEqual({ variant: "parchment" });
    expect(def.blocks[0].skin).toEqual({ variant: "wood" });
  });

  it("rejects a definition that is not an object", () => {
    expect(() => parseDefinitionShape(null)).toThrow(NotepadSchemaError);
  });

  it("rejects an unsupported schema version", () => {
    expect(() => parseDefinitionShape({ ...valid, schemaVersion: 99 })).toThrow(
      /schema version/i,
    );
  });

  it("rejects an unknown block type", () => {
    expect(() =>
      parseDefinitionShape({ schemaVersion: 1, blocks: [{ id: "b1", type: "nope", config: {} }] }),
    ).toThrow(/unknown block type/i);
  });

  it("rejects duplicate block ids because entries are keyed by them", () => {
    expect(() =>
      parseDefinitionShape({
        schemaVersion: 1,
        blocks: [
          { id: "b1", type: "text", config: {} },
          { id: "b1", type: "tally", config: {} },
        ],
      }),
    ).toThrow(/duplicate block id/i);
  });

  it("rejects a definition without any block", () => {
    expect(() => parseDefinitionShape({ schemaVersion: 1, blocks: [] })).toThrow(
      /at least one block/i,
    );
  });
});
