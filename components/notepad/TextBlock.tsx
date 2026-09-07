"use client";

import { blockModule } from "@/lib/notepad/registry";
import type { TextConfig, TextEntries } from "@/lib/notepad/blocks/text";
import type { BlockRendererProps } from "./registry";

export function TextBlock({ block, players, entries, readOnly, onChange }: BlockRendererProps) {
  const mod = blockModule("text");
  const config = block.config as unknown as TextConfig;
  const data = mod.parseEntries(entries, block.config, players) as TextEntries;

  return (
    <textarea
      aria-label={block.title ?? "Notiz"}
      placeholder={config.placeholder}
      disabled={readOnly}
      value={data.value}
      onChange={(e) => onChange({ value: e.target.value })}
      rows={3}
      className="w-full rounded-[var(--radius-md)] border border-line bg-surface p-3 text-ink outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-green-deep"
    />
  );
}
