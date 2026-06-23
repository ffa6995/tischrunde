import type { SupabaseClient } from "@supabase/supabase-js";
import type { Game } from "@/lib/types";

export async function listGames(supabase: SupabaseClient): Promise<Game[]> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("status", "approved")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Game[];
}
