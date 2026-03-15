export {
  MATCH_NOINDEX_AFTER_DAYS,
  isMatchExpiredForSeo,
  shouldOutputSeoMetadata,
  buildCanonical,
  getSafeSiteUrl,
  ROBOTS_INDEX_FOLLOW,
  ROBOTS_NOINDEX_FOLLOW,
  createIndexableMetadata,
  createNoindexMetadata,
  createMatchMetadata,
} from "./metadata";

export {
  getCoreUrls,
  getCompetizioniUrls,
  getSquadreUrls,
  getMercatiUrls,
  getSitemapIndexUrls,
  getActiveSportKeysForLinking,
  isSportLinkable,
  isSitemapAllowed,
  toSitemapXml,
  toSitemapIndexXml,
} from "./sitemap";
export type { SitemapUrl } from "./sitemap";

export { getBaseSchemaJsonLd } from "./schema";
export type { BaseSchemaParams } from "./schema";
