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
    .is("archived_at", null)
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
  const { error } = await supabase.rpc("set_round_status", {
    p_search_id: searchId,
    p_status: status,
  });
  if (error) throw error;
}

export async function archiveRound(
  supabase: SupabaseClient,
  searchId: string,
): Promise<void> {
  const { error } = await supabase.rpc("archive_round", {
    p_search_id: searchId,
  });
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
  visibility: "public" | "unlisted";
}

export async function createRound(
  supabase: SupabaseClient,
  input: CreateRoundInput,
): Promise<string> {
  const { data, error } = await supabase.rpc("create_round", {
    p_event_id: input.eventId,
    p_game_id: input.gameId,
    p_title: input.title,
    p_seats_total: input.seatsTotal,
    p_game_source: input.gameSource,
    p_desired_level: input.desiredLevel,
    p_beginner_friendly: input.beginnerFriendly,
    p_visibility: input.visibility,
  });
  if (error) throw error;
  return data as string;
}
