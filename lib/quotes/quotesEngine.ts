import { getBookmakers, getBookmakerDisplayName } from "./bookmakers";
import { fetchOddsFromTheOddsApi } from "./providers/theOddsApi";
import { fetchDirectBookmakerQuotes } from "./providers/directBookmakerFetcher";
import { normalizeOdds } from "./normalizer";
import { normalizeMultiMarket } from "./multiMarketNormalizer";
import { matchTeamNames } from "@/lib/teamAliases";
import { compareBookmakers } from "./bookmakerRanking";
import type { RemunerationConfig } from "./bookmaker.types";

const matchTeam = (a: string, b: string) => matchTeamNames(a, b);

function filterByMatch<T extends { homeTeam?: string; awayTeam?: string }>(
  items: T[],
  home?: string,
  away?: string
): T[] {
  if (!home || !away) return items;
  const h = home.toLowerCase().trim();
  const a = away.toLowerCase().trim();
  return items.filter((q) => {
    const qHome = (q.homeTeam || "").toLowerCase().trim();
    const qAway = (q.awayTeam || "").toLowerCase().trim();
    return matchTeam(qHome, h) && matchTeam(qAway, a);
  });
}

export async function getQuotesForMatch(
  sportKey: string,
  options?: { homeTeam?: string; awayTeam?: string }
) {
  const results: any[] = [];
  const bookmakers = getBookmakers();
  const apiKey = process.env.THE_ODDS_API_KEY;

  for (const bookmaker of bookmakers) {
    if (!bookmaker.isActive) continue;
    if (bookmaker.apiProvider !== "the_odds_api") continue;
    const key = bookmaker.apiKey || apiKey;
    if (!key) continue;

    let raw: any[];
    try {
      raw = await fetchOddsFromTheOddsApi({ apiKey: key, sportKey });
    } catch {
      continue;
    }

    const normalized = normalizeOdds(raw, getBookmakerDisplayName(bookmaker), bookmaker.apiBookmakerKey);
    results.push(...normalized);
  }

  return filterByMatch(results, options?.homeTeam, options?.awayTeam);
}

export type MultiMarketQuotes = Record<
  string,
  Array<{
    fixtureId: string;
    bookmaker: string;
    bookmakerKey: string;
    homeTeam: string;
    awayTeam: string;
    outcomes: Record<string, number>;
    remuneration?: RemunerationConfig | null;
  }>
>;

export async function getMultiMarketQuotes(
  sportKey: string,
  options?: { homeTeam?: string; awayTeam?: string; leagueId?: number; bookmakerId?: string }
): Promise<MultiMarketQuotes> {
  const bookmakers = getBookmakers();
  const filteredBms = options?.bookmakerId
    ? bookmakers.filter(
        (b) =>
          b.id === options!.bookmakerId ||
          b.apiBookmakerKey?.toLowerCase() === options!.bookmakerId?.toLowerCase()
      )
    : bookmakers;
  const apiKey = process.env.THE_ODDS_API_KEY;
  const merged: MultiMarketQuotes = {
    h2h: [],
    h2h_3_way_h1: [],
    totals_25: [],
    totals_15: [],
    double_chance: [],
    btts: [],
    spreads: [],
    draw_no_bet: [],
  };

  // Mappa bookmakerKey → remunerazione, usata per il tiebreak in caso di quote uguali
  const remunerationMap: Record<string, RemunerationConfig | null | undefined> = {};
  for (const bm of bookmakers) {
    const key = (bm.apiBookmakerKey ?? bm.id ?? "").toLowerCase();
    remunerationMap[key] = bm.remuneration;
  }

  for (const bookmaker of filteredBms) {
    if (!bookmaker.isActive) continue;

    if (bookmaker.apiProvider === "the_odds_api") {
      const key = bookmaker.apiKey || apiKey;
      if (!key) continue;

      let raw: any[];
      try {
        raw = await fetchOddsFromTheOddsApi({ apiKey: key, sportKey });
      } catch {
        continue;
      }

      const byMarket = normalizeMultiMarket(raw);
      for (const [marketKey, quotes] of Object.entries(byMarket)) {
        if (!merged[marketKey]) continue;
        // Arricchisce ogni quota con la remunerazione del suo bookmaker
        const withRem = quotes.map((q) => ({
          ...q,
          remuneration: remunerationMap[q.bookmakerKey] ?? null,
        }));
        merged[marketKey].push(...withRem);
      }
    } else if (bookmaker.apiProvider === "direct") {
      try {
        const directQuotes = await fetchDirectBookmakerQuotes(
          bookmaker,
          options?.leagueId
        );
        for (const q of directQuotes) {
          merged.h2h.push({
            fixtureId: "",
            bookmaker: q.bookmaker,
            bookmakerKey: q.bookmakerKey,
            homeTeam: q.homeTeam,
            awayTeam: q.awayTeam,
            outcomes: q.outcomes,
            remuneration: remunerationMap[q.bookmakerKey] ?? null,
          });
        }
      } catch {
        continue;
      }
    }
  }

  for (const key of Object.keys(merged)) {
    let arr = filterByMatch(
      merged[key],
      options?.homeTeam,
      options?.awayTeam
    );
    if (options?.bookmakerId) {
      const bm = filteredBms[0];
      const matchKey = (bm?.apiBookmakerKey ?? bm?.id ?? options.bookmakerId).toLowerCase();
      arr = arr.filter(
        (q) => (q.bookmakerKey || "").toLowerCase() === matchKey
      );
    }

    // Ordina per remunerazione (tiebreak su quota uguale gestito lato componente).
    // Revenue Share > CPA > CPL, poi valore più alto; manualPriority sovrascrive tutto.
    arr = arr.sort((a, b) =>
      compareBookmakers({ remuneration: a.remuneration }, { remuneration: b.remuneration })
    );

    merged[key] = arr;
  }

  return merged;
}
