"use client";

import { useState } from "react";
import { LogOut, Mail, UserRound } from "lucide-react";
import {
  useSession,
  useSignInAsGuest,
  useSignInWithEmail,
  useSignOut,
} from "@/lib/hooks/useSession";

/**
 * Auth light: provisorische Gast-Identität (Anzeigename) ODER Anmeldung für
 * bestehende Accounts per Magic-Link. Reine UI (CLAUDE.md §2).
 */
export function GuestPanel() {
  const { data, isLoading } = useSession();
  const signIn = useSignInAsGuest();
  const login = useSignInWithEmail();
  const signOut = useSignOut();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"guest" | "login">("guest");

  if (isLoading) {
    return <p className="text-sm font-semibold text-ink-soft">Lädt…</p>;
  }

  const profile = data?.profile;
  const user = data?.user;

  if (user) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-[14px] bg-green/15 text-green-deep">
            <UserRound className="size-5" />
          </span>
          <div>
            <p className="font-display text-lg font-bold leading-tight text-ink">
              {profile?.display_name ?? "Gast"}
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              {profile?.role ?? "guest"}
              {user.is_anonymous === false ? " · angemeldet" : " · Gast-Identität"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut.mutate()}
          disabled={signOut.isPending}
          className="flex items-center gap-2 rounded-[12px] border border-line bg-surface px-3 py-2 text-sm font-bold text-ink-soft active:translate-y-[2px]"
        >
          <LogOut className="size-4" /> Abmelden
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-[14px] border border-line bg-surface px-4 py-3 text-base font-semibold text-ink shadow-[0_3px_0_var(--line)] outline-none placeholder:text-ink-soft focus-visible:outline-[3px] focus-visible:outline-gold";
  const linkClass =
    "self-start text-sm font-bold text-green-deep underline underline-offset-2";

  // --- Anmelden (bestehender Account, Magic-Link) ---
  if (mode === "login") {
    if (login.isSuccess) {
      return (
        <div>
          <p className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <Mail className="size-4 text-green-deep" /> Anmelde-Mail gesendet
          </p>
          <p className="mt-1.5 text-sm font-semibold text-ink-soft">
            Öffne den Link in der Mail an <b className="text-ink">{email}</b> —
            dann bist du angemeldet.
          </p>
        </div>
      );
    }
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) login.mutate(email);
        }}
        className="flex flex-col gap-3"
      >
        <label
          htmlFor="login-email"
          className="text-xs font-extrabold uppercase tracking-wider text-ink-soft"
        >
          Anmelden mit E-Mail
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="deine@email.ch"
          autoComplete="email"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={!email.trim() || login.isPending}
          className="flex items-center justify-center gap-2 rounded-[14px] bg-gradient-to-br from-green to-green-deep px-4 py-3 text-base font-extrabold text-white shadow-[0_4px_0_var(--green-deep)] transition-transform active:translate-y-[3px] active:shadow-none disabled:opacity-50"
        >
          {login.isPending ? "Sende…" : "Anmelde-Link schicken"}
        </button>
        {login.isError && (
          <p className="text-sm font-semibold text-terra" role="alert">
            {humanizeError((login.error as Error)?.message)}
          </p>
        )}
        <button
          type="button"
          onClick={() => setMode("guest")}
          className={linkClass}
        >
          ← Lieber als Gast loslegen
        </button>
      </form>
    );
  }

  // --- Als Gast loslegen (provisorisch) ---
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) signIn.mutate(name);
      }}
      className="flex flex-col gap-3"
    >
      <label
        htmlFor="display-name"
        className="text-xs font-extrabold uppercase tracking-wider text-ink-soft"
      >
        Anzeigename
      </label>
      <input
        id="display-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="z. B. Andrin"
        autoComplete="off"
        className={inputClass}
      />
      <button
        type="submit"
        disabled={!name.trim() || signIn.isPending}
        className="flex items-center justify-center gap-2 rounded-[14px] bg-gradient-to-br from-green to-green-deep px-4 py-3 text-base font-extrabold text-white shadow-[0_4px_0_var(--green-deep)] transition-transform active:translate-y-[3px] active:shadow-none disabled:opacity-50"
      >
        {signIn.isPending ? "Moment…" : "Als Gast loslegen"}
      </button>
      {signIn.isError && (
        <p className="text-sm font-semibold text-terra" role="alert">
          {humanizeError((signIn.error as Error)?.message)}
        </p>
      )}
      <button
        type="button"
        onClick={() => setMode("login")}
        className={linkClass}
      >
        Schon dabei? Mit E-Mail anmelden
      </button>
    </form>
  );
}

function humanizeError(message?: string): string {
  if (!message) return "Etwas ist schiefgelaufen.";
  if (
    message.includes("Failed to fetch") ||
    message.includes("fetch failed") ||
    message.toLowerCase().includes("network")
  ) {
    return "Supabase ist noch nicht verbunden — echte Projekt-Keys in .env.local eintragen.";
  }
  if (message.toLowerCase().includes("anonymous")) {
    return "Anonyme Anmeldung im Supabase-Dashboard aktivieren (Authentication → Providers).";
  }
  return message;
}
