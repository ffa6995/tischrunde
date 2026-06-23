import { QRCodeSVG } from "qrcode.react";

/** QR-Code fürs Event/Runde (Konzept §11.4 / §8). Reine Präsentation. */
export function QRCodeBlock({
  value,
  caption,
}: {
  value: string;
  caption?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-[0_5px_0_var(--line)]">
      <div className="rounded-[16px] bg-white p-3">
        <QRCodeSVG value={value} size={148} level="M" />
      </div>
      {caption && (
        <p className="text-center text-sm font-bold text-ink-soft">{caption}</p>
      )}
    </div>
  );
}
