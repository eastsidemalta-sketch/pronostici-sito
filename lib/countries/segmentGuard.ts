/**
 * Guard per segmento country/locale.
 * Usato in middleware per bloccare richieste a country non attivi
 * PRIMA che layout/page/generateMetadata vengano eseguiti.
 */

import {
  COUNTRIES,
  getActiveCountryCodes,
  LOCALE_ACTIVE,
} from "./config";

/** Segmenti noti (locale o country) */
function getKnownSegmentCodes(locales: string[]): Set<string> {
  const fromCountries = COUNTRIES.map((c) => c.code);
  return new Set([...locales, ...fromCountries]);
}

/** Segmenti attivi (solo questi raggiungono layout/page) */
function getActiveSegmentCodes(): Set<string> {
  const fromCountries = getActiveCountryCodes();
  const fromLocales = Object.entries(LOCALE_ACTIVE)
    .filter(([, active]) => active)
    .map(([code]) => code);
  return new Set([...fromCountries, ...fromLocales]);
}

/**
 * Restituisce true se la richiesta deve essere bloccata (404).
 * Chiamare in middleware PRIMA di createMiddleware(next-intl).
 */
export function shouldBlockInactiveSegment(
  pathname: string,
  locales: string[]
): boolean {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (!segment) return false;

  const known = getKnownSegmentCodes(locales);
  const active = getActiveSegmentCodes();

  return known.has(segment) && !active.has(segment);
}
