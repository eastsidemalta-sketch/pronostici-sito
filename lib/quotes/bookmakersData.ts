import { Bookmaker } from "./bookmaker.types";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

/** Genera siteId: {ISO2}-{4 cifre} es. IT-0001 */
export function generateSiteId(
  country: string,
  existingBookmakers: Bookmaker[]
): string {
  const countryCode = (country || "XX").toUpperCase().slice(0, 2) || "XX";
  const prefix = `${countryCode}-`;
  const existing = existingBookmakers
    .map((b) => b.siteId)
    .filter((s): s is string => !!s && s.startsWith(prefix));
  const numbers = existing
    .map((s) => parseInt(s.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${countryCode}-${String(nextNum).padStart(4, "0")}`;
}

/** Assegna siteId ai bookmaker che non ce l'hanno (migrazione) */
function ensureSiteIds(bookmakers: Bookmaker[]): Bookmaker[] {
  const result = [...bookmakers];
  let changed = false;
  for (let i = 0; i < result.length; i++) {
    if (result[i].siteId) continue;
    const siteId = generateSiteId(result[i].country, result);
    result[i] = { ...result[i], siteId };
    changed = true;
  }
  return changed ? result : bookmakers;
}

const DEFAULT_BOOKMAKERS: Bookmaker[] = [
  {
    id: "bet365",
    siteId: "IT-0001",
    name: "Bet365",
    slug: "bet365",
    country: "IT",
    countries: ["IT", "DE", "ES", "FR", "UK"],
    countryConfig: {
      IT: {
        bonusDescription: "Bonus benvenuto 100% fino a 100€",
        links: [
          { url: "https://example.com/bet365-it", useCase: "scommetti" },
          { url: "https://example.com/bet365-reg", useCase: "registrati" },
          { url: "https://example.com/bet365-bonus", useCase: "bonus" },
        ],
      },
      DE: {
        bonusDescription: "Willkommensbonus bis 100€",
        links: [
          { url: "https://example.com/bet365-de", useCase: "scommetti" },
          { url: "https://example.com/bet365-reg-de", useCase: "registrati" },
        ],
      },
    },
    logoUrl: "/logos/bet365.svg",
    affiliateUrl: "https://example.com/bet365",
    isActive: true,
    apiProvider: "the_odds_api",
    apiKey: "", // usa THE_ODDS_API_KEY da .env se vuoto
    apiBookmakerKey: "bet365",
    apiConfig: { markets: ["h2h"] },
  },
  {
    id: "pmu",
    siteId: "FR-0001",
    name: "PMU",
    slug: "pmu",
    country: "FR",
    countries: ["FR"],
    logoUrl: "/logos/pmu.webp",
    affiliateUrl: "https://www.pmu.fr",
    isActive: true,
    apiProvider: "the_odds_api",
    apiKey: "",
    apiBookmakerKey: "pmu",
    apiConfig: { markets: ["h2h"] },
  },
];

const DATA_PATH = path.join(process.cwd(), "data", "bookmakers.json");

export function getBookmakers(): Bookmaker[] {
  let bookmakers: Bookmaker[];
  try {
    if (existsSync(DATA_PATH)) {
      const raw = readFileSync(DATA_PATH, "utf-8");
      const parsed = JSON.parse(raw) as Bookmaker[];
      if (parsed.length > 0) {
        bookmakers = parsed;
      } else {
        bookmakers = DEFAULT_BOOKMAKERS;
      }
    } else {
      bookmakers = DEFAULT_BOOKMAKERS;
    }
  } catch {
    bookmakers = DEFAULT_BOOKMAKERS;
  }
  const withSiteIds = ensureSiteIds(bookmakers);
  const needsSave = withSiteIds.some(
    (b, i) => b.siteId !== bookmakers[i]?.siteId
  );
  if (needsSave) {
    saveBookmakers(withSiteIds);
    return withSiteIds;
  }
  return bookmakers;
}

export function saveBookmakers(bookmakers: Bookmaker[]): void {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(bookmakers, null, 2));
}

/** Trova bookmaker per siteId (es. IT-0001). Per bonus, API, ecc. */
export function getBookmakerBySiteId(siteId: string): Bookmaker | undefined {
  const normalized = (siteId || "").trim().toUpperCase();
  if (!normalized) return undefined;
  return getBookmakers().find(
    (b) => b.siteId?.toUpperCase() === normalized
  );
}
