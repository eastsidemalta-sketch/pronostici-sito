/**
 * Debug: POST a matches/get_by_category_ids e mostra risposta raw.
 * GET /api/debug-betboom-feed
 * GET /api/debug-betboom-feed?categoryIds=all (category_ids vuoto = tutte le categorie)
 * GET /api/debug-betboom-feed?categoryIds=123,456 (category_ids specifici)
 * GET /api/debug-betboom-feed?categoryIds=0 (simula league 71 → mapping "0")
 * GET /api/debug-betboom-feed?full=1 (mostra sample completo primo match)
 * GET /api/debug-betboom-feed?simulate=1 (simula fetchDirectBookmakerQuotes con leagueId 71)
 * GET /api/debug-betboom-feed?marketIds=1,2,3,14,20 (testa mercati: 1=Winner, 2=Handicap, 3=Total, 14=BTTS, 20=Double Chance)
 */
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const endpoint = "https://com-br-partner-feed.sporthub.bet/api/partner_feed/v1/matches/get_by_category_ids";
  const apiKey = process.env.BETBOOM_API_KEY;
  const { searchParams } = new URL(req.url);
  const categoryIdsParam = searchParams.get("categoryIds");
  const marketIdsParam = searchParams.get("marketIds");
  const full = searchParams.get("full") === "1";
  const simulate = searchParams.get("simulate") === "1";

  let marketIds: number[] = [1];
  if (marketIdsParam) {
    marketIds = marketIdsParam.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n));
    if (marketIds.length === 0) marketIds = [1];
  }

  if (!apiKey) {
    return NextResponse.json({ error: "BETBOOM_API_KEY mancante" }, { status: 500 });
  }

  let categoryIds: number[];
  if (categoryIdsParam === "all" || categoryIdsParam === "") {
    try {
      const catsRes = await fetch(
        "https://com-br-partner-feed.sporthub.bet/api/partner_feed/v1/categories/get_by_sport_ids",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-access-token": apiKey,
            "x-partner": process.env.BETBOOM_PARTNER_ID ?? "id_7557",
          },
          body: JSON.stringify({ locale: "en", sport_ids: [2] }),
          cache: "no-store",
        }
      );
      const catsData = (await catsRes.json()) as { categories?: Array<{ id: number }>; data?: { categories?: Array<{ id: number }> } };
      const cats = catsData?.categories ?? catsData?.data?.categories ?? [];
      const allIds = cats.map((c) => c.id).filter((n) => n > 0);
      categoryIds = allIds.length > 0 ? allIds : [1];
    } catch {
      categoryIds = [1];
    }
  } else if (categoryIdsParam) {
    categoryIds = categoryIdsParam.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n));
  } else {
    categoryIds = [0]; // default: simula mapping league 71
  }

  if (categoryIds.length === 0) {
    return NextResponse.json({
      error: "Betboom richiede category_ids con almeno 1 elemento. Chiama /api/debug-betboom-categories per gli ID, poi ?categoryIds=123,456",
      categoriesUrl: "/api/debug-betboom-categories?sportIds=2",
    }, { status: 400 });
  }

  const body = {
    locale: "en",
    category_ids: categoryIds,
    market_ids: marketIds,
    type: "prematch",
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": apiKey,
        "x-partner": process.env.BETBOOM_PARTNER_ID ?? "id_7557",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        status: res.status,
        requestBody: body,
        errorBody: text.slice(0, 1000),
      });
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({
        ok: false,
        error: "Risposta non JSON",
        requestBody: body,
        raw: text.slice(0, 1000),
      });
    }

    const obj = data as Record<string, unknown>;
    const matches = obj.matches;
    const matchesArr = Array.isArray(matches) ? matches : [];
    const firstMatch = matchesArr[0] as Record<string, unknown> | undefined;
    const firstMatchKeys = firstMatch ? Object.keys(firstMatch) : [];
    const firstStake = firstMatch?.stakes;
    const stakesArr = Array.isArray(firstStake) ? firstStake : [];
    const firstStakeSample = stakesArr[0];

    // Estrai teams (path config: teams.home_team.name)
    const teams = firstMatch?.teams as { home_team?: { name?: string }; away_team?: { name?: string } } | undefined;
    const homeName = teams?.home_team?.name ?? "(non trovato)";
    const awayName = teams?.away_team?.name ?? "(non trovato)";

    // Cerca stake Winner (market_id 1) con outcome 1,2,3
    const winnerStakes = stakesArr.filter(
      (s: { market_name?: string }) => String(s?.market_name ?? "").toLowerCase() === "winner"
    );
    const outcomeIds = winnerStakes.map((s: { outcome_id?: number }) => s?.outcome_id);

    // Raggruppa stakes per market_name (utile con marketIds multipli)
    const stakesByMarket = stakesArr.reduce((acc: Record<string, number>, s: { market_name?: string }) => {
      const name = String(s?.market_name ?? "unknown");
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    }, {});

    // Sample stakes per market_id (per verificare parsing Over/Under, Handicap, BTTS, Double Chance)
    const stakesByMarketId = stakesArr.reduce((acc: Record<number, unknown[]>, s: { market_id?: number; market_name?: string; name?: string; factor?: number }) => {
      const mid = typeof s?.market_id === "number" ? s.market_id : 0;
      if (!acc[mid]) acc[mid] = [];
      if (acc[mid].length < 3) acc[mid].push({ market_id: s.market_id, market_name: s.market_name, name: s.name, factor: s.factor });
      return acc;
    }, {});

    const result: Record<string, unknown> = {
      ok: true,
      requestBody: body,
      marketIdsUsed: marketIds,
      marketIdsLegend: { 1: "Winner", 2: "Handicap", 3: "Total", 14: "BTTS", 20: "Double Chance" },
      matchesCount: matchesArr.length,
      firstMatchKeys,
      firstMatchTeams: { home: homeName, away: awayName },
      stakesCount: stakesArr.length,
      winnerStakesCount: winnerStakes.length,
      winnerOutcomeIds: outcomeIds,
      stakesByMarket,
      stakesByMarketId,
      firstMatchSample: firstMatch ? JSON.stringify(firstMatch).slice(0, full ? 4000 : 1500) : null,
      firstStakeSample: firstStakeSample ? JSON.stringify(firstStakeSample) : null,
    };

    if (categoryIds.length === 0) {
      result.hint = "category_ids=[] (tutte le categorie). Se matchesCount>0, rimuovi apiLeagueMapping 71 per usare tutte le categorie.";
    } else if (categoryIds[0] === 0) {
      result.hint = "category_ids=[0] (placeholder). Prova ?categoryIds=all per tutte le categorie, oppure /api/debug-betboom-categories per id reali.";
    } else {
      result.hint = `category_ids=${JSON.stringify(categoryIds)}`;
    }

    if (simulate) {
      try {
        const { getMultiMarketQuotes } = await import("@/lib/quotes/quotesEngine");
        const multi = await getMultiMarketQuotes("soccer_brazil_campeonato", { leagueId: 71 });
        result.simulatePipeline = {
          h2hCount: (multi.h2h ?? []).length,
          sampleQuotes: (multi.h2h ?? []).slice(0, 3).map((q) => ({
            home: q.homeTeam,
            away: q.awayTeam,
            odds: q.outcomes,
          })),
        };
      } catch (e) {
        result.simulatePipeline = { error: e instanceof Error ? e.message : String(e) };
      }
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      requestBody: body,
    });
  }
}
