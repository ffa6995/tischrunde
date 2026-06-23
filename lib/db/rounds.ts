import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DesiredLevel,
  GameSource,
  RoundWithGame,
} from "@/lib/types";

const ROUND_SELECT =
  "*, game:games(*), participants(*, profile:profiles(id, display_name, avatar_url))";

/** Roh-Row aus Supabase in unsere View-Form bringen (Belegungszähler ableiten). */
function toRoundWithGame(row: Record<string, unknown>): RoundWithGame {
  const participants = (row.participants ?? []) as RoundWithGame["participants"];
  const active = participants.filter(
    (p) => p.status !== "left" && p.status !== "removed" && p.status !== "no_show",
  );
  return {
    ...(row as unknown as RoundWithGame),
    participants: active,
    seats_taken: active.length,
  };
}

export async function getRoundsForEvent(
  supabase: SupabaseClient,
  eventId: string,
): Promise<RoundWithGame[]> {
  const { data, error } = await supabase
    .from("game_searches")
    .select(ROUND_SELECT)
    .eq("event_id", eventId)
    .eq("visibility", "public")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => toRoundWithGame(r as Record<string, unknown>));
}

export async function getRound(
  supabase: SupabaseClient,
  id: string,
): Promise<RoundWithGame | null> {
  const { data, error } = await supabase
    .from("game_searches")
    .select(ROUND_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toRoundWithGame(data as Record<string, unknown>) : null;
}

export async function setRoundStatus(
  supabase: SupabaseClient,
  searchId: string,
  status: "open" | "full" | "active" | "closed" | "cancelled",
): Promise<void> {
  const { error } = await supabase
    .from("game_searches")
    .update({ status })
    .eq("id", searchId);
  if (error) throw error;
}

export interface CreateRoundInput {
  eventId: string;
  gameId: string;
  creatorId: string;
  title: string | null;
  seatsTotal: number;
  gameSource: GameSource;
  desiredLevel: DesiredLevel;
  beginnerFriendly: boolean;
  visibility: "public" | "invite" | "unlisted";
}

export async function createRound(
  supabase: SupabaseClient,
  input: CreateRoundInput,
): Promise<string> {
  const { data, error } = await supabase
    .from("game_searches")
    .insert({
      event_id: input.eventId,
      game_id: input.gameId,
      creator_id: input.creatorId,
      title: input.title,
      seats_total: input.seatsTotal,
      game_source: input.gameSource,
      desired_level: input.desiredLevel,
      beginner_friendly: input.beginnerFriendly,
      visibility: input.visibility,
    })
    .select("id")
    .single();
  if (error) throw error;

  // Ersteller als Host eintragen
  await supabase.from("participants").insert({
    search_id: data.id,
    user_id: input.creatorId,
    role: "host",
    status: "joined",
  });

  // Aktivität protokollieren (Quelle für spätere Stats/Trust)
  await supabase.from("activity_events").insert({
    user_id: input.creatorId,
    type: "round_created",
    source_type: "game_search",
    source_id: data.id,
  });

  return data.id as string;
}
