import { describe, expect, it } from "vitest";
import { roundTableBlock } from "./roundTable";
import type { SheetPlayer } from "../schema";

const players: SheetPlayer[] = [
  { id: "p1", label: "Ann" },
  { id: "p2", label: "Bo" },
];

const skyjo = roundTableBlock.parseConfig({
  scoreDirection: "lowest_wins",
  limit: 100,
  limitBehavior: "end_at",
  allowNegative: true,
});

describe("roundTableBlock.parseConfig", () => {
  it("fills defaults for missing and invalid fields", () => {
    expect(roundTableBlock.parseConfig({})).toEqual(roundTableBlock.defaultConfig);
    expect(roundTableBlock.parseConfig({ scoreDirection: "sideways" })).toMatchObject({
      scoreDirection: "highest_wins",
    });
  });

  it("treats a non-numeric limit as no limit", () => {
    expect(roundTableBlock.parseConfig({ limit: "viel" })).toMatchObject({ limit: null });
  });
});

describe("roundTableBlock.parseEntries", () => {
  it("keeps only known players and coerces junk to null", () => {
    const entries = roundTableBlock.parseEntries(
      { rounds: [{ p1: 12, p2: "x", ghost: 5 }] },
      skyjo,
      players,
    ) as { rounds: Array<Record<string, number | null>> };
    expect(entries.rounds).toEqual([{ p1: 12, p2: null }]);
  });

  it("drops negative values when the config forbids them", () => {
    const config = roundTableBlock.parseConfig({ allowNegative: false });
    const entries = roundTableBlock.parseEntries({ rounds: [{ p1: -3, p2: 4 }] }, config, players) as {
      rounds: Array<Record<string, number | null>>;
    };
    expect(entries.rounds).toEqual([{ p1: null, p2: 4 }]);
  });
});

describe("roundTableBlock.compute", () => {
  it("sums columns and ignores empty cells", () => {
    const result = roundTableBlock.compute(
      { rounds: [{ p1: 10, p2: null }, { p1: 5, p2: 7 }] },
      skyjo,
      players,
    );
    expect(result.totals).toEqual({ p1: 15, p2: 7 });
  });

  it("names the lowest total as leader when lowest wins", () => {
    const result = roundTableBlock.compute({ rounds: [{ p1: 10, p2: 7 }] }, skyjo, players);
    expect(result.leader).toBe("p2");
  });

  it("names the highest total as leader when highest wins", () => {
    const config = roundTableBlock.parseConfig({ scoreDirection: "highest_wins" });
    const result = roundTableBlock.compute({ rounds: [{ p1: 10, p2: 7 }] }, config, players);
    expect(result.leader).toBe("p1");
  });

  it("reports no leader on a tie", () => {
    const result = roundTableBlock.compute({ rounds: [{ p1: 7, p2: 7 }] }, skyjo, players);
    expect(result.leader).toBeNull();
  });

  it("reports the limit as reached at exactly the limit and exposes the remainder", () => {
    const result = roundTableBlock.compute({ rounds: [{ p1: 100, p2: 40 }] }, skyjo, players);
    expect(result.target).toBe(100);
    expect(result.targetReached).toBe(true);
    expect(result.remaining).toEqual({ p1: 0, p2: 60 });
  });

  it("never reports a target when no limit is configured", () => {
    const config = roundTableBlock.parseConfig({ limit: null });
    const result = roundTableBlock.compute({ rounds: [{ p1: 999, p2: 1 }] }, config, players);
    expect(result.target).toBeNull();
    expect(result.remaining).toBeNull();
    expect(result.targetReached).toBe(false);
  });

  it("returns zero totals for a sheet without rounds", () => {
    const result = roundTableBlock.compute(roundTableBlock.emptyEntries(skyjo, players), skyjo, players);
    expect(result.totals).toEqual({ p1: 0, p2: 0 });
    expect(result.leader).toBeNull();
  });
});
