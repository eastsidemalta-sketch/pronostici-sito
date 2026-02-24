/**
 * Configurazione multi-country.
 * Usato per: attivazione country, hreflang, Coming Soon.
 *
 * Compatibile con [locale] attuale e futuro [country].
 */

export type CountryConfig = {
  /** Codice URL (locale o country) */
  code: string;
  /** Locale Intl (it-IT, pt-BR, en-NG...) */
  locale: string;
  /** Nome paese */
  name: string;
  /** Pubblicato e indicizzabile */
  active: boolean;
  /** Se attivo ma in beta: noindex */
  noindex?: boolean;
};

/** Tutti i country configurati (attivi e dormienti) */
export const COUNTRIES: CountryConfig[] = [
  { code: "it", locale: "it-IT", name: "Italia", active: true },
  { code: "br", locale: "pt-BR", name: "Brasil", active: false },
  { code: "ng", locale: "en-NG", name: "Nigeria", active: false },
  { code: "ke", locale: "en-KE", name: "Kenya", active: false },
  { code: "gh", locale: "en-GH", name: "Ghana", active: false },
];

/** Locales attuali (it, fr, es...) con flag active per hreflang */
export const LOCALE_ACTIVE: Record<string, boolean> = {
  it: true,
  fr: false,
  es: false,
  de: false,
  en: false,
  "pt-BR": false,
};

export const ACTIVE_COUNTRIES = COUNTRIES.filter((c) => c.active);
export const DEFAULT_COUNTRY = "it";

export function getCountryConfig(code: string): CountryConfig | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function isCountryActive(code: string): boolean {
  return getCountryConfig(code)?.active ?? false;
}

/** Country attivi (per sitemap, hreflang, IA signals) */
export function getActiveCountries(): CountryConfig[] {
  return COUNTRIES.filter((c) => c.active);
}

/** Codici attivi (per generateStaticParams, hreflang) */
export function getActiveCountryCodes(): string[] {
  return getActiveCountries().map((c) => c.code);
}

/** Locales attivi per hreflang (compatibile con routing.locales attuale) */
export function getActiveLocalesForHreflang(locales: string[]): string[] {
  return locales.filter((l) => LOCALE_ACTIVE[l] === true);
}
