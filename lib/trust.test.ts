import { describe, expect, it } from "vitest";
import { deriveTrust } from "./trust";
import type { ActivityEvent, ActivityType } from "./types";

let seq = 0;
function ev(
  type: ActivityType,
  metadata: Record<string, unknown> | null = null,
  sourceId = "s1",
): ActivityEvent {
  return {
    id: `e${seq++}`,
    user_id: "u1",
    type,
    source_type: "game_search",
    source_id: sourceId,
    metadata,
    created_by: "u1",
    created_at: "",
  };
}

describe("deriveTrust", () => {
  it("returns empty signals for no activity", () => {
    const t = deriveTrust([]);
    expect(t.signals).toEqual([]);
    expect(t.favorites).toEqual([]);
    expect(t.stamps).toEqual([]);
    expect(t).toMatchObject({ joined: 0, attended: 0, hosted: 0 });
  });

  it('shows "War Nx dabei" when joined but not checked in', () => {
    const t = deriveTrust([ev("round_joined", { game_name: "Catan" })]);
    expect(t.signals).toContain("War 1× dabei");
    expect(t.joined).toBe(1);
  });

  it('prefers "Nx erschienen" once checked in', () => {
    const t = deriveTrust([
      ev("round_joined", { game_name: "Catan" }),
      ev("checked_in", { event_id: "ev1", event_name: "Spielerei" }),
    ]);
    expect(t.signals).toContain("1× erschienen");
    expect(t.signals).not.toContain("War 1× dabei");
    expect(t.attended).toBe(1);
  });

  it("derives Host, Bringt Spiele mit, and Erklärt gern", () => {
    const t = deriveTrust([
      ev("round_created"),
      ev("game_brought", { game_name: "Azul" }),
      ev("round_joined", { skill: "teaches" }),
    ]);
    expect(t.signals).toEqual(
      expect.arrayContaining(["Host", "Bringt Spiele mit", "Erklärt gern"]),
    );
    expect(t.hosted).toBe(1);
  });

  it("ranks favorites by frequency, max 3", () => {
    const t = deriveTrust([
      ev("round_joined", { game_name: "Catan" }, "a"),
      ev("round_joined", { game_name: "Catan" }, "b"),
      ev("round_joined", { game_name: "Jassen" }, "c"),
      ev("round_joined", { game_name: "Azul" }, "d"),
      ev("round_joined", { game_name: "Uno" }, "e"),
    ]);
    expect(t.favorites[0]).toBe("Catan");
    expect(t.favorites).toHaveLength(3);
  });

  it("collects distinct event stamps from check-ins", () => {
    const t = deriveTrust([
      ev("checked_in", { event_id: "ev1", event_name: "Spielerei" }, "r1"),
      ev("checked_in", { event_id: "ev1", event_name: "Spielerei" }, "r2"),
      ev("checked_in", { event_id: "ev2", event_name: "Jass-Abend" }, "r3"),
    ]);
    expect(t.stamps).toEqual(
      expect.arrayContaining([
        { id: "ev1", name: "Spielerei" },
        { id: "ev2", name: "Jass-Abend" },
      ]),
    );
    expect(t.stamps).toHaveLength(2);
  });
});
