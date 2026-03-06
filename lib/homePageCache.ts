/**
 * Cache Redis per dati home page.
 * TTL 90 sec: riduce chiamate API, pagina veloce anche con 0 utenti.
 * Con cron che fa warm ogni 2 min, i dati sono sempre pronti.
 */

import { getUpcomingFixtures } from "./apiFootball";
import { getPredictionsForFixtures } from "@/app/pronostici-quote/lib/apiFootball";
import { getQuotesForFixtures } from "./quotes/fixturesQuotes";
import { getLeagueIdsForAllSports } from "./homeMenuData";
import { isSportEnabledForCountry } from "./sportsPerCountryData";

const CACHE_TTL_SEC = 90;
const KEY_PREFIX = "home:data:";

let redisClient: import("ioredis").default | null = null;

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
};

async function fetchFreshData(country: string): Promise<CachedHomeData> {
  const leagueIds = getLeagueIdsForAllSports(country);
  const calcioEnabled = isSportEnabledForCountry(country, "calcio");

  let fixtures: any[] = [];
  if (calcioEnabled && leagueIds.length > 0) {
    try {
      fixtures = await getUpcomingFixtures(leagueIds);
    } catch (e) {
      console.error("[homePageCache] getUpcomingFixtures error:", e);
    }
  }

  let quotesMap: Record<number, import("./quotes/fixturesQuotes").FixtureQuoteSummary> = {};
  let predictionsMap: Record<number, import("@/app/pronostici-quote/lib/apiFootball").FixturePredictions> = {};
  if (fixtures.length > 0) {
    try {
      [quotesMap, predictionsMap] = await Promise.all([
        getQuotesForFixtures(fixtures, country),
        getPredictionsForFixtures(fixtures.map((m: any) => m.fixture.id)),
      ]);
    } catch {
      // Quote API può fallire
    }
  }

  return {
    fixtures,
    quotesMap,
    predictionsMap,
    fetchedAt: Date.now(),
  };
}

/**
 * Ottiene i dati home: da cache Redis se disponibili, altrimenti fetch e cache.
 * @param bypassCache - se true, ignora la cache e fetch sempre dati freschi
 */
export async function getCachedHomeData(
  country: string,
  bypassCache = false
): Promise<CachedHomeData> {
  const redis = getRedis();
  const key = `${KEY_PREFIX}${country}`;

  if (bypassCache && redis) {
    try {
      await redis.del(key);
    } catch {
      // Ignora
    }
  }

  if (redis && !bypassCache) {
    try {
      const raw = await redis.get(key);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedHomeData;
        // Usa cache solo se ha partite: evita di servire dati vuoti per 90s (es. API down al warm)
        if (parsed?.fixtures?.length > 0 && parsed?.quotesMap && parsed?.predictionsMap) {
          return parsed;
        }
      }
    } catch {
      // Cache miss o errore → fetch
    }
  }

  const data = await fetchFreshData(country);

  if (redis) {
    try {
      await redis.set(key, JSON.stringify(data), "EX", CACHE_TTL_SEC);
    } catch {
      // Ignora errori scrittura cache
    }
  }

  return data;
}

/**
 * Invalida la cache per un paese (o tutti se country === "*").
 * Utile per debug o dopo deploy quando la cache potrebbe essere stale.
 */
export async function invalidateHomeCache(country: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    if (country === "*") {
      const keys = await redis.keys(`${KEY_PREFIX}*`);
      if (keys.length > 0) await redis.del(...keys);
    } else {
      await redis.del(`${KEY_PREFIX}${country}`);
    }
  } catch {
    // Ignora errori
  }
}

/**
 * Pre-popola la cache (chiamato da cron). Così quando arriva un utente i dati sono già pronti.
 */
export async function warmHomePageCache(countries: string[]): Promise<void> {
  for (const country of countries) {
    try {
      await getCachedHomeData(country);
    } catch (e) {
      console.error(`[homePageCache] warm ${country} error:`, e);
    }
  }
}
