import type { SupabaseClient } from "@supabase/supabase-js";
import type { SkillLevel } from "@/lib/types";

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
): Promise<void> {
  const { error } = await supabase.rpc("join_round", {
    p_search_id: input.searchId,
    p_skill_level: input.skillLevel,
    p_brings_game: input.bringsGame,
    p_brings_note: input.bringsNote ?? null,
    p_game_name: input.gameName ?? null,
  });
  if (error) throw error;
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
  const { error } = await supabase.rpc("check_in_round", {
    p_search_id: input.searchId,
    p_game_name: input.gameName ?? null,
    p_event_id: input.eventId ?? null,
    p_event_name: input.eventName ?? null,
  });
  if (error) throw error;
}

/** Host bestätigt Anwesenheit eines Teilnehmers (Konzept §5.2). */
export async function hostConfirmParticipant(
  supabase: SupabaseClient,
  searchId: string,
  targetUserId: string,
): Promise<void> {
  const { error } = await supabase.rpc("confirm_participant", {
    p_search_id: searchId,
    p_target_user_id: targetUserId,
  });
  if (error) throw error;
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
  const { error } = await supabase.rpc("remove_participant", {
    p_search_id: searchId,
    p_target_user_id: targetUserId,
  });
  if (error) throw error;
}

export async function leaveRound(
  supabase: SupabaseClient,
  searchId: string,
): Promise<void> {
  const { error } = await supabase.rpc("leave_round", { p_search_id: searchId });
  if (error) throw error;
}
