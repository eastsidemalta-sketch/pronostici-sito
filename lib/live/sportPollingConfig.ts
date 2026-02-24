/**
 * Sport-specific polling configuration for LIVE matches only.
 * Central, configurable file - not hardcoded in poller logic.
 *
 * Rules:
 * - Fast polling applies ONLY when match status is LIVE
 * - Fast polling applies ONLY for competitions with enable_live = true
 * - Usage tiers (70% / 85% / 95%) downgrade intervals when needed
 * - Max live matches per sport enforced; priority selects when limits exceeded
 *
 * API-Football / API-Sports support:
 * - Football: LIVE (fixtures?live=all)
 * - Basketball: LIVE (games by date, filter by status)
 * - Rugby: LIVE (games by date, filter by status)
 * - Tennis: NOT SUPPORTED by API-Football - LIVE polling disabled
 */

export type SportKey =
  | "football"
  | "tennis"
  | "basketball"
  | "rugby"
  | "ice_hockey"
  | "baseball";

/** LIVE statuses per sport - only these trigger fast polling */
export const SPORT_LIVE_STATUSES: Record<SportKey, readonly string[]> = {
  football: ["1H", "HT", "2H", "ET", "PEN", "PEN_LIVE"],
  tennis: ["LIVE", "IN_PLAY"], // NOT SUPPORTED by API-Football - kept for config
  basketball: ["Q1", "Q2", "Q3", "Q4", "OT"],
  rugby: ["1H", "HT", "2H", "BT", "ET", "PT"],
  ice_hockey: ["P1", "P2", "P3", "OT"],
  baseball: ["LIVE"], // Inning in progress
};

/** Base polling interval (ms) for LIVE matches - used when tier is normal */
export const SPORT_LIVE_INTERVALS_MS: Record<SportKey, number> = {
  football: 30 * 1000, // 30 seconds
  tennis: 15 * 1000, // 15 seconds
  basketball: 10 * 1000, // 10 seconds
  rugby: 30 * 1000, // 30 seconds
  ice_hockey: 15 * 1000, // 15 seconds
  baseball: 30 * 1000, // 30 seconds
};

/** Maximum simultaneous live matches to poll per sport (priority selects when exceeded) */
export const SPORT_MAX_LIVE_MATCHES: Record<SportKey, number> = {
  football: 25,
  tennis: 15,
  basketball: 15,
  rugby: 15,
  ice_hockey: 15,
  baseball: 15,
};

/** Tennis is NOT supported by API-Football - LIVE polling disabled for this sport */
export const TENNIS_LIVE_DISABLED = true;

/** Non-live: pre-match poll interval (ms) - 30-60 min or not at all */
export const PRE_MATCH_INTERVAL_MS = 45 * 60 * 1000; // 45 minutes

/** Post-match (FT): poll once, then stop */
export const POST_MATCH_POLL_ONCE = true;

/** Tier multiplier: base_interval * MULTIPLIER when over threshold */
export const TIER_INTERVAL_MULTIPLIERS = {
  normal: 1,
  tier70: 2,
  tier85: 3,
  tier95: Infinity, // stop
} as const;

export function getSportLiveIntervalMs(
  sport: SportKey,
  tier: "normal" | "tier70" | "tier85" | "tier95"
): number {
  const base = SPORT_LIVE_INTERVALS_MS[sport];
  const mult = TIER_INTERVAL_MULTIPLIERS[tier];
  return mult === Infinity ? Infinity : base * mult;
}

export function isLiveStatus(sport: SportKey, status: string): boolean {
  const statuses = SPORT_LIVE_STATUSES[sport];
  return statuses.includes(status);
}
