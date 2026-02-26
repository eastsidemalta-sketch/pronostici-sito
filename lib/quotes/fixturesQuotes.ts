import { getMultiMarketQuotes } from "./quotesEngine";
import { getSportKeyForLeague } from "./leagueToSportKey";
import { getBookmakers, getBookmakerDisplayName } from "./bookmakers";
import { getBookmakerUrl } from "./bookmakerUrls";
import { matchTeamNames } from "@/lib/teamAliases";

const matchTeam = (a: string, b: string) => matchTeamNames(a, b);

export type FixtureQuoteSummary = {
  best1: number;
  bestX: number;
  best2: number;
  /** Percentuali 1X2 calcolate dalla media delle quote di tutti i bookmaker */
  oddsBasedPct1?: number;
  oddsBasedPctX?: number;
  oddsBasedPct2?: number;
  bookmaker1?: { key: string; name: string; logoUrl?: string; faviconUrl?: string; url?: string };
  bookmakerX?: { key: string; name: string; logoUrl?: string; faviconUrl?: string; url?: string };
  bookmaker2?: { key: string; name: string; logoUrl?: string; faviconUrl?: string; url?: string };
};

/**
 * Calcola le percentuali 1X2 dalla media delle probabilità implicite di tutti i bookmaker.
 * Per ogni bookmaker: implied = 1/odds, normalizza a 100%, poi media tra tutti.
 */
function computeOddsBasedPercentages(
  quotes: Array<{ outcomes?: { home?: number; draw?: number; away?: number } }>
): { pct1: number; pctX: number; pct2: number } | null {
  const fairProbs: { pct1: number; pctX: number; pct2: number }[] = [];
  for (const q of quotes) {
    const h = q.outcomes?.home ?? 0;
    const d = q.outcomes?.draw ?? 0;
    const a = q.outcomes?.away ?? 0;
    if (h <= 0 || d <= 0 || a <= 0) continue;
    const totalImplied = 100 / h + 100 / d + 100 / a;
    if (totalImplied <= 0) continue;
    fairProbs.push({
      pct1: Math.round((100 / h / totalImplied) * 100),
      pctX: Math.round((100 / d / totalImplied) * 100),
      pct2: Math.round((100 / a / totalImplied) * 100),
    });
  }
  if (fairProbs.length === 0) return null;
  return {
    pct1: Math.round(fairProbs.reduce((s, p) => s + p.pct1, 0) / fairProbs.length),
    pctX: Math.round(fairProbs.reduce((s, p) => s + p.pctX, 0) / fairProbs.length),
    pct2: Math.round(fairProbs.reduce((s, p) => s + p.pct2, 0) / fairProbs.length),
  };
}

export async function getQuotesForFixtures(
  fixtures: Array<{
    fixture: { id: number };
    league: { id?: number; name?: string };
    teams: { home: { name: string }; away: { name: string } };
  }>,
  country?: string
): Promise<Record<number, FixtureQuoteSummary>> {
  const result: Record<number, FixtureQuoteSummary> = {};
  const bookmakers = getBookmakers();
  const logoByKey = new Map<string, string>();
  const faviconByKey = new Map<string, string>();
  const displayNameByKey = new Map<string, string>();
  bookmakers.forEach((bm) => {
    const key = (bm.apiBookmakerKey ?? bm.id).toLowerCase();
    if (bm.logoUrl) logoByKey.set(key, bm.logoUrl);
    if (bm.faviconUrl) faviconByKey.set(key, bm.faviconUrl);
    displayNameByKey.set(key, getBookmakerDisplayName(bm));
  });

  const bySportKey = new Map<string, typeof fixtures>();
  for (const f of fixtures) {
    const sportKey = getSportKeyForLeague(f.league?.id, f.league?.name);
    if (!sportKey) continue;
    if (!bySportKey.has(sportKey)) bySportKey.set(sportKey, []);
    bySportKey.get(sportKey)!.push(f);
  }

  for (const [sportKey, leagueFixtures] of bySportKey) {
    const leagueId = leagueFixtures[0]?.league?.id;
    let multiMarket: Awaited<ReturnType<typeof getMultiMarketQuotes>>;
    try {
      multiMarket = await getMultiMarketQuotes(sportKey, { leagueId });
    } catch {
      continue;
    }

    const h2h = multiMarket.h2h || [];
    for (const fixture of leagueFixtures) {
      const home = fixture.teams?.home?.name || "";
      const away = fixture.teams?.away?.name || "";
      const fixtureQuotes = h2h.filter(
        (q) => matchTeam(q.homeTeam || "", home) && matchTeam(q.awayTeam || "", away)
      );

      if (fixtureQuotes.length === 0) continue;

      const valid = fixtureQuotes.filter(
        (q) =>
          (q.outcomes?.home || 0) > 0 &&
          (q.outcomes?.draw || 0) > 0 &&
          (q.outcomes?.away || 0) > 0
      );
      const source = valid.length > 0 ? valid : fixtureQuotes;

      const best1 = Math.max(...source.map((q) => q.outcomes?.home || 0), 0);
      const bestX = Math.max(...source.map((q) => q.outcomes?.draw || 0), 0);
      const best2 = Math.max(...source.map((q) => q.outcomes?.away || 0), 0);

      const oddsBased = computeOddsBasedPercentages(source);

      const q1 = source.find((q) => (q.outcomes?.home || 0) === best1);
      const qX = source.find((q) => (q.outcomes?.draw || 0) === bestX);
      const q2 = source.find((q) => (q.outcomes?.away || 0) === best2);

      result[fixture.fixture.id] = {
        best1,
        bestX,
        best2,
        oddsBasedPct1: oddsBased?.pct1,
        oddsBasedPctX: oddsBased?.pctX,
        oddsBasedPct2: oddsBased?.pct2,
        bookmaker1: q1
          ? {
              key: q1.bookmakerKey || "",
              name: displayNameByKey.get((q1.bookmakerKey || "").toLowerCase()) || q1.bookmaker || "",
              logoUrl: logoByKey.get((q1.bookmakerKey || "").toLowerCase()),
              faviconUrl: faviconByKey.get((q1.bookmakerKey || "").toLowerCase()),
              url: getBookmakerUrl(q1.bookmakerKey || "", country) ?? undefined,
            }
          : undefined,
        bookmakerX: qX
          ? {
              key: qX.bookmakerKey || "",
              name: displayNameByKey.get((qX.bookmakerKey || "").toLowerCase()) || qX.bookmaker || "",
              logoUrl: logoByKey.get((qX.bookmakerKey || "").toLowerCase()),
              faviconUrl: faviconByKey.get((qX.bookmakerKey || "").toLowerCase()),
              url: getBookmakerUrl(qX.bookmakerKey || "", country) ?? undefined,
            }
          : undefined,
        bookmaker2: q2
          ? {
              key: q2.bookmakerKey || "",
              name: displayNameByKey.get((q2.bookmakerKey || "").toLowerCase()) || q2.bookmaker || "",
              logoUrl: logoByKey.get((q2.bookmakerKey || "").toLowerCase()),
              faviconUrl: faviconByKey.get((q2.bookmakerKey || "").toLowerCase()),
              url: getBookmakerUrl(q2.bookmakerKey || "", country) ?? undefined,
            }
          : undefined,
      };
    }
  }

  return result;
}
