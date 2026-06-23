"use client";

import { AppHeader } from "@/components/AppHeader";
import { TradingCard } from "@/components/TradingCard";
import { GuestPanel } from "@/components/GuestPanel";
import { DemoBanner } from "@/components/DemoBanner";
import { useSession } from "@/lib/hooks/useSession";

// MVP-light: Platzhalter-Signale (Trust = positive Chips, kein Score).
// Wachsen später automatisch aus activity_events.
const DEMO_SIGNALS = ["War 5× dabei", "Host", "Bringt Spiele mit", "Erklärt gern"];
const DEMO_FAVORITES = ["🏘️ Catan", "🃏 Jassen", "⚡ Pokémon TCG"];

export function MeView() {
  const { data: session, isLoading } = useSession();
  const profile = session?.profile;

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
            signals={DEMO_SIGNALS}
            favorites={DEMO_FAVORITES}
          />
          <p className="px-2 text-center text-sm font-semibold text-ink-soft">
            Im ersten Release Platzhalter — Stats &amp; Signale wachsen später
            automatisch aus deinen echten Runden.
          </p>
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
