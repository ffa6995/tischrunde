import type { ActivityEvent } from "@/lib/types";

/**
 * Leitet Trust-Signale + Lieblingsspiele aus activity_events ab (Konzept §9.1).
 * Trust wird NICHT hart gespeichert, sondern hier aus dem Event-Log berechnet.
 * Reine Funktion — keine DB, kein UI.
 */
export interface DerivedTrust {
  signals: string[];
  favorites: string[];
  joined: number;
  attended: number;
  hosted: number;
}

export function deriveTrust(activities: ActivityEvent[]): DerivedTrust {
  let joined = 0;
  let attended = 0;
  let hosted = 0;
  let brought = 0;
  const games = new Map<string, number>();

  for (const a of activities) {
    const gameName =
      typeof a.metadata?.game_name === "string" ? a.metadata.game_name : null;
    if (gameName) games.set(gameName, (games.get(gameName) ?? 0) + 1);

    switch (a.type) {
      case "round_joined":
        joined++;
        if (a.metadata?.brings_game === true) brought++;
        break;
      case "checked_in":
        attended++;
        break;
      case "round_created":
        hosted++;
        break;
      case "game_brought":
        brought++;
        break;
    }
  }

  const signals: string[] = [];
  if (attended > 0) signals.push(`${attended}× erschienen`);
  else if (joined > 0) signals.push(`War ${joined}× dabei`);
  if (hosted > 0) signals.push(hosted === 1 ? "Host" : `${hosted}× Host`);
  if (brought > 0) signals.push("Bringt Spiele mit");

  const favorites = [...games.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  return { signals, favorites, joined, attended, hosted };
}
