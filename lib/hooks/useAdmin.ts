"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  createEvent,
  listAllEvents,
  listAllLocations,
  setEventStatus,
  setLocationStatus,
  type CreateEventInput,
} from "@/lib/db/admin";
import { useSession } from "./useSession";
import type { Event, Location } from "@/lib/types";

export function useIsAdmin(): boolean {
  const { data } = useSession();
  const role = data?.profile?.role;
  return role === "admin" || role === "moderator";
}

export function useAllEvents(enabled: boolean) {
  const supabase = createClient();
  return useQuery<Event[]>({
    queryKey: ["admin", "events"],
    enabled,
    queryFn: () => listAllEvents(supabase),
  });
}

export function useAllLocations(enabled: boolean) {
  const supabase = createClient();
  return useQuery<Location[]>({
    queryKey: ["admin", "locations"],
    enabled,
    queryFn: () => listAllLocations(supabase),
  });
}

export function useCreateEvent() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation<string, Error, CreateEventInput>({
    mutationFn: (input) => createEvent(supabase, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useSetEventStatus() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { id: string; status: "draft" | "published" | "cancelled" | "archived" }
  >({
    mutationFn: ({ id, status }) => setEventStatus(supabase, id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useSetLocationStatus() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { id: string; status: "private" | "pending" | "public" | "archived" }
  >({
    mutationFn: ({ id, status }) => setLocationStatus(supabase, id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "locations"] }),
  });
}
