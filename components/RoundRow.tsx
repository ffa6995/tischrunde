import Link from "next/link";
import { Users } from "lucide-react";
import { LEVEL_LABEL, GAME_SOURCE_LABEL } from "@/lib/labels";
import type { GameTheme, RoundWithGame } from "@/lib/types";

/** Emoji-Platzhalter je Kategorie (später eigene SVG-Icons, Konzept §12.7). */
const THEME_EMOJI: Record<GameTheme, string> = {
  catan: "🏘️",
  jassen: "🃏",
  tcg: "⚡",
  standard: "🎲",
  party: "🎉",
  other: "🎲",
};

/** Zeile in der Rundenliste (Konzept §6.3). Reine Präsentation. */
export function RoundRow({ round }: { round: RoundWithGame }) {
  const total = round.seats_total;
  const taken = round.seats_taken;
  const full = taken >= total;
  const gameName = round.game?.name ?? "Unbekanntes Spiel";
  const emoji = THEME_EMOJI[round.game?.theme ?? "standard"];

  return (
    <Link
      href={`/r/${round.id}`}
      className={`flex items-center gap-3 rounded-[18px] border border-line bg-surface p-3.5 shadow-[0_4px_0_var(--line)] transition-transform active:translate-y-[3px] active:shadow-[0_1px_0_var(--line)] ${
        full ? "opacity-65" : ""
      }`}
    >
      <span
        className="grid size-12 shrink-0 place-items-center rounded-[13px] border border-line bg-surface-2 text-2xl"
        aria-hidden
      >
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate font-display text-base font-bold text-ink">
          {gameName}
        </b>
        <small className="block truncate text-[13px] font-bold text-ink-soft">
          {round.title ?? LEVEL_LABEL[round.desired_level]} ·{" "}
          {GAME_SOURCE_LABEL[round.game_source]}
        </small>
      </span>
      <span
        className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-black ${
          full ? "text-ink-soft" : "text-green-deep"
        }`}
      >
        {taken}/{total}
        <Users className="size-4" aria-label="belegte Plätze" />
      </span>
    </Link>
  );
}
