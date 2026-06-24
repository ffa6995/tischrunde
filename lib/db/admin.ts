import type { SupabaseClient } from "@supabase/supabase-js";
import type { Event, Location } from "@/lib/types";

/** Admin-DB-Funktionen (Konzept §14.3). Zugriff regelt RLS (role admin/moderator). */

export async function listAllEvents(
  supabase: SupabaseClient,
): Promise<Event[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Event[];
}

export interface CreateEventInput {
  title: string;
  startsAt: string; // ISO
  description: string | null;
  eventUrl: string | null;
  locationId: string | null;
}

export async function createEvent(
  supabase: SupabaseClient,
  input: CreateEventInput,
): Promise<string> {
  const { data, error } = await supabase
    .from("events")
    .insert({
      title: input.title,
      starts_at: input.startsAt,
      description: input.description,
      event_url: input.eventUrl,
      location_id: input.locationId,
      visibility: "public",
      status: "published",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function setEventStatus(
  supabase: SupabaseClient,
  id: string,
  status: "draft" | "published" | "cancelled" | "archived",
): Promise<void> {
  const { error } = await supabase
    .from("events")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function listAllLocations(
  supabase: SupabaseClient,
): Promise<Location[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Location[];
}

export async function setLocationStatus(
  supabase: SupabaseClient,
  id: string,
  status: "private" | "pending" | "public" | "archived",
): Promise<void> {
  const { error } = await supabase
    .from("locations")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
