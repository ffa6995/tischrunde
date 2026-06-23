"use client";

import Link from "next/link";
import { Camera, Globe, Plus } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { RoundRow } from "@/components/RoundRow";
import { ShareButton } from "@/components/ShareButton";
import { QRCodeBlock } from "@/components/QRCodeBlock";
import { DemoBanner } from "@/components/DemoBanner";
import { useEvent } from "@/lib/hooks/useEvents";
import { useRounds } from "@/lib/hooks/useRounds";
import { formatEventDate } from "@/lib/labels";

export function EventDetailView({ eventId }: { eventId: string }) {
  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: rounds, isLoading: roundsLoading } = useRounds(eventId);

  if (eventLoading) {
    return (
      <main className="mx-auto w-full max-w-[520px] px-5 py-6">
        <div className="h-40 animate-pulse rounded-[var(--radius-lg)] border border-line bg-surface" />
      </main>
    );
  }

  if (!event) {
    return (
      <main className="mx-auto w-full max-w-[520px] px-5 py-6 pb-24">
        <AppHeader back={{ href: "/", label: "Alle Treffen" }} />
        <p className="mt-8 text-center text-sm font-semibold text-ink-soft">
          Dieses Event gibt es (noch) nicht.
        </p>
      </main>
    );
  }

  const socials = (event.socials ?? {}) as Record<string, string>;

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-4 px-5 py-6 pb-24 lg:max-w-[900px] lg:py-10">
      <AppHeader back={{ href: "/", label: "Alle Treffen" }} />

      {/* Hero */}
      <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-[0_5px_0_var(--line)]">
        <span className="inline-block rounded-full border border-green bg-green/15 px-3 py-1 text-xs font-extrabold text-green-deep">
          {formatEventDate(event.starts_at)} Uhr
        </span>
        <h2 className="mt-2.5 font-display text-2xl font-extrabold text-ink">
          {event.title}
        </h2>
        {event.description && (
          <p className="mt-2.5 text-[13.5px] font-semibold text-ink-soft">
            {event.description}
          </p>
        )}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          {event.event_url && (
            <a
              href={event.event_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Website"
              className="grid size-10 place-items-center rounded-[12px] border border-line bg-surface-2 text-ink-soft"
            >
              <Globe className="size-[18px]" />
            </a>
          )}
          {socials.instagram && (
            <a
              href={socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="grid size-10 place-items-center rounded-[12px] border border-line bg-surface-2 text-ink-soft"
            >
              <Camera className="size-[18px]" />
            </a>
          )}
          <ShareButton url={`/e/${event.id}`} title={event.title} />
        </div>
      </section>

      <DemoBanner />

      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:items-start lg:gap-6">
        {/* Runden */}
        <div className="flex flex-col gap-2.5">
          <div className="mt-1 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-ink">
              Offene Runden
            </h3>
            <Link
              href={`/e/${event.id}/runde-neu`}
              className="flex items-center gap-1.5 rounded-[12px] bg-gradient-to-br from-green to-green-deep px-3.5 py-2.5 text-[13px] font-black text-white shadow-[0_4px_0_var(--green-deep)] active:translate-y-[3px] active:shadow-none"
            >
              <Plus className="size-4" /> Neue Runde
            </Link>
          </div>

          {roundsLoading ? (
            <div className="h-20 animate-pulse rounded-[18px] border border-line bg-surface" />
          ) : rounds && rounds.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {rounds.map((r) => (
                <RoundRow key={r.id} round={r} />
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-line bg-surface-2 p-6 text-center text-sm font-semibold text-ink-soft">
              Noch keine Runde — eröffne die erste!
            </div>
          )}
        </div>

        {/* Share / QR */}
        <div className="mt-4 lg:mt-1 lg:sticky lg:top-10">
          <QRCodeBlock
            value={
              typeof window !== "undefined"
                ? `${window.location.origin}/e/${event.id}`
                : `/e/${event.id}`
            }
            caption="QR am Tisch oder Eingang aufhängen → direkt zum Event."
          />
        </div>
      </div>
    </main>
  );
}
