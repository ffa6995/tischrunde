import { describe, expect, it } from "vitest";
import { isGameAvailable } from "./availability";

describe("isGameAvailable", () => {
  it("is available when the game is on-site (no bringers needed)", () => {
    expect(isGameAvailable("on_site", [])).toBe(true);
  });
  it("is available when the host brings it", () => {
    expect(isGameAvailable("host_brings", [])).toBe(true);
  });
  it("is NOT available when needed and nobody brings it", () => {
    expect(
      isGameAvailable("needed", [{ brings_game: false }, { brings_game: false }]),
    ).toBe(false);
  });
  it("becomes available once someone brings it", () => {
    expect(
      isGameAvailable("needed", [{ brings_game: false }, { brings_game: true }]),
    ).toBe(true);
  });
  it("brought_by_player needs an actual bringer", () => {
    expect(isGameAvailable("brought_by_player", [])).toBe(false);
    expect(isGameAvailable("brought_by_player", [{ brings_game: true }])).toBe(
      true,
    );
  });
});
