"use client";

import { AppHeader } from "@/components/AppHeader";
import { EventCard } from "@/components/EventCard";
import { DemoBanner } from "@/components/DemoBanner";
import { useEvents } from "@/lib/hooks/useEvents";
import { useRounds } from "@/lib/hooks/useRounds";
import type { Event } from "@/lib/types";

function EventListItem({ event }: { event: Event }) {
  const { data: rounds } = useRounds(event.id);
  const open = (rounds ?? []).filter((r) => r.status === "open").length;
  return <EventCard event={event} openRounds={open} />;
}

export function HomeView() {
  const { data: events, isLoading, isError, error, refetch } = useEvents();

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-4 px-5 py-6 pb-24 lg:max-w-[840px] lg:py-10">
      <AppHeader />

      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-terra">
          Nächste Treffen
        </p>
        <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink">
          Find dein Spiel.
        </h2>
        <p className="mt-1 text-sm font-semibold text-ink-soft">
          Offene Runden in deiner Nähe — beitreten oder selbst eröffnen.
        </p>
      </div>

      <DemoBanner />

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-[var(--radius-lg)] border border-line bg-surface" />
      ) : isError ? (
        <div role="alert" className="rounded-[var(--radius-lg)] border border-terra bg-surface p-6 text-center text-sm font-semibold text-ink-soft">
          {(error as Error).message || "Treffen konnten nicht geladen werden."}
          <button type="button" onClick={() => refetch()} className="mt-3 block w-full font-extrabold text-terra underline">Erneut versuchen</button>
        </div>
      ) : events && events.length > 0 ? (
        <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-2 lg:gap-4">
          {events.map((e) => (
            <EventListItem key={e.id} event={e} />
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface-2 p-6 text-center text-sm font-semibold text-ink-soft">
          Noch keine Events. Lege im Supabase-Dashboard eines an (oder führe den
          Seed aus <code>supabase/schema.sql</code> aus).
        </div>
      )}
    </main>
  );
}
