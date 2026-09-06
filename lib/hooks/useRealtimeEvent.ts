"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Keeps an event's round list fresh after round, seat, or status changes. */
export function useRealtimeEvent(eventId: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured() || !eventId) return;
    const supabase = createClient();
    const refresh = () => qc.invalidateQueries({ queryKey: ["rounds", eventId] });
    const channel = supabase
      .channel(`event-rounds-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_searches", filter: `event_id=eq.${eventId}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, qc]);
}
