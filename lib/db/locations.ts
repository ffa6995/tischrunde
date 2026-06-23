import type { SupabaseClient } from "@supabase/supabase-js";
import type { Game, Location } from "@/lib/types";

export async function getLocation(
  supabase: SupabaseClient,
  id: string,
): Promise<Location | null> {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Location | null;
}

/** Spielbestand einer Location (Konzept §7.1 location_games). */
export async function getLocationGames(
  supabase: SupabaseClient,
  locationId: string,
): Promise<Game[]> {
  const { data, error } = await supabase
    .from("location_games")
    .select("game:games(*)")
    .eq("location_id", locationId)
    .eq("status", "available");
  if (error) throw error;
  return (data ?? [])
    .map((row) => {
      const g = (row as unknown as { game: Game | Game[] | null }).game;
      return Array.isArray(g) ? (g[0] ?? null) : g;
    })
    .filter((g): g is Game => !!g);
}
