"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SheetView } from "@/components/notepad/SheetView";
import { useNotepadActions, useNotepadSheet } from "@/lib/hooks/useNotepad";
import { useRealtimeSheet } from "@/lib/hooks/useRealtimeSheet";
import { useSession } from "@/lib/hooks/useSession";
import type { SheetPlayer } from "@/lib/notepad/schema";

/** Speichert gebündelt, damit nicht jeder Tastendruck eine RPC auslöst. */
const SAVE_DEBOUNCE_MS = 600;

export function SheetPageView({ sheetId }: { sheetId: string }) {
  const { data: sheet, isLoading } = useNotepadSheet(sheetId);
  const session = useSession();
  const { save, finish, reopen, setStatus } = useNotepadActions(sheetId, sheet?.search_id ?? null);
  useRealtimeSheet(sheetId);

  // Nur der Schreiber hält einen lokalen Entwurf (für sofortiges Feedback
  // während des Tippens, vor dem debounced Save). Mitleser rendern immer
  // sheet.entries direkt, sonst würde ihr Blatt beim ersten Laden einfrieren
  // und Realtime-Updates des Schreibers nie mehr ankommen.
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (isLoading) return <p className="p-4 text-ink-soft">Notizblock wird geladen …</p>;
  if (!sheet) {
    return (
      <div className="p-4">
        <p className="text-ink">Dieser Notizblock ist nicht (mehr) verfügbar.</p>
        <Link href="/" className="mt-2 inline-block font-black text-green-deep">Zur Startseite</Link>
      </div>
    );
  }

  const isWriter = session.data?.user?.id === sheet.owner_id;
  const readOnly = !isWriter || sheet.status === "finished";
  const entries = isWriter && draft !== null ? draft : sheet.entries;

  function handleChange(next: Record<string, unknown>) {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save.mutate(next), SAVE_DEBOUNCE_MS);
  }

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-ink">{sheet.title ?? "Notizblock"}</h1>
          <p className="text-sm text-ink-soft">
            {isWriter ? "Du schreibst mit." : "Du liest mit — geschrieben wird am anderen Gerät."}
            {sheet.status === "finished" && " · Abgeschlossen"}
          </p>
        </div>
        {sheet.search_id && (
          <Link href={`/r/${sheet.search_id}`} className="text-sm font-black text-green-deep">
            Zur Runde
          </Link>
        )}
      </header>

      {save.isError && (
        <p role="alert" className="rounded-[var(--radius-md)] border border-line bg-surface p-3 text-sm text-ink">
          Speichern fehlgeschlagen: {save.error.message}. Die Eingaben bleiben stehen — nochmal versuchen.
        </p>
      )}

      <SheetView
        definition={sheet.definition}
        players={sheet.players as SheetPlayer[]}
        entries={entries}
        readOnly={readOnly}
        onEntriesChange={handleChange}
      />

      <Link
        href={`/vorlagen/uebernehmen?sheet=${sheet.id}`}
        className="min-h-[44px] rounded-[var(--radius-md)] border border-line px-4 py-3 text-center font-black text-ink"
      >
        Diese Vorlage übernehmen
      </Link>

      {isWriter && (
        <button
          type="button"
          disabled={setStatus.isPending}
          onClick={() => (sheet.status === "active" ? finish() : reopen())}
          className="min-h-[44px] rounded-[var(--radius-md)] border border-line bg-surface px-4 font-black text-ink"
        >
          {sheet.status === "active" ? "Blatt abschliessen" : "Blatt wieder öffnen"}
        </button>
      )}
    </div>
  );
}
