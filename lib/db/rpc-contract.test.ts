import { describe, expect, it } from "vitest";
import { archiveRound, createRound, setRoundStatus } from "./rounds";
import { checkIn, joinRound, leaveRound } from "./participants";
import {
  createSheet,
  deleteTemplate,
  saveEntries,
  saveTemplate,
  setSheetStatus,
  transferWriter,
} from "./notepad";

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

describe("notepad mutation RPC contracts", () => {
  it("creates a sheet without sending an owner id", async () => {
    const { client, calls } = rpcClient({ data: "sheet-1" });

    await expect(
      createSheet(client, {
        searchId: "round-1",
        templateId: "tpl-1",
        definition: { schemaVersion: 1, blocks: [] },
        players: [{ id: "p1", label: "Ann", participant_id: null }],
        title: "Skyjo",
      }),
    ).resolves.toBe("sheet-1");

    expect(calls).toEqual([
      {
        name: "create_notepad_sheet",
        args: {
          p_search_id: "round-1",
          p_template_id: "tpl-1",
          p_definition: { schemaVersion: 1, blocks: [] },
          p_players: [{ id: "p1", label: "Ann", participant_id: null }],
          p_title: "Skyjo",
        },
      },
    ]);
  });

  it("sends the expected revision with every entry save", async () => {
    const { client, calls } = rpcClient({ data: 4 });

    await expect(
      saveEntries(client, { sheetId: "sheet-1", entries: { table: { rounds: [] } }, expectedRevision: 3 }),
    ).resolves.toBe(4);

    expect(calls[0]).toEqual({
      name: "save_notepad_entries",
      args: { p_sheet_id: "sheet-1", p_entries: { table: { rounds: [] } }, p_expected_revision: 3 },
    });
  });

  it("routes the remaining notepad writes through named RPCs", async () => {
    const { client, calls } = rpcClient({ data: "tpl-9" });

    await setSheetStatus(client, "sheet-1", "finished");
    await transferWriter(client, "sheet-1", "user-2");
    await saveTemplate(client, {
      templateId: null,
      name: "Mein Jass",
      description: null,
      gameId: null,
      definition: { schemaVersion: 1, blocks: [] },
      originTemplateId: "tpl-1",
    });
    await deleteTemplate(client, "tpl-9");

    expect(calls.map((c) => c.name)).toEqual([
      "set_notepad_sheet_status",
      "transfer_notepad_writer",
      "save_notepad_template",
      "delete_notepad_template",
    ]);
    expect(calls[2].args).toMatchObject({ p_template_id: null, p_origin_template_id: "tpl-1" });
    expect(calls[2].args).toEqual(expect.not.objectContaining({ p_owner_id: expect.anything() }));
  });
});
