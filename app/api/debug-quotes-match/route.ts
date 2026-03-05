/**
 * Debug: verifica le quote multi-market per una partita.
 * Utile per capire quali mercati arrivano da Betboom prima di sistemare la UI.
 *
 * GET /api/debug-quotes-match?homeTeam=Palmeiras&awayTeam=Flamengo&leagueId=71&country=BR
 */
import { NextResponse } from "next/server";
import { getMultiMarketQuotes } from "@/lib/quotes/quotesEngine";
import { getSportKeyForLeague } from "@/lib/quotes/leagueToSportKey";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const homeTeam = searchParams.get("homeTeam");
  const awayTeam = searchParams.get("awayTeam");
  const leagueIdParam = searchParams.get("leagueId");
  const country = searchParams.get("country") ?? "BR";

  if (!homeTeam || !awayTeam) {
    return NextResponse.json({
      error: "Parametri richiesti: homeTeam, awayTeam. Opzionali: leagueId, country",
      example: "/api/debug-quotes-match?homeTeam=Palmeiras&awayTeam=Flamengo&leagueId=71&country=BR",
    }, { status: 400 });
  }

  const leagueId = leagueIdParam ? parseInt(leagueIdParam, 10) : 71;
  const sportKey = getSportKeyForLeague(leagueId);

  if (!sportKey) {
    return NextResponse.json({
      error: `Nessun sportKey per leagueId ${leagueId}`,
      leagueId,
    }, { status: 400 });
  }

  try {
    const multiMarket = await getMultiMarketQuotes(sportKey, {
      homeTeam,
      awayTeam,
      leagueId,
      country,
    });

    const summary: Record<string, number> = {};
    for (const [key, arr] of Object.entries(multiMarket)) {
      summary[key] = Array.isArray(arr) ? arr.length : 0;
    }

    const sample = Object.fromEntries(
      Object.entries(multiMarket).map(([k, arr]) => {
        const a = Array.isArray(arr) ? arr : [];
        const first = a[0];
        return [k, first ? { ...first, _count: a.length } : { _count: 0 }];
      })
    );

    return NextResponse.json({
      ok: true,
      request: { homeTeam, awayTeam, leagueId, country, sportKey },
      summary,
      sample,
      hint: "Se summary.h2h>0 ma spreads/totals_25/btts/double_chance sono 0, verifica il parsing degli stakes Betboom con /api/debug-betboom-feed?marketIds=1,2,3,14,20",
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}
