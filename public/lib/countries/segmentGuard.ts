/**
 * Guard per segmento market/locale.
 * Usato in middleware per bloccare richieste a mercati non attivi
 * PRIMA che layout/page/generateMetadata vengano eseguiti.
 *
 * Config-driven: deriva da SUPPORTED_MARKETS.
 */

import { getAllUrlSegments, getActiveLocales } from "@/lib/markets";

/** Segmenti noti (tutti i mercati configurati) */
function getKnownSegmentCodes(): Set<string> {
  return new Set(getAllUrlSegments());
}

/** Segmenti attivi (solo questi raggiungono layout/page) */
function getActiveSegmentCodes(): Set<string> {
  return new Set(getActiveLocales());
}

/**
 * Restituisce true se la richiesta deve essere bloccata (404).
 * Chiamare in middleware PRIMA di createMiddleware(next-intl).
 */
export function shouldBlockInactiveSegment(pathname: string): boolean {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (!segment) return false;

  const known = getKnownSegmentCodes();
  const active = getActiveSegmentCodes();

  return known.has(segment) && !active.has(segment);
}
