import path from "path";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";

const DATA_PATH = path.join(process.cwd(), "data", "liveUsage.json");

type UsageRecord = { hour: string; count: number; last_updated: string };

let memoryStore: UsageRecord[] = [];

function loadFromFile(): UsageRecord[] {
  try {
    if (existsSync(DATA_PATH)) {
      const raw = readFileSync(DATA_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveToFile(data: UsageRecord[]): void {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

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

const USAGE_KEY_HOURLY = "live:usage:hourly:";
const USAGE_KEY_DAILY = "live:usage:daily:";
const USAGE_KEY_MONTHLY = "live:usage:monthly:";
const USAGE_LAST_POLL = "live:usage:last_poll";

function getHourKey(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}-${String(now.getUTCHours()).padStart(2, "0")}`;
}

function getDayKey(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function getMonthKey(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Increment API call count by 1 */
export async function incrementApiUsage(): Promise<void> {
  const now = new Date();
  const hourKey = getHourKey(now);
  const dayKey = getDayKey(now);
  const monthKey = getMonthKey(now);

  const redis = getRedis();
  if (redis) {
    const pipeline = redis.pipeline();
    pipeline.incr(`${USAGE_KEY_HOURLY}${hourKey}`);
    pipeline.expire(`${USAGE_KEY_HOURLY}${hourKey}`, 48 * 3600); // 48h TTL
    pipeline.incr(`${USAGE_KEY_DAILY}${dayKey}`);
    pipeline.expire(`${USAGE_KEY_DAILY}${dayKey}`, 35 * 24 * 3600); // 35 days
    pipeline.incr(`${USAGE_KEY_MONTHLY}${monthKey}`);
    pipeline.expire(`${USAGE_KEY_MONTHLY}${monthKey}`, 400 * 24 * 3600); // ~13 months
    pipeline.set(USAGE_LAST_POLL, now.toISOString());
    await pipeline.exec();
  } else {
    if (memoryStore.length === 0) memoryStore = loadFromFile();
    const existing = memoryStore.find((r) => r.hour === hourKey);
    if (existing) {
      existing.count++;
      existing.last_updated = now.toISOString();
    } else {
      memoryStore.push({ hour: hourKey, count: 1, last_updated: now.toISOString() });
    }
    memoryStore = memoryStore.filter((r) => {
      const cutoff = Date.now() - 35 * 24 * 3600 * 1000;
      return new Date(r.last_updated).getTime() > cutoff;
    });
    saveToFile(memoryStore);
  }
}

/** Get hourly count for current hour */
export async function getHourlyCount(): Promise<number> {
  const now = new Date();
  const hourKey = getHourKey(now);

  const redis = getRedis();
  if (redis) {
    const raw = await redis.get(`${USAGE_KEY_HOURLY}${hourKey}`);
    return raw ? parseInt(raw, 10) : 0;
  }
  const rec = memoryStore.find((r) => r.hour === hourKey);
  return rec?.count ?? 0;
}

/** Get daily count for current day */
export async function getDailyCount(): Promise<number> {
  const now = new Date();
  const dayKey = getDayKey(now);

  const redis = getRedis();
  if (redis) {
    const raw = await redis.get(`${USAGE_KEY_DAILY}${dayKey}`);
    return raw ? parseInt(raw, 10) : 0;
  }
  const dayPrefix = dayKey + "-";
  const recs = memoryStore.filter((r) => r.hour.startsWith(dayPrefix) || r.hour === dayKey);
  return recs.reduce((sum, r) => sum + r.count, 0);
}

/** Get monthly count for current month */
export async function getMonthlyCount(): Promise<number> {
  const now = new Date();
  const monthKey = getMonthKey(now);

  const redis = getRedis();
  if (redis) {
    const raw = await redis.get(`${USAGE_KEY_MONTHLY}${monthKey}`);
    return raw ? parseInt(raw, 10) : 0;
  }
  const monthPrefix = monthKey + "-";
  const recs = memoryStore.filter((r) => r.hour.startsWith(monthPrefix));
  return recs.reduce((sum, r) => sum + r.count, 0);
}

/** Get last poll timestamp (ISO string) */
export async function getLastPollTime(): Promise<string | null> {
  const redis = getRedis();
  if (redis) {
    return redis.get(USAGE_LAST_POLL);
  }
  if (memoryStore.length === 0) memoryStore = loadFromFile();
  const latest = memoryStore.reduce<UsageRecord | null>((best, r) => {
    if (!best || r.last_updated > best.last_updated) return r;
    return best;
  }, null);
  return latest?.last_updated ?? null;
}

/** Set last poll timestamp */
export async function setLastPollTime(iso: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(USAGE_LAST_POLL, iso);
  }
}
