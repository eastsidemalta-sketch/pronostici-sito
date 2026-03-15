/**
 * Configurazione multi-country - DERIVATA da SUPPORTED_MARKETS.
 * Retrocompatibilità per consumer esistenti (sitemap, hreflang, ecc.).
 *
 * Single source of truth: lib/markets/config.ts
 */

import {
  SUPPORTED_MARKETS,
  getActiveMarkets,
  getActiveLocales,
  getDefaultLocale,
  getMarketConfig,
  isMarketActive,
} from "@/lib/markets";

export type CountryConfig = {
  code: string;
  locale: string;
  name: string;
  active: boolean;
  noindex?: boolean;
};

/** Tutti i country configurati - derivato da SUPPORTED_MARKETS */
export const COUNTRIES: CountryConfig[] = Object.entries(SUPPORTED_MARKETS).map(
  ([code, m]) => ({
    code: m.urlSegment,
    locale: m.defaultLocale,
    name: m.name,
    active: m.active,
    noindex: m.noindex,
  })
);

/** Locales attivi per hreflang - derivato da mercati attivi */
export const LOCALE_ACTIVE: Record<string, boolean> = Object.fromEntries(
  Object.entries(SUPPORTED_MARKETS).map(([, m]) => [m.urlSegment, m.active])
);

export const ACTIVE_COUNTRIES = COUNTRIES.filter((c) => c.active);
export const DEFAULT_COUNTRY = getDefaultLocale();

export function getCountryConfig(code: string): CountryConfig | undefined {
  const upper = code.toUpperCase();
  const m = getMarketConfig(upper);
  if (!m) return undefined;
  return {
    code: m.urlSegment,
    locale: m.defaultLocale,
    name: m.name,
    active: m.active,
    noindex: m.noindex,
  };
}

export function isCountryActive(code: string): boolean {
  return isMarketActive(code);
}

/** Country attivi (per sitemap, hreflang) */
export function getActiveCountries(): CountryConfig[] {
  return getActiveMarkets().map((m) => ({
    code: m.urlSegment,
    locale: m.defaultLocale,
    name: m.name,
    active: m.active,
    noindex: m.noindex,
  }));
}

/** Codici attivi (urlSegment) - per sitemap, hreflang */
export function getActiveCountryCodes(): string[] {
  return getActiveLocales();
}

/** Locales attivi per hreflang */
export function getActiveLocalesForHreflang(locales: string[]): string[] {
  return locales.filter((l) => LOCALE_ACTIVE[l] === true);
}
