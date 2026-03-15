/**
 * Debug: simula il flusso quote della home per capire perché Netwin non appare.
 *
 * GET /api/debug-home-quotes?country=IT
 *
 * Mostra per ogni partita: fixtureId, home, away, quote trovate, bookmaker presenti, match Netwin?
 */
import { NextResponse } from "next/server";
import { getCachedHomeData } from "@/lib/homePageCache";
import { getQuotesForFixtures } from "@/lib/quotes/fixturesQuotes";
import { getMultiMarketQuotes } from "@/lib/quotes/quotesEngine";
import { getSportKeyForLeague } from "@/lib/quotes/leagueToSportKey";
import { matchTeamNames } from "@/lib/teamAliases";
import { fetchDirectBookmakerQuotes } from "@/lib/quotes/providers/directBookmakerFetcher";
import { getCacheDebugInfo } from "@/lib/quotes/providers/netwinCache";
import { getBookmakers } from "@/lib/quotes/bookmakers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country") ?? "IT";

  try {
    const { fixtures } = await getCachedHomeData(country, true);
    const quotesMap = await getQuotesForFixtures(fixtures, country);

    // Per ogni partita: dettaglio quote
    const details: Array<{
      fixtureId: number;
      home: string;
      away: string;
      leagueId: number;
      sportKey: string | null;
      hasQuotes: boolean;
      bookmakers: string[];
      netwinInQuotes: boolean;
    }> = [];

    for (const f of fixtures.slice(0, 10)) {
      const home = f.teams?.home?.name ?? "";
      const away = f.teams?.away?.name ?? "";
      const q = quotesMap[f.fixture.id];
      const rawKeys = q
        ? [q.bookmaker1?.key, q.bookmakerX?.key, q.bookmaker2?.key]
        : [];
      const bookmakers: string[] = rawKeys.filter((k): k is string => Boolean(k));
      details.push({
        fixtureId: f.fixture.id,
        home,
        away,
        leagueId: f.league?.id ?? 0,
        sportKey: getSportKeyForLeague(f.league?.id, f.league?.name),
        hasQuotes: !!q && (q.best1 > 0 || q.bestX > 0 || q.best2 > 0),
        bookmakers,
        netwinInQuotes: bookmakers.some((k) => k?.toLowerCase() === "netwinit"),
      });
    }

    // Raw Netwin: quante partite ha?
    const netwinBm = getBookmakers().find(
      (b) => (b.apiBookmakerKey ?? b.id)?.toLowerCase() === "netwinit"
    );
    let netwinRawCount = 0;
    let netwinSample: Array<{ homeTeam: string; awayTeam: string }> = [];
    if (netwinBm) {
      try {
        const res = await fetchDirectBookmakerQuotes(netwinBm, 135);
        netwinRawCount = res.h2h?.length ?? 0;
        netwinSample = (res.h2h ?? []).slice(0, 5).map((q) => ({
          homeTeam: q.homeTeam,
          awayTeam: q.awayTeam,
        }));
      } catch (e) {
        netwinSample = [{ homeTeam: "error", awayTeam: String(e) }];
      }
    }

    // Test match per prima partita
    const first = fixtures[0];
    let matchTest: Record<string, unknown> = {};
    if (first && netwinBm) {
      const home = first.teams?.home?.name ?? "";
      const away = first.teams?.away?.name ?? "";
      try {
        const res = await fetchDirectBookmakerQuotes(netwinBm, 135);
        const h2h = res.h2h ?? [];
        const netwinQuotes = h2h.filter(
          (q) =>
            matchTeamNames(q.homeTeam || "", home, "netwinit") &&
            matchTeamNames(q.awayTeam || "", away, "netwinit")
        );
        matchTest = {
          netwinHasData: h2h.length > 0,
          firstFixtureHome: home,
          firstFixtureAway: away,
          netwinMatchCount: netwinQuotes.length,
          sampleNetwinHome: h2h[0]?.homeTeam,
          sampleNetwinAway: h2h[0]?.awayTeam,
        };
      } catch {
        matchTest = { error: true };
      }
    }

    const netwinCacheInfo = netwinBm ? await getCacheDebugInfo() : null;

    return NextResponse.json({
      ok: true,
      country,
      fixturesCount: fixtures.length,
      details,
      netwinRawCount,
      netwinSample,
      matchTest,
      netwinCacheInfo,
      hint: "Se netwinRawCount>0 ma netwinInQuotes=false, il problema è il matching nomi. Se netwinCacheInfo.hasCache=false, la FULL non è mai riuscita: controlla log FULL su Redis (netwin:cache:full_log).",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e instanceof Error ? e.message : e) },
      { status: 500 }
    );
  }
}
