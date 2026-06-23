"use client";

import { useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { useClaimProfile, useSession } from "@/lib/hooks/useSession";

/**
 * Profil-Claim (Konzept §8.3): macht aus der anonymen Gast-Identität einen
 * dauerhaften Account per Magic-Link. User-ID bleibt → Stats wandern mit.
 */
export function ClaimProfile() {
  const { data: session } = useSession();
  const claim = useClaimProfile();
  const [email, setEmail] = useState("");

  const user = session?.user;
  if (!user) return null;

  // Bereits dauerhaft (E-Mail/OAuth verknüpft).
  if (user.is_anonymous === false) {
    return (
      <section className="mx-auto flex w-full max-w-[330px] items-center gap-3 rounded-[var(--radius-lg)] border border-green bg-green/10 p-4">
        <ShieldCheck className="size-5 shrink-0 text-green-deep" />
        <p className="text-sm font-bold text-green-deep">
          Profil gesichert{user.email ? ` · ${user.email}` : ""}
        </p>
      </section>
    );
  }

  if (claim.isSuccess) {
    return (
      <section className="mx-auto w-full max-w-[330px] rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[0_5px_0_var(--line)]">
        <p className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <Mail className="size-4 text-green-deep" /> Bestätigungs-Mail gesendet
        </p>
        <p className="mt-1.5 text-sm font-semibold text-ink-soft">
          Klick den Link in der Mail an <b className="text-ink">{email}</b> —
          danach ist dein Profil dauerhaft gesichert, mit allen Runden &amp;
          Stamps.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[330px] rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[0_5px_0_var(--line)]">
      <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-terra">
        <ShieldCheck className="size-4" /> Profil sichern
      </p>
      <p className="mb-3 text-sm font-semibold text-ink-soft">
        Du spielst als Gast — sicher deine Karte mit einer E-Mail, damit Runden
        &amp; Stamps nicht am Gerät hängen.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) claim.mutate(email);
        }}
        className="flex flex-col gap-2.5"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="deine@email.ch"
          autoComplete="email"
          aria-label="E-Mail-Adresse"
          className="w-full rounded-[14px] border border-line bg-surface px-4 py-3 text-base font-semibold text-ink shadow-[0_3px_0_var(--line)] outline-none placeholder:text-ink-soft focus-visible:outline-[3px] focus-visible:outline-gold"
        />
        <button
          type="submit"
          disabled={!email.trim() || claim.isPending}
          className="flex items-center justify-center gap-2 rounded-[14px] bg-gradient-to-br from-green to-green-deep px-4 py-3 text-base font-extrabold text-white shadow-[0_4px_0_var(--green-deep)] transition-transform active:translate-y-[3px] active:shadow-none disabled:opacity-50"
        >
          {claim.isPending ? "Sende…" : "Magic-Link schicken"}
        </button>
        {claim.isError && (
          <p className="text-sm font-semibold text-terra" role="alert">
            {(claim.error as Error).message}
          </p>
        )}
      </form>
    </section>
  );
}
