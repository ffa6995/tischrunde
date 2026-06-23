import type { Metadata } from "next";
import { EventDetailView } from "./EventDetailView";
import { DEMO_EVENTS } from "@/lib/demo/fixtures";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const event = DEMO_EVENTS.find((e) => e.id === eventId);
  return {
    title: event?.title ?? "Event",
    description: event?.description ?? "Offene Spielrunden bei diesem Event.",
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <EventDetailView eventId={eventId} />;
}
