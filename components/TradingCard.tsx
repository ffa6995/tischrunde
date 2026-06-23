import { BadgeCheck, Sparkles } from "lucide-react";
import { Meeple } from "./icons";
import type { Profile } from "@/lib/types";

/**
 * Profil als Trading-Card (light). Trust = positive Signal-Chips,
 * KEIN numerischer Score (CLAUDE.md §4 / Konzept §9.1). Reine Präsentation.
 */
export function TradingCard({
  profile,
  signals,
  favorites = [],
  role = "Spieler",
}: {
  profile: Pick<Profile, "display_name">;
  signals: string[];
  favorites?: string[];
  role?: string;
}) {
  return (
    <div className="flex justify-center px-1 [perspective:1200px]">
      <div className="relative w-full max-w-[330px] overflow-hidden rounded-[24px] p-1.5 shadow-[0_20px_40px_-18px_var(--shadow-strong)] [background:linear-gradient(135deg,var(--gold),#B9831C_45%,var(--gold)_70%,#8a5f12)] [transform:rotateX(3deg)]">
        {/* Foil-Shimmer (wird via prefers-reduced-motion deaktiviert) */}
        <div className="pointer-events-none absolute inset-0 z-[5] mix-blend-overlay [animation:foil_5.5s_ease-in-out_infinite] [background-size:250%_250%] [background:linear-gradient(115deg,transparent_30%,rgba(255,255,255,.55)_45%,rgba(180,220,255,.4)_50%,transparent_62%)]" />

        <div className="relative z-[2] rounded-[19px] border border-white/25 p-4 [background:radial-gradient(120%_80%_at_50%_0%,var(--surface),var(--surface-2))]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10.5px] font-black uppercase tracking-[0.14em] text-terra">
              {role}
            </span>
            <span className="flex items-center gap-1 font-display text-[13px] font-black text-gold">
              <Sparkles className="size-3.5" /> Karte light
            </span>
          </div>

          <div className="mx-auto mb-2.5 grid size-24 place-items-center rounded-[20px] shadow-[0_8px_18px_-8px_var(--shadow-strong),0_0_0_4px_var(--surface),0_0_0_5px_var(--gold)] [background:radial-gradient(120%_120%_at_30%_20%,var(--green),var(--green-deep))]">
            <Meeple className="size-14 text-white" />
          </div>

          <div className="text-center font-display text-2xl font-black leading-none text-ink">
            {profile.display_name}
          </div>
          <div className="mb-3.5 mt-1 text-center text-xs font-extrabold text-ink-soft">
            Gast-Identität · Dreiländereck
          </div>

          {/* Signal-Chips statt Score */}
          <p className="mb-2 ml-0.5 text-[11px] font-black uppercase tracking-wider text-ink-soft">
            Vertrauens-Signale
          </p>
          <div className="mb-3.5 flex flex-wrap gap-1.5">
            {signals.length === 0 ? (
              <span className="rounded-full border border-dashed border-line bg-surface-2 px-3 py-1.5 text-[11.5px] font-bold text-ink-soft">
                Wächst aus deinen echten Runden.
              </span>
            ) : (
              signals.map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-[11.5px] font-bold text-ink"
                >
                  <BadgeCheck className="size-3.5 text-trust-verified" /> {s}
                </span>
              ))
            )}
          </div>

          {favorites.length > 0 && (
            <>
              <p className="mb-2 ml-0.5 text-[11px] font-black uppercase tracking-wider text-ink-soft">
                Lieblingsspiele
              </p>
              <div className="flex flex-wrap gap-1.5">
                {favorites.map((f) => (
                  <span
                    key={f}
                    className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-[11.5px] font-bold text-ink"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
