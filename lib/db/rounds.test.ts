import { expect, it } from "vitest";
import { getRoundsForEvent } from "./rounds";

it("requests only non-archived public rounds for an event", async () => {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const query = {
    select(...args: unknown[]) {
      calls.push({ method: "select", args });
      return query;
    },
    eq(...args: unknown[]) {
      calls.push({ method: "eq", args });
      return query;
    },
    is(...args: unknown[]) {
      calls.push({ method: "is", args });
      return query;
    },
    order(...args: unknown[]) {
      calls.push({ method: "order", args });
      return Promise.resolve({ data: [], error: null });
    },
  };
  const supabase = { from: () => query } as never;

  await expect(getRoundsForEvent(supabase, "event-1")).resolves.toEqual([]);

  expect(calls).toContainEqual({ method: "is", args: ["archived_at", null] });
});
