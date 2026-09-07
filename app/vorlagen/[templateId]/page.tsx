import type { Metadata } from "next";
import { TemplateBuilderView } from "./TemplateBuilderView";

export const metadata: Metadata = { title: "Vorlage bearbeiten" };

export default async function TemplateBuilderPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  return <TemplateBuilderView templateId={templateId} />;
}
