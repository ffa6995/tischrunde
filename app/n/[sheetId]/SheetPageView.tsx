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

/** Gleicher Fallback wie `defaultId()` in lib/notepad/authoring.ts (dort nicht exportiert). */
function newPlayerId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `p-${Math.random().toString(36).slice(2, 10)}`;
}

export function SheetPageView({ sheetId }: { sheetId: string }) {
  const { data: sheet, isLoading } = useNotepadSheet(sheetId);
  const session = useSession();
  const { save, finish, reopen, setStatus, updatePlayers } = useNotepadActions(sheetId, sheet?.search_id ?? null);
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
    // baseRevision ist zu diesem Zeitpunkt immer gesetzt: commitSave wird nur
    // aus den Schreiber-Zweigen (handleChange/retrySave/flushPending) heraus
    // aufgerufen, die alle erst nach dem "if (!sheet) return;"-Guard und damit
    // nach der einmaligen Initialisierung von baseRevision oben laufen. Die
    // Laufzeit-Prüfung hier ist nur, um das für TypeScript (number | null)
    // explizit zu machen, ohne den bestehenden Kontrollfluss umzubauen.
    if (baseRevision === null) {
      throw new Error("commitSave aufgerufen, bevor baseRevision initialisiert wurde");
    }
    const revision = await save.mutateAsync({ entries: value, expectedRevision: baseRevision });
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

  // Spieler-Verwaltung: komplett getrennter lokaler State von draft/baseRevision
  // oben (der gehört zu `entries`). `playersDraft` ist der noch nicht
  // gespeicherte Bearbeitungsstand; `null` heisst "kein ausstehender
  // Bearbeitungsstand", die Anzeige folgt dann direkt sheet.players.
  const [playersDraft, setPlayersDraft] = useState<SheetPlayer[] | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");

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

  // Nur der Schreiber darf die Spielerliste verändern, und auch der nicht bei
  // einem abgeschlossenen Blatt oder ungelöstem Konflikt — dieselbe Regel wie
  // `readOnly` oben, die RPC lehnt ein abgeschlossenes Blatt serverseitig
  // ohnehin ab, aber die UI soll die Kontrolle erst gar nicht anbieten.
  const canManagePlayers = isWriter && !readOnly;
  const players = (playersDraft ?? (sheet.players as SheetPlayer[]));
  const trimmedPlayers = players.map((p) => ({ ...p, label: p.label.trim() }));
  const hasBlankLabel = trimmedPlayers.some((p) => p.label.length === 0);
  const hasDuplicateId = new Set(trimmedPlayers.map((p) => p.id)).size !== trimmedPlayers.length;
  const playersValidationError = trimmedPlayers.length === 0
    ? "Mindestens ein:e Spieler:in wird benötigt."
    : hasBlankLabel
      ? "Namen dürfen nicht leer sein."
      : hasDuplicateId
        ? "Spieler-IDs müssen eindeutig sein."
        : null;
  const playersDirty = playersDraft !== null;

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

  function renamePlayer(playerId: string, label: string) {
    setPlayersDraft(players.map((p) => (p.id === playerId ? { ...p, label } : p)));
  }

  function removePlayer(playerId: string) {
    // Die letzte verbleibende Zeile lässt sich nicht entfernen (Button ist in
    // diesem Fall deaktiviert) — eine leere Spielerliste ergibt keinen Sinn
    // und würde ohnehin von der RPC abgelehnt.
    if (players.length <= 1) return;
    setPlayersDraft(players.filter((p) => p.id !== playerId));
  }

  function addPlayer() {
    const label = newPlayerName.trim();
    if (label.length === 0) return;
    setPlayersDraft([...players, { id: newPlayerId(), label, participant_id: null }]);
    setNewPlayerName("");
  }

  function discardPlayersEdit() {
    setPlayersDraft(null);
    setNewPlayerName("");
  }

  function savePlayers() {
    if (playersValidationError) return;
    updatePlayers.mutate(trimmedPlayers, { onSuccess: () => setPlayersDraft(null) });
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

      {canManagePlayers && (
        <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-line bg-surface p-3">
          <h2 className="font-black text-ink">Spieler verwalten</h2>

          <ul className="flex flex-col gap-2">
            {players.map((player, index) => {
              const inputId = `player-name-${player.id}`;
              return (
                <li key={player.id} className="flex items-center gap-2">
                  <label htmlFor={inputId} className="sr-only">
                    Name von Spieler {index + 1}
                  </label>
                  <input
                    id={inputId}
                    type="text"
                    value={player.label}
                    onChange={(e) => renamePlayer(player.id, e.target.value)}
                    className="min-h-[44px] flex-1 rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-ink outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-green-deep"
                  />
                  <button
                    type="button"
                    aria-label={`${player.label.trim() || "Spieler"} entfernen`}
                    disabled={players.length <= 1}
                    onClick={() => removePlayer(player.id)}
                    className="min-h-[44px] min-w-[44px] rounded-[var(--radius-sm)] text-ink-soft hover:text-ink disabled:opacity-40"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            <label htmlFor="new-player-name" className="sr-only">
              Name der neuen Spielerin oder des neuen Spielers
            </label>
            <input
              id="new-player-name"
              type="text"
              placeholder="Name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPlayer();
                }
              }}
              className="min-h-[44px] flex-1 rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-ink outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-green-deep"
            />
            <button
              type="button"
              onClick={addPlayer}
              disabled={newPlayerName.trim().length === 0}
              className="min-h-[44px] rounded-[var(--radius-sm)] border border-line px-4 font-black text-ink disabled:opacity-40"
            >
              Hinzufügen
            </button>
          </div>

          {playersValidationError && (
            <p className="text-xs font-bold text-ink-soft">{playersValidationError}</p>
          )}

          {updatePlayers.isError && (
            <div role="alert" className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 p-3 text-sm text-ink">
              <p>Spielerliste konnte nicht gespeichert werden: {updatePlayers.error.message}.</p>
              <button
                type="button"
                onClick={savePlayers}
                className="min-h-[44px] self-start rounded-[var(--radius-sm)] border border-line px-4 font-black text-terra"
              >
                Nochmal versuchen
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!playersDirty || Boolean(playersValidationError) || updatePlayers.isPending}
              onClick={savePlayers}
              className="min-h-[44px] flex-1 rounded-[var(--radius-md)] border border-line bg-surface px-4 font-black text-ink disabled:opacity-40"
            >
              {updatePlayers.isPending ? "Wird gespeichert …" : "Speichern"}
            </button>
            {playersDirty && (
              <button
                type="button"
                onClick={discardPlayersEdit}
                disabled={updatePlayers.isPending}
                className="min-h-[44px] rounded-[var(--radius-md)] border border-line px-4 font-black text-ink disabled:opacity-40"
              >
                Verwerfen
              </button>
            )}
          </div>
        </section>
      )}

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
