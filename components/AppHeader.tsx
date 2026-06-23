import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Meeple } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Kopfzeile. Mobil: Marke bzw. Zurück-Link + Hell/Dunkel-Schalter.
 * Ab lg übernimmt die Sidebar Marke + Toggle — daher wird die Marke-Variante
 * dort ausgeblendet und beim Zurück-Link nur der Link gezeigt.
 */
export function AppHeader({ back }: { back?: { href: string; label: string } }) {
  if (back) {
    return (
      <header className="flex items-center justify-between gap-3">
        <Link
          href={back.href}
          className="flex items-center gap-1.5 py-2 text-[13.5px] font-extrabold text-ink-soft"
        >
          <ChevronLeft className="size-4" /> {back.label}
        </Link>
        <span className="lg:hidden">
          <ThemeToggle />
        </span>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between gap-3 lg:hidden">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-[12px] bg-gradient-to-br from-green to-green-deep shadow-[0_4px_0_var(--green-deep)]">
          <Meeple className="size-5 text-white" />
        </span>
        <div>
          <h1 className="font-display text-xl font-black leading-none text-ink">
            Tischrunde
          </h1>
          <span className="mt-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">
            Dreiländereck
          </span>
        </div>
      </div>
      <ThemeToggle />
    </header>
  );
}
