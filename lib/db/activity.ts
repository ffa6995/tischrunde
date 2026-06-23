import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityEvent } from "@/lib/types";

/** Aktivitäts-Log eines Nutzers (Quelle für abgeleitete Trust-Signale). */
export async function getUserActivity(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActivityEvent[]> {
  const { data, error } = await supabase
    .from("activity_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ActivityEvent[];
}
