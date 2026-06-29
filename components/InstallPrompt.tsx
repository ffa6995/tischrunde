"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Meeple } from "./icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

/** „Zum Home-Bildschirm"-Hinweis (Android/Chrome beforeinstallprompt). */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || dismissed) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      // ignoriert
    }
    setDeferred(null);
  }

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 mx-auto flex w-[min(420px,calc(100%-2rem))] items-center gap-3 rounded-[16px] border border-line bg-surface p-3 shadow-[0_8px_24px_-10px_var(--shadow-strong)] lg:bottom-6">
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-green to-green-deep">
        <Meeple className="size-5 text-white" />
      </span>
      <p className="flex-1 text-sm font-bold text-ink">
        Tischrunde zum Home-Bildschirm?
      </p>
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 rounded-[10px] bg-gradient-to-br from-green to-green-deep px-3 py-2 text-xs font-black text-white"
      >
        <Download className="size-3.5" /> Installieren
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Hinweis schließen"
        className="grid size-8 shrink-0 place-items-center rounded-[10px] text-ink-soft"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
