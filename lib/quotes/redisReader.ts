import type { NormalizedMatch } from "@/workers/core/DataNormalizer";

let redisClient: import("ioredis").default | null = null;

function getRedis(): import("ioredis").default | null {
  if (redisClient) return redisClient;
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  try {
    const Redis = require("ioredis").default;
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },
    });
    return redisClient;
  } catch {
    return null;
  }
}

/**
 * Legge da Redis l’hash `match:odds:{id}` (campi = bookmaker id, valori = JSON `NormalizedMatch`).
 * Solo lato server (Route Handler / Server Actions); nessuna chiamata alle API bookmaker.
 */
export async function getMatchOddsFromRedis(
  apiFootballMatchId: string
): Promise<Record<string, NormalizedMatch>> {
  const redis = getRedis();
  if (!redis) {
    return {};
  }

  const id = (apiFootballMatchId || "").trim();
  if (!id) {
    return {};
  }

  try {
    const redisKey = `match:odds:${id}`;
    const rawData = await redis.hgetall(redisKey);

    if (!rawData || Object.keys(rawData).length === 0) {
      return {};
    }

    const parsedOdds: Record<string, NormalizedMatch> = {};

    for (const [bookmakerKey, jsonString] of Object.entries(rawData)) {
      if (!jsonString) continue;
      try {
        parsedOdds[bookmakerKey] = JSON.parse(jsonString) as NormalizedMatch;
      } catch (parseError) {
        console.error(
          `[RedisReader] Failed to parse odds for ${bookmakerKey}:`,
          parseError
        );
      }
    }

    return parsedOdds;
  } catch (error) {
    console.error(
      `[RedisReader] Error fetching odds for match ${apiFootballMatchId}:`,
      error
    );
    return {};
  }
}
