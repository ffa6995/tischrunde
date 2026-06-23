import type { SupabaseClient } from "@supabase/supabase-js";
import type { Participant, SkillLevel } from "@/lib/types";

export interface JoinRoundInput {
  searchId: string;
  userId: string;
  skillLevel: SkillLevel;
  bringsGame: boolean;
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
    metadata: { brings_game: input.bringsGame },
  });

  return data as Participant;
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
