/**
 * Leagues/competitions with enable_live and priority for live polling.
 * Only matches from these competitions get fast polling when LIVE.
 * Priority: lower number = higher priority (used when max live matches exceeded).
 */

import type { LiveSportKey } from "./types";

export type LiveLeagueConfig = {
  league_id: number;
  enable_live: boolean;
  priority: number; // 1 = highest, used when selecting which matches to poll
  sport: LiveSportKey;
};

/** Football leagues with live polling enabled. Priority: 1 = top leagues first. */
export const LIVE_FOOTBALL_LEAGUES: LiveLeagueConfig[] = [
  { league_id: 2, enable_live: true, priority: 1, sport: "football" }, // Champions League
  { league_id: 3, enable_live: true, priority: 1, sport: "football" }, // Europa League
  { league_id: 4, enable_live: true, priority: 1, sport: "football" }, // Conference League
  { league_id: 39, enable_live: true, priority: 2, sport: "football" }, // Premier League
  { league_id: 135, enable_live: true, priority: 2, sport: "football" }, // Serie A
  { league_id: 140, enable_live: true, priority: 2, sport: "football" }, // La Liga
  { league_id: 78, enable_live: true, priority: 2, sport: "football" }, // Bundesliga
  { league_id: 61, enable_live: true, priority: 2, sport: "football" }, // Ligue 1
  { league_id: 136, enable_live: true, priority: 3, sport: "football" }, // Serie B
  { league_id: 203, enable_live: true, priority: 3, sport: "football" }, // Super Lig
  { league_id: 94, enable_live: true, priority: 3, sport: "football" }, // Liga Portugal
  { league_id: 137, enable_live: true, priority: 3, sport: "football" }, // Coppa Italia
  { league_id: 142, enable_live: true, priority: 3, sport: "football" }, // FA Cup
  { league_id: 143, enable_live: true, priority: 3, sport: "football" }, // Copa del Rey
  { league_id: 148, enable_live: true, priority: 3, sport: "football" }, // DFB-Pokal
  { league_id: 66, enable_live: true, priority: 3, sport: "football" }, // Coupe de France
];

/** Basketball leagues (API-Sports league IDs). */
export const LIVE_BASKETBALL_LEAGUES: LiveLeagueConfig[] = [
  { league_id: 12, enable_live: true, priority: 1, sport: "basketball" }, // NBA
  { league_id: 117, enable_live: true, priority: 2, sport: "basketball" }, // EuroLeague
  { league_id: 120, enable_live: true, priority: 2, sport: "basketball" }, // LBA / Serie A
];

/** Rugby leagues (API-Sports league IDs). */
export const LIVE_RUGBY_LEAGUES: LiveLeagueConfig[] = [
  { league_id: 11, enable_live: true, priority: 1, sport: "rugby" }, // Six Nations
  { league_id: 16, enable_live: true, priority: 1, sport: "rugby" }, // Top 14
  { league_id: 4, enable_live: true, priority: 2, sport: "rugby" }, // Premiership Rugby
  { league_id: 1, enable_live: true, priority: 2, sport: "rugby" }, // United Rugby Championship
];

const ALL_LEAGUES = [
  ...LIVE_FOOTBALL_LEAGUES,
  ...LIVE_BASKETBALL_LEAGUES,
  ...LIVE_RUGBY_LEAGUES,
];

const LIVE_LEAGUE_MAP = new Map(
  ALL_LEAGUES.map((l) => [`${l.sport}:${l.league_id}`, l])
);

export function isLiveEnabledForLeague(
  leagueId: number | undefined,
  sport: LiveSportKey = "football"
): boolean {
  if (leagueId == null) return false;
  const config = LIVE_LEAGUE_MAP.get(`${sport}:${leagueId}`);
  return config?.enable_live ?? false;
}

export function getLeaguePriority(
  leagueId: number | undefined,
  sport: LiveSportKey = "football"
): number {
  if (leagueId == null) return 999;
  const config = LIVE_LEAGUE_MAP.get(`${sport}:${leagueId}`);
  return config?.priority ?? 999;
}
