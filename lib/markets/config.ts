/**
 * MARKET MANAGEMENT - Configurazione centrale enterprise-grade.
 *
 * Single source of truth per:
 * - Mercato di default (obbligatorio, deve essere active)
 * - Mercati attivi/dormienti
 * - Lingue, valuta, locale
 * - Routing, segment guard, hreflang
 *
 * Per attivare un nuovo paese: impostare active: true.
 * Nessuna logica hardcoded su paesi specifici.
 */

export type MarketConfig = {
  /** Mercato pubblicato e raggiungibile */
  active: boolean;
  /** Lingue supportate (codice BCP 47) */
  languages: string[];
  /** Valuta di default */
  defaultCurrency: string;
  /** Locale Intl per formattazione (es. it-IT, pt-BR) */
  defaultLocale: string;
  /** Segmento URL per next-intl (es. it, pt-BR, en-NG) */
  urlSegment: string;
  /** Nome paese per UI (footer, metadata) */
  name: string;
  /** Se attivo ma in beta: noindex */
  noindex?: boolean;
};

/** Configurazione mercati - unica fonte di verità */
export const SUPPORTED_MARKETS: Record<string, MarketConfig> = {
  IT: {
    active: true,
    languages: ["it"],
    defaultCurrency: "EUR",
    defaultLocale: "it-IT",
    urlSegment: "it",
    name: "Italia",
  },
  FR: {
    active: false,
    languages: ["fr"],
    defaultCurrency: "EUR",
    defaultLocale: "fr-FR",
    urlSegment: "fr",
    name: "France",
  },
  ES: {
    active: false,
    languages: ["es"],
    defaultCurrency: "EUR",
    defaultLocale: "es-ES",
    urlSegment: "es",
    name: "España",
  },
  DE: {
    active: false,
    languages: ["de"],
    defaultCurrency: "EUR",
    defaultLocale: "de-DE",
    urlSegment: "de",
    name: "Deutschland",
  },
  UK: {
    active: false,
    languages: ["en"],
    defaultCurrency: "GBP",
    defaultLocale: "en-GB",
    urlSegment: "en",
    name: "United Kingdom",
  },
  BR: {
    active: false,
    languages: ["pt"],
    defaultCurrency: "BRL",
    defaultLocale: "pt-BR",
    urlSegment: "pt-BR",
    name: "Brasil",
  },
  NG: {
    active: false,
    languages: ["en"],
    defaultCurrency: "NGN",
    defaultLocale: "en-NG",
    urlSegment: "en-NG",
    name: "Nigeria",
  },
  KE: {
    active: false,
    languages: ["en"],
    defaultCurrency: "KES",
    defaultLocale: "en-KE",
    urlSegment: "en-KE",
    name: "Kenya",
  },
  GH: {
    active: false,
    languages: ["en"],
    defaultCurrency: "GHS",
    defaultLocale: "en-GH",
    urlSegment: "en-GH",
    name: "Ghana",
  },
};

/** Mercato di default: obbligatorio, deve essere presente in SUPPORTED_MARKETS e active: true */
const DEFAULT_MARKET = "IT";

/** Configurazione mercati - struttura completa (defaultMarket esplicito) */
export const MARKET_CONFIG = {
  defaultMarket: DEFAULT_MARKET,
  supportedMarkets: SUPPORTED_MARKETS,
} as const;

/** Validazione a startup: defaultMarket deve esistere e essere active */
function validateDefaultMarket(): void {
  const config = SUPPORTED_MARKETS[DEFAULT_MARKET];
  if (!config) {
    throw new Error(
      `[MARKET_CONFIG] defaultMarket "${DEFAULT_MARKET}" non presente in SUPPORTED_MARKETS`
    );
  }
  if (!config.active) {
    throw new Error(
      `[MARKET_CONFIG] defaultMarket "${DEFAULT_MARKET}" deve avere active: true`
    );
  }
}
validateDefaultMarket();

export type ActiveMarket = MarketConfig & { code: string };

/** Mercati attivi (active === true) */
export function getActiveMarkets(): ActiveMarket[] {
  return Object.entries(SUPPORTED_MARKETS)
    .filter(([, c]) => c.active)
    .map(([code, config]) => ({ ...config, code }));
}

/** Codici mercato attivi (IT, BR, ...) */
export function getActiveMarketCodes(): string[] {
  return getActiveMarkets().map((m) => m.code);
}

/** Locales attivi per routing (urlSegment dei mercati attivi) */
export function getActiveLocales(): string[] {
  return getActiveMarkets().map((m) => m.urlSegment);
}

/** Locale di default (urlSegment di defaultMarket) */
export function getDefaultLocale(): string {
  const config = SUPPORTED_MARKETS[MARKET_CONFIG.defaultMarket];
  return config?.urlSegment ?? "it";
}

/** Mercato di default (sempre MARKET_CONFIG.defaultMarket) */
export function getDefaultMarketCode(): string {
  return MARKET_CONFIG.defaultMarket;
}

/** Config per codice mercato */
export function getMarketConfig(code: string): MarketConfig | undefined {
  const upper = code.toUpperCase();
  return SUPPORTED_MARKETS[upper];
}

/** Verifica se mercato è attivo */
export function isMarketActive(code: string): boolean {
  return getMarketConfig(code)?.active ?? false;
}

/** Tutti i segmenti URL noti (attivi + dormienti) per segment guard */
export function getAllUrlSegments(): string[] {
  return Object.values(SUPPORTED_MARKETS).map((m) => m.urlSegment);
}

/** Mappa urlSegment -> codice mercato */
export function getMarketCodeByUrlSegment(segment: string): string | undefined {
  const entry = Object.entries(SUPPORTED_MARKETS).find(
    ([, c]) => c.urlSegment === segment
  );
  return entry?.[0];
}

/** Mappa urlSegment -> nome paese */
export function getMarketNameByUrlSegment(segment: string): string {
  const entry = Object.entries(SUPPORTED_MARKETS).find(
    ([, c]) => c.urlSegment === segment
  );
  return entry?.[1]?.name ?? segment;
}

/** Mappa urlSegment -> defaultLocale Intl */
export function getIntlLocaleByUrlSegment(segment: string): string {
  const entry = Object.entries(SUPPORTED_MARKETS).find(
    ([, c]) => c.urlSegment === segment
  );
  return entry?.[1]?.defaultLocale ?? segment;
}

/** Mappa urlSegment -> codice paese ISO (per bookmaker links, ecc.) */
export function getCountryCodeByUrlSegment(segment: string): string {
  const code = getMarketCodeByUrlSegment(segment);
  return code ?? segment.toUpperCase();
}

/** Nome cookie per preferenza mercato (validato contro config) */
export const MARKET_COOKIE_NAME = "market";

/** Context minimo per determineMarket (compatibile con NextRequest) */
export type MarketRequestContext = {
  cookies?: { get(name: string): { value: string } | undefined };
  headers?: Headers;
};

/**
 * Determina il mercato da usare per una richiesta.
 *
 * Ordine:
 * 1. Cookie "market": se esiste, valida (presente in config + active) → usa, altrimenti ignora
 * 2. Accept-Language: match contro mercati active → primo match
 * 3. Fallback: sempre defaultMarket (deterministico)
 *
 * Mai fidarsi del cookie ciecamente. Mai usare ordine oggetti o "primo attivo".
 */
export function determineMarket(context: MarketRequestContext): string {
  const defaultMarket = MARKET_CONFIG.defaultMarket;

  // 1. Cookie: validare prima di usare
  const cookieValue = context.cookies?.get(MARKET_COOKIE_NAME)?.value?.trim();
  if (cookieValue) {
    const code = cookieValue.toUpperCase();
    const config = SUPPORTED_MARKETS[code];
    if (config?.active) {
      return code;
    }
    // Cookie invalido (inesistente o non active): ignorare, non usare
  }

  // 2. Accept-Language: match contro mercati active
  const acceptLanguage = context.headers?.get("accept-language");
  if (acceptLanguage) {
    const matched = matchAcceptLanguageToMarket(acceptLanguage);
    if (matched) return matched;
  }

  // 3. Fallback deterministico: sempre defaultMarket
  return defaultMarket;
}

/**
 * Estrae lingue da Accept-Language in ordine di preferenza (quality).
 * Formato: "en-US,en;q=0.9,pt;q=0.8" → ["en", "pt"]
 */
function parseAcceptLanguage(header: string): string[] {
  const parts = header.split(",").map((p) => p.trim());
  const withQ = parts.map((p) => {
    const [lang, qPart] = p.split(";").map((s) => s.trim());
    const q = qPart?.startsWith("q=") ? parseFloat(qPart.slice(2)) : 1;
    const primary = lang?.split("-")[0]?.toLowerCase() ?? "";
    return { primary, q };
  });
  withQ.sort((a, b) => b.q - a.q);
  const seen = new Set<string>();
  return withQ
    .map((x) => x.primary)
    .filter((p) => p && !seen.has(p) && (seen.add(p), true));
}

/** Match Accept-Language contro mercati active. Ritorna primo match o undefined. */
function matchAcceptLanguageToMarket(acceptLanguage: string): string | undefined {
  const preferredLangs = parseAcceptLanguage(acceptLanguage);
  const activeMarkets = getActiveMarkets();

  for (const lang of preferredLangs) {
    const market = activeMarkets.find((m) =>
      m.languages.some((l) => l.toLowerCase() === lang)
    );
    if (market) return market.code;
  }
  return undefined;
}
