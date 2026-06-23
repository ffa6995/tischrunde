import type { Metadata } from "next";
import { CreateRoundWizard } from "./CreateRoundWizard";

export const metadata: Metadata = { title: "Neue Runde" };

export default async function NewRoundPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <CreateRoundWizard eventId={eventId} />;
}
