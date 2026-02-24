/**
 * API-Sports Rugby LIVE games fetcher.
 * Endpoint: https://v1.rugby.api-sports.io/games
 *
 * No live=all parameter - fetch by date and filter by LIVE status.
 * LIVE statuses: 1H, HT, 2H, BT, ET, PT
 */

import type { LiveMatchState } from "./types";
import { encodeLiveFixtureId } from "./types";
import { SPORT_LIVE_STATUSES } from "./sportPollingConfig";

type ApiRugbyGame = {
  id: number;
  status?: { short?: string };
  league?: { id: number };
  scores?: { home?: number; away?: number };
  periods?: {
    first?: { home?: number; away?: number };
    second?: { home?: number; away?: number };
  };
};

function formatDateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Fetch live rugby games from API-Sports (games by date, filter by status) */
export async function fetchLiveRugbyGames(): Promise<LiveMatchState[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    return [];
  }

  const today = formatDateUTC(new Date());
  const url = `https://v1.rugby.api-sports.io/games?date=${today}`;

  const res = await fetch(url, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });

  if (!res.ok) {
    console.warn(
      `[live-poller] API-Rugby error ${res.status}: ${await res.text()}`
    );
    return [];
  }

  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    console.warn("[live-poller] API-Rugby errors:", data.errors);
  }

  const raw = data.response as ApiRugbyGame[] | undefined;
  if (!Array.isArray(raw)) return [];

  const liveStatuses = new Set(SPORT_LIVE_STATUSES.rugby);
  const results: LiveMatchState[] = [];

  for (const g of raw) {
    const status = g.status?.short ?? "";
    if (!liveStatuses.has(status)) continue;

    const scoreHome = g.scores?.home ?? 0;
    const scoreAway = g.scores?.away ?? 0;
    // Rugby doesn't provide elapsed minute in standard response - use null
    const minute = null;

    results.push({
      fixture_id: encodeLiveFixtureId("rugby", g.id),
      status,
      minute,
      score_home: scoreHome,
      score_away: scoreAway,
      last_updated_at: new Date().toISOString(),
      league_id: g.league?.id,
      sport: "rugby",
    });
  }

  return results;
}
