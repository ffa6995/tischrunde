"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listGames } from "@/lib/db/games";
import { DEMO_GAMES } from "@/lib/demo/fixtures";
import type { Game } from "@/lib/types";

export function useGames() {
  const supabase = createClient();
  return useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: () =>
      isSupabaseConfigured() ? listGames(supabase) : Promise.resolve(DEMO_GAMES),
  });
}
