/** Sport identifier for multi-sport live polling */
export type LiveSportKey = "football" | "basketball" | "rugby";

/** Live match state stored in Redis/DB - used by poller and internal API */
export type LiveMatchState = {
  /** Unique ID: football uses raw id; basketball/rugby use encoded (1e9+id, 2e9+id) */
  fixture_id: number;
  status: string;
  minute: number | null;
  score_home: number;
  score_away: number;
  last_updated_at: string; // ISO 8601
  league_id?: number;
  /** Sport (optional for backward compat - football assumed if absent) */
  sport?: LiveSportKey;
};

/** Encode sport+id to globally unique fixture_id (avoids collision across sports) */
export const LIVE_ID_OFFSETS = {
  football: 0,
  basketball: 1_000_000_000,
  rugby: 2_000_000_000,
} as const;

export function encodeLiveFixtureId(sport: LiveSportKey, id: number): number {
  return LIVE_ID_OFFSETS[sport] + id;
}

export function decodeLiveFixtureId(fixtureId: number): {
  sport: LiveSportKey;
  id: number;
} {
  if (fixtureId >= LIVE_ID_OFFSETS.rugby)
    return { sport: "rugby", id: fixtureId - LIVE_ID_OFFSETS.rugby };
  if (fixtureId >= LIVE_ID_OFFSETS.basketball)
    return { sport: "basketball", id: fixtureId - LIVE_ID_OFFSETS.basketball };
  return { sport: "football", id: fixtureId };
}

/** API-Football raw fixture (relevant fields) */
export type ApiFootballLiveFixture = {
  fixture: {
    id: number;
    status: { short: string; elapsed: number | null };
  };
  league?: { id: number };
  goals: { home: number | null; away: number | null };
};

/** Live statuses we poll (excludes NS, FT, etc.) - football/soccer */
export const LIVE_STATUSES = ["1H", "HT", "2H", "ET", "PEN", "PEN_LIVE"] as const;

/** Minimal live match payload - API response and frontend typing */
export type LiveMatchPayload = {
  fixture_id: number;
  status: string;
  minute: number | null;
  score: { home: number; away: number };
  last_updated_at: string;
};

/** Map status short -> display label (football, basketball, rugby) */
export const STATUS_LABELS: Record<string, string> = {
  "1H": "First Half",
  HT: "Halftime",
  "2H": "Second Half",
  ET: "Extra Time",
  PEN: "Penalties",
  PEN_LIVE: "Penalties",
  Q1: "Q1",
  Q2: "Q2",
  Q3: "Q3",
  Q4: "Q4",
  OT: "Overtime",
  BT: "Break",
  PT: "Penalties",
};
