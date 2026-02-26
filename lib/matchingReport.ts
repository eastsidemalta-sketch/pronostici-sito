/**
 * Report del matching automatico quote/fixtures.
 * Analizza cosa è stato matchato, cosa no, e suggerisce correzioni.
 */
import { getUpcomingFixtures } from "./apiFootball";
import { getBookmakerDisplayName } from "./quotes/bookmakers";
import { getMultiMarketQuotes } from "./quotes/quotesEngine";
import { getSportKeyForLeague } from "./quotes/leagueToSportKey";
import { getBookmakers } from "./quotes/bookmakers";
import { matchTeamNames } from "./teamAliases";
import { fetchDirectBookmakerQuotes } from "./quotes/providers/directBookmakerFetcher";

export type MatchResult = {
  fixtureId: number;
  leagueId?: number;
  leagueName?: string;
  apiHome: string;
  apiAway: string;
  bookmakerKey: string;
  bookmakerName: string;
  bmHome: string;
  bmAway: string;
  odds: { home: number; draw: number; away: number };
  matched: boolean;
};

export type TeamSuggestion = {
  apiFootball: string;
  bookmakerVariant: string;
  bookmakerId: string;
  bookmakerName: string;
  fixtureId: number;
  match: "home" | "away";
};

export type LeagueSuggestion = {
  leagueId: number;
  leagueName: string;
  bookmakerId: string;
  bookmakerName: string;
  suggestedValue?: string;
  reason: "no_mapping" | "no_quotes";
};

export type MatchingReport = {
  lastRun: string;
  summary: {
    totalFixtures: number;
    totalMatches: number;
    totalUnmatched: number;
    byBookmaker: Record<string, { matched: number; unmatched: number; errors?: string[] }>;
  };
  matches: MatchResult[];
  unmatched: MatchResult[];
  teamSuggestions: TeamSuggestion[];
  leagueSuggestions: LeagueSuggestion[];
};

function similarity(a: string, b: string): number {
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.8;
  const xw = x.split(/\s+/)[0];
  const yw = y.split(/\s+/)[0];
  if (xw === yw) return 0.6;
  return 0;
}

export async function runMatchingReport(bookmakerId?: string): Promise<MatchingReport> {
  const allBookmakers = getBookmakers().filter((b) => b.isActive);
  const bookmakers = bookmakerId
    ? allBookmakers.filter(
        (b) =>
          b.id === bookmakerId ||
          b.apiBookmakerKey?.toLowerCase() === bookmakerId?.toLowerCase()
      )
    : allBookmakers;
  const report: MatchingReport = {
    lastRun: new Date().toISOString(),
    summary: {
      totalFixtures: 0,
      totalMatches: 0,
      totalUnmatched: 0,
      byBookmaker: {},
    },
    matches: [],
    unmatched: [],
    teamSuggestions: [],
    leagueSuggestions: [],
  };

  let fixtures: any[] = [];
  try {
    fixtures = await getUpcomingFixtures();
  } catch {
    return report;
  }

  report.summary.totalFixtures = fixtures.length;
  const bySportKey = new Map<string, typeof fixtures>();

  for (const f of fixtures) {
    const sportKey = getSportKeyForLeague(f.league?.id, f.league?.name);
    if (!sportKey) continue;
    if (!bySportKey.has(sportKey)) bySportKey.set(sportKey, []);
    bySportKey.get(sportKey)!.push(f);
  }

  for (const bookmaker of bookmakers) {
    report.summary.byBookmaker[bookmaker.id] = { matched: 0, unmatched: 0 };
  }

  for (const [sportKey, leagueFixtures] of bySportKey) {
    const leagueId = leagueFixtures[0]?.league?.id;
    const leagueName = leagueFixtures[0]?.league?.name;

    let h2h: Array<{
      bookmakerKey: string;
      bookmaker: string;
      homeTeam: string;
      awayTeam: string;
      outcomes: Record<string, number>;
    }> = [];

    if (leagueId) {
      try {
        const multi = await getMultiMarketQuotes(sportKey, {
          leagueId,
          bookmakerId,
        });
        h2h = multi.h2h || [];
      } catch {
        // skip
      }
    }

    for (const fixture of leagueFixtures) {
      const apiHome = fixture.teams?.home?.name || "";
      const apiAway = fixture.teams?.away?.name || "";
      const fixtureId = fixture.fixture?.id;

      if (!apiHome || !apiAway) continue;

      const byBookmaker = new Map<string, typeof h2h[0]>();
      for (const q of h2h) {
        byBookmaker.set(q.bookmakerKey, q);
      }

      for (const q of h2h) {
        const matched =
          matchTeamNames(q.homeTeam, apiHome) && matchTeamNames(q.awayTeam, apiAway);

        const mr: MatchResult = {
          fixtureId,
          leagueId,
          leagueName,
          apiHome,
          apiAway,
          bookmakerKey: q.bookmakerKey,
          bookmakerName: q.bookmaker,
          bmHome: q.homeTeam,
          bmAway: q.awayTeam,
          odds: {
            home: q.outcomes?.home || 0,
            draw: q.outcomes?.draw || 0,
            away: q.outcomes?.away || 0,
          },
          matched,
        };

        const simHome = similarity(apiHome, q.homeTeam);
        const simAway = similarity(apiAway, q.awayTeam);
        const isSameMatch = simHome > 0 || simAway > 0;

        if (matched) {
          report.matches.push(mr);
          report.summary.byBookmaker[q.bookmakerKey] = report.summary.byBookmaker[q.bookmakerKey] ?? {
            matched: 0,
            unmatched: 0,
          };
          report.summary.byBookmaker[q.bookmakerKey].matched++;
        } else if (isSameMatch) {
          report.unmatched.push(mr);
          report.summary.byBookmaker[q.bookmakerKey] = report.summary.byBookmaker[q.bookmakerKey] ?? {
            matched: 0,
            unmatched: 0,
          };
          report.summary.byBookmaker[q.bookmakerKey].unmatched++;

          if (simHome < 1 && simHome > 0) {
            report.teamSuggestions.push({
              apiFootball: apiHome,
              bookmakerVariant: q.homeTeam,
              bookmakerId: q.bookmakerKey,
              bookmakerName: q.bookmaker,
              fixtureId,
              match: "home",
            });
          }
          if (simAway < 1 && simAway > 0) {
            report.teamSuggestions.push({
              apiFootball: apiAway,
              bookmakerVariant: q.awayTeam,
              bookmakerId: q.bookmakerKey,
              bookmakerName: q.bookmaker,
              fixtureId,
              match: "away",
            });
          }
        }
      }

      const directBookmakers = bookmakers.filter((b) => b.apiProvider === "direct");
      for (const bm of directBookmakers) {
        if (!bm.apiEndpoint || !bm.apiMappingConfig) continue;

        const hasLeagueMapping =
          leagueId != null && bm.apiLeagueMapping?.[String(leagueId)];

        if (leagueId != null && !hasLeagueMapping) {
          const exists = report.leagueSuggestions.some(
            (s) => s.leagueId === leagueId && s.bookmakerId === bm.id
          );
          if (!exists) {
            report.leagueSuggestions.push({
              leagueId,
              leagueName: leagueName ?? "",
              bookmakerId: bm.id,
              bookmakerName: getBookmakerDisplayName(bm),
              suggestedValue: leagueName?.toLowerCase().replace(/\s+/g, "_"),
              reason: "no_mapping",
            });
          }
        }

        try {
          const directQuotes = await fetchDirectBookmakerQuotes(bm, leagueId);
          for (const q of directQuotes) {
            const matched =
              matchTeamNames(q.homeTeam, apiHome) && matchTeamNames(q.awayTeam, apiAway);

            const mr: MatchResult = {
              fixtureId,
              leagueId,
              leagueName,
              apiHome,
              apiAway,
              bookmakerKey: bm.id,
              bookmakerName: getBookmakerDisplayName(bm),
              bmHome: q.homeTeam,
              bmAway: q.awayTeam,
              odds: q.outcomes,
              matched,
            };

            const simHome = similarity(apiHome, q.homeTeam);
            const simAway = similarity(apiAway, q.awayTeam);
            const isSameMatch = simHome > 0 || simAway > 0;

            if (matched) {
              report.matches.push(mr);
              report.summary.byBookmaker[bm.id].matched++;
            } else if (isSameMatch) {
              report.unmatched.push(mr);
              report.summary.byBookmaker[bm.id].unmatched++;

              if (simHome < 1 && simHome > 0) {
                report.teamSuggestions.push({
                  apiFootball: apiHome,
                  bookmakerVariant: q.homeTeam,
                  bookmakerId: bm.id,
                  bookmakerName: getBookmakerDisplayName(bm),
                  fixtureId,
                  match: "home",
                });
              }
              if (simAway < 1 && simAway > 0) {
                report.teamSuggestions.push({
                  apiFootball: apiAway,
                  bookmakerVariant: q.awayTeam,
                  bookmakerId: bm.id,
                  bookmakerName: getBookmakerDisplayName(bm),
                  fixtureId,
                  match: "away",
                });
              }
            }
          }
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          report.summary.byBookmaker[bm.id].errors =
            report.summary.byBookmaker[bm.id].errors ?? [];
          report.summary.byBookmaker[bm.id].errors!.push(err);
        }
      }
    }
  }

  report.summary.totalMatches = report.matches.length;
  report.summary.totalUnmatched = report.unmatched.length;

  const seenSuggestions = new Map<string, TeamSuggestion>();
  for (const s of report.teamSuggestions) {
    const key = `${s.apiFootball}|${s.bookmakerVariant}`;
    if (!seenSuggestions.has(key)) seenSuggestions.set(key, s);
  }
  report.teamSuggestions = Array.from(seenSuggestions.values());

  if (bookmakerId) {
    const bmKey = bookmakers[0]?.apiBookmakerKey ?? bookmakers[0]?.id ?? bookmakerId;
    report.matches = report.matches.filter(
      (m) =>
        m.bookmakerKey === bmKey ||
        m.bookmakerKey.toLowerCase() === bookmakerId.toLowerCase()
    );
    report.unmatched = report.unmatched.filter(
      (m) =>
        m.bookmakerKey === bmKey ||
        m.bookmakerKey.toLowerCase() === bookmakerId.toLowerCase()
    );
    report.teamSuggestions = report.teamSuggestions.filter(
      (s) =>
        s.bookmakerId === bmKey ||
        s.bookmakerId.toLowerCase() === bookmakerId.toLowerCase()
    );
    report.leagueSuggestions = report.leagueSuggestions.filter(
      (s) =>
        s.bookmakerId === bmKey ||
        s.bookmakerId.toLowerCase() === bookmakerId.toLowerCase()
    );
    report.summary.byBookmaker = Object.fromEntries(
      Object.entries(report.summary.byBookmaker).filter(
        ([k]) => k === bmKey || k.toLowerCase() === bookmakerId.toLowerCase()
      )
    );
  }

  return report;
}
