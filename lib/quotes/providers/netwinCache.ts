/**
 * Cache per Netwin (IT-0002): FULL ogni 3h, DELTA per le altre richieste.
 * FULL = dati completi (bloccata: max 1 ogni 3 ore).
 * DELTA = solo quote modificate, max 1 ogni 10 secondi.
 *
 * Regole API Netwin:
 * - FULL: può essere fatta solo ogni 3 ore
 * - DELTA: può essere fatta ogni 10 secondi, restituisce le quote modificate
 *
 * Cache su Redis: condivisa tra worker/processi. Fallback in-memory se Redis non disponibile.
 */
import { existsSync, mkdirSync, appendFileSync, readFileSync } from "fs";
import type { DirectMultiMarketResult, DirectQuote } from "./directBookmakerFetcher";

const FULL_FETCH_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 ore (limite Netwin)
const DELTA_MIN_INTERVAL_MS = 10 * 1000; // 10 secondi tra una DELTA e l'altra (limite Netwin)
const FULL_LOG_MAX_ENTRIES = 500; // retention log FULL su Redis (circa 7 giorni se 1 entry/20 min)

const REDIS_NETWIN_DATA = "netwin:cache:data";
const REDIS_NETWIN_STATE = "netwin:cache:state"; // { timestamp, lastDeltaCallAt }
const REDIS_NETWIN_FULL_LOG = "netwin:cache:full_log";
const FULL_LOG_FILE = "data/netwin-full.log";

// --- Redis client condiviso ---
let redisClient: import("ioredis").default | null = null;

export function getRedis(): import("ioredis").default | null {
  if (redisClient) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    const Redis = require("ioredis").default;
    redisClient = new Redis(url, { maxRetriesPerRequest: 1 });
    return redisClient;
  } catch {
    return null;
  }
}

// --- Fallback in-memory (quando Redis non c'è) ---
let memCache: { data: DirectMultiMarketResult; timestamp: number } | null = null;
let memLastDeltaCallAt: number | null = null;

function quoteKey(q: { homeTeam: string; awayTeam: string }): string {
  return `${(q.homeTeam || "").toLowerCase().trim()}|${(q.awayTeam || "").toLowerCase().trim()}`;
}

function mergeQuotes(base: DirectQuote[], updates: DirectQuote[]): DirectQuote[] {
  const map = new Map<string, DirectQuote>();
  for (const q of base) map.set(quoteKey(q), q);
  for (const q of updates) map.set(quoteKey(q), q);
  return Array.from(map.values());
}

function mergeMarketResults(
  full: DirectMultiMarketResult,
  delta: DirectMultiMarketResult
): DirectMultiMarketResult {
  const result: DirectMultiMarketResult = {};
  const keys: (keyof DirectMultiMarketResult)[] = [
    "h2h",
    "spreads",
    "totals_25",
    "totals_15",
    "btts",
    "double_chance",
    "draw_no_bet",
    "h2h_3_way_h1",
  ];
  for (const k of keys) {
    const fullArr = full[k] ?? [];
    const deltaArr = delta[k] ?? [];
    if (deltaArr.length > 0) {
      result[k] = mergeQuotes(fullArr, deltaArr);
    } else {
      result[k] = fullArr;
    }
  }
  return result;
}

/** Solo IT-0002 usa le API Netwin (cache FULL/DELTA, ecc.). */
export function isNetwinBookmaker(siteId?: string, _id?: string): boolean {
  return (siteId || "").toUpperCase() === "IT-0002";
}

// --- Gestione cache (Redis + fallback memoria) ---

export async function shouldUseFull(): Promise<boolean> {
  const redis = getRedis();
  let ts = 0;
  if (redis) {
    try {
      const stateRaw = await redis.get(REDIS_NETWIN_STATE);
      if (stateRaw) ts = (JSON.parse(stateRaw) as { timestamp?: number }).timestamp ?? 0;
    } catch {
      // ignore
    }
  } else if (memCache) {
    ts = memCache.timestamp;
  }
  return ts === 0 || Date.now() - ts > FULL_FETCH_INTERVAL_MS;
}

/** true se possiamo fare una chiamata DELTA (rispetta intervallo 10 sec) */
export async function canDoDelta(): Promise<boolean> {
  const redis = getRedis();
  let lastD = 0;
  if (redis) {
    try {
      const stateRaw = await redis.get(REDIS_NETWIN_STATE);
      if (stateRaw) lastD = (JSON.parse(stateRaw) as { lastDeltaCallAt?: number }).lastDeltaCallAt ?? 0;
    } catch {
      // ignore
    }
  } else {
    lastD = memLastDeltaCallAt ?? 0;
  }
  return lastD === 0 || Date.now() - lastD >= DELTA_MIN_INTERVAL_MS;
}

export async function recordDeltaCall(): Promise<void> {
  const now = Date.now();
  memLastDeltaCallAt = now;
  const redis = getRedis();
  if (redis) {
    try {
      const stateRaw = await redis.get(REDIS_NETWIN_STATE);
      const state = stateRaw ? (JSON.parse(stateRaw) as { timestamp?: number; lastDeltaCallAt?: number }) : { timestamp: 0 };
      state.lastDeltaCallAt = now;
      await redis.set(REDIS_NETWIN_STATE, JSON.stringify(state));
    } catch {
      // ignore
    }
  }
}

export async function getCached(ignoreExpiry = false): Promise<DirectMultiMarketResult | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const dataRaw = await redis.get(REDIS_NETWIN_DATA);
      const stateRaw = await redis.get(REDIS_NETWIN_STATE);
      if (dataRaw && stateRaw) {
        const data = JSON.parse(dataRaw) as DirectMultiMarketResult;
        const state = JSON.parse(stateRaw) as { timestamp?: number };
        const ts = state.timestamp ?? 0;
        if (ignoreExpiry || Date.now() - ts <= FULL_FETCH_INTERVAL_MS) return data;
      }
    } catch {
      // ignore
    }
  }
  if (memCache && (ignoreExpiry || Date.now() - memCache.timestamp <= FULL_FETCH_INTERVAL_MS)) {
    return memCache.data;
  }
  return null;
}

export async function setCache(data: DirectMultiMarketResult): Promise<void> {
  const timestamp = Date.now();
  memCache = { data, timestamp };
  memLastDeltaCallAt = null;
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(REDIS_NETWIN_DATA, JSON.stringify(data));
      await redis.set(REDIS_NETWIN_STATE, JSON.stringify({ timestamp, lastDeltaCallAt: null }));
    } catch {
      // ignore
    }
  }
}

export async function mergeDeltaWithCache(delta: DirectMultiMarketResult): Promise<DirectMultiMarketResult> {
  const full = await getCached();
  if (!full) return delta;
  return mergeMarketResults(full, delta);
}

// --- Log FULL (Redis list) ---

export async function logFullAttempt(
  success: boolean,
  details: { url?: string; h2hCount?: number; eventsExtracted?: number; error?: string; errorRaw?: string }
): Promise<void> {
  const timestamp = Date.now();
  const entry: Record<string, unknown> = {
    timestamp,
    iso: new Date(timestamp).toISOString(),
    success,
    ...(details.url && { url: details.url }),
    ...(success && details.h2hCount != null && { h2hCount: details.h2hCount }),
    ...(success && details.h2hCount === 0 && details.eventsExtracted != null && { eventsExtracted: details.eventsExtracted }),
    ...(!success && details.error && { error: details.error }),
    ...(!success && details.errorRaw && { errorRaw: details.errorRaw }),
  };
  const redis = getRedis();
  if (redis) {
    try {
      await redis.lpush(REDIS_NETWIN_FULL_LOG, JSON.stringify(entry));
      await redis.ltrim(REDIS_NETWIN_FULL_LOG, 0, FULL_LOG_MAX_ENTRIES - 1);
    } catch {
      // ignore
    }
  }
}

/** Legge il log FULL da file (per debug/report). Ultime N ore. */
export function getNetwinFullLogFromRedis(hours: number = 24): any[] {
  try {
    if (existsSync(FULL_LOG_FILE)) {
      const content = readFileSync(FULL_LOG_FILE, "utf-8");

      const cutoffTime = Date.now() - hours * 60 * 60 * 1000;

      return content
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line))
        .filter((entry) => entry.timestamp && entry.timestamp >= cutoffTime)
        .reverse()
        .slice(0, 100); // Keep max 100 entries to prevent memory overload
    }
  } catch {
    // Return empty array if file does not exist or cannot be read
  }
  return [];
}

// --- Debug / utility ---

export async function getCachedMatchSample(
  limit = 50
): Promise<Array<{ homeTeam: string; awayTeam: string; manifestazione?: string }>> {
  const c = await getCached();
  const h2h = c?.h2h ?? [];
  const max = limit <= 0 ? h2h.length : Math.min(limit, h2h.length);
  return h2h.slice(0, max).map((q) => ({
    homeTeam: q.homeTeam ?? "",
    awayTeam: q.awayTeam ?? "",
    manifestazione: (q as { manifestazione?: string }).manifestazione,
  }));
}


export type CacheDebugInfo = {
  hasCache: boolean;
  lastFullTimestamp: number | null;
  lastFullIso: string | null;
  nextFullAllowedAt: number | null;
  nextFullAllowedIso: string | null;
  h2hCount: number;
  shouldUseFull: boolean;
  cacheSource: "redis" | "memory" | "none";
};

export async function getCacheDebugInfo(): Promise<CacheDebugInfo> {
  const redis = getRedis();
  let data: { data: DirectMultiMarketResult; timestamp: number } | null = null;
  let cacheSource: "redis" | "memory" | "none" = "none";

  if (redis) {
    try {
      const dataRaw = await redis.get(REDIS_NETWIN_DATA);
      const stateRaw = await redis.get(REDIS_NETWIN_STATE);
      if (dataRaw && stateRaw) {
        const parsedData = JSON.parse(dataRaw) as DirectMultiMarketResult;
        const state = JSON.parse(stateRaw) as { timestamp?: number };
        const ts = state.timestamp ?? 0;
        if (Date.now() - ts <= FULL_FETCH_INTERVAL_MS) {
          data = { data: parsedData, timestamp: ts };
          cacheSource = "redis";
        }
      }
    } catch {
      // ignore
    }
  }
  if (!data && memCache && Date.now() - memCache.timestamp <= FULL_FETCH_INTERVAL_MS) {
    data = memCache;
    cacheSource = "memory";
  }

  if (!data) {
    return {
      hasCache: false,
      lastFullTimestamp: null,
      lastFullIso: null,
      nextFullAllowedAt: null,
      nextFullAllowedIso: null,
      h2hCount: 0,
      shouldUseFull: true,
      cacheSource: "none",
    };
  }

  const nextFullAt = data.timestamp + FULL_FETCH_INTERVAL_MS;
  return {
    hasCache: true,
    lastFullTimestamp: data.timestamp,
    lastFullIso: new Date(data.timestamp).toISOString(),
    nextFullAllowedAt: nextFullAt,
    nextFullAllowedIso: new Date(nextFullAt).toISOString(),
    h2hCount: data.data.h2h?.length ?? 0,
    shouldUseFull: await shouldUseFull(),
    cacheSource,
  };
}

// --- FUNZIONI DI SUPPORTO PER LE ROTTE DI DEBUG ---

async function getAllCachedMatchesFromFile(): Promise<
  Array<{ homeTeam: string; awayTeam: string; manifestazione?: string }>
> {
  const c = await getCached(true);
  const h2h = c?.h2h ?? [];
  return h2h.map((q) => ({
    homeTeam: q.homeTeam ?? "",
    awayTeam: q.awayTeam ?? "",
    manifestazione: (q as { manifestazione?: string }).manifestazione,
  }));
}

export async function getAllCachedMatches() {
  return getAllCachedMatchesFromFile();
}
