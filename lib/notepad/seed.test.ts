import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDefinition } from "./registry";

const sql = readFileSync("supabase/migrations/20260906010000_notepad.sql", "utf8");

/** Zieht alle '{...}'::jsonb-Literale aus dem Seed-Block. */
function seededDefinitions(): unknown[] {
  return [...sql.matchAll(/'(\{"schemaVersion".*?\})'::jsonb/gs)].map((m) =>
    JSON.parse(m[1]),
  );
}

describe("seeded system templates", () => {
  it("seeds exactly the four system templates", () => {
    expect(seededDefinitions()).toHaveLength(4);
  });

  it("parses every seeded definition through the block registry", () => {
    for (const definition of seededDefinitions()) {
      expect(() => parseDefinition(definition)).not.toThrow();
    }
  });

  it("keeps the Skyjo template at a limit of 100 with lowest wins", () => {
    const skyjo = seededDefinitions()
      .map((d) => parseDefinition(d))
      .find((d) => d.blocks[0].config.limit === 100);
    expect(skyjo?.blocks[0].config).toMatchObject({
      scoreDirection: "lowest_wins",
      limitBehavior: "end_at",
    });
  });
});
