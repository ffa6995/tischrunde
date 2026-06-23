import type {
  DesiredLevel,
  GameSource,
  GameTheme,
  Location,
  SkillLevel,
} from "@/lib/types";

/**
 * Öffentlich anzeigbare Adresse (Konzept §7.3): genaue Adresse nur für
 * öffentliche Venues; Heim-/private Orte zeigen nur die grobe Region.
 * (Verschlüsselung + Edge-Function-Freigabe für bestätigte Teilnehmer: Release 3.)
 */
export function locationAddress(loc: Location): string {
  if (loc.type === "home" || loc.status !== "public") {
    return loc.region_label ?? "Region wird nur an Teilnehmer freigegeben";
  }
  return loc.address_public ?? loc.region_label ?? "";
}

/** Spielfeld-Theme aus Spielkategorie (data-board in design-tokens.css). */
export function boardTheme(theme: GameTheme | undefined): string {
  if (theme === "catan" || theme === "jassen" || theme === "tcg") return theme;
  return "standard";
}

export const LEVEL_LABEL: Record<DesiredLevel, string> = {
  any: "Egal",
  beginner: "Anfänger willkommen",
  advanced: "Fortgeschritten",
  learning: "Lernende willkommen",
  tournament_like: "Turniernah",
};

export const SKILL_LABEL: Record<SkillLevel, string> = {
  beginner: "Anfänger",
  advanced: "Fortgeschritten",
  learning: "Lernt gern",
  teaches: "Erklärt gern",
  any: "Egal",
};

/** Tailwind-Klassen pro Skill (Text + Hintergrund, nie nur Farbe). */
export const SKILL_CLASS: Record<SkillLevel, string> = {
  beginner: "bg-green/15 text-green-deep",
  advanced: "bg-terra/15 text-terra",
  learning: "bg-gold/20 text-skill-learning",
  teaches: "bg-wood/15 text-wood-deep",
  any: "bg-surface-2 text-ink-soft",
};

export const GAME_SOURCE_LABEL: Record<GameSource, string> = {
  on_site: "Liegt vor Ort",
  needed: "Wird gesucht",
  brought_by_player: "Bringt jemand mit",
  host_brings: "Host bringt mit",
};

export function formatEventDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDayMonth(iso: string): { day: string; month: string } {
  const d = new Date(iso);
  return {
    day: new Intl.DateTimeFormat("de-DE", { day: "numeric" }).format(d),
    month: new Intl.DateTimeFormat("de-DE", { month: "short" }).format(d),
  };
}
