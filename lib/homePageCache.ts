/**
 * Cache Redis per dati home page.
 *
 * Strategia a due livelli:
 * 1. Cache principale (90s): dati freschi, riduce chiamate API.
 * 2. Cache "last known good" (6h): se API Football restituisce vuoto, mostriamo
 *    comunque i dati dell'ultimo aggiornamento riuscito invece di una pagina vuota.
 *
 * Con cron che fa warm ogni 2 min, i dati sono sempre pronti.
 */

import { getUpcomingFixtures } from "./apiFootball";
import { getPredictionsForFixtures } from "@/app/pronostici-quote/lib/apiFootball";
import { getQuotesForFixtures } from "./quotes/fixturesQuotes";
import { getLeagueIdsForAllSports } from "./homeMenuData";
import { isSportEnabledForCountry } from "./sportsPerCountryData";

const CACHE_TTL_SEC = 90;
const FALLBACK_TTL_SEC = 6 * 60 * 60; // 6 ore: dati da mostrare se API restituisce vuoto
const KEY_PREFIX = "home:data:";
const FALLBACK_KEY_PREFIX = "home:data:lastGood:";

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
  /** true quando API Football ha restituito vuoto e mostriamo l'ultimo import riuscito */
  usingFallback?: boolean;
};

async function fetchFreshData(country: string): Promise<CachedHomeData> {
  const leagueIds = getLeagueIdsForAllSports(country);
  const calcioEnabled = isSportEnabledForCountry(country, "calcio");

  let fixtures: any[] = [];
  if (calcioEnabled && leagueIds.length > 0) {
    try {
      fixtures = await getUpcomingFixtures(leagueIds);
      // Retry una volta se API restituisce vuoto (rate limit o fallimento transitorio)
      if (fixtures.length === 0) {
        await new Promise((r) => setTimeout(r, 1000));
        fixtures = await getUpcomingFixtures(leagueIds);
        if (fixtures.length > 0) {
          console.warn(`[homePageCache] Retry succeeded for ${country} (${fixtures.length} fixtures)`);
        }
      }
      // Fallback BR: se ancora vuoto, usa leghe IT (include 94, 140) e filtra per BR
      if (fixtures.length === 0 && country === "BR") {
        const itLeagueIds = getLeagueIdsForAllSports("IT");
        const brSet = new Set(leagueIds);
        const itFixtures = await getUpcomingFixtures(itLeagueIds);
        fixtures = itFixtures.filter((m: any) => brSet.has(m.league?.id));
        if (fixtures.length > 0) {
          console.warn(`[homePageCache] BR fallback: used IT fixtures filtered to BR leagues (${fixtures.length} fixtures)`);
        }
      }
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

  const fallbackKey = `${FALLBACK_KEY_PREFIX}${country}`;

  if (bypassCache && redis) {
    try {
      await redis.del(key);
      await redis.del(fallbackKey);
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
      if (data.fixtures.length > 0) {
        await redis.set(key, JSON.stringify(data), "EX", CACHE_TTL_SEC);
        await redis.set(fallbackKey, JSON.stringify(data), "EX", FALLBACK_TTL_SEC);
      } else {
        // API ha restituito vuoto: usa last known good se disponibile
        const fallbackRaw = await redis.get(fallbackKey);
        if (fallbackRaw) {
          const fallback = JSON.parse(fallbackRaw) as CachedHomeData;
          if (fallback?.fixtures?.length > 0 && fallback?.quotesMap && fallback?.predictionsMap) {
            console.warn(`[homePageCache] API returned empty for ${country}, using last known good (${fallback.fixtures.length} fixtures)`);
            const withFlag = { ...fallback, usingFallback: true };
            await redis.set(key, JSON.stringify(withFlag), "EX", CACHE_TTL_SEC);
            return withFlag;
          }
        }
        // Fallback BR: usa dati IT dalla cache se disponibili (filtra per leghe BR)
        if (country === "BR") {
          const itRaw = await redis.get(`${KEY_PREFIX}IT`);
          const itFallbackRaw = await redis.get(`${FALLBACK_KEY_PREFIX}IT`);
          const rawToUse = itRaw ?? itFallbackRaw;
          if (rawToUse) {
            const itData = JSON.parse(rawToUse) as CachedHomeData;
            const brLeagueIds = getLeagueIdsForAllSports("BR");
            const brSet = new Set(brLeagueIds);
            const filtered = (itData.fixtures ?? []).filter((m: any) => brSet.has(m.league?.id));
            if (filtered.length > 0) {
              const filteredIds = new Set(filtered.map((m: any) => m.fixture?.id).filter(Boolean));
              const predictionsMap: Record<number, unknown> = {};
              for (const [fid, p] of Object.entries(itData.predictionsMap ?? {})) {
                if (filteredIds.has(Number(fid))) predictionsMap[Number(fid)] = p;
              }
              let quotesMap: Record<number, import("./quotes/fixturesQuotes").FixtureQuoteSummary> = {};
              try {
                quotesMap = await getQuotesForFixtures(filtered, "BR");
              } catch {
                /* quote fetch opzionale */
              }
              console.warn(`[homePageCache] BR: using IT cache filtered to BR leagues (${filtered.length} fixtures)`);
              const withFlag: CachedHomeData = {
                fixtures: filtered,
                quotesMap,
                predictionsMap: predictionsMap as Record<number, import("@/app/pronostici-quote/lib/apiFootball").FixturePredictions>,
                fetchedAt: itData.fetchedAt,
                usingFallback: true,
              };
              await redis.set(key, JSON.stringify(withFlag), "EX", CACHE_TTL_SEC);
              return withFlag;
            }
          }
        }
        // Non memorizziamo vuoto in main: il prossimo request riproverà il fetch
      }
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
      const fallbackKeys = await redis.keys(`${FALLBACK_KEY_PREFIX}*`);
      if (keys.length > 0) await redis.del(...keys);
      if (fallbackKeys.length > 0) await redis.del(...fallbackKeys);
    } else {
      await redis.del(`${KEY_PREFIX}${country}`);
      await redis.del(`${FALLBACK_KEY_PREFIX}${country}`);
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
