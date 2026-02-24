export {
  COUNTRIES,
  ACTIVE_COUNTRIES,
  DEFAULT_COUNTRY,
  getCountryConfig,
  isCountryActive,
  getActiveCountries,
  getActiveCountryCodes,
  getActiveLocalesForHreflang,
  LOCALE_ACTIVE,
} from "./config";
export type { CountryConfig } from "./config";

export { isBotUserAgent, isBotRequest } from "./isBot";

export {
  buildHreflangAlternates,
  stripLocaleFromPath,
  getAlternatesWithHreflang,
} from "./hreflang";
