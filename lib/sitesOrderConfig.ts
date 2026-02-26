import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { getActiveMarketCodes } from "@/lib/markets";

const DATA_PATH = path.join(process.cwd(), "data", "sitesOrder.json");

export type SitesOrderConfig = {
  /** Per paese: ordine degli ID bookmaker (siti di scommesse per quel paese) */
  byCountry?: Record<string, string[]>;
};

let cache: SitesOrderConfig | null = null;

function getRawConfig(): SitesOrderConfig {
  if (cache !== null) return cache;
  try {
    if (existsSync(DATA_PATH)) {
      const raw = readFileSync(DATA_PATH, "utf-8");
      const parsed = JSON.parse(raw) as SitesOrderConfig;
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

export function getSitesOrderConfig(): SitesOrderConfig {
  return getRawConfig();
}

export function saveSitesOrderConfig(config: SitesOrderConfig): void {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(config, null, 2));
  cache = config;
}

/** Restituisce gli ID bookmaker ordinati per quel paese. Se non configurato, restituisce undefined (usa ordine naturale). */
export function getSitesOrderForCountry(country: string): string[] | undefined {
  const config = getRawConfig();
  const ids = config.byCountry?.[country];
  if (ids?.length) return ids;
  return undefined;
}

export function getSupportedCountries(): string[] {
  return getActiveMarketCodes();
}
