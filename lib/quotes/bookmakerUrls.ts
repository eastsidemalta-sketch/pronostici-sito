import { getBookmakers } from "./bookmakers";

/**
 * Restituisce l'URL per il bottone "Scommetti" nelle quote.
 * Priorità: quoteButtonUrl > countryConfig scommetti > affiliateUrl
 * Cerca per apiBookmakerKey o per id (per provider direct).
 */
export function getBookmakerUrl(bookmakerKey: string, country?: string): string | null {
  const bookmakers = getBookmakers();
  const key = (bookmakerKey || "").toLowerCase().trim();
  const bm = bookmakers.find(
    (b) => b.apiBookmakerKey?.toLowerCase() === key || b.id.toLowerCase() === key
  );
  if (!bm) return null;

  if (bm.quoteButtonUrl) return bm.quoteButtonUrl;

  if (country && bm.countryConfig?.[country]) {
    const link = bm.countryConfig[country].links.find(
      (l) => l.useCase === "scommetti"
    );
    return link?.url ?? bm.affiliateUrl;
  }

  return bm.affiliateUrl ?? null;
}

/**
 * Restituisce un URL per un use case specifico (url2, url3, o da countryConfig).
 */
export function getBookmakerUrlByUseCase(
  bookmakerKey: string,
  useCase: string,
  country?: string
): string | null {
  const bookmakers = getBookmakers();
  const key = (bookmakerKey || "").toLowerCase().trim();
  const bm = bookmakers.find(
    (b) => b.apiBookmakerKey?.toLowerCase() === key || b.id.toLowerCase() === key
  );
  if (!bm) return null;

  if (useCase === bm.url2UseCase && bm.url2) return bm.url2;
  if (useCase === bm.url3UseCase && bm.url3) return bm.url3;

  if (country && bm.countryConfig?.[country]) {
    const link = bm.countryConfig[country].links.find(
      (l) => l.useCase === useCase
    );
    return link?.url ?? null;
  }

  return null;
}

/**
 * Restituisce la descrizione bonus per paese, se presente.
 */
export function getBookmakerBonusDescription(
  bookmakerKey: string,
  country: string
): string | null {
  const bookmakers = getBookmakers();
  const key = (bookmakerKey || "").toLowerCase().trim();
  const bm = bookmakers.find(
    (b) => b.apiBookmakerKey?.toLowerCase() === key || b.id.toLowerCase() === key
  );
  return bm?.countryConfig?.[country]?.bonusDescription ?? null;
}

/**
 * Restituisce tutti i link configurati per un bookmaker in un paese.
 */
export function getBookmakerLinks(
  bookmakerKey: string,
  country: string
): Array<{ url: string; useCase: string }> {
  const bookmakers = getBookmakers();
  const key = (bookmakerKey || "").toLowerCase().trim();
  const bm = bookmakers.find(
    (b) => b.apiBookmakerKey?.toLowerCase() === key || b.id.toLowerCase() === key
  );
  return bm?.countryConfig?.[country]?.links ?? [];
}
