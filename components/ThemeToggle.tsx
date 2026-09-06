"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

/** Hell/Dunkel über data-theme auf <html> (CLAUDE.md §5.1), persistiert. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document === "undefined"
      ? "light"
      : (document.documentElement.getAttribute("data-theme") as Theme | null) ?? "light",
  );

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("tr-theme", next);
    } catch {
      // localStorage nicht verfügbar — egal, data-theme ist gesetzt.
    }
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === "light" ? "Dunkelmodus einschalten" : "Hellmodus einschalten"
      }
      className="grid size-11 place-items-center rounded-[14px] border border-line bg-surface text-ink shadow-[0_3px_0_var(--line)] transition-transform active:translate-y-[2px] active:shadow-none"
    >
      {theme === "light" ? (
        <Moon className="size-5" />
      ) : (
        <Sun className="size-5" />
      )}
    </button>
  );
}
