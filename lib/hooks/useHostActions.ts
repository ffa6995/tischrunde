"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  hostConfirmParticipant,
  removeParticipant,
} from "@/lib/db/participants";
import { archiveRound, setRoundStatus } from "@/lib/db/rounds";
import type { SessionState } from "./useSession";
import type { RoundWithGame, SearchStatus } from "@/lib/types";

function invalidate(qc: QueryClient, searchId: string, eventId: string | null) {
  qc.invalidateQueries({ queryKey: ["round", searchId] });
  if (eventId) qc.invalidateQueries({ queryKey: ["rounds", eventId] });
}

function patchRound(
  qc: QueryClient,
  searchId: string,
  eventId: string | null,
  fn: (r: RoundWithGame) => RoundWithGame,
) {
  qc.setQueryData<RoundWithGame | null>(["round", searchId], (r) =>
    r ? fn(r) : r,
  );
  if (eventId) {
    qc.setQueryData<RoundWithGame[]>(["rounds", eventId], (list) =>
      list?.map((r) => (r.id === searchId ? fn(r) : r)),
    );
  }
}

export function useHostActions(searchId: string, eventId: string | null) {
  const supabase = createClient();
  const qc = useQueryClient();
  const configured = isSupabaseConfigured();
  const hostId = () =>
    qc.getQueryData<SessionState>(["session"])?.user?.id ?? null;

  const confirm = useMutation<void, Error, string>({
    mutationFn: async (targetUserId) => {
      if (!configured) {
        patchRound(qc, searchId, eventId, (r) => ({
          ...r,
          participants: r.participants.map((p) =>
            p.user_id === targetUserId ? { ...p, status: "confirmed" } : p,
          ),
        }));
        return;
      }
      if (!hostId()) throw new Error("Keine Host-Session.");
      await hostConfirmParticipant(supabase, searchId, targetUserId);
    },
    onSuccess: () => configured && invalidate(qc, searchId, eventId),
  });

  const remove = useMutation<void, Error, string>({
    mutationFn: async (targetUserId) => {
      if (!configured) {
        patchRound(qc, searchId, eventId, (r) => {
          const participants = r.participants.filter(
            (p) => p.user_id !== targetUserId,
          );
          return { ...r, participants, seats_taken: participants.length };
        });
        return;
      }
      await removeParticipant(supabase, searchId, targetUserId);
    },
    onSuccess: () => configured && invalidate(qc, searchId, eventId),
  });

  const setStatus = useMutation<void, Error, SearchStatus>({
    mutationFn: async (status) => {
      if (!configured) {
        patchRound(qc, searchId, eventId, (r) => ({ ...r, status }));
        return;
      }
      await setRoundStatus(supabase, searchId, status);
    },
    onSuccess: () => configured && invalidate(qc, searchId, eventId),
  });

  const archive = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!configured) {
        patchRound(qc, searchId, eventId, (r) => ({
          ...r,
          archived_at: new Date().toISOString(),
        }));
        return;
      }
      await archiveRound(supabase, searchId);
    },
    onSuccess: () => configured && invalidate(qc, searchId, eventId),
  });

  return { confirm, remove, setStatus, archive };
}
