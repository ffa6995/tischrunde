import { describe, expect, it } from "vitest";
import { archiveRound, createRound, setRoundStatus } from "./rounds";
import { checkIn, joinRound, leaveRound } from "./participants";

function rpcClient(result: { data?: unknown; error?: unknown } = {}) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  return {
    calls,
    client: {
      rpc(name: string, args: Record<string, unknown>) {
        calls.push({ name, args });
        return Promise.resolve({ data: null, error: null, ...result });
      },
    } as never,
  };
}

describe("round mutation RPC contracts", () => {
  it("creates a round atomically through create_round", async () => {
    const { client, calls } = rpcClient({ data: "round-1" });
    await expect(createRound(client, {
      eventId: "event-1", gameId: "game-1", creatorId: "spoofed-user", title: null,
      seatsTotal: 4, gameSource: "on_site", desiredLevel: "any", beginnerFriendly: false,
      visibility: "public",
    })).resolves.toBe("round-1");
    expect(calls).toEqual([expect.objectContaining({ name: "create_round", args: expect.not.objectContaining({ creator_id: expect.anything() }) })]);
  });

  it("routes participation lifecycle changes through authenticated RPCs", async () => {
    const { client, calls } = rpcClient();
    await joinRound(client, { searchId: "r", userId: "spoofed", skillLevel: "learning", bringsGame: true });
    await checkIn(client, { searchId: "r", userId: "spoofed" });
    await leaveRound(client, "r");
    await setRoundStatus(client, "r", "closed");
    expect(calls.map((call) => call.name)).toEqual([
      "join_round", "check_in_round", "leave_round", "set_round_status",
    ]);
  });

  it("archives a round through archive_round without a creator id", async () => {
    const { client, calls } = rpcClient();

    await archiveRound(client, "r");

    expect(calls).toEqual([
      { name: "archive_round", args: { p_search_id: "r" } },
    ]);
  });
});
