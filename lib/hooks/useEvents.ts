"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getEvent, getPublishedEvents } from "@/lib/db/events";
import { DEMO_EVENTS } from "@/lib/demo/fixtures";
import type { Event } from "@/lib/types";

export function useEvents() {
  const supabase = createClient();
  return useQuery<Event[]>({
    queryKey: ["events"],
    queryFn: () =>
      isSupabaseConfigured()
        ? getPublishedEvents(supabase)
        : Promise.resolve(DEMO_EVENTS),
  });
}

export function useEvent(id: string | null | undefined) {
  const supabase = createClient();
  return useQuery<Event | null>({
    queryKey: ["event", id],
    enabled: !!id,
    queryFn: () =>
      isSupabaseConfigured()
        ? getEvent(supabase, id!)
        : Promise.resolve(DEMO_EVENTS.find((e) => e.id === id) ?? null),
  });
}
