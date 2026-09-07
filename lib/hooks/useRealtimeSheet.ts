"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Live-Update eines Punkteblatts für Mitleser (Spec §Realtime).
 * Voraussetzung: notepad_sheets ist in der supabase_realtime-Publication
 * (supabase/enable-realtime.sql).
 */
export function useRealtimeSheet(sheetId: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured() || !sheetId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`notepad-${sheetId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notepad_sheets", filter: `id=eq.${sheetId}` },
        () => qc.invalidateQueries({ queryKey: ["notepad-sheet", sheetId] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sheetId, qc]);
}
