/**
 * Market Stats - aggregazione e recommendation.
 * NON modifica defaultMarket. Solo informativo.
 */

import { randomUUID } from "crypto";
import { getAnalyticsRedis } from "./redis";
import {
  KEY_REQUESTS,
  KEY_REQUESTS_TOTAL,
  KEY_UNIQUE,
  KEY_TEMP_PFMERGE,
} from "./redis";
import { getActiveMarketCodes } from "@/lib/markets";
import { MARKET_CONFIG } from "@/lib/markets";

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/** Dati giornalieri per recommendation (30 giorni consecutivi) */
export type DailyMarketData = {
  dateKey: string;
  byMarket: Record<string, number>;
  total: number;
};

export type MarketStatsEntry = {
  requests: number;
  uniqueVisitorsEstimate: number;
  requestSharePercent: number;
};

export type MarketStatsResponse = {
  rangeDays: number;
  totals: {
    requests: number;
    uniqueVisitorsEstimate: number;
  };
  byMarket: Record<string, MarketStatsEntry>;
  recommendation: {
    rule: string;
    suggestedDefaultMarket: string | null;
    meetsThreshold: boolean;
  };
};

const RECOMMENDATION_RULE =
  "Change default if market >= 60% for 30 consecutive days";
const SHARE_THRESHOLD_PERCENT = 60;
const MIN_DAYS_FOR_RECOMMENDATION = 30;

/**
 * PFCOUNT sicuro via PFMERGE: crea chiave temp, merge, count, delete.
 * Evita limiti Redis su PFCOUNT con molti argomenti.
 */
async function pfCountSafe(
  redis: import("ioredis").default,
  keys: string[]
): Promise<number> {
  if (keys.length === 0) return 0;
  if (keys.length === 1) {
    try {
      return await redis.pfcount(keys[0]);
    } catch {
      return 0;
    }
  }
  const tempKey = KEY_TEMP_PFMERGE(`${randomUUID()}`);
  try {
    await redis.pfmerge(tempKey, ...keys);
    const count = await redis.pfcount(tempKey);
    return count;
  } catch {
    return 0;
  } finally {
    await redis.del(tempKey).catch(() => {});
  }
}

/**
 * Calcola statistiche per gli ultimi N giorni.
 */
export async function getMarketStats(
  rangeDays: number
): Promise<MarketStatsResponse> {
  const redis = getAnalyticsRedis();
  const markets = getActiveMarketCodes();
  const defaultMarket = MARKET_CONFIG.defaultMarket;

  const totals = { requests: 0, uniqueVisitorsEstimate: 0 };
  const byMarket: Record<string, MarketStatsEntry> = {};

  for (const m of markets) {
    byMarket[m] = {
      requests: 0,
      uniqueVisitorsEstimate: 0,
      requestSharePercent: 0,
    };
  }

  if (!redis) {
    return {
      rangeDays,
      totals,
      byMarket,
      recommendation: recommendationEngine([], rangeDays, defaultMarket),
    };
  }

  const now = new Date();
  const uniqueKeysByMarket: Record<string, string[]> = {};
  for (const m of markets) uniqueKeysByMarket[m] = [];

  /** Dati per giorno (ordine: da oggi a N giorni fa) per recommendation */
  const dailyData: DailyMarketData[] = [];

  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateKey = toDateKey(d);

    const keyTotal = KEY_REQUESTS_TOTAL(dateKey);
    const totalVal = await redis.get(keyTotal);
    const dayTotal = parseInt(totalVal ?? "0", 10);
    totals.requests += dayTotal;

    const dayByMarket: Record<string, number> = {};
    for (const m of markets) {
      const keyReq = KEY_REQUESTS(m, dateKey);
      const val = await redis.get(keyReq);
      const reqCount = parseInt(val ?? "0", 10);
      byMarket[m].requests += reqCount;
      dayByMarket[m] = reqCount;
      uniqueKeysByMarket[m].push(KEY_UNIQUE(m, dateKey));
    }
    dailyData.push({ dateKey, byMarket: dayByMarket, total: dayTotal });
  }

  // Unique visitors: PFMERGE + PFCOUNT sicuro (temp key, merge, count, del)
  for (const m of markets) {
    const keys = uniqueKeysByMarket[m] ?? [];
    byMarket[m].uniqueVisitorsEstimate = await pfCountSafe(redis, keys);
  }

  // Totale unique: PFMERGE di tutti gli HLL
  const allUniqueKeys: string[] = [];
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateKey = toDateKey(d);
    for (const m of markets) {
      allUniqueKeys.push(KEY_UNIQUE(m, dateKey));
    }
  }
  totals.uniqueVisitorsEstimate = await pfCountSafe(redis, allUniqueKeys);

  // Percentuali
  for (const m of markets) {
    byMarket[m].requestSharePercent =
      totals.requests > 0
        ? Math.round((byMarket[m].requests / totals.requests) * 1000) / 10
        : 0;
  }

  return {
    rangeDays,
    totals,
    byMarket,
    recommendation: recommendationEngine(
      dailyData,
      rangeDays,
      defaultMarket
    ),
  };
}

/**
 * Engine di raccomandazione.
 * Regola: suggerire cambio default solo se un market >= 60% per almeno 30 giorni CONSECUTIVI.
 * NON modifica config. Solo informativo.
 */
export function recommendationEngine(
  dailyData: DailyMarketData[],
  rangeDays: number,
  currentDefault: string
): {
  rule: string;
  suggestedDefaultMarket: string | null;
  meetsThreshold: boolean;
} {
  if (rangeDays < MIN_DAYS_FOR_RECOMMENDATION || dailyData.length < MIN_DAYS_FOR_RECOMMENDATION) {
    return {
      rule: RECOMMENDATION_RULE,
      suggestedDefaultMarket: null,
      meetsThreshold: false,
    };
  }

  // Dati incompleti: troppi giorni senza traffico
  const daysWithData = dailyData.filter((d) => d.total > 0).length;
  if (daysWithData < MIN_DAYS_FOR_RECOMMENDATION) {
    return {
      rule: RECOMMENDATION_RULE,
      suggestedDefaultMarket: null,
      meetsThreshold: false,
    };
  }

  // Ordine cronologico: da più vecchio a più recente (per "consecutivi")
  const chronological = [...dailyData].reverse();

  const markets = Object.keys(
    chronological[0]?.byMarket ?? {}
  ) as string[];

  let bestMarket: string | null = null;
  let bestStreak = 0;

  for (const market of markets) {
    if (market === currentDefault) continue;

    let streak = 0;
    let maxStreak = 0;

    for (const day of chronological) {
      const total = day.total;
      const requests = day.byMarket[market] ?? 0;
      const sharePercent = total > 0 ? (requests / total) * 100 : 0;

      if (sharePercent >= SHARE_THRESHOLD_PERCENT) {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 0;
      }
    }

    if (maxStreak >= MIN_DAYS_FOR_RECOMMENDATION && maxStreak > bestStreak) {
      bestStreak = maxStreak;
      bestMarket = market;
    }
  }

  const meetsThreshold = bestMarket !== null;

  return {
    rule: RECOMMENDATION_RULE,
    suggestedDefaultMarket: meetsThreshold ? bestMarket : null,
    meetsThreshold,
  };
}
