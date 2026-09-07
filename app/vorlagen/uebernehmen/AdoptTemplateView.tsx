"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useNotepadSheet, useSaveTemplate } from "@/lib/hooks/useNotepad";
import { forkDefinition } from "@/lib/notepad/authoring";

/**
 * Übernahme am Tisch: kopiert den Definitions-Snapshot eines Blatts, das man
 * lesen darf, in eine eigene Vorlage — ohne Lesezugriff auf die Original-Vorlage.
 */
export function AdoptTemplateView() {
  const router = useRouter();
  const sheetId = useSearchParams().get("sheet") ?? "";
  const { data: sheet, isLoading } = useNotepadSheet(sheetId);
  const saveTemplate = useSaveTemplate();
  const started = useRef(false);

  useEffect(() => {
    if (!sheet || started.current) return;
    started.current = true;
    saveTemplate.mutate(
      {
        templateId: null,
        name: `${sheet.title ?? "Notizblock"} (übernommen)`,
        description: null,
        gameId: null,
        definition: forkDefinition(sheet.definition) as unknown as Record<string, unknown>,
        originTemplateId: sheet.template_id,
      },
      { onSuccess: (templateId) => router.replace(`/vorlagen/${templateId}`) },
    );
  }, [sheet, saveTemplate, router]);

  if (!sheetId || (!isLoading && !sheet)) {
    return (
      <div className="p-4">
        <p role="alert" className="text-ink">Dieser Notizblock ist nicht verfügbar.</p>
        <Link href="/vorlagen" className="mt-2 inline-block font-black text-green-deep">
          Zu den Vorlagen
        </Link>
      </div>
    );
  }

  if (saveTemplate.isError) {
    return (
      <div className="p-4">
        <p role="alert" className="text-ink">
          Übernehmen fehlgeschlagen: {saveTemplate.error.message}
        </p>
        <Link href="/vorlagen" className="mt-2 inline-block font-black text-green-deep">
          Zu den Vorlagen
        </Link>
      </div>
    );
  }

  return <p className="p-4 text-ink-soft">Vorlage wird übernommen …</p>;
}
