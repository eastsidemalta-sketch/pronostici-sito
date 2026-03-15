/**
 * Market Tracking Middleware.
 * Traccia SOLO su rotte user-facing. Esclude health, market-stats, static.
 * Usa HyperLogLog per unique visitors.
 */

import {
  getAnalyticsRedis,
  ANALYTICS_TTL_SEC,
  KEY_REQUESTS,
  KEY_REQUESTS_TOTAL,
  KEY_UNIQUE,
} from "./redis";
import { getVidFromRequest } from "./visitorId";

/** Formato data YYYYMMDD */
function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/** Path da tracciare (user-facing) */
const TRACKED_PATHS: (string | RegExp)[] = [
  "/api/upcoming-data",
  /^\/api\/fixture\/[^/]+$/,
  "/api/quotes",
  "/api/live-matches",
  /^\/(it|fr|es|de|en|pt-BR|en-NG|en-KE|en-GH)(\/|$)/, // page routes con locale
];

/** Path da escludere (tecnici, static) */
const EXCLUDED_PATHS: (string | RegExp)[] = [
  "/api/health",
  "/api/market-stats",
  "/api/cron/",
  "/api/debug-",
  "/api/ad2min3k/",
  /\.(ico|png|jpg|jpeg|gif|svg|css|js|woff2?)$/i,
  /^\/_next\//,
  /^\/static\//,
  /^\/assets\//,
  /^\/favicon/,
];

function matchesAny(pathname: string, patterns: (string | RegExp)[]): boolean {
  for (const p of patterns) {
    if (typeof p === "string") {
      if (pathname === p || pathname.startsWith(p + "/")) return true;
    } else if (p.test(pathname)) return true;
  }
  return false;
}

function shouldTrack(pathname: string): boolean {
  if (matchesAny(pathname, EXCLUDED_PATHS)) return false;
  return matchesAny(pathname, TRACKED_PATHS);
}

/** Request con market e path */
export interface TrackableRequest {
  path?: string;
  url?: string;
  market?: string;
  cookies?: Record<string, string>;
  headers?: { cookie?: string };
}

/**
 * Middleware: traccia richiesta su Redis.
 * Richiede req.market (da determineMarket) e req.vid (da ensureVisitorIdCookie).
 * Fire-and-forget: non blocca la risposta.
 */
export function trackMarketRequest(
  req: TrackableRequest,
  _res: unknown,
  next: () => void
): void {
  const pathname = req.path ?? new URL(req.url ?? "/", "http://x").pathname;
  if (!shouldTrack(pathname)) {
    next();
    return;
  }
  const market = req.market;
  if (!market) {
    next();
    return;
  }
  const vid = (req as { vid?: string }).vid ?? getVidFromRequest(req);
  if (!vid) {
    next();
    return;
  }
  // Fire-and-forget: non attendere Redis
  recordMarketHit(market, vid).catch(() => {
    // Silently ignore Redis errors
  });
  next();
}

/**
 * Registra un hit per market+vid.
 * Chiamabile da Next.js API routes o da middleware Express.
 */
export async function recordMarketHit(
  market: string,
  vid: string
): Promise<void> {
  const redis = getAnalyticsRedis();
  if (!redis) return;
  const dateKey = toDateKey(new Date());
  const keyReq = KEY_REQUESTS(market, dateKey);
  const keyTotal = KEY_REQUESTS_TOTAL(dateKey);
  const keyUnique = KEY_UNIQUE(market, dateKey);
  try {
    const pipeline = redis.pipeline();
    pipeline.incr(keyReq);
    pipeline.expire(keyReq, ANALYTICS_TTL_SEC);
    pipeline.incr(keyTotal);
    pipeline.expire(keyTotal, ANALYTICS_TTL_SEC);
    pipeline.pfadd(keyUnique, vid);
    pipeline.expire(keyUnique, ANALYTICS_TTL_SEC);
    await pipeline.exec();
  } catch {
    // Ignore
  }
}
