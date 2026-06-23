"use client";

import { FlaskConical } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Hinweis, solange gegen Platzhalter-Keys (Demo-Daten) gelaufen wird. */
export function DemoBanner() {
  if (isSupabaseConfigured()) return null;
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius)] border border-dashed border-line bg-surface-2 p-3.5">
      <FlaskConical className="mt-0.5 size-5 shrink-0 text-ink-soft" />
      <p className="text-[13px] font-semibold text-ink-soft">
        <strong className="text-ink">Demo-Daten.</strong> Supabase ist noch nicht
        verbunden — Joins &amp; neue Runden bleiben nur in dieser Sitzung. Keys in{" "}
        <code>.env.local</code> eintragen und <code>supabase/schema.sql</code>{" "}
        ausführen, um echt zu werden.
      </p>
    </div>
  );
}
