"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dice5, MapPin, Minus, Plus } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { GuestPanel } from "@/components/GuestPanel";
import { useGames } from "@/lib/hooks/useGames";
import { useCreateRound } from "@/lib/hooks/useRounds";
import { useEvent } from "@/lib/hooks/useEvents";
import { useLocationGames } from "@/lib/hooks/useLocations";
import { useSession } from "@/lib/hooks/useSession";
import { LEVEL_LABEL } from "@/lib/labels";
import type { DesiredLevel, Game, GameSource } from "@/lib/types";

const SOURCES: { value: GameSource; label: string }[] = [
  { value: "on_site", label: "Liegt vor Ort" },
  { value: "host_brings", label: "Ich bringe es mit" },
  { value: "needed", label: "Jemand muss mitbringen" },
];

const LEVELS: DesiredLevel[] = ["any", "beginner", "learning", "advanced"];

export function CreateRoundWizard({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { data: games } = useGames();
  const { data: session } = useSession();
  const { data: event } = useEvent(eventId);
  const { data: onSiteGames } = useLocationGames(event?.location_id);
  const create = useCreateRound(eventId);

  const onSiteIds = useMemo(
    () => new Set((onSiteGames ?? []).map((g) => g.id)),
    [onSiteGames],
  );

  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [game, setGame] = useState<Game | null>(null);
  const [seats, setSeats] = useState(4);
  const [source, setSource] = useState<GameSource>("on_site");
  const [level, setLevel] = useState<DesiredLevel>("any");
  const visibility = "public" as const;

  const hasIdentity = !!session?.user?.id;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (games ?? []).filter((g) => g.name.toLowerCase().includes(q));
  }, [games, query]);

  // "Liegt vor Ort" nur, wenn das gewählte Spiel im Location-Bestand ist.
  const gameOnSite = !!game && onSiteIds.has(game.id);
  const availableSources = gameOnSite
    ? SOURCES
    : SOURCES.filter((s) => s.value !== "on_site");

  function pickGame(g: Game) {
    setGame(g);
    setSeats(Math.min(g.max_players, 6));
    setSource(onSiteIds.has(g.id) ? "on_site" : "needed");
    setStep(2);
  }

  const onSiteFiltered = filtered.filter((g) => onSiteIds.has(g.id));
  const otherFiltered = filtered.filter((g) => !onSiteIds.has(g.id));

  const gameButton = (g: Game, onSite: boolean) => (
    <button
      key={g.id}
      type="button"
      onClick={() => pickGame(g)}
      className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-3 text-left shadow-[0_3px_0_var(--line)] active:translate-y-[2px] active:shadow-none"
    >
      <span className="grid size-10 place-items-center rounded-[11px] border border-line bg-surface-2 text-ink-soft">
        <Dice5 className="size-5" />
      </span>
      <b className="font-display text-base text-ink">{g.name}</b>
      <span className="ml-auto flex items-center gap-1 text-xs font-bold text-ink-soft">
        {onSite && <MapPin className="size-3.5 text-green-deep" />}
        {g.min_players}–{g.max_players}
      </span>
    </button>
  );

  function submit() {
    if (!game || !hasIdentity) return;
    create.mutate(
      {
        gameId: game.id,
        title: null,
        seatsTotal: seats,
        gameSource: source,
        desiredLevel: level,
        beginnerFriendly: level === "beginner" || level === "learning",
        visibility,
      },
      { onSuccess: (id) => router.push(`/r/${id}`) },
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-4 px-5 py-6 pb-24">
      <AppHeader back={{ href: `/e/${eventId}`, label: "Abbrechen" }} />

      {/* Fortschritt */}
      <div className="flex gap-1.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-green" : "bg-line"}`}
          />
        ))}
      </div>

      {/* Schritt 1: Spiel */}
      {step === 1 && (
        <section>
          <p className="mb-3 font-display text-2xl font-extrabold text-ink">
            Welches Spiel?
          </p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Spiel suchen… (z. B. Catan, Jass)"
            autoComplete="off"
            className="w-full rounded-[14px] border border-line bg-surface px-4 py-3 text-base font-semibold text-ink shadow-[0_3px_0_var(--line)] outline-none placeholder:text-ink-soft focus-visible:outline-[3px] focus-visible:outline-gold"
          />
          <div className="mt-3 flex flex-col gap-2">
            {onSiteFiltered.length > 0 && (
              <>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-green-deep">
                  <MapPin className="size-3.5" /> Vor Ort verfügbar
                </p>
                {onSiteFiltered.map((g) => gameButton(g, true))}
              </>
            )}
            {otherFiltered.length > 0 && (
              <>
                <p className="mt-2 text-[11px] font-black uppercase tracking-wider text-ink-soft">
                  {onSiteFiltered.length > 0
                    ? "Andere Spiele · mitbringen"
                    : "Spiele"}
                </p>
                {otherFiltered.map((g) => gameButton(g, false))}
              </>
            )}
            {filtered.length === 0 && (
              <p className="px-1 text-sm font-semibold text-ink-soft">
                Kein Treffer. (Neues Spiel anlegen kommt in Release 2+.)
              </p>
            )}
          </div>
        </section>
      )}

      {/* Schritt 2: Wie */}
      {step === 2 && game && (
        <section className="flex flex-col gap-4">
          <p className="font-display text-2xl font-extrabold text-ink">
            Wie wird gespielt?
          </p>
          <div className="flex items-center gap-3 rounded-[16px] border border-line bg-surface p-3.5 shadow-[0_4px_0_var(--line)]">
            <span className="grid size-11 place-items-center rounded-[12px] border border-line bg-surface-2 text-ink-soft">
              <Dice5 className="size-5" />
            </span>
            <b className="font-display text-lg text-ink">{game.name}</b>
          </div>

          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-ink-soft">
              Plätze gesamt
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="weniger Plätze"
                onClick={() => setSeats((s) => Math.max(game.min_players, s - 1))}
                className="grid size-11 place-items-center rounded-[13px] border border-line bg-surface text-2xl font-black text-ink shadow-[0_3px_0_var(--line)] active:translate-y-[2px] active:shadow-none"
              >
                <Minus className="size-5" />
              </button>
              <b className="min-w-8 text-center font-display text-2xl text-ink">
                {seats}
              </b>
              <button
                type="button"
                aria-label="mehr Plätze"
                onClick={() => setSeats((s) => Math.min(game.max_players, s + 1))}
                className="grid size-11 place-items-center rounded-[13px] border border-line bg-surface text-2xl font-black text-ink shadow-[0_3px_0_var(--line)] active:translate-y-[2px] active:shadow-none"
              >
                <Plus className="size-5" />
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-ink-soft">
              Spiel vorhanden?
            </p>
            <div className="flex flex-wrap gap-2">
              {availableSources.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSource(s.value)}
                  aria-pressed={source === s.value}
                  className={`inline-flex min-h-11 items-center rounded-full px-3.5 py-2 text-[13px] font-extrabold ${
                    source === s.value
                      ? "border border-green bg-green/15 text-green-deep"
                      : "border border-line bg-surface text-ink-soft"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-ink-soft">
              Wen suchst du?
            </p>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevel(l)}
                  aria-pressed={level === l}
                  className={`inline-flex min-h-11 items-center rounded-full px-3.5 py-2 text-[13px] font-extrabold ${
                    level === l
                      ? "border border-green bg-green/15 text-green-deep"
                      : "border border-line bg-surface text-ink-soft"
                  }`}
                >
                  {LEVEL_LABEL[l]}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(3)}
            className="mt-2 rounded-[16px] bg-gradient-to-br from-green to-green-deep px-4 py-3.5 text-base font-black text-white shadow-[0_4px_0_var(--green-deep)] active:translate-y-[3px] active:shadow-none"
          >
            Weiter
          </button>
        </section>
      )}

      {/* Schritt 3: öffentlich eröffnen */}
      {step === 3 && game && (
        <section className="flex flex-col gap-4">
          <p className="font-display text-2xl font-extrabold text-ink">
            Öffentliche Runde
          </p>
          <p className="text-sm font-semibold text-ink-soft">
            Die Runde erscheint auf dem öffentlichen Tischplan des Events.
          </p>

          {!hasIdentity && (
            <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[0_5px_0_var(--line)]">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-terra">
                Als Host kurz vorstellen
              </p>
              <GuestPanel />
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!hasIdentity || create.isPending}
            className="mt-1 rounded-[16px] bg-gradient-to-br from-terra to-[#A83E2C] px-4 py-4 text-base font-black text-white shadow-[0_5px_0_#8f3525] active:translate-y-[4px] active:shadow-none disabled:opacity-50"
          >
            {create.isPending ? "Wird eröffnet…" : "Runde eröffnen"}
          </button>
          {create.isError && (
            <p className="text-sm font-semibold text-terra" role="alert">
              {(create.error as Error).message}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
