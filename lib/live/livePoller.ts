import {
  fetchLiveFixturesFromApi,
  toLiveMatchState,
} from "./apiFootballLive";
import { fetchLiveBasketballGames } from "./apiBasketballLive";
import { fetchLiveRugbyGames } from "./apiRugbyLive";
import {
  setLiveMatches,
  getAllLiveMatches,
  removeLiveMatches,
} from "./liveMatchStore";
import {
  getMonthlyCount,
  getHourlyCount,
  getDailyCount,
  getLastPollTime,
  setLastPollTime,
  incrementApiUsage,
} from "./usageStore";
import {
  LIVE_POLLING_DISABLED,
  MONTHLY_BUDGET,
  getUsageTier,
  getPollIntervalMs,
  type UsageTier,
} from "./pollingConfig";
import {
  getSportLiveIntervalMs,
  SPORT_MAX_LIVE_MATCHES,
  isLiveStatus,
  type SportKey,
} from "./sportPollingConfig";
import {
  isLiveEnabledForLeague,
  getLeaguePriority,
} from "./liveLeaguesConfig";
import { liveLog } from "./liveLogger";
import type { LiveMatchState, LiveSportKey } from "./types";

let lastKnownTier: UsageTier = "normal";

/** Compare two states - true if identical */
function stateEquals(a: LiveMatchState, b: LiveMatchState): boolean {
  return (
    a.fixture_id === b.fixture_id &&
    a.status === b.status &&
    a.minute === b.minute &&
    a.score_home === b.score_home &&
    a.score_away === b.score_away
  );
}

/** Run one poll cycle: fetch from API, update store. Respects kill switch and usage tiers. */
export async function runLivePollCycle(): Promise<{
  updated: number;
  removed: number;
  error?: string;
  tier?: UsageTier;
  skipped?: boolean;
}> {
  if (LIVE_POLLING_DISABLED) {
    liveLog.killSwitchActive();
    return { updated: 0, removed: 0, skipped: true };
  }

  const monthlyUsed = await getMonthlyCount();
  const tier = getUsageTier(monthlyUsed);
  const intervalMs = getPollIntervalMs(tier);

  if (tier === "tier95") {
    liveLog.pollSkip("budget_exceeded_95", {
      tier,
      monthlyUsed,
      budget: MONTHLY_BUDGET,
      pct: Math.round((monthlyUsed / MONTHLY_BUDGET) * 100),
    });
    return { updated: 0, removed: 0, tier, skipped: true };
  }

  const lastPoll = await getLastPollTime();
  if (lastPoll) {
    const elapsed = Date.now() - new Date(lastPoll).getTime();
    if (elapsed < intervalMs) {
      liveLog.pollSkip("interval_not_elapsed", {
        elapsed,
        required: intervalMs,
        tier,
      });
      return { updated: 0, removed: 0, tier, skipped: true };
    }
  }

  if (tier !== lastKnownTier && lastKnownTier !== "normal") {
    liveLog.downgrade(lastKnownTier, tier, intervalMs);
  }
  if (tier !== lastKnownTier) {
    const pct = Math.round((monthlyUsed / MONTHLY_BUDGET) * 100);
    if (pct >= 70) {
      liveLog.thresholdCrossed(tier, monthlyUsed, MONTHLY_BUDGET, pct);
    }
  }
  lastKnownTier = tier;

  liveLog.pollStart(tier);

  try {
    const [footballRaw, basketballRaw, rugbyRaw] = await Promise.all([
      fetchLiveFixturesFromApi(),
      fetchLiveBasketballGames(),
      fetchLiveRugbyGames(),
    ]);
    await Promise.all([
      incrementApiUsage(),
      incrementApiUsage(),
      incrementApiUsage(),
    ]);
    await setLastPollTime(new Date().toISOString());

    const footballStates = footballRaw.map(toLiveMatchState);
    const allStates: LiveMatchState[] = [
      ...footballStates,
      ...basketballRaw,
      ...rugbyRaw,
    ];

    function filterAndLimit(
      states: LiveMatchState[],
      sport: SportKey,
      sportKey: LiveSportKey
    ): LiveMatchState[] {
      const eligible = states.filter(
        (s) =>
          s.sport === sportKey &&
          isLiveStatus(sport, s.status) &&
          isLiveEnabledForLeague(s.league_id, sportKey)
      );
      const maxLive = SPORT_MAX_LIVE_MATCHES[sport];
      const sorted = [...eligible].sort(
        (a, b) =>
          getLeaguePriority(a.league_id, sportKey) -
          getLeaguePriority(b.league_id, sportKey)
      );
      return sorted.slice(0, maxLive);
    }

    const footballFiltered = filterAndLimit(
      footballStates,
      "football",
      "football"
    );
    const basketballFiltered = filterAndLimit(
      basketballRaw,
      "basketball",
      "basketball"
    );
    const rugbyFiltered = filterAndLimit(rugbyRaw, "rugby", "rugby");

    const states: LiveMatchState[] = [
      ...footballFiltered,
      ...basketballFiltered,
      ...rugbyFiltered,
    ];

    const existing = await getAllLiveMatches();
    const existingMap = new Map(existing.map((m) => [m.fixture_id, m]));

    // Only update matches that changed
    const toWrite: LiveMatchState[] = [];
    for (const s of states) {
      const ex = existingMap.get(s.fixture_id);
      if (!ex || !stateEquals(ex, s)) {
        toWrite.push(s);
      }
    }

    if (toWrite.length > 0) {
      await setLiveMatches(toWrite);
    }

    const currentIds = new Set(states.map((s) => s.fixture_id));
    const toRemove = existing
      .filter((m) => !currentIds.has(m.fixture_id))
      .map((m) => m.fixture_id);
    if (toRemove.length > 0) {
      await removeLiveMatches(toRemove);
    }

    const updated = toWrite.length;
    const newMonthly = monthlyUsed + 3; // 3 API calls per cycle (football, basketball, rugby)
    const [hourly, daily] = await Promise.all([
      getHourlyCount(),
      getDailyCount(),
    ]);

    liveLog.pollSuccess(updated, toRemove.length, newMonthly, tier);
    liveLog.usageSnapshot(hourly, daily, newMonthly, MONTHLY_BUDGET);

    return {
      updated,
      removed: toRemove.length,
      tier,
    };
  } catch (err) {
    liveLog.pollError(err);
    return {
      updated: 0,
      removed: 0,
      error: String(err),
      tier,
    };
  }
}

const DEFAULT_INTERVAL_MS = 30 * 1000; // Football base: 30s

/** Start background poller (for long-running processes). Uses sport-specific intervals. */
export function startLivePoller(): () => void {
  let cancelled = false;

  const tick = async () => {
    if (cancelled) return;
    try {
      const result = await runLivePollCycle();
      const intervalMs =
        result.tier && result.skipped === false
          ? getPollIntervalMs(result.tier)
          : DEFAULT_INTERVAL_MS;
      const next =
        result.tier === "tier95"
          ? 60 * 60 * 1000
          : Math.min(intervalMs, 60 * 60 * 1000);
      if (!cancelled) setTimeout(tick, next);
    } catch (err) {
      liveLog.pollError(err);
      if (!cancelled) setTimeout(tick, DEFAULT_INTERVAL_MS);
    }
  };

  void tick();

  return () => {
    cancelled = true;
  };
}
