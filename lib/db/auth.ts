import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import { upsertProfile } from "./profiles";

/**
 * Auth light (CLAUDE.md §5.3 / Konzept §8.3): provisorische Gast-Identität.
 * Anonymer Supabase-Auth-User + Anzeigename. Profil-Claim (Magic-Link/Discord)
 * kommt später; Aktivität/Stats wandern dann mit.
 */
export async function signInAsGuest(
  supabase: SupabaseClient,
  displayName: string,
): Promise<Profile> {
  const name = displayName.trim();
  if (!name) throw new Error("Bitte einen Anzeigenamen eingeben.");

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error("Es konnte keine Gast-Identität erstellt werden.");

  return upsertProfile(supabase, userId, name);
}

export async function signOut(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
