import type { Metadata } from "next";
import { SheetPageView } from "./SheetPageView";

export const metadata: Metadata = { title: "Notizblock" };

export default async function NotepadSheetPage({
  params,
}: {
  params: Promise<{ sheetId: string }>;
}) {
  const { sheetId } = await params;
  return <SheetPageView sheetId={sheetId} />;
}
