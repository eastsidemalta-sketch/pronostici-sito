/**
 * API-Sports Basketball LIVE games fetcher.
 * Endpoint: https://v1.basketball.api-sports.io/games
 *
 * No live=all parameter - fetch by date and filter by LIVE status.
 * LIVE statuses: Q1, Q2, Q3, Q4, OT (HT, BT for halftime/break)
 */

import type { LiveMatchState } from "./types";
import { encodeLiveFixtureId } from "./types";
import { SPORT_LIVE_STATUSES } from "./sportPollingConfig";

type ApiBasketballGame = {
  id: number;
  status?: { short?: string; timer?: string | null };
  league?: { id: number };
  scores?: {
    home?: { total?: number | null };
    away?: { total?: number | null };
  };
};

function formatDateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Fetch live basketball games from API-Sports (games by date, filter by status) */
export async function fetchLiveBasketballGames(): Promise<LiveMatchState[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    return [];
  }

  const today = formatDateUTC(new Date());
  const url = `https://v1.basketball.api-sports.io/games?date=${today}`;

  const res = await fetch(url, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });

  if (!res.ok) {
    console.warn(
      `[live-poller] API-Basketball error ${res.status}: ${await res.text()}`
    );
    return [];
  }

  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    console.warn("[live-poller] API-Basketball errors:", data.errors);
  }

  const raw = data.response as ApiBasketballGame[] | undefined;
  if (!Array.isArray(raw)) return [];

  const liveStatuses = new Set(SPORT_LIVE_STATUSES.basketball);
  const results: LiveMatchState[] = [];

  for (const g of raw) {
    const status = g.status?.short ?? "";
    if (!liveStatuses.has(status)) continue;

    const scoreHome = g.scores?.home?.total ?? 0;
    const scoreAway = g.scores?.away?.total ?? 0;
    const timer = g.status?.timer;
    const minute = timer ? parseTimerToMinute(timer) : null;

    results.push({
      fixture_id: encodeLiveFixtureId("basketball", g.id),
      status,
      minute,
      score_home: scoreHome,
      score_away: scoreAway,
      last_updated_at: new Date().toISOString(),
      league_id: g.league?.id,
      sport: "basketball",
    });
  }

  return results;
}

/** Parse basketball timer (e.g. "5:23" or "12:00") to approximate minute */
function parseTimerToMinute(timer: string): number | null {
  const m = timer.match(/^(\d+):(\d+)$/);
  if (!m) return null;
  const mins = parseInt(m[1], 10);
  const secs = parseInt(m[2], 10);
  if (Number.isNaN(mins) || Number.isNaN(secs)) return null;
  return mins;
}
