import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { getAllMarketCodes, getDefaultMarketCode } from "@/lib/markets";

const DATA_PATH = path.join(process.cwd(), "data", "telegramBannerConfig.json");
const REDIS_KEY = "admin:telegramBannerConfig:v1";

/** Redis client (lazy). Se REDIS_URL non c'è, torna null. */
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

export type TelegramBannerCountryConfig = {
  /** Testo del banner */
  text: string;
  /** Testo del bottone */
  buttonText: string;
  /** URL del canale Telegram */
  channelUrl: string;
};

export type TelegramBannerConfig = {
  byCountry?: Record<string, TelegramBannerCountryConfig>;
};

const DEFAULT_CONFIG: TelegramBannerConfig = {
  byCountry: {},
};

const DEFAULT_IT: TelegramBannerCountryConfig = {
  text: "Resta aggiornato! Iscriviti al nostro canale Telegram per pronostici e analisi.",
  buttonText: "Unisciti su Telegram",
  channelUrl: "https://t.me/playsignal",
};

let cache: TelegramBannerConfig | null = null;

function getRawConfig(): TelegramBannerConfig {
  // 1) Cache (popolata da warmTelegramBannerConfigCache o da saveTelegramBannerConfig)
  if (cache !== null) return cache;

  try {
    if (existsSync(DATA_PATH)) {
      const raw = readFileSync(DATA_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    // fallback
  }
  return DEFAULT_CONFIG;
}

export function getTelegramBannerConfig(): TelegramBannerConfig {
  return getRawConfig();
}

/**
 * Salva config Telegram banner.
 * - Scrive su Redis (se disponibile) per persistenza su Render
 * - Scrive anche su file come fallback/dev
 */
export function saveTelegramBannerConfig(config: TelegramBannerConfig): void {
  cache = config;

  const redis = getRedis();
  if (redis) {
    // Fire-and-forget: non bloccare la request admin
    redis.set(REDIS_KEY, JSON.stringify(config)).catch(() => {});
  }
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(config, null, 2));
}

/**
 * Carica config da Redis in cache (async).
 * Usato dagli handler API admin per inizializzare cache al primo accesso.
 */
export async function warmTelegramBannerConfigCache(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const raw = await redis.get(REDIS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as TelegramBannerConfig;
    if (parsed && typeof parsed === "object") cache = parsed;
  } catch {
    // ignore
  }
}

/** Restituisce la config per un paese. Fallback al mercato di default se non configurato. */
export function getTelegramBannerForCountry(country: string): TelegramBannerCountryConfig | null {
  const config = getRawConfig();
  const defaultMarket = getDefaultMarketCode();
  const cc = config.byCountry?.[country] ?? config.byCountry?.[defaultMarket] ?? (country === defaultMarket ? DEFAULT_IT : null);
  if (!cc?.channelUrl?.trim()) return null;
  return {
    text: cc.text?.trim() || DEFAULT_IT.text,
    buttonText: cc.buttonText?.trim() || DEFAULT_IT.buttonText,
    channelUrl: cc.channelUrl.trim(),
  };
}

export function getSupportedCountries(): string[] {
  return getAllMarketCodes();
}
