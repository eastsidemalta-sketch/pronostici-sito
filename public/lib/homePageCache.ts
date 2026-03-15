/**
 * Cache Redis per dati home page.
 *
 * Architettura a pool globale:
 * 1. Un solo fetch API Football per tutte le leghe (union paesi attivi)
 * 2. Cache globale home:fixtures:global → tutti i paesi filtrano da qui
 * 3. Cache per-country home:data:${country} → dati derivati (fixtures filtrati + quote + predictions)
 * 4. Fallback generico: config cacheFallback (es. BR→IT) quando paese ha dati vuoti
 *
 * Aggiungere lega: leaguesConfig.globalLeagueIds + byCountry
 * Aggiungere paese: leaguesConfig.byCountry + cacheFallback (opzionale)
 */

import { getUpcomingFixtures } from "./apiFootball";
import { getPredictionsForFixtures } from "@/app/pronostici-quote/lib/apiFootball";
import { getQuotesForFixtures } from "./quotes/fixturesQuotes";
import { getLeagueIdsForAllSports } from "./homeMenuData";
import { isSportEnabledForCountry } from "./sportsPerCountryData";
import { getGlobalLeagueIds, getCacheFallbackCountries } from "./leaguesConfig";

const CACHE_TTL_SEC = 2100;
const FALLBACK_TTL_SEC = 12 * 60 * 60; // 12 ore: last known good
const GLOBAL_KEY = "home:fixtures:global";
const GLOBAL_FALLBACK_KEY = "home:fixtures:lastGood";
const KEY_PREFIX = "home:data:";
const FALLBACK_KEY_PREFIX = "home:data:lastGood:";

let redisClient: import("ioredis").default | null = null;

/** Cache in-memory quando Redis non disponibile (evita fetch multipli) */
let memoryGlobalCache: { fixtures: any[]; expires: number } | null = null;
const MEMORY_CACHE_TTL_MS = 30 * 60 * 1000;

function getRedis(): import("ioredis").default | null {
  if (redisClient) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require("ioredis").default;
    redisClient = new Redis(url, { maxRetriesPerRequest: 1 });
    return redisClient;
  } catch {
    return null;
  }
}

export type CachedHomeData = {
  fixtures: any[];
  quotesMap: Record<number, import("./quotes/fixturesQuotes").FixtureQuoteSummary>;
  predictionsMap: Record<number, import("@/app/pronostici-quote/lib/apiFootball").FixturePredictions>;
  fetchedAt: number;
  usingFallback?: boolean;
};

/** Fetch e cache del pool globale (union di tutte le leghe). */
async function fetchGlobalFixtures(bypassCache = false): Promise<any[]> {
  const redis = getRedis();
  if (redis && !bypassCache) {
    try {
      const raw = await redis.get(GLOBAL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { fixtures: any[] };
        if (parsed?.fixtures?.length > 0) return parsed.fixtures;
      }
    } catch {
      /* cache miss */
    }
  }

  if (!redis && !bypassCache && memoryGlobalCache && Date.now() < memoryGlobalCache.expires) {
    if (memoryGlobalCache.fixtures.length > 0) return memoryGlobalCache.fixtures;
  }

  const leagueIds = getGlobalLeagueIds();
  if (leagueIds.length === 0) return [];

  let fixtures: any[] = [];
  try {
    fixtures = await getUpcomingFixtures(leagueIds);
    if (fixtures.length === 0) {
      await new Promise((r) => setTimeout(r, 1000));
      fixtures = await getUpcomingFixtures(leagueIds);
      if (fixtures.length > 0) {
        console.warn(`[homePageCache] Global retry succeeded (${fixtures.length} fixtures)`);
      }
    }
  } catch (e) {
    console.error("[homePageCache] getUpcomingFixtures error:", e);
  }

  if (redis && fixtures.length > 0) {
    try {
      await redis.set(GLOBAL_KEY, JSON.stringify({ fixtures, fetchedAt: Date.now() }), "EX", CACHE_TTL_SEC);
      await redis.set(GLOBAL_FALLBACK_KEY, JSON.stringify({ fixtures, fetchedAt: Date.now() }), "EX", FALLBACK_TTL_SEC);
    } catch {
      /* ignore */
    }
  }

  if (!redis && fixtures.length > 0) {
    memoryGlobalCache = { fixtures, expires: Date.now() + MEMORY_CACHE_TTL_MS };
  }

  return fixtures;
}

/** Costruisce dati per un paese: filtra fixtures globali, fetch quote e predictions. */
async function buildCountryData(
  country: string,
  fixtures: any[],
  leagueIds: number[],
  limitQuotes: boolean = false
): Promise<CachedHomeData> {
  const filtered = fixtures.filter((m: any) => leagueIds.includes(m.league?.id));
  let quotesMap: Record<number, import("./quotes/fixturesQuotes").FixtureQuoteSummary> = {};
  let predictionsMap: Record<number, import("@/app/pronostici-quote/lib/apiFootball").FixturePredictions> = {};

  if (filtered.length > 0) {
    try {
      // If triggered by a user request, slice to 15 to prevent blocking.
      // If triggered by Cron, process all matches.
      const fixturesToProcess = limitQuotes ? filtered.slice(0, 15) : filtered;

      [quotesMap, predictionsMap] = await Promise.all([
        getQuotesForFixtures(fixturesToProcess, country),
        getPredictionsForFixtures(fixturesToProcess.map((m: any) => m.fixture.id)),
      ]);
    } catch {
      /* quote/predictions possono fallire */
    }
  }

  return {
    fixtures: filtered, // Always return ALL fixtures so schedule remains intact
    quotesMap,
    predictionsMap,
    fetchedAt: Date.now(),
  };
}

/** Prova fallback da altri paesi (config cacheFallback). */
async function tryFallbackFromOtherCountries(
  country: string,
  leagueIds: number[]
): Promise<CachedHomeData | null> {
  const redis = getRedis();
  if (!redis) return null;

  const fallbackCountries = getCacheFallbackCountries(country);
  for (const fallbackCountry of fallbackCountries) {
    try {
      const raw = await redis.get(`${KEY_PREFIX}${fallbackCountry}`);
      const fallbackRaw = raw ?? (await redis.get(`${FALLBACK_KEY_PREFIX}${fallbackCountry}`));
      if (!fallbackRaw) continue;

      const otherData = JSON.parse(fallbackRaw) as CachedHomeData;
      const otherFixtures = otherData.fixtures ?? [];
      if (otherFixtures.length === 0) continue;

      const leagueSet = new Set(leagueIds);
      const filtered = otherFixtures.filter((m: any) => leagueSet.has(m.league?.id));
      if (filtered.length === 0) continue;

      const filteredIds = new Set(filtered.map((m: any) => m.fixture?.id).filter(Boolean));
      const predictionsMap: Record<number, unknown> = {};
      for (const [fid, p] of Object.entries(otherData.predictionsMap ?? {})) {
        if (filteredIds.has(Number(fid))) predictionsMap[Number(fid)] = p;
      }

      let quotesMap: Record<number, import("./quotes/fixturesQuotes").FixtureQuoteSummary> = {};
      try {
        quotesMap = await getQuotesForFixtures(filtered, country);
      } catch {
        /* opzionale */
      }

      console.warn(`[homePageCache] ${country}: using ${fallbackCountry} cache filtered (${filtered.length} fixtures)`);
      return {
        fixtures: filtered,
        quotesMap,
        predictionsMap: predictionsMap as Record<number, import("@/app/pronostici-quote/lib/apiFootball").FixturePredictions>,
        fetchedAt: otherData.fetchedAt,
        usingFallback: true,
      };
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Ottiene i dati home: da cache Redis se disponibili, altrimenti deriva dal pool globale.
 * @param bypassCache - se true, ignora la cache e fetch sempre dati freschi
 * @param isBackgroundCron - se true, processa tutte le quote; se false (live user), limita a 15
 */
export async function getCachedHomeData(
  country: string,
  bypassCache = false,
  isBackgroundCron = false
): Promise<CachedHomeData> {
  const redis = getRedis();
  const key = `${KEY_PREFIX}${country}`;
  const fallbackKey = `${FALLBACK_KEY_PREFIX}${country}`;

  if (bypassCache && redis) {
    try {
      await redis.del(key);
      await redis.del(fallbackKey);
      await redis.del(GLOBAL_KEY);
    } catch {
      /* ignore */
    }
  }

  const leagueIds = getLeagueIdsForAllSports(country);
  const calcioEnabled = isSportEnabledForCountry(country, "calcio");

  if (!calcioEnabled || leagueIds.length === 0) {
    return { fixtures: [], quotesMap: {}, predictionsMap: {}, fetchedAt: Date.now() };
  }

  if (redis && !bypassCache) {
    try {
      const raw = await redis.get(key);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedHomeData;
        if (parsed?.fixtures?.length > 0 && parsed?.quotesMap && parsed?.predictionsMap) {
          return parsed;
        }
      }
    } catch {
      /* cache miss */
    }
  }

  let globalFixtures = await fetchGlobalFixtures(bypassCache);

  if (globalFixtures.length === 0 && redis) {
    try {
      const fallbackRaw = await redis.get(GLOBAL_FALLBACK_KEY);
      if (fallbackRaw) {
        const parsed = JSON.parse(fallbackRaw) as { fixtures: any[] };
        if (parsed?.fixtures?.length > 0) {
          console.warn(`[homePageCache] Global empty, using last known good (${parsed.fixtures.length} fixtures)`);
          globalFixtures = parsed.fixtures;
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Pass !isBackgroundCron so live users trigger the 15-match limit
  let data = await buildCountryData(country, globalFixtures, leagueIds, !isBackgroundCron);

  if (data.fixtures.length === 0) {
    const fallbackData = await tryFallbackFromOtherCountries(country, leagueIds);
    if (fallbackData) {
      data = fallbackData;
    } else if (!redis) {
      const fallbackCountries = getCacheFallbackCountries(country);
      const leagueSet = new Set(leagueIds);
      for (const fc of fallbackCountries) {
        const fcLeagueIds = getLeagueIdsForAllSports(fc);
        if (fcLeagueIds.length === 0) continue;
        try {
          const fcFixtures = await getUpcomingFixtures(fcLeagueIds);
          const filtered = fcFixtures.filter((m: any) => leagueSet.has(m.league?.id));
          if (filtered.length > 0) {
            data = await buildCountryData(country, filtered, leagueIds, !isBackgroundCron);
            console.warn(`[homePageCache] ${country}: no Redis, used ${fc} fetch (${filtered.length} fixtures)`);
            break;
          }
        } catch {
          continue;
        }
      }
    }
  }

  if (data.fixtures.length === 0 && redis) {
    try {
      const countryFallbackRaw = await redis.get(fallbackKey);
      if (countryFallbackRaw) {
        const countryFallback = JSON.parse(countryFallbackRaw) as CachedHomeData;
        if (countryFallback?.fixtures?.length > 0 && countryFallback?.quotesMap && countryFallback?.predictionsMap) {
          console.warn(`[homePageCache] ${country}: using last known good (${countryFallback.fixtures.length} fixtures)`);
          return { ...countryFallback, usingFallback: true };
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (redis && data.fixtures.length > 0) {
    try {
      await redis.set(key, JSON.stringify(data), "EX", CACHE_TTL_SEC);
      await redis.set(fallbackKey, JSON.stringify(data), "EX", FALLBACK_TTL_SEC);
    } catch {
      /* ignore */
    }
  }

  return data;
}

/**
 * Invalida la cache. country="*" invalida tutto (globale + tutti i paesi).
 */
export async function invalidateHomeCache(country: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    if (country === "*") {
      await redis.del(GLOBAL_KEY);
      await redis.del(GLOBAL_FALLBACK_KEY);
      const keys = await redis.keys(`${KEY_PREFIX}*`);
      const fallbackKeys = await redis.keys(`${FALLBACK_KEY_PREFIX}*`);
      if (keys.length > 0) await redis.del(...keys);
      if (fallbackKeys.length > 0) await redis.del(...fallbackKeys);
    } else {
      await redis.del(`${KEY_PREFIX}${country}`);
      await redis.del(`${FALLBACK_KEY_PREFIX}${country}`);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Pre-popola la cache. Un solo fetch globale, poi deriva per ogni paese.
 * Uses bypassCache=true and isBackgroundCron=true so all quotes are processed.
 */
export async function warmHomePageCache(countries: string[]): Promise<void> {
  if (countries.length === 0) return;

  try {
    const globalFixtures = await fetchGlobalFixtures(true); // force fresh global
    if (globalFixtures.length === 0) {
      console.warn("[homePageCache] Warm: global fixtures empty");
    }

    for (const country of countries) {
      try {
        await getCachedHomeData(country, true, true);
      } catch (e) {
        console.error(`[homePageCache] warm ${country} error:`, e);
      }
    }
  } catch (e) {
    console.error("[homePageCache] warm error:", e);
  }
}
