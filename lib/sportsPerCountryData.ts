import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { routing, localeToCountryCode } from "@/i18n/routing";
import type {
  SportsPerCountry,
  SportKey,
  SportsConfig,
  LocalePerCountry,
} from "./sportsPerCountry";

const DATA_PATH = path.join(process.cwd(), "data", "sportsPerCountry.json");

const DEFAULT_SPORTS: SportsPerCountry = {
  IT: ["calcio", "basket", "tennis", "rugby"],
  FR: ["calcio", "basket", "tennis", "rugby"],
  ES: ["calcio", "basket", "tennis", "rugby"],
  DE: ["calcio", "basket", "tennis", "rugby"],
  UK: ["calcio", "basket", "tennis", "rugby"],
  BR: ["calcio", "basket", "tennis", "rugby"],
  NG: ["calcio", "basket", "tennis", "rugby"],
  KE: ["calcio", "basket", "tennis", "rugby"],
  GH: ["calcio", "basket", "tennis", "rugby"],
};

const DEFAULT_LOCALE_PER_COUNTRY: LocalePerCountry = {
  IT: "it",
  FR: "fr",
  ES: "es",
  DE: "de",
  UK: "en",
  BR: "pt-BR",
  NG: "en-NG",
  KE: "en-KE",
  GH: "en-GH",
};

function parseConfig(raw: unknown): SportsConfig {
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (obj.sports && typeof obj.sports === "object") {
      return {
        sports: obj.sports as SportsPerCountry,
        localePerCountry:
          (obj.localePerCountry as LocalePerCountry) || DEFAULT_LOCALE_PER_COUNTRY,
      };
    }
    if (!("sports" in obj) && !("localePerCountry" in obj)) {
      return {
        sports: obj as SportsPerCountry,
        localePerCountry: DEFAULT_LOCALE_PER_COUNTRY,
      };
    }
  }
  return {
    sports: DEFAULT_SPORTS,
    localePerCountry: DEFAULT_LOCALE_PER_COUNTRY,
  };
}

export function getSportsConfig(): SportsConfig {
  try {
    if (existsSync(DATA_PATH)) {
      const raw = readFileSync(DATA_PATH, "utf-8");
      const parsed = JSON.parse(raw) as unknown;
      return parseConfig(parsed);
    }
  } catch {
    // fallback
  }
  return {
    sports: DEFAULT_SPORTS,
    localePerCountry: DEFAULT_LOCALE_PER_COUNTRY,
  };
}

export function saveSportsConfig(config: SportsConfig): void {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(config, null, 2));
}

export function getSportsPerCountry(): SportsPerCountry {
  return getSportsConfig().sports;
}

export function saveSportsPerCountry(data: SportsPerCountry): void {
  const config = getSportsConfig();
  saveSportsConfig({ ...config, sports: data });
}

export function getLocalePerCountry(): LocalePerCountry {
  return getSportsConfig().localePerCountry;
}

export function saveLocalePerCountry(data: LocalePerCountry): void {
  const config = getSportsConfig();
  saveSportsConfig({ ...config, localePerCountry: data });
}

/** Verifica se uno sport è attivo per un paese (config admin Sport attivi per paese). */
export function isSportEnabledForCountry(
  country: string,
  sportKey: SportKey
): boolean {
  const sports = getSportsConfig().sports[country];
  if (!sports) return true; // paese non configurato: tutti attivi
  if (sports.length === 0) return false; // esplicitamente "Nessuno"
  return sports.includes(sportKey);
}

/** Restituisce il locale per un paese. Se non configurato, usa il default dal routing. */
export function getLocaleForCountry(country: string): string {
  const locale = getSportsConfig().localePerCountry[country];
  if (locale && (routing.locales as readonly string[]).includes(locale))
    return locale;
  const found = Object.entries(localeToCountryCode).find(([, c]) => c === country);
  return found?.[0] ?? routing.defaultLocale;
}
