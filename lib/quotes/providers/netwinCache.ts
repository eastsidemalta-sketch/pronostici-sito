/**
 * Cache per Netwin (IT-0002): FULL ogni 2.5h, DELTA per le altre richieste.
 * FULL = dati completi, DELTA = solo aggiornamenti da mergare sulla base FULL.
 *
 * Regole API:
 * - Prima chiamata: sempre FULL (stabilisce connessione)
 * - Chiamate successive: DELTA, max 1 ogni 5 secondi
 * - FULL periodico: ogni 2-3 ore
 */
import type { DirectMultiMarketResult } from "./directBookmakerFetcher";
import type { DirectQuote } from "./directBookmakerFetcher";

const FULL_FETCH_INTERVAL_MS = 2.5 * 60 * 60 * 1000; // 2.5 ore
const DELTA_MIN_INTERVAL_MS = 5 * 1000; // 5 secondi tra una DELTA e l'altra

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

/** true se possiamo fare una chiamata DELTA (rispetta intervallo 5 sec) */
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
