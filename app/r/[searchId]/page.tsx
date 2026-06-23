import type { Metadata } from "next";
import { BoardView } from "./BoardView";
import { demoRound } from "@/lib/demo/fixtures";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ searchId: string }>;
}): Promise<Metadata> {
  const { searchId } = await params;
  const round = demoRound(searchId);
  const name = round?.game?.name;
  return { title: name ? `${name} — Runde` : "Runde" };
}

export default async function RoundPage({
  params,
}: {
  params: Promise<{ searchId: string }>;
}) {
  const { searchId } = await params;
  return <BoardView searchId={searchId} />;
}
