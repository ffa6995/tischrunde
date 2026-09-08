"use client";

import { useRef } from "react";
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
  updateSheetPlayers,
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
  const qc = useQueryClient();
  const configured = isSupabaseConfigured();
  return useQuery<NotepadSheet | null>({
    queryKey: ["notepad-sheet", sheetId],
    // Demo-Modus: das Blatt liegt nur im Cache (useCreateSheet legt es dort an).
    // Bei einem Refetch (z.B. Remount nach staleTime) muss der Cache-Wert
    // zurückgegeben werden, statt ihn mit null zu überschreiben – sonst
    // verschwindet das Blatt selbst, sobald diese Query erneut ausgeführt wird.
    queryFn: async () =>
      configured ? getSheet(supabase, sheetId) : (qc.getQueryData<NotepadSheet>(["notepad-sheet", sheetId]) ?? null),
    enabled: Boolean(sheetId),
  });
}

export function useRoundSheets(searchId: string | null) {
  const supabase = createClient();
  const qc = useQueryClient();
  const configured = isSupabaseConfigured();
  return useQuery<NotepadSheet[]>({
    queryKey: ["notepad-sheets", searchId],
    // Demo-Modus: die Liste lebt nur im Cache (useCreateSheet seedet sie).
    // Ein Refetch darf sie nicht auf [] zurücksetzen, sonst verliert die
    // Runden-Übersicht alle Blätter, sobald diese Query erneut läuft.
    queryFn: async () =>
      configured && searchId
        ? getSheetsForRound(supabase, searchId)
        : (qc.getQueryData<NotepadSheet[]>(["notepad-sheets", searchId]) ?? []),
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
        const sheet: NotepadSheet = {
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
        };
        qc.setQueryData<NotepadSheet>(["notepad-sheet", id], sheet);
        // Demo-Modus: die Runde-Liste lebt nur im Cache, hier mitschreiben,
        // sonst bleibt das neue Blatt für die Runden-Übersicht unsichtbar.
        if (input.searchId) {
          qc.setQueryData<NotepadSheet[]>(["notepad-sheets", input.searchId], (list) => [
            ...(list ?? []),
            sheet,
          ]);
        }
        return id;
      }
      return createSheet(supabase, input);
    },
    onSuccess: (_id, input) => {
      // Im Demo-Modus wurde die Liste gerade oben geseedet; ein Invalidate
      // hier würde sie sofort mit dem Demo-Fallback ([]) überschreiben.
      if (configured && input.searchId) {
        qc.invalidateQueries({ queryKey: ["notepad-sheets", input.searchId] });
      }
    },
  });
}

export function useNotepadActions(sheetId: string, searchId?: string | null) {
  const supabase = createClient();
  const qc = useQueryClient();
  const configured = isSupabaseConfigured();

  // Die Revision, die der letzte ERFOLGREICHE eigene Save dieses Geräts
  // erzeugt hat. Wird nur von diesem Hook geschrieben (nie von einem fremden
  // Gerät berührt) und dient dazu, einen bereits abgeschlossenen eigenen Save
  // aus der Warteschlange (scope) von einem echten Fremd-Schreiben zu
  // unterscheiden, siehe effectiveExpectedRevision unten. Lebt so lange wie
  // dieser Hook (pro sheetId neu, da die Seite bei Sheet-Wechsel remountet).
  const lastOwnRevisionRef = useRef<number | null>(null);

  const save = useMutation<number, Error, { entries: Record<string, unknown>; expectedRevision: number }>({
    // Serialisiert Saves pro Blatt: TanStack Query führt Mutationen mit
    // gleicher scope.id nacheinander aus, nie parallel. Ohne das würde ein
    // zweiter debounced Save starten, während der erste noch unterwegs ist,
    // beide läsen dieselbe (alte) Revision, und der zweite würde vom Server
    // fälschlich als Konflikt abgelehnt, obwohl niemand sonst geschrieben hat.
    scope: { id: `notepad-save-${sheetId}` },
    // Die erwartete Revision kommt vom Aufrufer (SheetPageView: baseRevision),
    // nicht aus dem Query-Cache. Der Cache-Wert kann zwischen Tastendruck
    // (Timer wird gestellt) und Timer-Ablauf (Save wird tatsächlich
    // abgeschickt) bereits von einem FREMDEN Save via Realtime vorgerückt
    // sein — würde man dann die Cache-Revision lesen, würde sie fälschlich
    // zur erwarteten Revision und der stale Entwurf überschriebe den fremden
    // Stand widerspruchslos. Mit der vom Aufrufer übergebenen (alten)
    // baseRevision lehnt die RPC den Save stattdessen korrekt als Konflikt ab.
    mutationFn: async ({ entries, expectedRevision }) => {
      // Zwei schnell hintereinander abgeschickte eigene Saves (Debounce feuert
      // zweimal, bevor der erste zurück ist) capturen beide dieselbe
      // (veraltete) baseRevision, weil React sie noch nicht aktualisiert hat —
      // der scope oben serialisiert sie aber trotzdem korrekt hintereinander.
      // lastOwnRevisionRef.current wird erst NACH Abschluss des vorherigen
      // eigenen Saves gesetzt (s.u.), also sieht der zweite, hier zur
      // Ausführungszeit (nicht zur Dispatch-Zeit) gelesene Wert bereits den
      // frischen Stand — ein Fremd-Schreiben ändert diesen Ref nie, die
      // Konflikt-Erkennung bleibt also unangetastet.
      //
      // Max statt "Ref bevorzugen": Nach einem explizit aufgelösten Konflikt
      // (SheetPageView.takeNewerVersion setzt baseRevision auf sheet.revision
      // vom Server) kann expectedRevision frischer sein als der hier noch
      // veraltete Ref, den kein fremd ausgelöster Konflikt zurücksetzt. Beide
      // Werte sind aber unabhängig voneinander niemals höher als der wahre
      // Server-Stand (der Ref kommt selbst aus einer Server-Antwort,
      // expectedRevision aus baseRevision, das nur per erfolgreichem eigenen
      // Save oder per explizitem takeNewerVersion vorrückt) — das Maximum ist
      // also immer der jeweils aktuellere von zwei korrekten-oder-veralteten
      // Werten, nie eine Überschätzung, die der Server fälschlich akzeptieren würde.
      const effectiveExpectedRevision = Math.max(
        lastOwnRevisionRef.current ?? expectedRevision,
        expectedRevision,
      );
      if (!configured) {
        // Demo-Modus hat keinen Server und damit keine echte Konflikt-Prüfung;
        // die Revision zählt einfach lokal hoch, expectedRevision bleibt ungenutzt.
        // lastOwnRevisionRef wird trotzdem gepflegt, damit dieser Zweig
        // denselben Codepfad/Mental-Model wie der konfigurierte Zweig teilt.
        const current = qc.getQueryData<NotepadSheet | null>(["notepad-sheet", sheetId]);
        const revision = current?.revision ?? 0;
        const next = revision + 1;
        patchSheet(qc, sheetId, (s) => ({ ...s, entries, revision: next }));
        lastOwnRevisionRef.current = next;
        return next;
      }
      const next = await saveEntries(supabase, { sheetId, entries, expectedRevision: effectiveExpectedRevision });
      patchSheet(qc, sheetId, (s) => ({ ...s, entries, revision: next }));
      lastOwnRevisionRef.current = next;
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
    onSuccess: () => {
      if (!configured) return;
      qc.invalidateQueries({ queryKey: ["notepad-sheet", sheetId] });
      // Der Status-Badge in der Runden-Liste hängt an dieser Query mit dran.
      if (searchId) qc.invalidateQueries({ queryKey: ["notepad-sheets", searchId] });
    },
  });

  const updatePlayers = useMutation<void, Error, NotepadSheet["players"]>({
    mutationFn: async (players) => {
      if (!configured) {
        patchSheet(qc, sheetId, (s) => ({ ...s, players }));
        return;
      }
      await updateSheetPlayers(supabase, sheetId, players);
    },
    onSuccess: (_result, players) => {
      if (!configured) return;
      patchSheet(qc, sheetId, (s) => ({ ...s, players }));
      qc.invalidateQueries({ queryKey: ["notepad-sheet", sheetId] });
      if (searchId) qc.invalidateQueries({ queryKey: ["notepad-sheets", searchId] });
    },
  });

  const handOver = useMutation<void, Error, string>({
    mutationFn: async (toUserId) => {
      if (!configured) {
        patchSheet(qc, sheetId, (s) => ({ ...s, owner_id: toUserId }));
        return;
      }
      await transferWriter(supabase, sheetId, toUserId);
    },
    onSuccess: () => {
      if (!configured) return;
      qc.invalidateQueries({ queryKey: ["notepad-sheet", sheetId] });
      if (searchId) qc.invalidateQueries({ queryKey: ["notepad-sheets", searchId] });
    },
  });

  return {
    save,
    finish: () => setStatus.mutate("finished"),
    reopen: () => setStatus.mutate("active"),
    setStatus,
    handOver,
    updatePlayers,
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
