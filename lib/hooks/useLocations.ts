"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getLocation, getLocationGames } from "@/lib/db/locations";
import { demoLocation, demoLocationGames } from "@/lib/demo/fixtures";
import type { Game, Location } from "@/lib/types";

export function useLocation(id: string | null | undefined) {
  const supabase = createClient();
  return useQuery<Location | null>({
    queryKey: ["location", id],
    enabled: !!id,
    queryFn: () =>
      isSupabaseConfigured()
        ? getLocation(supabase, id!)
        : Promise.resolve(demoLocation(id!)),
  });
}

export function useLocationGames(id: string | null | undefined) {
  const supabase = createClient();
  return useQuery<Game[]>({
    queryKey: ["location-games", id],
    enabled: !!id,
    queryFn: () =>
      isSupabaseConfigured()
        ? getLocationGames(supabase, id!)
        : Promise.resolve(demoLocationGames(id!)),
  });
}
