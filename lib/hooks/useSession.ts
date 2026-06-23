"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getProfile } from "@/lib/db/profiles";
import { requestEmailClaim, signInAsGuest, signOut } from "@/lib/db/auth";
import type { Profile } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

export interface SessionState {
  user: User | null;
  profile: Profile | null;
}

const DEMO_KEY = "tr-demo-guest";

function readDemoGuest(): SessionState {
  if (typeof window === "undefined") return { user: null, profile: null };
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (!raw) return { user: null, profile: null };
    const g = JSON.parse(raw) as { id: string; display_name: string };
    const profile: Profile = {
      id: g.id,
      display_name: g.display_name,
      avatar_url: null,
      role: "guest",
      verification_status: "none",
      created_at: "",
      updated_at: "",
    };
    return { user: { id: g.id, is_anonymous: true } as unknown as User, profile };
  } catch {
    return { user: null, profile: null };
  }
}

/** Aktuelle Session + Profil (TanStack Query, getrennt von der UI). */
export function useSession() {
  const supabase = createClient();
  return useQuery<SessionState>({
    queryKey: ["session"],
    queryFn: async () => {
      if (!isSupabaseConfigured()) return readDemoGuest();
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return { user: null, profile: null };
      const profile = await getProfile(supabase, user.id);
      return { user, profile };
    },
    retry: false,
  });
}

export function useSignInAsGuest() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (displayName: string) => {
      const name = displayName.trim();
      if (!name) throw new Error("Bitte einen Anzeigenamen eingeben.");
      if (!isSupabaseConfigured()) {
        const id =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `demo-${Date.now()}`;
        localStorage.setItem(DEMO_KEY, JSON.stringify({ id, display_name: name }));
        return;
      }
      await signInAsGuest(supabase, name);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session"] }),
  });
}

export function useClaimProfile() {
  const supabase = createClient();
  return useMutation({
    mutationFn: async (email: string) => {
      if (!isSupabaseConfigured()) {
        throw new Error(
          "Profil sichern braucht eine echte Supabase-Verbindung (kein Demo-Modus).",
        );
      }
      await requestEmailClaim(supabase, email);
    },
  });
}

export function useSignOut() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!isSupabaseConfigured()) {
        localStorage.removeItem(DEMO_KEY);
        return;
      }
      await signOut(supabase);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session"] }),
  });
}
