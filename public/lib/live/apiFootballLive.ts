import type { ApiFootballLiveFixture, LiveMatchState } from "./types";
import { LIVE_STATUSES } from "./types";

/** Fetch all live fixtures from API-Football (fixtures?live=all) */
export async function fetchLiveFixturesFromApi(): Promise<ApiFootballLiveFixture[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    console.warn("[live-poller] API_FOOTBALL_KEY missing");
    return [];
  }

  const url = "https://v3.football.api-sports.io/fixtures?live=all";
  const res = await fetch(url, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });

  if (!res.ok) {
    console.warn(`[live-poller] API-Football error ${res.status}: ${await res.text()}`);
    return [];
  }

  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    console.warn("[live-poller] API errors:", data.errors);
  }

  const raw = data.response as ApiFootballLiveFixture[] | undefined;
  if (!Array.isArray(raw)) return [];

  const statusSet = new Set(LIVE_STATUSES);
  return raw.filter((m) => statusSet.has(m.fixture?.status?.short as (typeof LIVE_STATUSES)[number]));
}

/** Convert API response to LiveMatchState */
export function toLiveMatchState(m: ApiFootballLiveFixture): LiveMatchState {
  return {
    fixture_id: m.fixture.id,
    status: m.fixture.status?.short ?? "",
    minute: m.fixture.status?.elapsed ?? null,
    score_home: m.goals?.home ?? 0,
    score_away: m.goals?.away ?? 0,
    last_updated_at: new Date().toISOString(),
    league_id: m.league?.id,
    sport: "football",
  };
}
