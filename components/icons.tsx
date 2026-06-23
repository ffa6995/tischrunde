/** Geteilte Marken-Icons (später durch eigene SVG-Kategorie-Icons ergänzbar). */

export function Meeple({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2c-1.6 0-2.9 1.4-2.9 3.1 0 .9.4 1.7 1 2.3-1.8.7-3.1 2.5-3.1 4.6V21a1 1 0 0 0 1 1h1.5v-3a2.5 2.5 0 0 1 5 0v3H17a1 1 0 0 0 1-1v-9c0-2.1-1.3-3.9-3.1-4.6.6-.6 1-1.4 1-2.3C15.9 3.4 14.6 2 12 2Z" />
    </svg>
  );
}
