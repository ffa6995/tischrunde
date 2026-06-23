import type { SupabaseClient } from "@supabase/supabase-js";
import type { Participant, SkillLevel } from "@/lib/types";

export interface JoinRoundInput {
  searchId: string;
  userId: string;
  skillLevel: SkillLevel;
  bringsGame: boolean;
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
    metadata: { brings_game: input.bringsGame, game_name: input.gameName ?? null },
  });

  return data as Participant;
}

/** QR-Check-in (Light): bestätigt Anwesenheit (Konzept §11.4 — das Schwungrad). */
export async function checkIn(
  supabase: SupabaseClient,
  searchId: string,
  userId: string,
  gameName?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("participants")
    .update({ status: "confirmed" })
    .eq("search_id", searchId)
    .eq("user_id", userId);
  if (error) throw error;

  await supabase.from("activity_events").insert({
    user_id: userId,
    type: "checked_in",
    source_type: "game_search",
    source_id: searchId,
    metadata: { game_name: gameName ?? null },
  });
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
