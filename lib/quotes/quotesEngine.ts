import { getBookmakers, getBookmakerDisplayName } from "./bookmakers";
import { fetchDirectBookmakerQuotes } from "./providers/directBookmakerFetcher";
import { getMatchOddsFromRedis } from "./redisReader";
import { matchTeamNames } from "@/lib/teamAliases";
import { compareBookmakers } from "./bookmakerRanking";
import type { Bookmaker, RemunerationConfig } from "./bookmaker.types";
import { getUniversalTeamId } from "@/workers/utils/teamMatcher";

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

function qn(v?: number): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * Se i worker hanno popolato `match:odds:{homeId-awayId}` e i nomi risolvono gli stessi id di `DataNormalizer`,
 * restituisce le quote senza chiamare le API bookmaker.
 */
async function tryLoadMultiMarketFromRedis(
  options: { homeTeam?: string; awayTeam?: string },
  filteredBms: Bookmaker[],
  bookmakers: Bookmaker[]
): Promise<MultiMarketQuotes | null> {
  if (process.env.QUOTES_SKIP_REDIS === "1" || process.env.QUOTES_SKIP_REDIS === "true") {
    return null;
  }

  const ht = options.homeTeam?.trim();
  const at = options.awayTeam?.trim();
  if (!ht || !at) return null;

  const hid = getUniversalTeamId(ht);
  const aid = getUniversalTeamId(at);
  if (hid == null || aid == null) return null;

  const raw = await getMatchOddsFromRedis(`${hid}-${aid}`);
  if (Object.keys(raw).length === 0) return null;

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

  const remunerationMap: Record<string, RemunerationConfig | null | undefined> = {};
  for (const bm of bookmakers) {
    const key = (bm.apiBookmakerKey ?? bm.id ?? "").toLowerCase();
    remunerationMap[key] = bm.remuneration;
  }

  const activeFilteredIds = new Set(
    filteredBms.filter((b) => b.isActive).map((b) => b.id.toLowerCase())
  );

  for (const [redisField, nm] of Object.entries(raw)) {
    const idLower = redisField.toLowerCase();
    if (!activeFilteredIds.has(idLower)) continue;
    const bm = filteredBms.find(
      (b) => b.id.toLowerCase() === idLower && b.isActive
    );
    if (!bm) continue;

    const bookmakerKey = bm.id;
    const bookmaker = getBookmakerDisplayName(bm);
    const rem = remunerationMap[bookmakerKey.toLowerCase()] ?? null;
    const m = nm.markets;

    if (qn(m.match_winner_1) || qn(m.match_winner_x) || qn(m.match_winner_2)) {
      merged.h2h!.push({
        fixtureId: "",
        bookmaker,
        bookmakerKey,
        homeTeam: ht,
        awayTeam: at,
        outcomes: {
          home: qn(m.match_winner_1),
          draw: qn(m.match_winner_x),
          away: qn(m.match_winner_2),
        },
        remuneration: rem,
      });
    }

    if (qn(m.over_2_5) || qn(m.under_2_5)) {
      merged.totals_25!.push({
        fixtureId: "",
        bookmaker,
        bookmakerKey,
        homeTeam: ht,
        awayTeam: at,
        outcomes: { over: qn(m.over_2_5), under: qn(m.under_2_5) },
        remuneration: rem,
      });
    }

    if (qn(m.over_1_5) || qn(m.under_1_5)) {
      merged.totals_15!.push({
        fixtureId: "",
        bookmaker,
        bookmakerKey,
        homeTeam: ht,
        awayTeam: at,
        outcomes: { over: qn(m.over_1_5), under: qn(m.under_1_5) },
        remuneration: rem,
      });
    }

    if (qn(m.double_chance_1x) || qn(m.double_chance_12) || qn(m.double_chance_x2)) {
      merged.double_chance!.push({
        fixtureId: "",
        bookmaker,
        bookmakerKey,
        homeTeam: ht,
        awayTeam: at,
        outcomes: {
          homeOrDraw: qn(m.double_chance_1x),
          homeOrAway: qn(m.double_chance_12),
          drawOrAway: qn(m.double_chance_x2),
        },
        remuneration: rem,
      });
    }

    if (qn(m.goal) || qn(m.nogoal)) {
      merged.btts!.push({
        fixtureId: "",
        bookmaker,
        bookmakerKey,
        homeTeam: ht,
        awayTeam: at,
        outcomes: { yes: qn(m.goal), no: qn(m.nogoal) },
        remuneration: rem,
      });
    }

    if (qn(m.spread_home) || qn(m.spread_away)) {
      merged.spreads!.push({
        fixtureId: "",
        bookmaker,
        bookmakerKey,
        homeTeam: ht,
        awayTeam: at,
        outcomes: {
          home: qn(m.spread_home),
          away: qn(m.spread_away),
          homePoint: m.spread_home_point ?? 0,
          awayPoint: m.spread_away_point ?? 0,
        },
        remuneration: rem,
      });
    }
  }

  const hasAny = Object.values(merged).some(
    (arr) => Array.isArray(arr) && arr.length > 0
  );
  if (!hasAny) return null;

  return merged;
}

function applyFiltersAndSort(
  merged: MultiMarketQuotes,
  options?: {
    homeTeam?: string;
    awayTeam?: string;
    bookmakerId?: string;
  },
  filteredBms: Bookmaker[] = []
): MultiMarketQuotes {
  for (const key of Object.keys(merged)) {
    let arr = filterByMatch(
      merged[key as keyof MultiMarketQuotes],
      options?.homeTeam,
      options?.awayTeam
    );
    if (options?.bookmakerId) {
      const bm = filteredBms[0];
      const matchKey = (
        bm?.apiBookmakerKey ??
        bm?.id ??
        options.bookmakerId
      ).toLowerCase();
      arr = arr.filter(
        (q) => (q.bookmakerKey || "").toLowerCase() === matchKey
      );
    }
    arr = arr.sort((a, b) =>
      compareBookmakers(
        { remuneration: a.remuneration },
        { remuneration: b.remuneration }
      )
    );
    (merged as Record<string, typeof arr>)[key] = arr;
  }
  return merged;
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
    let parsedCountry = options.country.toUpperCase();
    if (parsedCountry.includes('BR')) parsedCountry = 'BR';
    else if (parsedCountry.includes('IT')) parsedCountry = 'IT';
    else parsedCountry = parsedCountry.slice(0, 2);
    bookmakers = bookmakers.filter(
      (b) =>
        b.countries?.includes(parsedCountry) ||
        b.country === parsedCountry ||
        b.countryConfig?.[parsedCountry]
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

  const fromRedis = await tryLoadMultiMarketFromRedis(
    { homeTeam: options?.homeTeam, awayTeam: options?.awayTeam },
    filteredBms,
    bookmakers
  );
  if (fromRedis) {
    return applyFiltersAndSort(fromRedis, options, filteredBms);
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

  return applyFiltersAndSort(merged, options, filteredBms);
}
