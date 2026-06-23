import Link from "next/link";
import { Meeple } from "@/components/icons";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-[520px] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="grid size-16 place-items-center rounded-[18px] bg-gradient-to-br from-green to-green-deep shadow-[0_5px_0_var(--green-deep)]">
        <Meeple className="size-9 text-white" />
      </span>
      <h1 className="font-display text-2xl font-extrabold text-ink">
        Kein Platz an diesem Tisch.
      </h1>
      <p className="text-sm font-semibold text-ink-soft">
        Diese Seite gibt es nicht (mehr). Vielleicht ist die Runde schon
        vorbei.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-[14px] bg-gradient-to-br from-green to-green-deep px-5 py-3 text-base font-black text-white shadow-[0_4px_0_var(--green-deep)] active:translate-y-[3px] active:shadow-none"
      >
        Zu den Treffen
      </Link>
    </main>
  );
}
