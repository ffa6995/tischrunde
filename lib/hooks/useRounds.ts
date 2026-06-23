"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  createRound as dbCreateRound,
  getRound,
  getRoundsForEvent,
} from "@/lib/db/rounds";
import { joinRound as dbJoinRound } from "@/lib/db/participants";
import {
  DEMO_GAMES,
  demoRound,
  demoRoundsForEvent,
} from "@/lib/demo/fixtures";
import type { SessionState } from "./useSession";
import type {
  DesiredLevel,
  GameSource,
  ParticipantWithProfile,
  RoundWithGame,
  SkillLevel,
} from "@/lib/types";

export function useRounds(eventId: string) {
  const supabase = createClient();
  return useQuery<RoundWithGame[]>({
    queryKey: ["rounds", eventId],
    queryFn: () =>
      isSupabaseConfigured()
        ? getRoundsForEvent(supabase, eventId)
        : Promise.resolve(demoRoundsForEvent(eventId)),
  });
}

export function useRound(searchId: string) {
  const supabase = createClient();
  return useQuery<RoundWithGame | null>({
    queryKey: ["round", searchId],
    queryFn: () =>
      isSupabaseConfigured()
        ? getRound(supabase, searchId)
        : Promise.resolve(demoRound(searchId)),
  });
}

export interface CreateRoundForm {
  gameId: string;
  title: string | null;
  seatsTotal: number;
  gameSource: GameSource;
  desiredLevel: DesiredLevel;
  beginnerFriendly: boolean;
  visibility: "public" | "invite" | "unlisted";
}

export function useCreateRound(eventId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation<string, Error, CreateRoundForm>({
    mutationFn: async (form) => {
      const session = qc.getQueryData<SessionState>(["session"]);
      const creatorId = session?.user?.id;
      if (!creatorId) throw new Error("Bitte zuerst eine Gast-Identität anlegen.");

      if (!isSupabaseConfigured()) {
        const id = `r-neu-${Date.now()}`;
        const game = DEMO_GAMES.find((g) => g.id === form.gameId) ?? null;
        const host: ParticipantWithProfile = {
          id: `${id}-host`,
          search_id: id,
          user_id: creatorId,
          joined_at: "",
          role: "host",
          skill_level: "any",
          brings_game: form.gameSource === "host_brings",
          status: "joined",
          profile: {
            id: creatorId,
            display_name: session?.profile?.display_name ?? "Du",
            avatar_url: null,
          },
        };
        const round: RoundWithGame = {
          id,
          event_id: eventId,
          location_id: null,
          game_id: form.gameId,
          creator_id: creatorId,
          title: form.title,
          seats_total: form.seatsTotal,
          visibility: form.visibility,
          join_mode: "open",
          game_source: form.gameSource,
          beginner_friendly: form.beginnerFriendly,
          desired_level: form.desiredLevel,
          status: "open",
          created_at: "",
          updated_at: "",
          game,
          participants: [host],
          seats_taken: 1,
        };
        qc.setQueryData<RoundWithGame>(["round", id], round);
        qc.setQueryData<RoundWithGame[]>(["rounds", eventId], (prev) =>
          prev ? [...prev, round] : [round],
        );
        return id;
      }

      return dbCreateRound(supabase, {
        eventId,
        gameId: form.gameId,
        creatorId,
        title: form.title,
        seatsTotal: form.seatsTotal,
        gameSource: form.gameSource,
        desiredLevel: form.desiredLevel,
        beginnerFriendly: form.beginnerFriendly,
        visibility: form.visibility,
      });
    },
    onSuccess: () => {
      if (isSupabaseConfigured()) {
        qc.invalidateQueries({ queryKey: ["rounds", eventId] });
      }
    },
  });
}

export interface JoinForm {
  skillLevel: SkillLevel;
  bringsGame: boolean;
}

function applyDemoJoin(
  qc: QueryClient,
  searchId: string,
  eventId: string | null,
  form: JoinForm,
) {
  const session = qc.getQueryData<SessionState>(["session"]);
  const userId = session?.user?.id ?? "demo-you";
  const newPart: ParticipantWithProfile = {
    id: `${searchId}-${userId}`,
    search_id: searchId,
    user_id: userId,
    joined_at: "",
    role: "player",
    skill_level: form.skillLevel,
    brings_game: form.bringsGame,
    status: "joined",
    profile: {
      id: userId,
      display_name: session?.profile?.display_name ?? "Du",
      avatar_url: null,
    },
  };

  const merge = (r: RoundWithGame): RoundWithGame => {
    if (r.participants.some((p) => p.user_id === userId)) return r;
    const participants = [...r.participants, newPart];
    return { ...r, participants, seats_taken: participants.length };
  };

  qc.setQueryData<RoundWithGame | null>(["round", searchId], (r) =>
    r ? merge(r) : r,
  );
  if (eventId) {
    qc.setQueryData<RoundWithGame[]>(["rounds", eventId], (list) =>
      list?.map((r) => (r.id === searchId ? merge(r) : r)),
    );
  }
}

export function useJoinRound(searchId: string, eventId: string | null) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation<void, Error, JoinForm>({
    mutationFn: async (form) => {
      const session = qc.getQueryData<SessionState>(["session"]);
      const userId = session?.user?.id;

      if (!isSupabaseConfigured()) {
        applyDemoJoin(qc, searchId, eventId, form);
        return;
      }
      if (!userId) throw new Error("Bitte zuerst eine Gast-Identität anlegen.");
      await dbJoinRound(supabase, {
        searchId,
        userId,
        skillLevel: form.skillLevel,
        bringsGame: form.bringsGame,
      });
    },
    onSuccess: () => {
      if (isSupabaseConfigured()) {
        qc.invalidateQueries({ queryKey: ["round", searchId] });
        if (eventId) qc.invalidateQueries({ queryKey: ["rounds", eventId] });
      }
    },
  });
}
