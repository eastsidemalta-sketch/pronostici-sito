export {
  SUPPORTED_MARKETS,
  MARKET_CONFIG,
  MARKET_COOKIE_NAME,
  getActiveMarkets,
  getActiveMarketCodes,
  getActiveLocales,
  getDefaultLocale,
  getDefaultMarketCode,
  getMarketConfig,
  isMarketActive,
  getAllUrlSegments,
  getMarketCodeByUrlSegment,
  getMarketNameByUrlSegment,
  getIntlLocaleByUrlSegment,
  getCountryCodeByUrlSegment,
  determineMarket,
} from "./config";
export type { MarketConfig, ActiveMarket, MarketRequestContext } from "./config";
