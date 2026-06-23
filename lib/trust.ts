import type { ActivityEvent } from "@/lib/types";

/**
 * Leitet Trust-Signale, Lieblingsspiele und Event-Stamps aus activity_events ab
 * (Konzept §9.1/§10.1). Trust wird NICHT hart gespeichert, sondern hier aus dem
 * Event-Log berechnet. Reine Funktion — keine DB, kein UI.
 */
export interface DerivedTrust {
  signals: string[];
  favorites: string[];
  stamps: { id: string; name: string }[];
  joined: number;
  attended: number;
  hosted: number;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function deriveTrust(activities: ActivityEvent[]): DerivedTrust {
  let joined = 0;
  let attended = 0;
  let hosted = 0;
  let brought = 0;
  let teaches = false;
  const games = new Map<string, number>();
  const stamps = new Map<string, string>();

  for (const a of activities) {
    const gameName = str(a.metadata?.game_name);
    if (gameName) games.set(gameName, (games.get(gameName) ?? 0) + 1);

    switch (a.type) {
      case "round_joined":
        joined++;
        if (a.metadata?.skill === "teaches") teaches = true;
        break;
      case "checked_in": {
        attended++;
        const eid = str(a.metadata?.event_id);
        const ename = str(a.metadata?.event_name);
        if (eid && ename) stamps.set(eid, ename);
        break;
      }
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
  if (teaches) signals.push("Erklärt gern");

  const favorites = [...games.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const stampList = [...stamps.entries()].map(([id, name]) => ({ id, name }));

  return { signals, favorites, stamps: stampList, joined, attended, hosted };
}
