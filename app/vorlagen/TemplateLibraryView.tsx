"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCreateSheet, useDeleteTemplate, useNotepadTemplates } from "@/lib/hooks/useNotepad";
import { playersFromNames } from "@/lib/notepad/authoring";

export function TemplateLibraryView() {
  const router = useRouter();
  const { data: templates, isLoading } = useNotepadTemplates();
  const createSheet = useCreateSheet();
  const removeTemplate = useDeleteTemplate();
  const [names, setNames] = useState("");
  const [startId, setStartId] = useState<string | null>(null);

  const chosen = templates?.find((t) => t.id === startId) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4 p-4">
      <header>
        <h1 className="font-display text-2xl font-black text-ink">Notizblöcke</h1>
        <p className="text-sm text-ink-soft">
          Vorlagen für Punkte am Tisch — mitgelieferte und eigene.
        </p>
      </header>

      <Link
        href="/vorlagen/neu"
        className="flex min-h-[44px] items-center justify-center rounded-[var(--radius-md)] border border-line bg-surface font-black text-ink"
      >
        Eigene Vorlage bauen
      </Link>

      {isLoading && <p className="text-sm text-ink-soft">Vorlagen werden geladen …</p>}

      <ul className="flex flex-col gap-2">
        {(templates ?? []).map((template) => (
          <li
            key={template.id}
            className="rounded-[var(--radius-md)] border border-line bg-surface p-3"
          >
            <p className="font-black text-ink">
              {template.name}
              {template.kind === "user" && (
                <span className="ml-2 text-xs font-bold text-ink-soft">· eigene</span>
              )}
            </p>
            {template.description && (
              <p className="text-xs text-ink-soft">{template.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStartId(template.id)}
                className="min-h-[44px] rounded-[var(--radius-sm)] border border-line px-3 font-black text-ink"
              >
                Blatt starten
              </button>
              <Link
                href={`/vorlagen/${template.id}`}
                className="flex min-h-[44px] items-center rounded-[var(--radius-sm)] border border-line px-3 font-black text-ink"
              >
                {template.kind === "system" ? "Übernehmen & anpassen" : "Bearbeiten"}
              </Link>
              {template.kind === "user" && (
                <button
                  type="button"
                  onClick={() => removeTemplate.mutate(template.id)}
                  className="min-h-[44px] rounded-[var(--radius-sm)] px-3 font-black text-ink-soft"
                >
                  Löschen
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {chosen && (
        <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-4">
          <h2 className="font-display text-lg font-black text-ink">
            Wer spielt mit? ({chosen.name})
          </h2>
          <label htmlFor="players" className="mt-2 block text-xs font-black uppercase text-ink-soft">
            Namen, eine pro Zeile
          </label>
          <textarea
            id="players"
            rows={4}
            value={names}
            onChange={(e) => setNames(e.target.value)}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-line bg-surface p-3 text-ink"
          />
          <button
            type="button"
            disabled={createSheet.isPending || names.trim().length === 0}
            onClick={() =>
              createSheet.mutate(
                {
                  searchId: null,
                  templateId: chosen.id,
                  definition: chosen.definition,
                  players: playersFromNames(names.split("\n")),
                  title: chosen.name,
                },
                { onSuccess: (sheetId) => router.push(`/n/${sheetId}`) },
              )
            }
            className="mt-3 min-h-[44px] w-full rounded-[var(--radius-md)] border border-line px-3 font-black text-ink disabled:opacity-60"
          >
            Blatt öffnen
          </button>
          {createSheet.isError && (
            <p role="alert" className="mt-2 text-sm text-ink">{createSheet.error.message}</p>
          )}
        </section>
      )}
    </div>
  );
}
