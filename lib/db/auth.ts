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

/**
 * Anmeldung für bestehende (oder neue) Accounts per Magic-Link (Konzept §8.2).
 * Schickt einen Login-Link; nach dem Klick (→ /auth/confirm) ist man eingeloggt.
 */
export async function signInWithEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<void> {
  const e = email.trim();
  if (!e) throw new Error("Bitte eine E-Mail-Adresse eingeben.");
  const { error } = await supabase.auth.signInWithOtp({ email: e });
  if (error) throw error;
}

export async function signOut(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Profil-Claim (Konzept §8.3): hängt eine E-Mail an den bestehenden (anonymen)
 * User. Supabase schickt eine Bestätigungs-Mail; nach dem Klick ist der User
 * dauerhaft — die User-ID bleibt gleich, also wandern Stats/Stamps mit.
 */
export async function requestEmailClaim(
  supabase: SupabaseClient,
  email: string,
): Promise<void> {
  const e = email.trim();
  if (!e) throw new Error("Bitte eine E-Mail-Adresse eingeben.");
  const { error } = await supabase.auth.updateUser({ email: e });
  if (error) throw error;
}
