import { Suspense } from "react";
import type { Metadata } from "next";
import { AdoptTemplateView } from "./AdoptTemplateView";

export const metadata: Metadata = { title: "Vorlage übernehmen" };

export default function AdoptTemplatePage() {
  return (
    <Suspense fallback={<p className="p-4 text-ink-soft">Wird geladen …</p>}>
      <AdoptTemplateView />
    </Suspense>
  );
}
