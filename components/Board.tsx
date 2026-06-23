import { Globe, Lock } from "lucide-react";

const CREST: Record<string, string> = {
  catan: "🏘️",
  jassen: "🃏",
  tcg: "⚡",
  standard: "🎲",
};

/**
 * Das Spielfeld: ein Layout, austauschbares Theme je Spielkategorie
 * (data-board, design-tokens.css §). Reine Hülle — Seats kommen als children.
 */
export function Board({
  theme,
  title,
  subtitle,
  isPublic,
  children,
}: {
  theme: string;
  title: string;
  subtitle: string;
  isPublic: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      data-board={theme}
      role="group"
      aria-label={`Spieltisch ${title} — ${subtitle}`}
      className="relative mb-4 overflow-hidden rounded-[24px] border-[7px] border-[var(--rim)] p-[18px] shadow-[inset_0_2px_0_rgba(255,255,255,.18),inset_0_-24px_40px_-20px_rgba(0,0,0,.5),0_16px_30px_-16px_var(--shadow-strong)] [background:radial-gradient(130%_120%_at_50%_0%,color-mix(in_srgb,var(--felt)_88%,#fff_4%),var(--felt-deep))]"
    >
      <span
        className="pointer-events-none absolute -right-3 -top-4 rotate-[-12deg] text-[120px] opacity-[0.13]"
        aria-hidden
      >
        {CREST[theme] ?? CREST.standard}
      </span>
      <span className="inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1.5 text-xs font-black text-white backdrop-blur-sm">
        {isPublic ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
        {isPublic ? "Öffentlich findbar" : "Privat · nur Einladung"}
      </span>
      <h3 className="mt-3 font-display text-2xl font-black text-white [text-shadow:0_2px_6px_rgba(0,0,0,.4)]">
        {title}
      </h3>
      <p className="text-[12.5px] font-extrabold text-white/80 [text-shadow:0_1px_3px_rgba(0,0,0,.4)]">
        {subtitle}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}
