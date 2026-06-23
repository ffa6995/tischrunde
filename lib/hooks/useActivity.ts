"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getUserActivity } from "@/lib/db/activity";
import { checkIn as dbCheckIn } from "@/lib/db/participants";
import { deriveTrust, type DerivedTrust } from "@/lib/trust";
import type { SessionState } from "./useSession";
import type { ActivityEvent, ActivityType, RoundWithGame } from "@/lib/types";

/** Hängt im Demo-Modus ein Aktivitäts-Event in den Query-Cache (dedupliziert). */
export function appendDemoActivity(
  qc: QueryClient,
  userId: string,
  ev: {
    type: ActivityType;
    sourceId: string;
    metadata?: Record<string, unknown>;
  },
) {
  const key = ["activity", userId];
  const prev = qc.getQueryData<ActivityEvent[]>(key) ?? [];
  if (prev.some((e) => e.type === ev.type && e.source_id === ev.sourceId)) {
    return;
  }
  const record: ActivityEvent = {
    id: `${ev.type}-${ev.sourceId}-${prev.length}`,
    user_id: userId,
    type: ev.type,
    source_type: "game_search",
    source_id: ev.sourceId,
    metadata: ev.metadata ?? null,
    created_by: userId,
    created_at: "",
  };
  qc.setQueryData<ActivityEvent[]>(key, [record, ...prev]);
}

/** Abgeleitete Trust-Signale + Lieblingsspiele eines Nutzers. */
export function useTrustSignals(userId: string | undefined): {
  trust: DerivedTrust;
  isLoading: boolean;
} {
  const supabase = createClient();
  const qc = useQueryClient();
  const q = useQuery<ActivityEvent[]>({
    queryKey: ["activity", userId],
    enabled: !!userId,
    staleTime: Infinity,
    queryFn: () =>
      isSupabaseConfigured()
        ? getUserActivity(supabase, userId!)
        : Promise.resolve(
            qc.getQueryData<ActivityEvent[]>(["activity", userId]) ?? [],
          ),
  });
  return { trust: deriveTrust(q.data ?? []), isLoading: q.isLoading };
}

function markConfirmedInCache(
  qc: QueryClient,
  searchId: string,
  eventId: string | null,
  userId: string,
) {
  const flip = (r: RoundWithGame): RoundWithGame => ({
    ...r,
    participants: r.participants.map((p) =>
      p.user_id === userId ? { ...p, status: "confirmed" } : p,
    ),
  });
  qc.setQueryData<RoundWithGame | null>(["round", searchId], (r) =>
    r ? flip(r) : r,
  );
  if (eventId) {
    qc.setQueryData<RoundWithGame[]>(["rounds", eventId], (list) =>
      list?.map((r) => (r.id === searchId ? flip(r) : r)),
    );
  }
}

export function useCheckIn(
  searchId: string,
  eventId: string | null,
  gameName: string | null,
) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const session = qc.getQueryData<SessionState>(["session"]);
      const userId = session?.user?.id;
      if (!userId) throw new Error("Bitte zuerst beitreten.");

      if (!isSupabaseConfigured()) {
        appendDemoActivity(qc, userId, {
          type: "checked_in",
          sourceId: searchId,
          metadata: { game_name: gameName },
        });
        markConfirmedInCache(qc, searchId, eventId, userId);
        return;
      }
      await dbCheckIn(supabase, searchId, userId, gameName);
    },
    onSuccess: () => {
      const session = qc.getQueryData<SessionState>(["session"]);
      if (isSupabaseConfigured()) {
        qc.invalidateQueries({ queryKey: ["round", searchId] });
        if (eventId) qc.invalidateQueries({ queryKey: ["rounds", eventId] });
        qc.invalidateQueries({ queryKey: ["activity", session?.user?.id] });
      }
    },
  });
}
