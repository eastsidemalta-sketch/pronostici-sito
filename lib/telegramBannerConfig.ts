import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { localeToCountryCode } from "@/i18n/routing";

const DATA_PATH = path.join(process.cwd(), "data", "telegramBannerConfig.json");

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

function getRawConfig(): TelegramBannerConfig {
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

export function saveTelegramBannerConfig(config: TelegramBannerConfig): void {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(config, null, 2));
}

/** Restituisce la config per un paese. Fallback a IT se non configurato. */
export function getTelegramBannerForCountry(country: string): TelegramBannerCountryConfig | null {
  const config = getRawConfig();
  const cc = config.byCountry?.[country] ?? config.byCountry?.IT ?? (country === "IT" ? DEFAULT_IT : null);
  if (!cc?.channelUrl?.trim()) return null;
  return {
    text: cc.text?.trim() || DEFAULT_IT.text,
    buttonText: cc.buttonText?.trim() || DEFAULT_IT.buttonText,
    channelUrl: cc.channelUrl.trim(),
  };
}

export function getSupportedCountries(): string[] {
  return [...new Set(Object.values(localeToCountryCode))];
}
