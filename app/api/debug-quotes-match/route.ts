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
  const forceFull = searchParams.get("forceFull") === "1";
  const forceDelta = searchParams.get("forceDelta") === "1";
  const systemCode = searchParams.get("systemCode") ?? undefined;

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
      const rawByBookmaker: Record<string, { h2hCount: number; h2hSample: Array<{ homeTeam: string; awayTeam: string; outcomes?: unknown }>; matchRequested?: Record<string, unknown>; _error?: string }> = {};
      const homeNorm = (homeTeam || "").toLowerCase().trim();
      const awayNorm = (awayTeam || "").toLowerCase().trim();
      const matchFilter = (q: { homeTeam?: string; awayTeam?: string }) => {
        const qh = (q.homeTeam || "").toLowerCase().trim();
        const qa = (q.awayTeam || "").toLowerCase().trim();
        return (
          (qh === homeNorm && qa === awayNorm) ||
          (qh.includes(homeNorm) && qa.includes(awayNorm)) ||
          (homeNorm.includes(qh) && awayNorm.includes(qa))
        );
      };
      for (const bm of bookmakers) {
        if (bm.apiProvider !== "direct") continue;
        try {
          const res = await fetchDirectBookmakerQuotes(bm, leagueId, {
            forceFull: forceFull || undefined,
            forceDelta: forceDelta || undefined,
            systemCodeOverride: systemCode,
          });
          const h2h = res.h2h ?? [];
          const matchH2h = h2h.find(matchFilter);
          const matchSpreads = (res.spreads ?? []).filter(matchFilter);
          const matchTotals25 = (res.totals_25 ?? []).find(matchFilter);
          const matchTotals15 = (res.totals_15 ?? []).find(matchFilter);
          const matchBtts = (res.btts ?? []).find(matchFilter);
          const matchDc = (res.double_chance ?? []).find(matchFilter);
          const matchRequested: Record<string, unknown> = {};
          if (matchH2h) {
            matchRequested.h2h = { home: matchH2h.outcomes?.home, draw: matchH2h.outcomes?.draw, away: matchH2h.outcomes?.away };
          }
          if (matchSpreads.length > 0) {
            matchRequested.spreads = matchSpreads.map((s) => s.outcomes);
          }
          if (matchTotals25) {
            matchRequested.totals_25 = matchTotals25.outcomes;
          }
          if (matchTotals15) {
            matchRequested.totals_15 = matchTotals15.outcomes;
          }
          if (matchBtts) {
            matchRequested.btts = matchBtts.outcomes;
          }
          if (matchDc) {
            matchRequested.double_chance = matchDc.outcomes;
          }
          rawByBookmaker[bm.name] = {
            h2hCount: h2h.length,
            h2hSample: h2h.slice(0, 15).map((q) => ({
              homeTeam: q.homeTeam,
              awayTeam: q.awayTeam,
              outcomes: q.outcomes,
            })),
            ...(Object.keys(matchRequested).length > 0 && {
              matchRequested: {
                homeTeam: matchH2h?.homeTeam ?? matchSpreads[0]?.homeTeam ?? matchTotals25?.homeTeam,
                awayTeam: matchH2h?.awayTeam ?? matchSpreads[0]?.awayTeam ?? matchTotals25?.awayTeam,
                ...matchRequested,
              },
            }),
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
        request: { homeTeam, awayTeam, leagueId, country, sportKey, forceFull, forceDelta, systemCode: systemCode || "(env)" },
        rawByBookmaker,
        hint: "matchRequested = quote dalla cache per la partita. h2h (1X2), totals_25 (Over/Under 2.5), totals_15, spreads (Handicap), btts (Gol/No Gol), double_chance. Confronta con netwin.it.",
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
