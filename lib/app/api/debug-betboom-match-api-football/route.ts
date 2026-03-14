/**
 * Debug: confronta partite API Football (league 71) con Betboom.
 * Verifica se le partite del Brasileirão sono presenti nel feed Betboom (category_ids=[]).
 *
 * GET /api/debug-betboom-match-api-football
 */
import { NextResponse } from "next/server";
import { matchTeamNames } from "@/lib/teamAliases";

async function fetchApiFootballFixtures(leagueId: number) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return [];
  const today = new Date();
  const fromDate = today.toISOString().split("T")[0];
  const to = new Date(today);
  to.setUTCDate(to.getUTCDate() + 7);
  const toDate = to.toISOString().split("T")[0];
  const season = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;

  const url = `https://v3.football.api-sports.io/fixtures?from=${fromDate}&to=${toDate}&league=${leagueId}&season=${season}`;
  const res = await fetch(url, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.response ?? []).filter((m: any) => (m.fixture?.status?.short ?? "") === "NS");
}

async function fetchBetboomMatches(categoryIds: number[]) {
  const apiKey = process.env.BETBOOM_API_KEY;
  if (!apiKey) return [];
  let ids = categoryIds;
  if (ids.length === 0) {
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
    if (catsRes.ok) {
      const catsData = (await catsRes.json()) as { categories?: Array<{ id: number }> };
      ids = (catsData.categories ?? []).map((c) => c.id).filter((n) => n > 0);
    }
    if (ids.length === 0) return [];
  }
  const body = {
    locale: "en",
    category_ids: ids,
    market_ids: [1],
    type: "prematch",
  };
  const res = await fetch(
    "https://com-br-partner-feed.sporthub.bet/api/partner_feed/v1/matches/get_by_category_ids",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": apiKey,
        "x-partner": process.env.BETBOOM_PARTNER_ID ?? "id_7557",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { matches?: Array<{ teams?: { home_team?: { name?: string }; away_team?: { name?: string } } }> };
  const matches = data.matches ?? [];
  return matches.map((m) => ({
    home: m.teams?.home_team?.name ?? "",
    away: m.teams?.away_team?.name ?? "",
  }));
}

export async function GET() {
  const apiFootballKey = process.env.API_FOOTBALL_KEY;
  const betboomKey = process.env.BETBOOM_API_KEY;

  if (!apiFootballKey) {
    return NextResponse.json({ error: "API_FOOTBALL_KEY mancante" }, { status: 500 });
  }
  if (!betboomKey) {
    return NextResponse.json({ error: "BETBOOM_API_KEY mancante" }, { status: 500 });
  }

  try {
    const [fixtures, betboomAll] = await Promise.all([
      fetchApiFootballFixtures(71),
      fetchBetboomMatches([]),
    ]);

    const apiFootballPairs = fixtures.map((f: any) => ({
      home: (f.teams?.home?.name ?? "").trim(),
      away: (f.teams?.away?.name ?? "").trim(),
      date: f.fixture?.date,
      league: f.league?.name,
    }));

    const matched: Array<{ apiFootball: { home: string; away: string }; betboom: { home: string; away: string } }> = [];
    const notMatched: Array<{ home: string; away: string }> = [];

    for (const af of apiFootballPairs) {
      const found = betboomAll.find(
        (b) => matchTeamNames(b.home, af.home) && matchTeamNames(b.away, af.away)
      );
      if (found) {
        matched.push({ apiFootball: { home: af.home, away: af.away }, betboom: found });
      } else {
        notMatched.push({ home: af.home, away: af.away });
      }
    }

    // Sample di nomi Betboom per debug (varianti possibili)
    const betboomHomeSamples = [...new Set(betboomAll.map((b) => b.home).filter(Boolean))].slice(0, 15);
    const betboomAwaySamples = [...new Set(betboomAll.map((b) => b.away).filter(Boolean))].slice(0, 15);

    return NextResponse.json({
      ok: true,
      apiFootball: {
        leagueId: 71,
        fixturesCount: apiFootballPairs.length,
        sample: apiFootballPairs.slice(0, 5),
      },
      betboom: {
        categoryIds: [],
        matchesCount: betboomAll.length,
        homeSamples: betboomHomeSamples,
        awaySamples: betboomAwaySamples,
      },
      matching: {
        matchedCount: matched.length,
        notMatchedCount: notMatched.length,
        matched: matched.slice(0, 10),
        notMatched: notMatched.slice(0, 10),
      },
      hint:
        notMatched.length > 0 && betboomAll.length > 0
          ? "Alcune partite API Football non trovate in Betboom. Verifica teamAliases.json per varianti di nome."
          : betboomAll.length === 0
            ? "Betboom non ha restituito partite (category_ids=[]). Verifica API key e endpoint."
            : "Tutte le partite trovate in Betboom.",
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
