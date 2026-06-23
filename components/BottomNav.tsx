"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, IdCard } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Treffen", icon: CalendarDays, match: (p: string) => p === "/" || p.startsWith("/e") || p.startsWith("/r") },
  { href: "/me", label: "Karte", icon: IdCard, match: (p: string) => p.startsWith("/me") },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 mx-auto flex w-full max-w-[520px] gap-2 border-t border-line bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-3 py-2 backdrop-blur-md">
      {ITEMS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 rounded-[12px] py-1.5 text-[10.5px] font-black tracking-wide ${
              active ? "text-green-deep" : "text-ink-soft"
            }`}
          >
            <Icon className="size-6" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
