"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfigFields } from "@/components/notepad/ConfigFields";
import { SheetView } from "@/components/notepad/SheetView";
import { useNotepadTemplates, useSaveTemplate } from "@/lib/hooks/useNotepad";
import {
  addBlock,
  emptyDefinition,
  forkDefinition,
  moveBlock,
  removeBlock,
  updateBlockConfig,
} from "@/lib/notepad/authoring";
import { BLOCK_MODULES, parseDefinition } from "@/lib/notepad/registry";
import type { BlockType, SheetDefinition, SheetPlayer } from "@/lib/notepad/schema";
import type { NotepadTemplate } from "@/lib/types";

const PREVIEW_PLAYERS: SheetPlayer[] = [
  { id: "demo-1", label: "Ann", participant_id: null },
  { id: "demo-2", label: "Bo", participant_id: null },
];

/**
 * Lädt die Vorlage und entscheidet neu/fork/bearbeiten, bevor das eigentliche
 * Formular montiert wird. Das ist bewusst getrennt: `TemplateBuilderForm`
 * initialisiert seinen State (Name, Definition, …) einmalig aus `source` —
 * würde diese Komponente schon vor dem Laden montieren, bliebe der Formular-
 * State für immer leer, weil useState seinen Startwert nur beim ersten
 * Rendern liest, ein späteres Eintreffen der Vorlage aber nicht nachzieht.
 */
export function TemplateBuilderView({ templateId }: { templateId: string }) {
  const { data: templates, isLoading } = useNotepadTemplates();
  const isNew = templateId === "neu";
  const source = templates?.find((t) => t.id === templateId) ?? null;

  if (!isNew && isLoading) {
    return <p className="p-4 text-ink-soft">Vorlage wird geladen …</p>;
  }

  if (!isNew && !source) {
    return (
      <div className="p-4">
        <p role="alert" className="text-ink">Diese Vorlage ist nicht verfügbar.</p>
        <Link href="/vorlagen" className="mt-2 inline-block font-black text-green-deep">
          Zu den Vorlagen
        </Link>
      </div>
    );
  }

  return <TemplateBuilderForm templateId={templateId} isNew={isNew} source={source} />;
}

function TemplateBuilderForm({
  templateId,
  isNew,
  source,
}: {
  templateId: string;
  isNew: boolean;
  source: NotepadTemplate | null;
}) {
  const router = useRouter();
  const saveTemplate = useSaveTemplate();

  // System-Vorlagen werden nie bearbeitet, sondern übernommen (Fork).
  const isFork = Boolean(source && source.kind === "system");

  const [definition, setDefinition] = useState<SheetDefinition>(() => {
    if (isNew || !source) return emptyDefinition();
    // Fork = frische Block-IDs; eigene Vorlage bearbeiten = IDs unverändert lassen.
    return isFork ? forkDefinition(source.definition) : parseDefinition(source.definition);
  });
  const [name, setName] = useState(
    isNew ? "" : isFork ? `${source?.name ?? ""} (eigene)` : source?.name ?? "",
  );
  const [description, setDescription] = useState(source?.description ?? "");
  const [previewEntries, setPreviewEntries] = useState<Record<string, unknown>>({});

  function save() {
    saveTemplate.mutate(
      {
        templateId: isNew || isFork ? null : templateId,
        name,
        description: description.trim() === "" ? null : description,
        gameId: source?.game_id ?? null,
        definition: definition as unknown as Record<string, unknown>,
        originTemplateId: isFork ? templateId : source?.origin_template_id ?? null,
      },
      { onSuccess: () => router.push("/vorlagen") },
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4 p-4">
      <header>
        <h1 className="font-display text-2xl font-black text-ink">
          {isNew ? "Neue Vorlage" : isFork ? "Vorlage übernehmen" : "Vorlage bearbeiten"}
        </h1>
        {isFork && (
          <p className="text-sm text-ink-soft">
            Du bearbeitest eine Kopie — die Original-Vorlage bleibt unverändert.
          </p>
        )}
      </header>

      <div className="flex flex-col gap-1">
        <label htmlFor="tpl-name" className="text-xs font-black uppercase text-ink-soft">Name</label>
        <input
          id="tpl-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-h-[44px] rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-ink"
        />
        <label htmlFor="tpl-desc" className="mt-2 text-xs font-black uppercase text-ink-soft">
          Beschreibung
        </label>
        <input
          id="tpl-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[44px] rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-ink"
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-black text-ink">Bausteine</h2>
        {definition.blocks.map((block, index) => (
          <div key={block.id} className="rounded-[var(--radius-md)] border border-line bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-black text-ink">{BLOCK_MODULES[block.type].label}</p>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Nach oben"
                  disabled={index === 0}
                  onClick={() => setDefinition(moveBlock(definition, block.id, -1))}
                  className="min-h-[44px] min-w-[44px] rounded-[var(--radius-sm)] border border-line text-ink disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Nach unten"
                  disabled={index === definition.blocks.length - 1}
                  onClick={() => setDefinition(moveBlock(definition, block.id, +1))}
                  className="min-h-[44px] min-w-[44px] rounded-[var(--radius-sm)] border border-line text-ink disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="Baustein entfernen"
                  disabled={definition.blocks.length === 1}
                  onClick={() => setDefinition(removeBlock(definition, block.id))}
                  className="min-h-[44px] min-w-[44px] rounded-[var(--radius-sm)] border border-line text-ink disabled:opacity-40"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="mt-2">
              <ConfigFields
                fields={BLOCK_MODULES[block.type].configFields}
                values={block.config}
                idPrefix={block.id}
                onChange={(patch) => setDefinition(updateBlockConfig(definition, block.id, patch))}
              />
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          {(Object.keys(BLOCK_MODULES) as BlockType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setDefinition(addBlock(definition, type))}
              className="min-h-[44px] rounded-[var(--radius-sm)] border border-line px-3 font-black text-ink"
            >
              + {BLOCK_MODULES[type].label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-black text-ink">Vorschau</h2>
        <div className="mt-2">
          <SheetView
            definition={definition as unknown as Record<string, unknown>}
            players={PREVIEW_PLAYERS}
            entries={previewEntries}
            readOnly={false}
            onEntriesChange={setPreviewEntries}
          />
        </div>
      </section>

      <button
        type="button"
        disabled={saveTemplate.isPending || name.trim().length === 0}
        onClick={save}
        className="min-h-[44px] rounded-[var(--radius-md)] border border-line bg-surface px-4 font-black text-ink disabled:opacity-60"
      >
        Vorlage speichern
      </button>
      {saveTemplate.isError && (
        <p role="alert" className="text-sm text-ink">{saveTemplate.error.message}</p>
      )}
    </div>
  );
}
