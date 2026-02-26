/** Tipi per bookmaker e quote */

/** Dove utilizzare il link: scommetti, registrati, bonus, ecc. */
export type BookmakerLinkUseCase = "scommetti" | "registrati" | "bonus" | "casino" | "sport" | string;

export type BookmakerCountryConfig = {
  bonusDescription?: string; // descrizione bonus per quel paese
  links: Array<{
    url: string;
    useCase: BookmakerLinkUseCase; // dove utilizzare il link
  }>;
  /** Attiva Bonus sotto "Tutte le quote" */
  matchBoxBonusEnabled?: boolean;
  /** Testo bottone sotto "Tutte le quote" */
  matchBoxButtonText?: string;
  /** URL redirect sotto "Tutte le quote" */
  matchBoxButtonUrl?: string;
  /** Attiva Bonus sotto "Pronostici completi" */
  matchBoxBonusInPronosticiEnabled?: boolean;
  /** Testo bottone sotto "Pronostici completi" (se vuoto usa matchBoxButtonText) */
  matchBoxPronosticiButtonText?: string;
  /** URL redirect sotto "Pronostici completi" (se vuoto usa matchBoxButtonUrl) */
  matchBoxPronosticiButtonUrl?: string;
  /** Colore del box bonus: giallo (default) o arancione */
  matchBoxButtonColor?: "yellow" | "orange";
};

export type Bookmaker = {
  id: string;
  /** ID univoco per integrazioni: {ISO2}-{4 cifre} es. IT-0001, BR-0002 */
  siteId?: string;
  name: string;
  /** Nome visibile sul sito (se vuoto usa name) */
  displayName?: string | null;
  slug: string;
  country: string; // paese principale/sede
  countries?: string[]; // paesi in cui il bookmaker è presente (es. ["IT", "DE", "ES"])
  /** Config per paese: link e descrizione bonus per ogni paese */
  countryConfig?: Record<string, BookmakerCountryConfig>;
  logoUrl: string;
  /** Favicon (path es. /favicons/bet365.ico) - opzionale */
  faviconUrl?: string | null;
  /** Url di base / affiliate principale */
  affiliateUrl: string; // fallback se non c'è countryConfig
  /** Link specifico per il bottone "Scommetti" nelle quote */
  quoteButtonUrl?: string | null;
  /** Secondo URL con use case (es. registrati, bonus) */
  url2?: string | null;
  url2UseCase?: string; // dove utilizzare url2
  /** Terzo URL con use case */
  url3?: string | null;
  url3UseCase?: string; // dove utilizzare url3
  isActive: boolean;

  apiProvider: "the_odds_api" | "direct"; // the_odds_api = aggregatore, direct = API del bookmaker
  /** URL base API quote (es. The Odds API) */
  apiBaseUrl?: string;
  apiKey: string; // chiave API
  apiBookmakerKey?: string; // chiave The Odds API (es. "bet365") - solo se apiProvider=the_odds_api
  apiConfig: {
    markets: string[];
  };

  /** === API diretta (solo se apiProvider=direct) === */
  /** URL documentazione API fornita dal bookmaker */
  apiDocumentationUrl?: string | null;
  /** Endpoint completo per le quote (es. https://api.bookmaker.com/v1/odds) */
  apiEndpoint?: string | null;
  /** Come inviare la chiave: query (param), header (X-Api-Key), bearer */
  apiAuthType?: "query" | "header" | "bearer";
  /** Chiave segreta aggiuntiva (es. per header Authorization) */
  apiSecret?: string | null;
  /** Mapping scoperto automaticamente: percorsi JSON per homeTeam, awayTeam, odds 1/X/2 */
  apiMappingConfig?: {
    homeTeam?: string; // es. "$.home" o "event.homeTeam"
    awayTeam?: string;
    odds1?: string;
    oddsX?: string;
    odds2?: string;
    /** Path per iterare sugli eventi (es. "$.events" o "data") */
    eventsPath?: string;
  } | null;
  /** Stato ultimo tentativo matching: pending | testing | matched | failed */
  apiDiscoveryStatus?: "pending" | "testing" | "matched" | "failed";
  /** Mapping leagueId (API-Football) -> identificatore lega per questo bookmaker */
  apiLeagueMapping?: Record<string, string>;
  /** Config richiesta: method, queryParams, body (per POST) */
  apiRequestConfig?: {
    method?: "GET" | "POST";
    queryParams?: Record<string, string>;
    bodyTemplate?: Record<string, unknown>;
  };
}
