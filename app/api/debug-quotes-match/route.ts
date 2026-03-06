/**
 * Debug: verifica le quote multi-market per una partita.
 * Utile per capire quali mercati arrivano da Betboom prima di sistemare la UI.
 *
 * GET /api/debug-quotes-match?homeTeam=Palmeiras&awayTeam=Flamengo&leagueId=71&country=BR
 * ?raw=1 = mostra quote grezze da ogni bookmaker PRIMA del filtro per partita (utile per capire se Netwin restituisce dati)
 */
import { NextResponse } from "next/server";
import { getMultiMarketQuotes } from "@/lib/quotes/quotesEngine";
import { getSportKeyForLeague } from "@/lib/quotes/leagueToSportKey";
import { getBookmakers } from "@/lib/quotes/bookmakers";
import { fetchDirectBookmakerQuotes } from "@/lib/quotes/providers/directBookmakerFetcher";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const homeTeam = searchParams.get("homeTeam");
  const awayTeam = searchParams.get("awayTeam");
  const leagueIdParam = searchParams.get("leagueId");
  const country = searchParams.get("country") ?? "BR";
  const raw = searchParams.get("raw") === "1";

  if (!homeTeam || !awayTeam) {
    return NextResponse.json({
      error: "Parametri richiesti: homeTeam, awayTeam. Opzionali: leagueId, country, raw",
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
    if (raw) {
      const bookmakers = getBookmakers().filter(
        (b) =>
          b.isActive &&
          (b.countries?.includes(country) || b.country === country || b.countryConfig?.[country])
      );
      const rawByBookmaker: Record<string, { h2hCount: number; h2hSample: Array<{ homeTeam: string; awayTeam: string; outcomes?: unknown }>; _error?: string }> = {};
      for (const bm of bookmakers) {
        if (bm.apiProvider !== "direct") continue;
        try {
          const res = await fetchDirectBookmakerQuotes(bm, leagueId);
          const h2h = res.h2h ?? [];
          rawByBookmaker[bm.name] = {
            h2hCount: h2h.length,
            h2hSample: h2h.slice(0, 15).map((q) => ({
              homeTeam: q.homeTeam,
              awayTeam: q.awayTeam,
              outcomes: q.outcomes,
            })),
          };
        } catch (err) {
          rawByBookmaker[bm.name] = {
            h2hCount: 0,
            h2hSample: [],
            _error: err instanceof Error ? err.message : String(err),
          };
        }
      }
      return NextResponse.json({
        ok: true,
        request: { homeTeam, awayTeam, leagueId, country, sportKey },
        rawByBookmaker,
        hint: "Questi sono i dati GREZZI da ogni bookmaker (senza filtro per partita). Se h2hCount=0 per Netwin, il feed non restituisce quote. Se h2hSample contiene la partita ma con nomi diversi, aggiungi alias in data/teamAliases.json",
      });
    }

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
      hint: "Se summary.h2h>0 ma spreads/totals_25/btts/double_chance sono 0, verifica il parsing degli stakes Betboom con /api/debug-betboom-feed?marketIds=1,2,3,14,20. Usa ?raw=1 per vedere le quote grezze da ogni bookmaker.",
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}
