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

  // Der Entwurf, der noch NICHT an save.mutate übergeben wurde. Wird beim
  // Tippen gesetzt und geleert, sobald der Save tatsächlich losgeschickt wird
  // (Timer-Ablauf oder Flush) — so sendet ein doppelter Flush (z.B. Tab-
  // Wechsel kurz vor Unmount) den Entwurf nie zweimal.
  const pendingRef = useRef<Record<string, unknown> | null>(null);

  // Die Revision, auf der der aktuelle Entwurf basiert. Steigt mit jedem
  // eigenen erfolgreichen Save mit; bleibt sonst stehen. Wenn sheet.revision
  // (das u.a. per Realtime von FREMDEN Saves aktualisiert wird) daran
  // vorbeizieht, während noch ein ungesicherter Entwurf offen ist, hat ein
  // anderes Gerät derselben Schreib-Identität zwischenzeitlich gespeichert
  // (Fix 2: zwei Geräte, ein User, ein Schreiber-Konzept). Als State statt
  // Ref, weil der Wert in `hasConflict`/JSX einfliesst — ein Ref darf während
  // des Renderns nicht gelesen werden (react-hooks/refs).
  const [baseRevision, setBaseRevision] = useState<number | null>(null);

  // Initialisierung als "State beim Rendern anpassen" (React-Doku), nicht als
  // Effect: sheet lädt asynchron nach, und ein Effect, der hier synchron
  // setState aufruft, würde eine unnötige Render-Kaskade auslösen
  // (react-hooks/set-state-in-effect). Läuft nur einmal, weil die Bedingung
  // danach nicht mehr zutrifft.
  if (sheet && baseRevision === null) {
    setBaseRevision(sheet.revision);
  }

  // Schickt einen Entwurf an save.mutate und verschiebt die Basis-Revision
  // erst NACH Erfolg — bei einem Fehlschlag bleibt die Basis stehen, damit ein
  // späterer Retry mit demselben Entwurf keinen falschen Konflikt auslöst.
  async function commitSave(value: Record<string, unknown>): Promise<void> {
    const revision = await save.mutateAsync(value);
    setBaseRevision(revision);
  }

  // Leert Timer + offenen Entwurf und schickt ihn ab (falls einer ansteht).
  // Aufrufbar mehrfach hintereinander (Unmount + vorheriger Visibility-Wechsel
  // z.B.) ohne doppelt zu speichern, weil pendingRef sofort geleert wird.
  function flushPending(): Promise<void> {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pendingRef.current === null) return Promise.resolve();
    const value = pendingRef.current;
    pendingRef.current = null;
    return commitSave(value);
  }

  // Ref-Indirektion, damit Effects mit leerem Dependency-Array immer die
  // aktuelle Closure (aktueller Entwurf, aktuelle Mutation) aufrufen, ohne bei
  // jedem Tastendruck neu abonnieren zu müssen. Die Zuweisung passiert in
  // einem Effect (nicht direkt im Render-Body), weil ein Ref während des
  // Renderns nicht beschrieben werden darf (react-hooks/refs).
  const flushRef = useRef(flushPending);
  useEffect(() => {
    flushRef.current = flushPending;
  });

  // Flush beim Verlassen der Seite (Zurück, Link-Klick, Unmount) — sonst geht
  // eine Eingabe innerhalb der letzten 600ms des Debounce kommentarlos
  // verloren (Fix 1).
  useEffect(() => {
    return () => {
      flushRef.current().catch(() => {
        // Fehler wird über save.isError sichtbar; die Komponente ist beim
        // Unmount-Flush schon (oder gleich) weg, hier gibt es nichts mehr zu tun.
      });
    };
  }, []);

  // Flush, wenn die PWA in den Hintergrund geht (Tab-Wechsel, App-Wechsel auf
  // dem Handy) — derselbe Datenverlust wie beim Navigieren, nur ohne Unmount.
  // beforeunload ist ein bestmöglicher, nicht-blockierender Versuch: er darf
  // den Seitenwechsel nicht aufhalten, daher kein preventDefault/return-Value.
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flushRef.current().catch(() => {});
      }
    }
    function onBeforeUnload() {
      flushRef.current().catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

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

  // Fix 2: Jemand anderes (z.B. dasselbe Konto auf einem zweiten Gerät) hat
  // gespeichert, während hier noch ein ungesicherter Entwurf auf einer
  // älteren Revision offen ist. Statt den fremden Stand stillschweigend zu
  // überschreiben, wird der Entwurf eingefroren (read-only), bis die
  // schreibende Person die neuere Version explizit übernimmt.
  const hasConflict =
    isWriter && draft !== null && baseRevision !== null && sheet.revision > baseRevision;

  const readOnly = !isWriter || sheet.status === "finished" || hasConflict;
  const entries = isWriter && draft !== null ? draft : sheet.entries;

  function handleChange(next: Record<string, unknown>) {
    setDraft(next);
    pendingRef.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      const value = pendingRef.current;
      pendingRef.current = null;
      if (value !== null) commitSave(value).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
  }

  function retrySave() {
    // TS verliert die Narrowing-Info aus dem `if (!sheet) return;` oben
    // innerhalb dieser separat deklarierten Funktion — daher hier erneut
    // geprüft (zur Laufzeit ist `sheet` an dieser Stelle immer gesetzt, da
    // der Retry-Button nur nach dem frühen Return gerendert wird).
    if (!sheet) return;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    pendingRef.current = null;
    commitSave(draft ?? sheet.entries).catch(() => {});
  }

  function takeNewerVersion() {
    if (!sheet) return;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    pendingRef.current = null;
    setBaseRevision(sheet.revision);
    setDraft(null);
  }

  async function handleFinish() {
    try {
      await flushPending();
    } catch {
      // Save fehlgeschlagen — Fehler-Banner mit Retry ist bereits sichtbar,
      // das Blatt bleibt aktiv statt mit ungesicherten Eingaben abzuschliessen.
      return;
    }
    finish();
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

      {isWriter && !hasConflict && (save.isPending || save.isSuccess) && (
        <p aria-live="polite" className="text-xs font-bold text-ink-soft">
          {save.isPending ? "Wird gespeichert …" : "Gespeichert"}
        </p>
      )}

      {isWriter && hasConflict && (
        <div role="alert" className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-line bg-surface p-3 text-sm text-ink">
          <p>
            Dieses Blatt wurde inzwischen auf einem anderen Gerät geändert. Deine noch nicht gespeicherten
            Eingaben gehen verloren, wenn du die neuere Version übernimmst.
          </p>
          <button
            type="button"
            onClick={takeNewerVersion}
            className="min-h-[44px] self-start rounded-[var(--radius-sm)] border border-line px-4 font-black text-ink"
          >
            Neuere Version übernehmen
          </button>
        </div>
      )}

      {isWriter && !hasConflict && save.isError && (
        <div role="alert" className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-line bg-surface p-3 text-sm text-ink">
          <p>Speichern fehlgeschlagen: {save.error.message}. Die Eingaben bleiben stehen.</p>
          <button
            type="button"
            onClick={retrySave}
            className="min-h-[44px] self-start rounded-[var(--radius-sm)] border border-line px-4 font-black text-terra"
          >
            Nochmal versuchen
          </button>
        </div>
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
          onClick={() => (sheet.status === "active" ? handleFinish() : reopen())}
          className="min-h-[44px] rounded-[var(--radius-md)] border border-line bg-surface px-4 font-black text-ink"
        >
          {sheet.status === "active" ? "Blatt abschliessen" : "Blatt wieder öffnen"}
        </button>
      )}
    </div>
  );
}
