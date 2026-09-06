"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check, Info, QrCode, ShieldCheck, X } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Board } from "@/components/Board";
import { Seat } from "@/components/Seat";
import { ShareButton } from "@/components/ShareButton";
import { QRCodeBlock } from "@/components/QRCodeBlock";
import { GuestPanel } from "@/components/GuestPanel";
import { DemoBanner } from "@/components/DemoBanner";
import { useRound, useJoinRound, useLeaveRound } from "@/lib/hooks/useRounds";
import { useCheckIn } from "@/lib/hooks/useActivity";
import { useEvent } from "@/lib/hooks/useEvents";
import { useRealtimeRound } from "@/lib/hooks/useRealtimeRound";
import { useHostActions } from "@/lib/hooks/useHostActions";
import { useSession } from "@/lib/hooks/useSession";
import { isGameAvailable } from "@/lib/availability";
import {
  boardTheme,
  GAME_SOURCE_LABEL,
  LEVEL_LABEL,
  SKILL_CLASS,
  SKILL_LABEL,
} from "@/lib/labels";
import type { SkillLevel } from "@/lib/types";

const JOIN_SKILLS: SkillLevel[] = ["beginner", "learning", "advanced", "teaches"];

// Vordefinierte, respektvolle Kick-Gründe (Konzept §9.3 — kein Freitext-Bashing).
const REMOVE_REASONS = [
  "Nicht erschienen",
  "Passt nicht zur Runde",
  "Verhalten",
  "Doppelt eingetragen",
];

export function BoardView({ searchId }: { searchId: string }) {
  const { data: round, isLoading, isError, error, refetch } = useRound(searchId);
  const { data: event } = useEvent(round?.event_id ?? undefined);
  const { data: session } = useSession();
  const join = useJoinRound(searchId, round?.event_id ?? null);
  const checkIn = useCheckIn(
    searchId,
    round?.event_id ?? null,
    round?.game?.name ?? null,
    event?.title ?? null,
  );
  useRealtimeRound(searchId, round?.event_id ?? null);
  const host = useHostActions(searchId, round?.event_id ?? null);
  const leave = useLeaveRound(searchId, round?.event_id ?? null);

  const [skill, setSkill] = useState<SkillLevel>("learning");
  const [bringsGame, setBringsGame] = useState(false);
  const [bringsNote, setBringsNote] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [closeWarn, setCloseWarn] = useState(false);

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-[520px] px-5 py-6">
        <div className="h-64 animate-pulse rounded-[24px] border border-line bg-surface" />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto w-full max-w-[520px] px-5 py-6 pb-24">
        <AppHeader back={{ href: "/", label: "Zurück" }} />
        <div role="alert" className="mt-8 rounded-[var(--radius-lg)] border border-terra bg-surface p-5 text-center text-sm font-semibold text-ink-soft">
          {(error as Error).message || "Die Runde konnte nicht geladen werden."}
          <button type="button" onClick={() => refetch()} className="mt-3 font-extrabold text-terra underline">Erneut versuchen</button>
        </div>
      </main>
    );
  }

  if (!round) {
    return (
      <main className="mx-auto w-full max-w-[520px] px-5 py-6 pb-24">
        <AppHeader back={{ href: "/", label: "Zurück" }} />
        <p className="mt-8 text-center text-sm font-semibold text-ink-soft">
          Diese Runde gibt es (noch) nicht.
        </p>
      </main>
    );
  }

  const userId = session?.user?.id;
  const seatsTaken = round.seats_taken;
  const emptyCount = Math.max(0, round.seats_total - seatsTaken);
  const full = emptyCount === 0;
  const me = userId
    ? round.participants.find((p) => p.user_id === userId)
    : undefined;
  const alreadyIn = !!me;
  const confirmed = me?.status === "confirmed";
  const theme = boardTheme(round.game?.theme);
  const subtitle = `${GAME_SOURCE_LABEL[round.game_source]} · sucht ${LEVEL_LABEL[round.desired_level]}`;
  const isHost = !!userId && round.creator_id === userId;
  const manageable = round.participants.filter((p) => p.role !== "host");
  const isClosed = round.status === "closed" || round.status === "cancelled";
  const onSiteGame = round.game_source === "on_site";
  const otherBringer = round.participants.find(
    (p) => p.brings_game && p.user_id !== userId,
  );
  const bringRedundant = onSiteGame || !!otherBringer;
  const gameAvailable = isGameAvailable(round.game_source, round.participants);
  const bringHint = onSiteGame
    ? "Liegt eigentlich vor Ort — nur nötig, wenn du z. B. Erweiterungen mitbringst."
    : otherBringer
      ? `${otherBringer.profile?.display_name ?? "Jemand"} bringt das Spiel schon mit — nur nötig, wenn du z. B. Erweiterungen dabei hast.`
      : null;

  function handleJoin() {
    if (!userId || alreadyIn || join.isPending) return;
    join.mutate({
      skillLevel: skill,
      bringsGame,
      bringsNote: bringsGame ? bringsNote.trim() || null : null,
      gameName: round?.game?.name ?? null,
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-3 px-5 py-6 pb-24">
      <AppHeader
        back={{ href: `/e/${round.event_id ?? ""}`, label: "Zum Event" }}
      />

      {/* Identität nötig zum Beitreten */}
      {!userId && !alreadyIn && (
        <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[0_5px_0_var(--line)]">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-terra">
            Kurz vorstellen — dann mitspielen
          </p>
          <GuestPanel />
        </section>
      )}

      {/* Skill-Wahl (nur wenn beitreten möglich) */}
      {userId && !alreadyIn && !full && (
        <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[0_5px_0_var(--line)]">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-terra">
            Wie spielst du?
          </p>
          <div className="flex flex-wrap gap-2">
            {JOIN_SKILLS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSkill(s)}
                aria-pressed={skill === s}
                className={`inline-flex min-h-11 items-center rounded-full px-3.5 py-2 text-[13px] font-extrabold ${
                  skill === s
                    ? SKILL_CLASS[s] + " ring-2 ring-current"
                    : "border border-line bg-surface text-ink-soft"
                }`}
              >
                {SKILL_LABEL[s]}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <label className="flex items-center gap-2.5 text-sm font-bold text-ink">
              <input
                type="checkbox"
                checked={bringsGame}
                onChange={(e) => setBringsGame(e.target.checked)}
                className="size-5 accent-[var(--green)]"
              />
              Ich sage zu, das Spiel mitzubringen
              {bringRedundant && bringHint && (
                <span
                  title={bringHint}
                  className="inline-flex cursor-help text-ink-soft"
                  aria-label="Hinweis zum Mitbringen"
                >
                  <Info className="size-4" />
                </span>
              )}
            </label>
            {bringsGame && (
              <div className="mt-2 flex flex-col gap-1.5">
                {bringHint && (
                  <p className="flex items-start gap-1.5 text-xs font-semibold text-ink-soft">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    {bringHint}
                  </p>
                )}
                <input
                  value={bringsNote}
                  onChange={(e) => setBringsNote(e.target.value)}
                  placeholder="Notiz (optional) — z. B. Erweiterung Seefahrer"
                  aria-label="Notiz zum Mitbringen"
                  className="w-full rounded-[12px] border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink outline-none placeholder:text-ink-soft focus-visible:outline-[3px] focus-visible:outline-gold"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {alreadyIn && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 460, damping: 26 }}
          className="flex flex-col gap-2.5 rounded-[14px] border border-green bg-green/10 px-4 py-3"
        >
          {confirmed ? (
            <p className="flex items-center gap-2 text-sm font-extrabold text-green-deep">
              <Check className="size-4" /> Eingecheckt — viel Spaß am Tisch!
            </p>
          ) : (
            <>
              <p className="text-sm font-extrabold text-green-deep">
                Du bist dabei — beim Ankommen am Tisch einchecken:
              </p>
              <button
                type="button"
                onClick={() => checkIn.mutate()}
                disabled={checkIn.isPending}
                className="flex items-center justify-center gap-2 rounded-[12px] bg-gradient-to-br from-green to-green-deep px-4 py-3 text-sm font-black text-white shadow-[0_4px_0_var(--green-deep)] transition-transform active:translate-y-[3px] active:shadow-none disabled:opacity-50"
              >
                <QrCode className="size-4" />
                {checkIn.isPending ? "Check-in…" : "Ich bin da — Check-in"}
              </button>
            </>
          )}
          {!isHost && (
            <button
              type="button"
              onClick={() => leave.mutate()}
              disabled={leave.isPending}
              className="self-start text-xs font-bold text-ink-soft underline underline-offset-2"
            >
              {leave.isPending ? "…" : "Runde verlassen"}
            </button>
          )}
        </motion.div>
      )}

      {(join.isError || leave.isError || checkIn.isError || host.confirm.isError || host.remove.isError || host.setStatus.isError) && (
        <div role="alert" className="rounded-[14px] border border-terra bg-surface px-4 py-3 text-sm font-semibold text-terra">
          {[join.error, leave.error, checkIn.error, host.confirm.error, host.remove.error, host.setStatus.error].find(Boolean)?.message || "Die Änderung konnte nicht gespeichert werden."}
          <button type="button" onClick={() => refetch()} className="ml-2 font-extrabold underline">Aktualisieren</button>
        </div>
      )}

      {round.status !== "open" && (
        <div className="flex justify-center">
          <span className="rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-black uppercase tracking-wider text-ink-soft">
            {round.status === "full"
              ? "Voll besetzt"
              : round.status === "closed"
                ? "Runde geschlossen"
                : round.status === "active"
                  ? "Läuft"
                  : "Abgesagt"}
          </span>
        </div>
      )}

      {!gameAvailable && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-[14px] border border-gold bg-gold/10 px-4 py-3"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--warning-soft)]" />
          <p className="text-sm font-bold text-ink">
            Noch kein Spiel gesichert — niemand bringt{" "}
            {round.game?.name ?? "das Spiel"} mit. Wähle „Ich bringe das Spiel
            mit&quot;, wenn du es dabei hast.
          </p>
        </div>
      )}

      <Board
        theme={theme}
        title={round.game?.name ?? "Runde"}
        subtitle={subtitle}
        isPublic={round.visibility === "public"}
      >
        {round.participants.map((p) => (
          <Seat key={p.id} participant={p} isYou={p.user_id === userId} />
        ))}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <Seat
            key={`empty-${i}`}
            onJoin={handleJoin}
            disabled={!userId || alreadyIn || join.isPending || isClosed}
          />
        ))}
      </Board>

      {/* Legende */}
      <div className="flex flex-wrap justify-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-black uppercase ${SKILL_CLASS.beginner}`}>
          Anfänger
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-black uppercase ${SKILL_CLASS.advanced}`}>
          Fortgeschritten
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-black uppercase ${SKILL_CLASS.learning}`}>
          Lernt gern
        </span>
      </div>

      {isHost && (
        <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[0_5px_0_var(--line)]">
          <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-terra">
            <ShieldCheck className="size-4" /> Tisch verwalten
          </p>

          {manageable.length === 0 ? (
            <p className="text-sm font-semibold text-ink-soft">
              Noch keine Mitspieler beigetreten.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {manageable.map((p) => (
                <li
                  key={p.id}
                  className="rounded-[14px] border border-line bg-surface-2 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-display text-sm font-bold text-ink">
                      {p.profile?.display_name ?? "Gast"}
                      {p.status === "confirmed" && (
                        <Check className="size-3.5 text-green-deep" />
                      )}
                    </span>
                    <div className="flex gap-2">
                      {p.status !== "confirmed" && (
                        <button
                          type="button"
                          onClick={() => host.confirm.mutate(p.user_id)}
                          disabled={host.confirm.isPending}
                          className="rounded-[10px] bg-green/15 px-2.5 py-1.5 text-xs font-extrabold text-green-deep"
                        >
                          Bestätigen
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setRemoving(removing === p.user_id ? null : p.user_id)
                        }
                        className="flex items-center gap-1 rounded-[10px] border border-line bg-surface px-2.5 py-1.5 text-xs font-extrabold text-ink-soft"
                      >
                        <X className="size-3.5" /> Entfernen
                      </button>
                    </div>
                  </div>
                  {removing === p.user_id && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="w-full text-[11px] font-bold text-ink-soft">
                        Grund (respektvoll, nicht öffentlich):
                      </span>
                      {REMOVE_REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            host.remove.mutate(p.user_id);
                            setRemoving(null);
                          }}
                          className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 border-t border-line pt-3">
            {round.status === "closed" ? (
              <button
                type="button"
                onClick={() => host.setStatus.mutate("open")}
                disabled={host.setStatus.isPending}
                className="text-sm font-extrabold text-green-deep"
              >
                Runde wieder öffnen
              </button>
            ) : round.status === "cancelled" ? (
              <p className="text-sm font-bold text-ink-soft">Runde abgesagt.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {closeWarn && !gameAvailable && (
                  <p className="flex items-start gap-1.5 text-sm font-semibold text-terra">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    Kein Spiel gesichert — liegt nicht vor Ort und niemand bringt
                    es mit. Trotzdem schließen?
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!gameAvailable && !closeWarn) {
                      setCloseWarn(true);
                      return;
                    }
                    host.setStatus.mutate("closed");
                  }}
                  disabled={host.setStatus.isPending}
                  className="self-start text-sm font-extrabold text-terra"
                >
                  {!gameAvailable && closeWarn
                    ? "Trotzdem schließen"
                    : "Runde schließen"}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <DemoBanner />

      <div className="mt-2 flex items-center justify-center">
        <ShareButton url={`/r/${round.id}`} title={round.game?.name} label="Runde teilen" />
      </div>
      <QRCodeBlock
        value={
          typeof window !== "undefined"
            ? `${window.location.origin}/r/${round.id}`
            : `/r/${round.id}`
        }
        caption="Tisch-QR — scannen, beitreten, losspielen."
      />
    </main>
  );
}
