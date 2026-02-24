import { Bookmaker } from "./bookmaker.types";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

const DEFAULT_BOOKMAKERS: Bookmaker[] = [
  {
    id: "bet365",
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
  try {
    if (existsSync(DATA_PATH)) {
      const raw = readFileSync(DATA_PATH, "utf-8");
      const parsed = JSON.parse(raw) as Bookmaker[];
      if (parsed.length > 0) return parsed;
    }
  } catch {
    // fallback to default
  }
  return DEFAULT_BOOKMAKERS;
}

export function saveBookmakers(bookmakers: Bookmaker[]): void {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(bookmakers, null, 2));
}
