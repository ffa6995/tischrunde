"use client";

import type { FieldSpec } from "@/lib/notepad/schema";

export interface ConfigFieldsProps {
  fields: FieldSpec[];
  values: Record<string, unknown>;
  idPrefix: string;
  onChange: (patch: Record<string, unknown>) => void;
}

/**
 * Baut das Konfigurationsformular generisch aus den configFields des Blocktyps.
 * Kein Blocktyp wird hier namentlich erwähnt — genau das macht den Builder erweiterbar.
 */
export function ConfigFields({ fields, values, idPrefix, onChange }: ConfigFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const value = values[field.key];
        return (
          <div key={field.key} className="flex flex-col gap-1">
            {field.kind !== "boolean" && (
              <label htmlFor={id} className="text-xs font-black uppercase tracking-wide text-ink-soft">
                {field.label}
              </label>
            )}

            {field.kind === "boolean" && (
              <div className="flex min-h-[44px] items-center gap-2">
                <input
                  id={id}
                  type="checkbox"
                  checked={value === true}
                  onChange={(e) => onChange({ [field.key]: e.target.checked })}
                  className="size-6"
                />
                <label htmlFor={id} className="text-xs font-black uppercase tracking-wide text-ink-soft">
                  {field.label}
                </label>
              </div>
            )}

            {field.kind === "number" && (
              <input
                id={id}
                type="text"
                inputMode="numeric"
                value={value === null || value === undefined ? "" : String(value)}
                onChange={(e) =>
                  onChange({
                    [field.key]: e.target.value.trim() === "" ? null : Number(e.target.value),
                  })
                }
                className="min-h-[44px] rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-ink"
              />
            )}

            {field.kind === "text" && (
              <input
                id={id}
                type="text"
                maxLength={field.maxLength}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange({ [field.key]: e.target.value })}
                className="min-h-[44px] rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-ink"
              />
            )}

            {field.kind === "select" && (
              <select
                id={id}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange({ [field.key]: e.target.value })}
                className="min-h-[44px] rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-ink"
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            )}

            {field.help && <p className="text-xs text-ink-soft">{field.help}</p>}
          </div>
        );
      })}
    </div>
  );
}
