/**
 * Cache per Netwin (IT-0002): FULL ogni 3h, DELTA per le altre richieste.
 * FULL = dati completi (bloccata: max 1 ogni 3 ore).
 * DELTA = solo quote modificate, max 1 ogni 10 secondi.
 *
 * Regole API Netwin:
 * - FULL: può essere fatta solo ogni 3 ore
 * - DELTA: può essere fatta ogni 10 secondi, restituisce le quote modificate
 *
 * Cache su file: condivisa tra worker/processi (Next.js può usare più worker).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from "fs";
import path from "path";
import type { DirectMultiMarketResult } from "./directBookmakerFetcher";
import type { DirectQuote } from "./directBookmakerFetcher";

const FULL_FETCH_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 ore (limite Netwin)
const DELTA_MIN_INTERVAL_MS = 10 * 1000; // 10 secondi tra una DELTA e l'altra (limite Netwin)

const CACHE_FILE = path.join(process.cwd(), "data", ".netwin-cache.json");
const FULL_LOG_FILE = path.join(process.cwd(), "data", ".netwin-full.log");
const FULL_LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 giorni

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

function loadFromFileCache(): { data: DirectMultiMarketResult; timestamp: number } | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const raw = readFileSync(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as { data: DirectMultiMarketResult; timestamp: number };
    if (!parsed?.data || typeof parsed.timestamp !== "number") return null;
    if (Date.now() - parsed.timestamp > FULL_FETCH_INTERVAL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToFileCache(data: DirectMultiMarketResult, timestamp: number): void {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify({ data, timestamp }), "utf-8");
  } catch (e) {
    console.warn("[Netwin] Impossibile salvare cache su file:", e instanceof Error ? e.message : String(e));
  }
}

/** Registra tentativo FULL (successo o errore). Retention 7 giorni. */
export function logFullAttempt(
  success: boolean,
  details: { url?: string; h2hCount?: number; error?: string; errorRaw?: string }
): void {
  try {
    const dir = path.dirname(FULL_LOG_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const timestamp = Date.now();
    const entry: Record<string, unknown> = {
      timestamp,
      iso: new Date(timestamp).toISOString(),
      success,
      ...(details.url && { url: details.url }),
      ...(success && details.h2hCount != null && { h2hCount: details.h2hCount }),
      ...(!success && details.error && { error: details.error }),
      ...(!success && details.errorRaw && { errorRaw: details.errorRaw }),
    };
    appendFileSync(FULL_LOG_FILE, JSON.stringify(entry) + "\n", "utf-8");
    trimLogToRetention();
  } catch {
    // ignora errori di log
  }
}

/** Rimuove voci più vecchie di 7 giorni */
function trimLogToRetention(): void {
  try {
    if (!existsSync(FULL_LOG_FILE)) return;
    const raw = readFileSync(FULL_LOG_FILE, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    const cutoff = Date.now() - FULL_LOG_RETENTION_MS;
    const kept = lines.filter((line) => {
      try {
        const e = JSON.parse(line);
        return e.timestamp >= cutoff;
      } catch {
        return true;
      }
    });
    if (kept.length < lines.length) {
      writeFileSync(FULL_LOG_FILE, kept.join("\n") + (kept.length ? "\n" : ""), "utf-8");
    }
  } catch {
    // ignora
  }
}

export function getCached(): DirectMultiMarketResult | null {
  if (cache && Date.now() - cache.timestamp <= FULL_FETCH_INTERVAL_MS) return cache.data;
  const fromFile = loadFromFileCache();
  if (fromFile) {
    cache = fromFile;
    return fromFile.data;
  }
  return null;
}

export function setCache(data: DirectMultiMarketResult): void {
  const timestamp = Date.now();
  cache = { data, timestamp };
  lastDeltaCallAt = null;
  saveToFileCache(data, timestamp);
}

export function mergeDeltaWithCache(delta: DirectMultiMarketResult): DirectMultiMarketResult {
  const full = getCached();
  if (!full) return delta;
  return mergeMarketResults(full, delta);
}

/** Debug: campione di partite in cache (per verificare nomi squadre usati da Netwin) */
export function getCachedMatchSample(limit = 50): Array<{ homeTeam: string; awayTeam: string }> {
  const c = getCached();
  const h2h = c?.h2h ?? [];
  const max = limit <= 0 ? h2h.length : Math.min(limit, h2h.length);
  return h2h.slice(0, max).map((q) => ({ homeTeam: q.homeTeam, awayTeam: q.awayTeam }));
}

/** Debug: legge tutte le partite direttamente dal file cache (bypass in-memory, per showMatches=all) */
export function getAllCachedMatchesFromFile(): Array<{ homeTeam: string; awayTeam: string }> {
  const candidates = [
    path.join(process.cwd(), "data", ".netwin-cache.json"),
    path.join(process.cwd(), ".next", "standalone", "data", ".netwin-cache.json"),
  ];
  for (const p of candidates) {
    try {
      if (!existsSync(p)) continue;
      const raw = readFileSync(p, "utf-8");
      const parsed = JSON.parse(raw) as { data?: { h2h?: Array<{ homeTeam?: string; awayTeam?: string }> } };
      const h2h = parsed?.data?.h2h ?? [];
      return h2h.map((q) => ({ homeTeam: q.homeTeam ?? "", awayTeam: q.awayTeam ?? "" }));
    } catch {
      continue;
    }
  }
  return [];
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
  cacheFilePath: string;
  cacheFileExists: boolean;
} {
  let data = cache;
  if (!data) {
    const fromFile = loadFromFileCache();
    if (fromFile) {
      cache = fromFile;
      data = fromFile;
    }
  }
  const cacheFilePath = CACHE_FILE;
  const cacheFileExists = existsSync(CACHE_FILE);

  if (!data) {
    return {
      hasCache: false,
      lastFullTimestamp: null,
      lastFullIso: null,
      nextFullAllowedAt: null,
      nextFullAllowedIso: null,
      h2hCount: 0,
      shouldUseFull: true,
      cacheFilePath,
      cacheFileExists,
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
    shouldUseFull: shouldUseFull(),
    cacheFilePath,
    cacheFileExists,
  };
}
