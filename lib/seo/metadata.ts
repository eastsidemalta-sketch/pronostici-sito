/**
 * Strategia SEO metadata per Next.js App Router.
 * Country-aware, language-aware, index/noindex.
 */

import { Metadata } from "next";
import { isCountryActive } from "@/lib/countries";

export function getSafeSiteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL || "https://playsignal.io";

  if (
    url.includes("localhost") ||
    url.includes("127.0.0.1")
  ) {
    return "https://playsignal.io";
  }

  return url;
}

/** Giorni oltre i quali un match passato diventa noindex */
export const MATCH_NOINDEX_AFTER_DAYS = 14;

/**
 * Verifica se un match è "scaduto" per SEO (noindex).
 * Finestra 14 giorni: bilancia freshness (Google preferisce contenuti recenti)
 * con utilità post-partita (pronostici, quote, risultati restano rilevanti).
 */
export function isMatchExpiredForSeo(matchDate: Date): boolean {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MATCH_NOINDEX_AFTER_DAYS);
  return matchDate < cutoff;
}

/** Verifica se il country è attivo e deve avere metadata SEO */
export function shouldOutputSeoMetadata(countryCode: string): boolean {
  return isCountryActive(countryCode);
}

/**
 * Sanitizza il path per canonical: rimuove query, hash, slash ridondanti.
 * Stesso output per varianti con parametri (?tab=, ?sort=, ecc.).
 */
function sanitizePathForCanonical(rawPath: string): string {
  const withoutQuery = rawPath.split("?")[0];
  const withoutHash = withoutQuery.split("#")[0];
  const trimmed = withoutHash.trim();
  const normalized = trimmed.replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
  return normalized;
}

/** Costruisce canonical URL: senza query, senza trailing slash, sempre indexabile */
export function buildCanonical(countryCode: string, pathWithoutCountry: string): string {
  const base = getSafeSiteUrl().replace(/\/$/, "");
  const path = sanitizePathForCanonical(pathWithoutCountry);
  const suffix = path ? `/${path}` : "";
  return `${base}/${countryCode}${suffix}`;
}

/** Robots: index,follow */
export const ROBOTS_INDEX_FOLLOW: Metadata["robots"] = {
  index: true,
  follow: true,
};

/** Robots: noindex,follow */
export const ROBOTS_NOINDEX_FOLLOW: Metadata["robots"] = {
  index: false,
  follow: true,
};

/**
 * Base metadata per pagine indicizzabili.
 * Usa solo per country attivi.
 */
export function createIndexableMetadata(params: {
  title: string;
  description: string;
  countryCode: string;
  pathWithoutCountry: string;
  openGraph?: { title?: string; description?: string; type?: "website" | "article" };
}): Metadata {
  const { title, description, countryCode, pathWithoutCountry, openGraph } = params;
  const canonical = buildCanonical(countryCode, pathWithoutCountry);
  const ogType: "website" | "article" = openGraph?.type ?? "website";

  return {
    title,
    description,
    robots: ROBOTS_INDEX_FOLLOW,
    alternates: { canonical },
    openGraph: {
      title: openGraph?.title ?? title,
      description: openGraph?.description ?? description,
      type: ogType,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: openGraph?.title ?? title,
      description: openGraph?.description ?? description,
    },
  };
}

/**
 * Metadata per pagine noindex (filtri, search, match scaduti).
 */
export function createNoindexMetadata(params: {
  title: string;
  description: string;
  countryCode: string;
  pathWithoutCountry: string;
}): Metadata {
  const { title, description, countryCode, pathWithoutCountry } = params;
  const canonical = buildCanonical(countryCode, pathWithoutCountry);

  return {
    title,
    description,
    robots: ROBOTS_NOINDEX_FOLLOW,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
    },
  };
}

/**
 * Metadata per match: index se futuro/recente, noindex se scaduto.
 */
export function createMatchMetadata(params: {
  title: string;
  description: string;
  countryCode: string;
  pathWithoutCountry: string;
  matchDate: Date;
  openGraph?: { title?: string; description?: string; type?: "website" | "article" };
}): Metadata {
  const { matchDate, ...rest } = params;
  const expired = isMatchExpiredForSeo(matchDate);

  if (expired) {
    return createNoindexMetadata(rest);
  }
  return createIndexableMetadata({
    ...rest,
    openGraph: params.openGraph,
  });
}
