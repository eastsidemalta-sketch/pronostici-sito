import { getBookmakers } from "./bookmakers";
import { fetchDirectBookmakerQuotes } from "./providers/directBookmakerFetcher";
import { matchTeamNames } from "@/lib/teamAliases";
import { compareBookmakers } from "./bookmakerRanking";
import type { RemunerationConfig } from "./bookmaker.types";

function matchTeam(
  providerHome: string,
  providerAway: string,
  apiFootballHome: string,
  apiFootballAway: string,
  bookmakerKey?: string
) {
  return (
    matchTeamNames(providerHome, apiFootballHome, bookmakerKey) &&
    matchTeamNames(providerAway, apiFootballAway, bookmakerKey)
  );
}

function filterByMatch<T extends { homeTeam?: string; awayTeam?: string; bookmakerKey?: string }>(
  items: T[],
  home?: string,
  away?: string
): T[] {
  if (!home || !away) return items;
  return items.filter((q) => {
    const qHome = q.homeTeam || "";
    const qAway = q.awayTeam || "";
    const bmKey = (q as { bookmakerKey?: string }).bookmakerKey;
    return matchTeam(qHome, qAway, home, away, bmKey);
  });
}

/** Quote da API dirette dei bookmaker. The Odds API rimosso. */
export async function getQuotesForMatch(
  sportKey: string,
  options?: { homeTeam?: string; awayTeam?: string; leagueId?: number }
) {
  const multi = await getMultiMarketQuotes(sportKey, {
    homeTeam: options?.homeTeam,
    awayTeam: options?.awayTeam,
    leagueId: options?.leagueId,
  });
  return filterByMatch(multi.h2h ?? [], options?.homeTeam, options?.awayTeam);
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
  options?: { homeTeam?: string; awayTeam?: string; leagueId?: number; bookmakerId?: string; country?: string }
): Promise<MultiMarketQuotes> {
  let bookmakers = getBookmakers();
  if (options?.country) {
    const country = options.country.toUpperCase().slice(0, 2);
    bookmakers = bookmakers.filter(
      (b) =>
        b.countries?.includes(country) ||
        b.country === country ||
        b.countryConfig?.[country]
    );
  }
  const filteredBms = options?.bookmakerId
    ? bookmakers.filter(
        (b) =>
          b.id === options!.bookmakerId ||
          b.apiBookmakerKey?.toLowerCase() === options!.bookmakerId?.toLowerCase()
      )
    : bookmakers;
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

    if (bookmaker.apiProvider === "direct") {
      try {
        const directResult = await fetchDirectBookmakerQuotes(
          bookmaker,
          options?.leagueId
        );
        for (const [marketKey, quotes] of Object.entries(directResult)) {
          const arr = merged[marketKey as keyof typeof merged];
          if (!Array.isArray(arr)) continue;
          for (const q of quotes ?? []) {
            arr.push({
              fixtureId: "",
              bookmaker: q.bookmaker,
              bookmakerKey: q.bookmakerKey,
              homeTeam: q.homeTeam,
              awayTeam: q.awayTeam,
              outcomes: q.outcomes,
              remuneration: remunerationMap[q.bookmakerKey] ?? null,
            });
          }
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
