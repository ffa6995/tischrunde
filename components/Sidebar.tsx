"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, IdCard } from "lucide-react";
import { Meeple } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

const ITEMS = [
  {
    href: "/",
    label: "Treffen",
    icon: CalendarDays,
    match: (p: string) => p === "/" || p.startsWith("/e") || p.startsWith("/r"),
  },
  {
    href: "/me",
    label: "Karte",
    icon: IdCard,
    match: (p: string) => p.startsWith("/me"),
  },
];

/** Seiten-Navigation für Tablet/Desktop (ersetzt die Bottom-Nav ab lg). */
export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-line px-5 py-6 lg:flex">
      <Link href="/" className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-[12px] bg-gradient-to-br from-green to-green-deep shadow-[0_4px_0_var(--green-deep)]">
          <Meeple className="size-5 text-white" />
        </span>
        <div>
          <p className="font-display text-xl font-black leading-none text-ink">
            Tischrunde
          </p>
          <span className="mt-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">
            Dreiländereck
          </span>
        </div>
      </Link>

      <nav className="flex flex-col gap-1.5">
        {ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-sm font-extrabold ${
                active
                  ? "bg-green/15 text-green-deep"
                  : "text-ink-soft hover:bg-surface-2"
              }`}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <ThemeToggle />
      </div>
    </aside>
  );
}
