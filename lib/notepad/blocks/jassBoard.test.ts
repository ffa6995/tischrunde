import { describe, expect, it } from "vitest";
import { jassBoardBlock } from "./jassBoard";

const config = jassBoardBlock.parseConfig({
  targetScore: 2500,
  weisEnabled: true,
  matchBonus: 100,
});

describe("jassBoardBlock.parseConfig", () => {
  it("defaults to a 1000-point Schieber without match bonus", () => {
    expect(jassBoardBlock.parseConfig({})).toEqual(jassBoardBlock.defaultConfig);
    expect(jassBoardBlock.defaultConfig).toMatchObject({ targetScore: 1000, matchBonus: 0 });
  });

  it("falls back to the default target for a nonsense value", () => {
    expect(jassBoardBlock.parseConfig({ targetScore: -5 })).toMatchObject({ targetScore: 1000 });
  });
});

describe("jassBoardBlock.compute", () => {
  it("sums plain points per team", () => {
    const result = jassBoardBlock.compute(
      { rows: [{ a: 80, b: 77 }, { a: 60, b: 97 }] },
      config,
      [],
    );
    expect(result.totals).toEqual({ a: 140, b: 174 });
    expect(result.leader).toBe("b");
  });

  it("adds Weis only when Weis is enabled", () => {
    const withWeis = jassBoardBlock.compute({ rows: [{ a: 80, aWeis: 50, b: 77 }] }, config, []);
    expect(withWeis.totals.a).toBe(130);

    const off = jassBoardBlock.parseConfig({ targetScore: 2500, weisEnabled: false });
    const withoutWeis = jassBoardBlock.compute({ rows: [{ a: 80, aWeis: 50, b: 77 }] }, off, []);
    expect(withoutWeis.totals.a).toBe(80);
  });

  it("adds the match bonus once per marked row", () => {
    const result = jassBoardBlock.compute({ rows: [{ a: 157, aMatch: true, b: 0 }] }, config, []);
    expect(result.totals.a).toBe(257);
  });

  it("reports the remaining points to the target per team", () => {
    const result = jassBoardBlock.compute({ rows: [{ a: 500, b: 300 }] }, config, []);
    expect(result.target).toBe(2500);
    expect(result.remaining).toEqual({ a: 2000, b: 2200 });
    expect(result.targetReached).toBe(false);
  });

  it("reports the target as reached at exactly the target score", () => {
    const result = jassBoardBlock.compute({ rows: [{ a: 2500, b: 300 }] }, config, []);
    expect(result.targetReached).toBe(true);
    expect(result.remaining).toEqual({ a: 0, b: 2200 });
  });

  it("reports no leader while both teams are level", () => {
    const result = jassBoardBlock.compute({ rows: [{ a: 100, b: 100 }] }, config, []);
    expect(result.leader).toBeNull();
  });

  it("starts an empty board at zero for both teams", () => {
    const result = jassBoardBlock.compute(jassBoardBlock.emptyEntries(config, []), config, []);
    expect(result.totals).toEqual({ a: 0, b: 0 });
  });
});
