/**
 * Aus dem DB-Schema (supabase/schema.sql) abgeleitete Typen.
 * TEXT+CHECK-Spalten werden hier als String-Union-Typen abgebildet.
 * Später ggf. durch `supabase gen types typescript` ersetzen.
 */

export type Role =
  | "guest"
  | "player"
  | "verified"
  | "owner"
  | "moderator"
  | "admin";

export type VerificationStatus =
  | "none"
  | "email"
  | "phone"
  | "trusted"
  | "venue_verified";

export type GameTheme =
  | "standard"
  | "catan"
  | "jassen"
  | "tcg"
  | "party"
  | "other";

export type GameSource =
  | "on_site"
  | "needed"
  | "brought_by_player"
  | "host_brings";

export type DesiredLevel =
  | "any"
  | "beginner"
  | "advanced"
  | "learning"
  | "tournament_like";

export type SearchStatus = "open" | "full" | "active" | "closed" | "cancelled";

export type SkillLevel =
  | "beginner"
  | "advanced"
  | "learning"
  | "teaches"
  | "any";

export type ParticipantStatus =
  | "requested"
  | "joined"
  | "confirmed"
  | "removed"
  | "left"
  | "no_show";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: Role;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  name: string;
  min_players: number;
  max_players: number;
  theme: GameTheme;
  image_url: string | null;
  bgg_id: number | null;
  created_by: string | null;
  status: "draft" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  type: "venue" | "event_host" | "home" | "shop";
  address_public: string | null;
  region_label: string | null;
  geo: Record<string, unknown> | null;
  socials: Record<string, unknown> | null;
  website: string | null;
  owner_id: string | null;
  claimed_by: string | null;
  status: "private" | "pending" | "public" | "archived";
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationWithGames extends Location {
  games: Game[];
}

export interface Event {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location_id: string | null;
  description: string | null;
  host_id: string | null;
  event_url: string | null;
  socials: Record<string, unknown> | null;
  visibility: "public" | "private" | "unlisted";
  status: "draft" | "published" | "cancelled" | "archived";
  created_at: string;
  updated_at: string;
}

export interface GameSearch {
  id: string;
  event_id: string | null;
  location_id: string | null;
  game_id: string | null;
  creator_id: string | null;
  title: string | null;
  seats_total: number;
  visibility: "public" | "invite" | "unlisted";
  join_mode: "open" | "approval";
  game_source: GameSource;
  beginner_friendly: boolean;
  desired_level: DesiredLevel;
  status: SearchStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  search_id: string;
  user_id: string;
  joined_at: string;
  role: "host" | "player";
  skill_level: SkillLevel;
  brings_game: boolean;
  brings_note: string | null;
  status: ParticipantStatus;
}

export type ActivityType =
  | "round_created"
  | "round_archived"
  | "round_joined"
  | "checked_in"
  | "host_confirmed"
  | "game_brought"
  | "respect_given"
  | "no_show_reported"
  | "match_confirmed";

export interface ActivityEvent {
  id: string;
  user_id: string;
  type: ActivityType;
  source_type: "event" | "game_search" | "match" | "profile" | "location" | null;
  source_id: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

/** Teilnehmer inkl. (Teil-)Profil — für die Slot-Anzeige im Spielfeld. */
export interface ParticipantWithProfile extends Participant {
  profile: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
}

/** Runde inkl. Spiel + Teilnehmern + abgeleitetem Belegungszähler. */
export interface RoundWithGame extends GameSearch {
  game: Game | null;
  participants: ParticipantWithProfile[];
  seats_taken: number;
}
