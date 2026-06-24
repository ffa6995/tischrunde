import { describe, expect, it } from "vitest";
import { boardTheme, locationAddress } from "./labels";
import type { Location } from "./types";

function loc(p: Partial<Location>): Location {
  return {
    id: "l1",
    name: "Ort",
    type: "venue",
    address_public: null,
    region_label: null,
    geo: null,
    socials: null,
    website: null,
    owner_id: null,
    claimed_by: null,
    status: "public",
    is_verified: false,
    created_at: "",
    updated_at: "",
    ...p,
  };
}

describe("boardTheme", () => {
  it("keeps known board themes", () => {
    expect(boardTheme("catan")).toBe("catan");
    expect(boardTheme("jassen")).toBe("jassen");
    expect(boardTheme("tcg")).toBe("tcg");
  });
  it("falls back to standard for others/undefined", () => {
    expect(boardTheme("party")).toBe("standard");
    expect(boardTheme("other")).toBe("standard");
    expect(boardTheme(undefined)).toBe("standard");
  });
});

describe("locationAddress", () => {
  it("shows the full address for a public venue", () => {
    expect(
      locationAddress(loc({ status: "public", address_public: "Schulgasse 1" })),
    ).toBe("Schulgasse 1");
  });
  it("hides the exact address for a home location (region only)", () => {
    const a = locationAddress(
      loc({ type: "home", region_label: "Dornbirn", address_public: "Geheim 5" }),
    );
    expect(a).toBe("Dornbirn");
    expect(a).not.toContain("Geheim");
  });
  it("hides the address for a non-public (pending) location", () => {
    expect(
      locationAddress(
        loc({ status: "pending", region_label: "Bregenz", address_public: "X" }),
      ),
    ).toBe("Bregenz");
  });
});
