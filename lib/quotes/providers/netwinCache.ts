/**
 * Cache per Netwin (IT-0002): FULL ogni 3h, DELTA per le altre richieste.
 * FULL = dati completi (bloccata: max 1 ogni 3 ore).
 * DELTA = solo quote modificate, max 1 ogni 10 secondi.
 *
 * Regole API Netwin:
 * - FULL: può essere fatta solo ogni 3 ore
 * - DELTA: può essere fatta ogni 10 secondi, restituisce le quote modificate
 */
import type { DirectMultiMarketResult } from "./directBookmakerFetcher";
import type { DirectQuote } from "./directBookmakerFetcher";

const FULL_FETCH_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 ore (limite Netwin)
const DELTA_MIN_INTERVAL_MS = 10 * 1000; // 10 secondi tra una DELTA e l'altra (limite Netwin)

let cache: { data: DirectMultiMarketResult; timestamp: number } | null = null;
let lastDeltaCallAt: number | null = null;

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

export function isNetwinBookmaker(siteId?: string, id?: string): boolean {
  return siteId === "IT-0002" || id === "netwinit";
}

export function shouldUseFull(): boolean {
  if (!cache) return true;
  return Date.now() - cache.timestamp > FULL_FETCH_INTERVAL_MS;
}

/** true se possiamo fare una chiamata DELTA (rispetta intervallo 10 sec) */
export function canDoDelta(): boolean {
  if (!lastDeltaCallAt) return true;
  return Date.now() - lastDeltaCallAt >= DELTA_MIN_INTERVAL_MS;
}

export function recordDeltaCall(): void {
  lastDeltaCallAt = Date.now();
}

export function getCached(): DirectMultiMarketResult | null {
  if (!cache) return null;
  if (Date.now() - cache.timestamp > FULL_FETCH_INTERVAL_MS) return null;
  return cache.data;
}

export function setCache(data: DirectMultiMarketResult): void {
  cache = { data, timestamp: Date.now() };
  lastDeltaCallAt = null;
}

export function mergeDeltaWithCache(delta: DirectMultiMarketResult): DirectMultiMarketResult {
  const full = getCached();
  if (!full) return delta;
  return mergeMarketResults(full, delta);
}

/** Debug: info sulla cache Netwin (ultima FULL, prossima FULL consentita) */
export function getCacheDebugInfo(): {
  hasCache: boolean;
  lastFullTimestamp: number | null;
  lastFullIso: string | null;
  nextFullAllowedAt: number | null;
  nextFullAllowedIso: string | null;
  h2hCount: number;
  shouldUseFull: boolean;
} {
  if (!cache) {
    return {
      hasCache: false,
      lastFullTimestamp: null,
      lastFullIso: null,
      nextFullAllowedAt: null,
      nextFullAllowedIso: null,
      h2hCount: 0,
      shouldUseFull: true,
    };
  }
  const nextFullAt = cache.timestamp + FULL_FETCH_INTERVAL_MS;
  return {
    hasCache: true,
    lastFullTimestamp: cache.timestamp,
    lastFullIso: new Date(cache.timestamp).toISOString(),
    nextFullAllowedAt: nextFullAt,
    nextFullAllowedIso: new Date(nextFullAt).toISOString(),
    h2hCount: cache.data.h2h?.length ?? 0,
    shouldUseFull: shouldUseFull(),
  };
}
