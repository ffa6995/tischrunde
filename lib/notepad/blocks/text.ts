/** Freitext-Notiz (Hausregeln, Erweiterungen, wer gibt) — rechnet nichts. */
import type { BlockModule, FieldSpec } from "../schema";
import { emptyResult } from "../schema";

export interface TextConfig {
  placeholder: string;
}

export interface TextEntries {
  value: string;
}

const DEFAULT_CONFIG: TextConfig = { placeholder: "Notiz …" };

const CONFIG_FIELDS: FieldSpec[] = [
  { key: "placeholder", kind: "text", label: "Platzhalter", maxLength: 60 },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseConfig(raw: unknown): Record<string, unknown> {
  const input = isRecord(raw) ? raw : {};
  return {
    placeholder:
      typeof input.placeholder === "string" && input.placeholder.length > 0
        ? input.placeholder.slice(0, 60)
        : DEFAULT_CONFIG.placeholder,
  } satisfies TextConfig as unknown as Record<string, unknown>;
}

export const textBlock: BlockModule = {
  type: "text",
  label: "Notiz",
  defaultConfig: DEFAULT_CONFIG as unknown as Record<string, unknown>,
  configFields: CONFIG_FIELDS,
  parseConfig,
  emptyEntries: () => ({ value: "" } satisfies TextEntries),
  parseEntries: (raw) => ({
    value: isRecord(raw) && typeof raw.value === "string" ? raw.value : "",
  } satisfies TextEntries),
  compute: () => emptyResult(),
};
