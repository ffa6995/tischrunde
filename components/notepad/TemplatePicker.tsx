"use client";

import { useNotepadTemplates } from "@/lib/hooks/useNotepad";
import type { NotepadTemplate } from "@/lib/types";

export interface TemplatePickerProps {
  gameId: string | null;
  onPick: (template: NotepadTemplate) => void;
  pendingId?: string | null;
}

/** Passende Vorlagen zuerst: gleiches Spiel, dann System, dann eigene. */
function sortTemplates(templates: NotepadTemplate[], gameId: string | null): NotepadTemplate[] {
  return [...templates].sort((a, b) => {
    const matchA = a.game_id && a.game_id === gameId ? 0 : 1;
    const matchB = b.game_id && b.game_id === gameId ? 0 : 1;
    if (matchA !== matchB) return matchA - matchB;
    if (a.kind !== b.kind) return a.kind === "system" ? -1 : 1;
    return a.name.localeCompare(b.name, "de");
  });
}

export function TemplatePicker({ gameId, onPick, pendingId }: TemplatePickerProps) {
  const { data: templates, isLoading, isError, error } = useNotepadTemplates();
  if (isLoading) return <p className="text-sm text-ink-soft">Vorlagen werden geladen …</p>;
  if (isError) {
    return (
      <p role="alert" className="text-sm text-ink-soft">
        Vorlagen konnten nicht geladen werden: {error.message}
      </p>
    );
  }
  if (!templates || templates.length === 0) {
    return <p className="text-sm text-ink-soft">Noch keine Vorlagen vorhanden.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {sortTemplates(templates, gameId).map((template) => (
        <li key={template.id}>
          <button
            type="button"
            disabled={Boolean(pendingId)}
            onClick={() => onPick(template)}
            className="flex min-h-[44px] w-full flex-col items-start rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-left disabled:opacity-60"
          >
            <span className="font-black text-ink">
              {template.name}
              {template.kind === "user" && (
                <span className="ml-2 text-xs font-bold text-ink-soft">· eigene</span>
              )}
            </span>
            {template.description && (
              <span className="text-xs text-ink-soft">{template.description}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
