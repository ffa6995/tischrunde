import type { Metadata } from "next";
import { MeView } from "@/components/MeView";

export const metadata: Metadata = { title: "Deine Karte" };

export default function Page() {
  return <MeView />;
}
