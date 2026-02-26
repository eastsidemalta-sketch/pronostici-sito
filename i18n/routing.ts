import { defineRouting } from "next-intl/routing";
import {
  getActiveLocales,
  getDefaultLocale,
  getAllUrlSegments,
  getMarketNameByUrlSegment,
  getCountryCodeByUrlSegment,
  getIntlLocaleByUrlSegment,
} from "@/lib/markets";

/**
 * Routing derivato da SUPPORTED_MARKETS.
 * Solo mercati con active: true sono raggiungibili.
 */
export const routing = defineRouting({
  locales: getActiveLocales(),
  defaultLocale: getDefaultLocale(),
  localePrefix: "always",
});

/** Tutti i segmenti noti (attivi + dormienti) - per segment guard */
export const allUrlSegments = getAllUrlSegments();

/** Mappa locale (urlSegment) -> nome paese (per footer, metadata, ecc.) */
export function getLocaleToCountry(): Record<string, string> {
  return Object.fromEntries(
    allUrlSegments.map((seg) => [seg, getMarketNameByUrlSegment(seg)])
  );
}

/** Mappa locale -> codice paese ISO (per link bookmaker per paese) */
export function getLocaleToCountryCode(): Record<string, string> {
  return Object.fromEntries(
    allUrlSegments.map((seg) => [seg, getCountryCodeByUrlSegment(seg)])
  );
}

/** Mappa locale -> Intl (per formattazione date) */
export function getLocaleToIntl(): Record<string, string> {
  return Object.fromEntries(
    allUrlSegments.map((seg) => [seg, getIntlLocaleByUrlSegment(seg)])
  );
}

/** Retrocompatibilità: oggetti statici per import diretto */
export const localeToCountry: Record<string, string> = getLocaleToCountry();
export const localeToCountryCode: Record<string, string> = getLocaleToCountryCode();
export const localeToIntl: Record<string, string> = getLocaleToIntl();
