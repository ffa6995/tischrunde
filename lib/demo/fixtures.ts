/**
 * Demo-Daten für den Walking Skeleton ohne verbundene DB.
 * Spiegelt den Seed aus supabase/schema.sql (Event + Spiele + Runden) und
 * ergänzt illustrative Teilnehmer, damit das Spielfeld gefüllt wirkt.
 * Wird nur genutzt, solange isSupabaseConfigured() === false.
 */
import type {
  Event,
  Game,
  Location,
  LocationWithGames,
  RoundWithGame,
  ParticipantWithProfile,
} from "@/lib/types";

const T = "2026-06-21T12:00:00.000Z";

export const DEMO_LOCATION: Location = {
  id: "33333333-3333-3333-3333-333333333301",
  name: "Jugendhaus Dornbirn",
  type: "event_host",
  address_public: "Jugendhaus, Schulgasse 1, Dornbirn",
  region_label: "Dornbirn",
  geo: null,
  socials: null,
  website: "https://example.org/jugendhaus",
  owner_id: null,
  claimed_by: null,
  status: "public",
  is_verified: true,
  created_at: T,
  updated_at: T,
};

export const DEMO_EVENT: Event = {
  id: "22222222-2222-2222-2222-222222222201",
  title: "Spielerei Dornbirn",
  starts_at: "2026-06-28T12:00:00.000Z",
  ends_at: "2026-06-28T16:00:00.000Z",
  location_id: DEMO_LOCATION.id,
  description:
    "Offener Brett- & Kartenspiel-Nachmittag im Jugendhaus, Dornbirn. Komm vorbei — alle Einnahmen gehen an die Pfadfinder.",
  host_id: null,
  event_url: "https://example.org/spielerei",
  socials: { instagram: "https://instagram.com/spielerei" },
  visibility: "public",
  status: "published",
  created_at: T,
  updated_at: T,
};

export const DEMO_EVENTS: Event[] = [DEMO_EVENT];

function game(
  id: string,
  name: string,
  min: number,
  max: number,
  theme: Game["theme"],
): Game {
  return {
    id,
    name,
    min_players: min,
    max_players: max,
    theme,
    image_url: null,
    bgg_id: null,
    created_by: null,
    status: "approved",
    created_at: T,
    updated_at: T,
  };
}

export const DEMO_GAMES: Game[] = [
  game("11111111-1111-1111-1111-111111111101", "Catan", 3, 4, "catan"),
  game("11111111-1111-1111-1111-111111111102", "Carcassonne", 2, 5, "catan"),
  game("11111111-1111-1111-1111-111111111103", "Wingspan", 1, 5, "standard"),
  game("11111111-1111-1111-1111-111111111104", "Azul", 2, 4, "standard"),
  game("11111111-1111-1111-1111-111111111105", "7 Wonders", 3, 7, "standard"),
  game("11111111-1111-1111-1111-111111111106", "Jassen", 4, 4, "jassen"),
];

function part(
  searchId: string,
  name: string,
  skill: ParticipantWithProfile["skill_level"],
  role: "host" | "player" = "player",
): ParticipantWithProfile {
  const id = `${searchId}-${name.toLowerCase()}`;
  return {
    id,
    search_id: searchId,
    user_id: id,
    joined_at: T,
    role,
    skill_level: skill,
    brings_game: false,
    brings_note: null,
    status: "joined",
    profile: { id, display_name: name, avatar_url: null },
  };
}

const GAME_BY_ID = Object.fromEntries(DEMO_GAMES.map((g) => [g.id, g]));

// Spielbestand der Location (welche der DEMO_GAMES dort vor Ort sind).
const DEMO_LOCATION_GAME_IDS = [
  "11111111-1111-1111-1111-111111111101", // Catan
  "11111111-1111-1111-1111-111111111102", // Carcassonne
  "11111111-1111-1111-1111-111111111103", // Wingspan
  "11111111-1111-1111-1111-111111111104", // Azul
];

export function demoLocation(id: string): Location | null {
  return id === DEMO_LOCATION.id ? DEMO_LOCATION : null;
}

export function demoLocationWithGames(id: string): LocationWithGames | null {
  if (id !== DEMO_LOCATION.id) return null;
  return {
    ...DEMO_LOCATION,
    games: DEMO_LOCATION_GAME_IDS.map((gid) => GAME_BY_ID[gid]).filter(Boolean),
  };
}

export function demoLocationGames(id: string): Game[] {
  return demoLocationWithGames(id)?.games ?? [];
}

function round(
  id: string,
  gameId: string,
  seats: number,
  source: RoundWithGame["game_source"],
  level: RoundWithGame["desired_level"],
  beginnerFriendly: boolean,
  title: string,
  participants: ParticipantWithProfile[],
): RoundWithGame {
  return {
    id,
    event_id: DEMO_EVENT.id,
    location_id: null,
    game_id: gameId,
    creator_id: null,
    title,
    seats_total: seats,
    visibility: "public",
    join_mode: "open",
    game_source: source,
    beginner_friendly: beginnerFriendly,
    desired_level: level,
    status: "open",
    archived_at: null,
    created_at: T,
    updated_at: T,
    game: GAME_BY_ID[gameId] ?? null,
    participants,
    seats_taken: participants.length,
  };
}

export const DEMO_ROUNDS: RoundWithGame[] = [
  round(
    "r-catan",
    "11111111-1111-1111-1111-111111111101",
    4,
    "on_site",
    "advanced",
    false,
    "Aufbau-Strategen gesucht",
    [
      part("r-catan", "Lea", "advanced", "host"),
      part("r-catan", "Tobias", "advanced"),
    ],
  ),
  round(
    "r-jassen",
    "11111111-1111-1111-1111-111111111106",
    4,
    "on_site",
    "advanced",
    false,
    "Differenzler zu viert",
    [
      part("r-jassen", "Hannes", "advanced", "host"),
      part("r-jassen", "Marlis", "advanced"),
      part("r-jassen", "Werner", "advanced"),
    ],
  ),
  round(
    "r-wingspan",
    "11111111-1111-1111-1111-111111111103",
    5,
    "on_site",
    "beginner",
    true,
    "Anfänger willkommen",
    [part("r-wingspan", "Sophie", "beginner", "host")],
  ),
  round(
    "r-carcassonne",
    "11111111-1111-1111-1111-111111111102",
    4,
    "needed",
    "any",
    true,
    "Wer bringt es mit?",
    [],
  ),
];

export function demoRoundsForEvent(eventId: string): RoundWithGame[] {
  return eventId === DEMO_EVENT.id ? DEMO_ROUNDS : [];
}

export function demoRound(searchId: string): RoundWithGame | null {
  return DEMO_ROUNDS.find((r) => r.id === searchId) ?? null;
}
