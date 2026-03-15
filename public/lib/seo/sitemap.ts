/**
 * Sitemap XML SEO-safe per Next.js App Router.
 * Solo /it, no match, no filtri, no query.
 */

import { buildCanonical, getSafeSiteUrl } from "./metadata";
import { getActiveCountryCodes } from "@/lib/countries";
import { getDefaultLocale } from "@/lib/markets";

const ACTIVE_COUNTRY = getDefaultLocale();

export type SitemapUrl = {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

/** URL canonical per sitemap (sempre pulito, no query) */
function toCanonical(path: string): string {
  return buildCanonical(ACTIVE_COUNTRY, path);
}

/** Core: home, sport hub, pagine statiche. Valori conservativi per SEO. */
export function getCoreUrls(): SitemapUrl[] {
  const urls: SitemapUrl[] = [
    { loc: toCanonical(""), changefreq: "daily", priority: 0.8 },
    { loc: toCanonical("pronostici-quote"), changefreq: "daily", priority: 0.7 },
    { loc: toCanonical("bonus"), changefreq: "weekly", priority: 0.6 },
    { loc: toCanonical("siti-scommesse"), changefreq: "weekly", priority: 0.6 },
  ];
  return urls;
}

/** Competizioni: calcio hub, future (NO ?league=, NO match). Valori conservativi. */
export function getCompetizioniUrls(): SitemapUrl[] {
  const urls: SitemapUrl[] = [
    { loc: toCanonical("pronostici-quote/calcio"), changefreq: "weekly", priority: 0.6 },
    { loc: toCanonical("pronostici-quote/calcio/future"), changefreq: "weekly", priority: 0.6 },
  ];
  return urls;
}

/** Sport con contenuto reale e presenti in sitemap. Usato per internal linking orizzontale. */
export function getActiveSportKeysForLinking(): string[] {
  const urls = getCompetizioniUrls();
  const keys = new Set<string>();
  for (const u of urls) {
    const match = u.loc.match(/\/pronostici-quote\/([^/]+)(?:\/|$)/);
    if (match) keys.add(match[1]);
  }
  return Array.from(keys);
}

/** Link sport A → sport B consentito solo se entrambi hanno contenuto e sono in sitemap. */
export function isSportLinkable(sportKey: string): boolean {
  return getActiveSportKeysForLinking().includes(sportKey);
}

/** Squadre: nessuna pagina dedicata (placeholder per futuro) */
export function getSquadreUrls(): SitemapUrl[] {
  return [];
}

/** Mercati: nessuna pagina dedicata (placeholder per futuro) */
export function getMercatiUrls(): SitemapUrl[] {
  return [];
}

/** URL delle sitemap per l'index. Solo sitemap con contenuto reale. */
export function getSitemapIndexUrls(): { loc: string; lastmod?: string }[] {
  const base = getSafeSiteUrl().replace(/\/$/, "");
  const sitemaps: { loc: string }[] = [];
  if (getCoreUrls().length > 0) sitemaps.push({ loc: `${base}/sitemap-it-core.xml` });
  if (getCompetizioniUrls().length > 0) sitemaps.push({ loc: `${base}/sitemap-it-competizioni.xml` });
  if (getSquadreUrls().length > 0) sitemaps.push({ loc: `${base}/sitemap-it-squadre.xml` });
  if (getMercatiUrls().length > 0) sitemaps.push({ loc: `${base}/sitemap-it-mercati.xml` });
  return sitemaps;
}

/** Verifica che solo country attivo sia incluso */
export function isSitemapAllowed(): boolean {
  const active = getActiveCountryCodes();
  return active.includes(ACTIVE_COUNTRY);
}

/** Genera XML per sitemap URL set */
export function toSitemapXml(urls: SitemapUrl[]): string {
  const lastmod = new Date().toISOString().split("T")[0];
  const entries = urls.map((u) => {
    const loc = escapeXml(u.loc);
    const lm = u.lastmod ?? lastmod;
    const cf = u.changefreq ? `    <changefreq>${u.changefreq}</changefreq>\n` : "";
    const pr = u.priority !== undefined ? `    <priority>${u.priority}</priority>\n` : "";
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lm}</lastmod>\n${cf}${pr}  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`;
}

/** Genera XML per sitemap index */
export function toSitemapIndexXml(sitemaps: { loc: string; lastmod?: string }[]): string {
  const lastmod = new Date().toISOString().split("T")[0];
  const entries = sitemaps.map((s) => {
    const loc = escapeXml(s.loc);
    const lm = s.lastmod ?? lastmod;
    return `  <sitemap>\n    <loc>${loc}</loc>\n    <lastmod>${lm}</lastmod>\n  </sitemap>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</sitemapindex>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
