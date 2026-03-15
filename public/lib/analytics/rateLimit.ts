/**
 * Rate limit per /api/market-stats.
 * Max 10 richieste/minuto per IP.
 * Redis key: metrics:ratelimit:market-stats:{ip}:{YYYYMMDDHHMM}
 */

import { getAnalyticsRedis } from "./redis";

const RATE_LIMIT_PREFIX = "metrics:ratelimit:market-stats:";
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SEC = 60;

function toMinuteKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}${m}${day}${h}${min}`;
}

/**
 * Verifica rate limit. Ritorna true se OK, false se superato (429).
 * Se Redis non disponibile → permette (fail-open).
 */
export async function checkMarketStatsRateLimit(
  ip: string
): Promise<{ allowed: boolean }> {
  const redis = getAnalyticsRedis();
  if (!redis) return { allowed: true };

  const safeIp = ip.replace(/[^a-fA-F0-9.:]/g, "_").slice(0, 64) || "unknown";
  const minuteKey = toMinuteKey(new Date());
  const key = `${RATE_LIMIT_PREFIX}${safeIp}:${minuteKey}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW_SEC);
    }
    return { allowed: count <= RATE_LIMIT_MAX };
  } catch {
    return { allowed: true };
  }
}

/**
 * Middleware Express: rate limit su /api/market-stats.
 * Se superato → 429 Too Many Requests.
 */
export async function rateLimitMarketStats(
  req: { ip?: string; connection?: { remoteAddress?: string }; headers?: { [k: string]: string | string[] | undefined } },
  res: { status: (n: number) => { json: (o: object) => void }; json: (o: object) => void },
  next: () => void
): Promise<void> {
  const ip =
    (req.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    (req.headers?.["x-real-ip"] as string) ??
    req.ip ??
    req.connection?.remoteAddress ??
    "127.0.0.1";
  const { allowed } = await checkMarketStatsRateLimit(ip);
  if (!allowed) {
    res.status(429).json({ error: "Too Many Requests" });
    return;
  }
  next();
}
