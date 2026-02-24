/**
 * Genera alternates.languages per metadata.
 * Outputta hreflang SOLO per locale/country attivi.
 *
 * Evita "alternate without hreflang return" quando attivi nuovi country.
 */

import { getActiveCountryCodes, getActiveLocalesForHreflang } from "./config";

/**
 * Genera alternates.languages per Metadata.
 * Solo per locale/country con active === true.
 *
 * @param baseUrl - es. https://site.com
 * @param pathWithoutLocale - es. /pronostici-quote/calcio/inter-juventus-fixture-123
 * @param allLocales - lista completa (es. routing.locales)
 * @param mode - "locale" per [locale] attuale, "country" per futuro [country]
 */
export function buildHreflangAlternates(
  baseUrl: string,
  pathWithoutLocale: string,
  allLocales: string[],
  mode: "locale" | "country" = "locale"
): Record<string, string> {
  const activeCodes =
    mode === "country"
      ? getActiveCountryCodes()
      : getActiveLocalesForHreflang(allLocales);

  if (activeCodes.length <= 1) {
    return {};
  }

  const languages: Record<string, string> = {};
  const cleanBase = baseUrl.replace(/\/$/, "");
  const cleanPath = pathWithoutLocale.startsWith("/") ? pathWithoutLocale : `/${pathWithoutLocale}`;

  for (const code of activeCodes) {
    const href = `${cleanBase}/${code}${cleanPath}`;
    const hreflang = codeToHreflang(code);
    languages[hreflang] = href;
  }

  return languages;
}

/**
 * Mappa code -> hreflang (es. it -> it, pt-BR -> pt-BR)
 */
function codeToHreflang(code: string): string {
  const map: Record<string, string> = {
    it: "it",
    fr: "fr",
    es: "es",
    de: "de",
    en: "en-GB",
    "pt-BR": "pt-BR",
    br: "pt-BR",
    ng: "en-NG",
    ke: "en-KE",
    gh: "en-GH",
  };
  return map[code] ?? code;
}

/**
 * Helper: estrae path senza il primo segmento (locale/country).
 * Es. /it/pronostici-quote/calcio/x -> /pronostici-quote/calcio/x
 */
export function stripLocaleFromPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return "/";
  return "/" + segments.slice(1).join("/");
}

/**
 * Restituisce alternates pronto per Metadata.
 * Usa in generateMetadata:
 *
 *   alternates: {
 *     canonical: `...`,
 *     ...getAlternatesWithHreflang(SITE_URL, `/${locale}/path`, routing.locales),
 *   }
 *
 * Outputta languages solo se ci sono 2+ locale attivi.
 */
export function getAlternatesWithHreflang(
  baseUrl: string,
  fullPathname: string,
  allLocales: string[],
  mode: "locale" | "country" = "locale"
): { languages?: Record<string, string> } {
  const pathWithoutLocale = stripLocaleFromPath(fullPathname);
  const languages = buildHreflangAlternates(
    baseUrl,
    pathWithoutLocale,
    allLocales,
    mode
  );
  if (Object.keys(languages).length === 0) return {};
  return { languages };
}
