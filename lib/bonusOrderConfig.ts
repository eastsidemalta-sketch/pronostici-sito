import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { localeToCountryCode } from "@/i18n/routing";

const DATA_PATH = path.join(process.cwd(), "data", "bonusOrder.json");

export type BonusOrderConfig = {
  /** Per paese: ordine degli ID bookmaker (quelli con bonus per quel paese) */
  byCountry?: Record<string, string[]>;
};

let cache: BonusOrderConfig | null = null;

function getRawConfig(): BonusOrderConfig {
  if (cache !== null) return cache;
  try {
    if (existsSync(DATA_PATH)) {
      const raw = readFileSync(DATA_PATH, "utf-8");
      const parsed = JSON.parse(raw) as BonusOrderConfig;
      if (parsed && typeof parsed === "object") {
        cache = parsed;
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  cache = {};
  return {};
}

export function getBonusOrderConfig(): BonusOrderConfig {
  return getRawConfig();
}

export function saveBonusOrderConfig(config: BonusOrderConfig): void {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(config, null, 2));
  cache = config;
}

/** Restituisce gli ID bookmaker ordinati per quel paese. Se non configurato, restituisce undefined (usa ordine naturale). */
export function getBonusOrderForCountry(country: string): string[] | undefined {
  const config = getRawConfig();
  const ids = config.byCountry?.[country];
  if (ids?.length) return ids;
  return undefined;
}

export function getSupportedCountries(): string[] {
  return [...new Set(Object.values(localeToCountryCode))];
}
