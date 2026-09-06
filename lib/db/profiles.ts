import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

/** Reine DB-Funktionen für `profiles` (keine UI-Logik, CLAUDE.md §2). */

export async function getProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function upsertProfile(
  supabase: SupabaseClient,
  userId: string,
  displayName: string,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, display_name: displayName })
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}
