import type { GameSource } from "@/lib/types";

/**
 * Ist für die Runde ein Spiel gesichert? (Konzept §11.3 Bring-Mechanik)
 * Verfügbar, wenn es vor Ort liegt, der Host es mitbringt, oder mind. ein
 * Teilnehmer „bringe mit" angegeben hat. Reine Funktion.
 */
export function isGameAvailable(
  gameSource: GameSource,
  participants: { brings_game: boolean }[],
): boolean {
  if (gameSource === "on_site" || gameSource === "host_brings") return true;
  return participants.some((p) => p.brings_game);
}
