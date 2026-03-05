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
    isActive: false,
    apiProvider: "direct",
    apiKey: "",
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
    isActive: false,
    apiProvider: "direct",
    apiKey: "",
    apiBookmakerKey: "pmu",
    apiConfig: { markets: ["h2h"] },
  },
  {
    id: "betboom",
    siteId: "BR-0001",
    name: "Betboom",
    slug: "betboom",
    country: "BR",
    countries: ["BR"],
    logoUrl: "/logos/betboom.png",
    faviconUrl: "/favicons/betboom.png",
    affiliateUrl: "https://click.betboom.com/0p7o0R0n",
    isActive: false,
    apiProvider: "direct",
    apiKey: "",
    apiBookmakerKey: "betboom",
    apiConfig: { markets: ["h2h"] },
    countryConfig: {
      BR: {
        bonusDescription: "Bônus de boas-vindas para novos apostadores. Cadastre-se e aproveite as melhores odds em futebol, esportes e apostas ao vivo.",
        links: [
          { url: "https://click.betboom.com/0p7o0R0n", useCase: "scommetti" },
          { url: "https://click.betboom.com/0p7o0R0n", useCase: "registrati" },
          { url: "https://click.betboom.com/0p7o0R0n", useCase: "bonus" },
        ],
      },
    },
  },
];

const DATA_PATH = path.join(process.cwd(), "data", "bookmakers.json");
const PROFILES_PATH = path.join(process.cwd(), "data", "clientProfiles.json");

type ClientProfile = {
  siteId?: string;
  name?: string;
  internalName?: string;
  bookmakerId?: string;
  affiliateUrl?: string;
  logoPath?: string;
  faviconPath?: string;
  bonusDescription?: string;
  /** Testo commissione (es. "Revenue Share 40%") - informativo */
  commission?: string;
  /** Remunerazione applicata al bookmaker */
  remuneration?: { model: "CPA" | "CPL" | "revenue_share"; value: number };
  api?: {
    enabled?: boolean;
    endpoint?: string;
    method?: string;
    params?: Record<string, string>;
    bodyTemplate?: Record<string, unknown>; // per POST (es. Betboom: locale, market_ids, type)
    apiKeyEnv?: string; // es. "BETBOOM_API_KEY" - usa process.env[apiKeyEnv]
    authType?: "query" | "header" | "bearer";
    mapping?: Record<string, unknown>;
    apiLeagueMapping?: Record<string, string>; // leagueId -> category_id o tournament_id
  };
};

/** Inietta bookmaker da clientProfiles se non già presenti (es. Netwin IT-002) */
function injectFromClientProfiles(bookmakers: Bookmaker[]): Bookmaker[] {
  try {
    if (!existsSync(PROFILES_PATH)) return bookmakers;
    const profiles = JSON.parse(readFileSync(PROFILES_PATH, "utf-8")) as Record<string, ClientProfile>;
    const existingIds = new Set(bookmakers.map((b) => (b.siteId || b.id || "").toUpperCase()));
    const toAdd: Bookmaker[] = [];
    for (const [siteId, profile] of Object.entries(profiles)) {
      if (!profile || existingIds.has(siteId.toUpperCase())) continue;
      toAdd.push({
        id: profile.bookmakerId || profile.internalName?.toLowerCase().replace(/\s+/g, "") || "netwinit",
        siteId: profile.siteId || siteId,
        name: profile.name || "Netwin",
        slug: "netwinit",
        country: "IT",
        countries: ["IT"],
        logoUrl: profile.logoPath || "/logos/netwin-it-2.png",
        faviconUrl: profile.faviconPath,
        affiliateUrl: profile.affiliateUrl || "",
        isActive: true,
        apiProvider: "direct",
        apiKey: "",
        apiConfig: { markets: ["h2h"] },
        countryConfig: {
          IT: {
            bonusDescription: profile.bonusDescription,
            links: [{ url: profile.affiliateUrl || "", useCase: "bonus" }],
          },
        },
      } as Bookmaker);
    }
    return toAdd.length > 0 ? [...toAdd, ...bookmakers] : bookmakers;
  } catch {
    return bookmakers;
  }
}

/** Applica override da clientProfiles (logo, favicon, remuneration, api) ai bookmaker corrispondenti */
function applyClientProfilesOverrides(bookmakers: Bookmaker[]): Bookmaker[] {
  try {
    if (!existsSync(PROFILES_PATH)) return bookmakers;
    const profiles = JSON.parse(readFileSync(PROFILES_PATH, "utf-8")) as Record<string, ClientProfile>;
    return bookmakers.map((bm) => {
      const siteId = bm.siteId || "";
      const profile = profiles[siteId];
      if (!profile) return bm;
      const updates: Partial<Bookmaker> = {};
      if (profile.logoPath) updates.logoUrl = profile.logoPath;
      if (profile.faviconPath) updates.faviconUrl = profile.faviconPath;
      if (profile.remuneration) updates.remuneration = profile.remuneration;

      if (profile.api?.enabled && profile.api.endpoint) {
        updates.apiProvider = "direct";
        updates.isActive = true;
        updates.apiEndpoint = profile.api.endpoint;
        updates.apiAuthType = (profile.api.authType as "query" | "header" | "bearer") ?? "bearer";
        updates.apiMappingConfig = profile.api.mapping as Bookmaker["apiMappingConfig"] ?? undefined;
        updates.apiRequestConfig = {
          method: (profile.api.method === "POST" ? "POST" : "GET") as "GET" | "POST",
          queryParams: { ...profile.api.params },
          bodyTemplate: profile.api.bodyTemplate,
        };
        if (profile.api.apiLeagueMapping) updates.apiLeagueMapping = profile.api.apiLeagueMapping;
        if (profile.api.apiKeyEnv) {
          const key = process.env[profile.api.apiKeyEnv];
          if (key) updates.apiKey = key;
        } else if (profile.api.params?.apiKey) {
          updates.apiKey = profile.api.params.apiKey;
        }
      }

      return Object.keys(updates).length > 0 ? { ...bm, ...updates } : bm;
    });
  } catch {
    return bookmakers;
  }
}

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
  if (needsSave) saveBookmakers(withSiteIds);
  const toReturn = needsSave ? withSiteIds : bookmakers;
  const withProfiles = injectFromClientProfiles(toReturn);
  return applyClientProfilesOverrides(withProfiles);
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
