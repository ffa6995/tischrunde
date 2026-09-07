import { describe, expect, it } from "vitest";
import {
  addBlock,
  emptyDefinition,
  forkDefinition,
  moveBlock,
  playersFromNames,
  playersFromParticipants,
  removeBlock,
  updateBlockConfig,
  updateBlockTitle,
} from "./authoring";
import type { ParticipantWithProfile } from "@/lib/types";

function ids() {
  let n = 0;
  return () => `id-${++n}`;
}

const source = {
  schemaVersion: 1,
  blocks: [
    { id: "old-1", type: "round_table", config: { limit: 100 } },
    { id: "old-2", type: "text", config: {} },
  ],
};

describe("forkDefinition", () => {
  it("returns a deep copy with fresh block ids", () => {
    const fork = forkDefinition(source, ids());
    expect(fork.blocks.map((b) => b.id)).toEqual(["id-1", "id-2"]);
    expect(fork.blocks[0].config).toMatchObject({ limit: 100 });
  });

  it("shares no references with the source", () => {
    const fork = forkDefinition(source, ids());
    (fork.blocks[0].config as Record<string, unknown>).limit = 7;
    expect(source.blocks[0].config.limit).toBe(100);
  });

  it("normalises the copied config through the block module", () => {
    const fork = forkDefinition(
      { schemaVersion: 1, blocks: [{ id: "x", type: "round_table", config: { limit: "viel" } }] },
      ids(),
    );
    expect(fork.blocks[0].config).toMatchObject({ limit: null });
  });
});

describe("definition editing", () => {
  it("starts an empty definition with a single round table", () => {
    const def = emptyDefinition(ids());
    expect(def.blocks).toHaveLength(1);
    expect(def.blocks[0].type).toBe("round_table");
  });

  it("appends a block with its default config", () => {
    const def = addBlock(emptyDefinition(ids()), "tally", () => "tally-1");
    expect(def.blocks[1]).toMatchObject({ id: "tally-1", type: "tally" });
    expect(def.blocks[1].config).toMatchObject({ step: 1 });
  });

  it("removes a block but never the last one", () => {
    const two = addBlock(emptyDefinition(ids()), "text", () => "note");
    expect(removeBlock(two, "note").blocks).toHaveLength(1);
    expect(() => removeBlock(emptyDefinition(ids()), "id-1")).toThrow(/at least one block/i);
  });

  it("moves a block and clamps at the ends", () => {
    const two = addBlock(emptyDefinition(ids()), "text", () => "note");
    expect(moveBlock(two, "note", -1).blocks.map((b) => b.id)).toEqual(["note", "id-1"]);
    expect(moveBlock(two, "note", +1).blocks.map((b) => b.id)).toEqual(["id-1", "note"]);
  });

  it("patches one block config through its module parser", () => {
    const def = emptyDefinition(ids());
    const patched = updateBlockConfig(def, "id-1", { scoreDirection: "lowest_wins", limit: 100 });
    expect(patched.blocks[0].config).toMatchObject({ scoreDirection: "lowest_wins", limit: 100 });
    expect(def.blocks[0].config).toMatchObject({ scoreDirection: "highest_wins" });
  });

  it("sets a block's title", () => {
    const def = emptyDefinition(ids());
    const patched = updateBlockTitle(def, "id-1", "Punkte Runde 1");
    expect(patched.blocks[0].title).toBe("Punkte Runde 1");
    expect(def.blocks[0].title).toBeUndefined();
  });

  it("clears a title back to undefined instead of storing an empty string", () => {
    const withTitle = updateBlockTitle(emptyDefinition(ids()), "id-1", "Punkte");
    const cleared = updateBlockTitle(withTitle, "id-1", "   ");
    expect(cleared.blocks[0].title).toBeUndefined();
    expect("title" in cleared.blocks[0] && cleared.blocks[0].title === "").toBe(false);
  });

  it("only touches the targeted block's title", () => {
    const two = addBlock(emptyDefinition(ids()), "text", () => "note");
    const patched = updateBlockTitle(two, "note", "Notizen");
    expect(patched.blocks[0].title).toBeUndefined();
    expect(patched.blocks[1].title).toBe("Notizen");
  });
});

describe("player helpers", () => {
  it("builds players from active participants, keeping the link", () => {
    const participants = [
      { id: "pa-1", user_id: "u1", status: "joined", profile: { id: "u1", display_name: "Ann" } },
      { id: "pa-2", user_id: "u2", status: "left", profile: { id: "u2", display_name: "Bo" } },
    ] as unknown as ParticipantWithProfile[];
    expect(playersFromParticipants(participants)).toEqual([
      { id: "u1", label: "Ann", participant_id: "pa-1" },
    ]);
  });

  it("builds players from typed names and drops blanks", () => {
    expect(playersFromNames([" Ann ", "", "Bo"], ids())).toEqual([
      { id: "id-1", label: "Ann", participant_id: null },
      { id: "id-2", label: "Bo", participant_id: null },
    ]);
  });
});
