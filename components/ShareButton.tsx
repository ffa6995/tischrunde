"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/** Teilt einen Link (Web Share API, sonst Clipboard). */
export function ShareButton({
  url,
  title,
  label = "Teilen",
}: {
  url: string;
  title?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const fullUrl = url.startsWith("http")
      ? url
      : typeof window !== "undefined"
        ? window.location.origin + url
        : url;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, url: fullUrl });
        return;
      }
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Nutzer hat Dialog abgebrochen — nichts tun.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={label}
      className="flex items-center gap-2 rounded-[12px] border border-line bg-surface-2 px-3.5 py-2.5 text-sm font-extrabold text-ink-soft transition-transform active:translate-y-[2px]"
    >
      {copied ? (
        <>
          <Check className="size-4 text-green-deep" /> Kopiert
        </>
      ) : (
        <>
          <Share2 className="size-4" /> {label}
        </>
      )}
    </button>
  );
}
