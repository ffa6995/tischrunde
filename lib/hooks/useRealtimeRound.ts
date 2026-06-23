"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Live-Update der Sitzplätze (CLAUDE.md §5.5). Abonniert participant-Änderungen
 * der Runde und invalidiert die Queries, sobald jemand bei-/austritt oder
 * eincheckt. Nur im Real-Modus; im Demo-Modus passiert nichts.
 *
 * Voraussetzung: Tabelle `participants` ist in der supabase_realtime-Publication
 * (siehe supabase/enable-realtime.sql).
 */
export function useRealtimeRound(searchId: string, eventId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured() || !searchId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`round-${searchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `search_id=eq.${searchId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["round", searchId] });
          if (eventId) qc.invalidateQueries({ queryKey: ["rounds", eventId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [searchId, eventId, qc]);
}
