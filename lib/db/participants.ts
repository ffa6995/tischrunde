import type { SupabaseClient } from "@supabase/supabase-js";
import type { Participant, SkillLevel } from "@/lib/types";

export interface JoinRoundInput {
  searchId: string;
  userId: string;
  skillLevel: SkillLevel;
  bringsGame: boolean;
  bringsNote?: string | null;
  gameName?: string | null;
}

export async function joinRound(
  supabase: SupabaseClient,
  input: JoinRoundInput,
): Promise<Participant> {
  const { data, error } = await supabase
    .from("participants")
    .upsert(
      {
        search_id: input.searchId,
        user_id: input.userId,
        skill_level: input.skillLevel,
        brings_game: input.bringsGame,
        brings_note: input.bringsGame ? (input.bringsNote ?? null) : null,
        role: "player",
        status: "joined",
      },
      { onConflict: "search_id,user_id" },
    )
    .select()
    .single();
  if (error) throw error;

  await supabase.from("activity_events").insert({
    user_id: input.userId,
    type: "round_joined",
    source_type: "game_search",
    source_id: input.searchId,
    metadata: {
      brings_game: input.bringsGame,
      game_name: input.gameName ?? null,
      skill: input.skillLevel,
    },
  });

  // Bring-Mechanik (Konzept §11.3): eigenes Signal, wenn jemand mitbringt.
  if (input.bringsGame) {
    await supabase.from("activity_events").insert({
      user_id: input.userId,
      type: "game_brought",
      source_type: "game_search",
      source_id: input.searchId,
      metadata: { game_name: input.gameName ?? null, note: input.bringsNote ?? null },
    });
  }

  return data as Participant;
}

export interface CheckInInput {
  searchId: string;
  userId: string;
  gameName?: string | null;
  eventId?: string | null;
  eventName?: string | null;
}

/** QR-Check-in (Light): bestätigt Anwesenheit (Konzept §11.4 — das Schwungrad). */
export async function checkIn(
  supabase: SupabaseClient,
  input: CheckInInput,
): Promise<void> {
  const { error } = await supabase
    .from("participants")
    .update({ status: "confirmed" })
    .eq("search_id", input.searchId)
    .eq("user_id", input.userId);
  if (error) throw error;

  await supabase.from("activity_events").insert({
    user_id: input.userId,
    type: "checked_in",
    source_type: "game_search",
    source_id: input.searchId,
    metadata: {
      game_name: input.gameName ?? null,
      event_id: input.eventId ?? null,
      event_name: input.eventName ?? null,
    },
  });
}

/** Host bestätigt Anwesenheit eines Teilnehmers (Konzept §5.2). */
export async function hostConfirmParticipant(
  supabase: SupabaseClient,
  searchId: string,
  targetUserId: string,
  hostId: string,
): Promise<void> {
  const { error } = await supabase
    .from("participants")
    .update({ status: "confirmed" })
    .eq("search_id", searchId)
    .eq("user_id", targetUserId);
  if (error) throw error;

  await supabase.from("activity_events").insert({
    user_id: targetUserId,
    type: "host_confirmed",
    source_type: "game_search",
    source_id: searchId,
    created_by: hostId,
  });
}

/**
 * Host entfernt einen Teilnehmer (respektvoll, vordefinierter Grund).
 * KEIN Trust-Abzug (Konzept §9.3) — nur Status 'removed'.
 */
export async function removeParticipant(
  supabase: SupabaseClient,
  searchId: string,
  targetUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from("participants")
    .update({ status: "removed" })
    .eq("search_id", searchId)
    .eq("user_id", targetUserId);
  if (error) throw error;
}

export async function leaveRound(
  supabase: SupabaseClient,
  searchId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("participants")
    .update({ status: "left" })
    .eq("search_id", searchId)
    .eq("user_id", userId);
  if (error) throw error;
}
