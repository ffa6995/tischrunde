import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { formatDayMonth } from "@/lib/labels";
import type { Event } from "@/lib/types";

/** Eventkarte für die Events-Liste (Konzept §6.1). Reine Präsentation. */
export function EventCard({
  event,
  openRounds,
}: {
  event: Event;
  openRounds: number;
}) {
  const { day, month } = formatDayMonth(event.starts_at);
  const time = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(event.starts_at));

  return (
    <Link
      href={`/e/${event.id}`}
      className="relative block overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[0_5px_0_var(--line),0_14px_22px_-14px_var(--shadow)] transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-[0_1px_0_var(--line)]"
    >
      <span className="absolute right-0 top-0 rounded-bl-[18px] bg-gradient-to-br from-terra to-[#A83E2C] px-3.5 py-2 text-center text-white">
        <b className="block font-display text-2xl font-black leading-none">
          {day}
        </b>
        <i className="text-[10px] font-extrabold uppercase not-italic tracking-wider">
          {month}
        </i>
      </span>
      <h3 className="mb-1.5 max-w-[74%] font-display text-xl font-bold text-ink">
        {event.title}
      </h3>
      <p className="flex items-center gap-1.5 text-sm font-bold text-ink-soft">
        <Clock className="size-4 shrink-0" /> {time} Uhr
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-green bg-green/15 px-3 py-1 text-xs font-extrabold text-green-deep">
          <Users className="size-3.5" /> {openRounds}{" "}
          {openRounds === 1 ? "offene Runde" : "offene Runden"}
        </span>
      </div>
    </Link>
  );
}
