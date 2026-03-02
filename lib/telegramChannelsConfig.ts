import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { getAllMarketCodes } from "@/lib/markets";

const DATA_PATH = path.join(process.cwd(), "data", "telegramChannelsConfig.json");
const REDIS_KEY = "admin:telegramChannelsConfig:v1";

/** Redis client (lazy). Se REDIS_URL non c'è, torna null. */
let redisClient: import("ioredis").default | null = null;
function getRedis(): import("ioredis").default | null {
  if (redisClient !== null) return redisClient;
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

export type TelegramChannelsConfig = {
  /** channel_id per paese: @channelusername o -100xxxxxxxxxx */
  byCountry?: Record<string, string>;
};

let cache: TelegramChannelsConfig | null = null;

function getRawConfig(): TelegramChannelsConfig {
  if (cache !== null) return cache;
  try {
    if (existsSync(DATA_PATH)) {
      const raw = readFileSync(DATA_PATH, "utf-8");
      const parsed = JSON.parse(raw) as TelegramChannelsConfig;
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    // fallback
  }
  return { byCountry: {} };
}

export function getTelegramChannelsConfig(): TelegramChannelsConfig {
  return getRawConfig();
}

export async function getTelegramChannelsConfigAsync(): Promise<TelegramChannelsConfig> {
  await warmTelegramChannelsConfigCache();
  return getRawConfig();
}

export function saveTelegramChannelsConfig(config: TelegramChannelsConfig): void {
  cache = config;
  const redis = getRedis();
  if (redis) {
    redis.set(REDIS_KEY, JSON.stringify(config)).catch(() => {});
  }
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(config, null, 2));
}

export async function warmTelegramChannelsConfigCache(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const raw = await redis.get(REDIS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as TelegramChannelsConfig;
    if (parsed && typeof parsed === "object") cache = parsed;
  } catch {
    // ignore
  }
}

/** Restituisce il channel_id per un paese, o null se non configurato */
export function getChannelIdForCountry(country: string): string | null {
  const config = getRawConfig();
  const id = config.byCountry?.[country]?.trim();
  return id || null;
}

export function getSupportedCountries(): string[] {
  return getAllMarketCodes();
}
