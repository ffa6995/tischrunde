"use client";

import { Stamp } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { TradingCard } from "@/components/TradingCard";
import { GuestPanel } from "@/components/GuestPanel";
import { DemoBanner } from "@/components/DemoBanner";
import { useSession } from "@/lib/hooks/useSession";
import { useTrustSignals } from "@/lib/hooks/useActivity";

export function MeView() {
  const { data: session, isLoading } = useSession();
  const profile = session?.profile;
  // Trust = aus activity_events abgeleitete Signal-Chips (kein Score).
  const { trust } = useTrustSignals(session?.user?.id);

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-4 px-5 py-6 pb-24 lg:py-10">
      <AppHeader />

      <p className="text-center text-xs font-black uppercase tracking-[0.16em] text-terra">
        Deine Spielerkarte
      </p>

      {isLoading ? (
        <div className="mx-auto h-80 w-full max-w-[330px] animate-pulse rounded-[24px] border border-line bg-surface" />
      ) : profile ? (
        <>
          <TradingCard
            profile={profile}
            role={profile.role === "guest" ? "Gast" : "Spieler"}
            signals={trust.signals}
            favorites={trust.favorites}
          />
          <p className="px-2 text-center text-sm font-semibold text-ink-soft">
            {trust.signals.length === 0
              ? "Tritt einer Runde bei und checke am Tisch ein — deine Signale wachsen aus echten Runden."
              : "Deine Signale wachsen automatisch aus echten Runden (Beitreten, Check-in, Hosten)."}
          </p>

          {trust.stamps.length > 0 && (
            <section className="mx-auto w-full max-w-[330px] rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[0_5px_0_var(--line)]">
              <p className="mb-2.5 text-[11px] font-black uppercase tracking-wider text-ink-soft">
                Event-Stamps
              </p>
              <div className="flex flex-wrap gap-2">
                {trust.stamps.map((s) => (
                  <span
                    key={s.id}
                    className="flex items-center gap-1.5 rounded-full border border-dashed border-gold bg-gold/10 px-3 py-1.5 text-xs font-extrabold text-wood-deep"
                  >
                    <Stamp className="size-3.5 text-gold" /> {s.name}
                  </span>
                ))}
              </div>
            </section>
          )}
          <section className="mx-auto w-full max-w-[330px] rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[0_5px_0_var(--line)]">
            <GuestPanel />
          </section>
        </>
      ) : (
        <section className="mx-auto w-full max-w-[360px] rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[0_5px_0_var(--line)]">
          <p className="mb-3 text-sm font-semibold text-ink-soft">
            Lege eine Gast-Identität an — deine Karte füllt sich ab der ersten
            Runde.
          </p>
          <GuestPanel />
        </section>
      )}

      <DemoBanner />
    </main>
  );
}
