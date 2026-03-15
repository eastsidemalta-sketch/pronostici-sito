/**
 * Redis client per Market Analytics.
 * Usa REDIS_URL da env. Fallback graceful se Redis non disponibile.
 */

import type Redis from "ioredis";

let redisClient: Redis | null = null;

export function getAnalyticsRedis(): Redis | null {
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

/** TTL per chiavi analytics: 90 giorni */
export const ANALYTICS_TTL_DAYS = 90;
export const ANALYTICS_TTL_SEC = ANALYTICS_TTL_DAYS * 24 * 60 * 60;

export const KEY_PREFIX = "metrics:market:";
export const KEY_REQUESTS = (market: string, date: string) =>
  `${KEY_PREFIX}requests:${market}:${date}`;
export const KEY_REQUESTS_TOTAL = (date: string) =>
  `${KEY_PREFIX}requests:total:${date}`;
export const KEY_UNIQUE = (market: string, date: string) =>
  `${KEY_PREFIX}unique:${market}:${date}`;

/** Chiave temporanea per PFMERGE (TTL 60s, evitare collisioni) */
export const KEY_TEMP_PFMERGE = (suffix: string) =>
  `temp:metrics:market:unique:${suffix}`;
