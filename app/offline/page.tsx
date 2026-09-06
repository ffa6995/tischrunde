import { Meeple } from "@/components/icons";

export const metadata = { title: "Offline" };

export default function Offline() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-[520px] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="grid size-16 place-items-center rounded-[18px] bg-gradient-to-br from-wood to-wood-deep shadow-[0_5px_0_var(--wood-deep)]">
        <Meeple className="size-9 text-white" />
      </span>
      <h1 className="font-display text-2xl font-extrabold text-ink">
        Gerade offline.
      </h1>
      <p className="text-sm font-semibold text-ink-soft">
        Keine Verbindung. Sobald du wieder online bist, geht&apos;s am Tisch weiter —
        einfach neu laden.
      </p>
    </main>
  );
}
