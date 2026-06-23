import type { SupabaseClient } from "@supabase/supabase-js";
import type { Event } from "@/lib/types";

/** Reine DB-Funktionen für `events` (CLAUDE.md §2). */

export async function getPublishedEvents(
  supabase: SupabaseClient,
): Promise<Event[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("visibility", "public")
    .eq("status", "published")
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Event[];
}

export async function getEvent(
  supabase: SupabaseClient,
  id: string,
): Promise<Event | null> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Event | null;
}
