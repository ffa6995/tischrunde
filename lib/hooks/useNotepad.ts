"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  createSheet,
  deleteTemplate,
  getSheet,
  getSheetsForRound,
  listTemplates,
  saveEntries,
  saveTemplate,
  setSheetStatus,
  transferWriter,
} from "@/lib/db/notepad";
import type { CreateSheetInput, SaveTemplateInput } from "@/lib/db/notepad";
import type { NotepadSheet, NotepadSheetStatus, NotepadTemplate } from "@/lib/types";
import type { SessionState } from "./useSession";

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `local-${Math.random().toString(36).slice(2, 10)}`;
}

function patchSheet(qc: QueryClient, sheetId: string, fn: (s: NotepadSheet) => NotepadSheet) {
  qc.setQueryData<NotepadSheet | null>(["notepad-sheet", sheetId], (s) => (s ? fn(s) : s));
}

export function useNotepadTemplates() {
  const supabase = createClient();
  const configured = isSupabaseConfigured();
  return useQuery<NotepadTemplate[]>({
    queryKey: ["notepad-templates"],
    queryFn: async () => (configured ? listTemplates(supabase) : []),
    staleTime: 60_000,
  });
}

export function useNotepadSheet(sheetId: string) {
  const supabase = createClient();
  const configured = isSupabaseConfigured();
  return useQuery<NotepadSheet | null>({
    queryKey: ["notepad-sheet", sheetId],
    // Demo-Modus: das Blatt liegt nur im Cache (useCreateSheet legt es dort an).
    queryFn: async () => (configured ? getSheet(supabase, sheetId) : null),
    enabled: Boolean(sheetId),
  });
}

export function useRoundSheets(searchId: string | null) {
  const supabase = createClient();
  const configured = isSupabaseConfigured();
  return useQuery<NotepadSheet[]>({
    queryKey: ["notepad-sheets", searchId],
    queryFn: async () => (configured && searchId ? getSheetsForRound(supabase, searchId) : []),
    enabled: Boolean(searchId),
  });
}

export function useCreateSheet() {
  const supabase = createClient();
  const qc = useQueryClient();
  const configured = isSupabaseConfigured();

  return useMutation<string, Error, CreateSheetInput>({
    mutationFn: async (input) => {
      if (!configured) {
        const id = newId();
        const now = new Date().toISOString();
        // Demo-Owner kommt aus der Session-Cache (Gast-User), damit isWriter
        // für den Ersteller stimmt; "demo-user" ist nur der letzte Rückfall.
        const ownerId =
          qc.getQueryData<SessionState>(["session"])?.user?.id ?? "demo-user";
        qc.setQueryData<NotepadSheet>(["notepad-sheet", id], {
          id,
          title: input.title,
          search_id: input.searchId,
          owner_id: ownerId,
          template_id: input.templateId,
          schema_version: 1,
          definition: input.definition,
          players: input.players,
          entries: {},
          revision: 0,
          status: "active",
          created_at: now,
          updated_at: now,
        });
        return id;
      }
      return createSheet(supabase, input);
    },
    onSuccess: (_id, input) => {
      if (input.searchId) qc.invalidateQueries({ queryKey: ["notepad-sheets", input.searchId] });
    },
  });
}

export function useNotepadActions(sheetId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const configured = isSupabaseConfigured();

  const save = useMutation<number, Error, Record<string, unknown>>({
    mutationFn: async (entries) => {
      const current = qc.getQueryData<NotepadSheet | null>(["notepad-sheet", sheetId]);
      const revision = current?.revision ?? 0;
      if (!configured) {
        patchSheet(qc, sheetId, (s) => ({ ...s, entries, revision: revision + 1 }));
        return revision + 1;
      }
      const next = await saveEntries(supabase, { sheetId, entries, expectedRevision: revision });
      patchSheet(qc, sheetId, (s) => ({ ...s, entries, revision: next }));
      return next;
    },
    // Kein Refetch nach jedem Tastendruck: die Revision wandert optimistisch mit,
    // Mitleser bekommen die Änderung über useRealtimeSheet.
  });

  const setStatus = useMutation<void, Error, NotepadSheetStatus>({
    mutationFn: async (status) => {
      if (!configured) {
        patchSheet(qc, sheetId, (s) => ({ ...s, status }));
        return;
      }
      await setSheetStatus(supabase, sheetId, status);
    },
    onSuccess: () => configured && qc.invalidateQueries({ queryKey: ["notepad-sheet", sheetId] }),
  });

  const handOver = useMutation<void, Error, string>({
    mutationFn: async (toUserId) => {
      if (!configured) {
        patchSheet(qc, sheetId, (s) => ({ ...s, owner_id: toUserId }));
        return;
      }
      await transferWriter(supabase, sheetId, toUserId);
    },
    onSuccess: () => configured && qc.invalidateQueries({ queryKey: ["notepad-sheet", sheetId] }),
  });

  return {
    save,
    finish: () => setStatus.mutate("finished"),
    reopen: () => setStatus.mutate("active"),
    setStatus,
    handOver,
  };
}

export function useSaveTemplate() {
  const supabase = createClient();
  const qc = useQueryClient();
  const configured = isSupabaseConfigured();

  return useMutation<string, Error, SaveTemplateInput>({
    mutationFn: async (input) => {
      if (!configured) return input.templateId ?? newId();
      return saveTemplate(supabase, input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notepad-templates"] }),
  });
}

export function useDeleteTemplate() {
  const supabase = createClient();
  const qc = useQueryClient();
  const configured = isSupabaseConfigured();

  return useMutation<void, Error, string>({
    mutationFn: async (templateId) => {
      if (!configured) return;
      await deleteTemplate(supabase, templateId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notepad-templates"] }),
  });
}
