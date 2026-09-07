import type { Metadata } from "next";
import { TemplateLibraryView } from "./TemplateLibraryView";

export const metadata: Metadata = { title: "Notizblock-Vorlagen" };

export default function TemplatesPage() {
  return <TemplateLibraryView />;
}
