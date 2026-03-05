/**
 * Debug: verifica perché il Brasile non vede partite.
 * Simula getUpcomingFixtures([71]) e mostra API Football + fallback Betboom.
 *
 * GET /api/debug-br-fixtures
 */
import { NextResponse } from "next/server";

function getTodayInSiteTz(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

export async function GET() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  const betboomKey = process.env.BETBOOM_API_KEY;

  const fromDate = getTodayInSiteTz();
  const to = new Date(fromDate + "T00:00:00Z");
  to.setUTCDate(to.getUTCDate() + 7);
  const toDate = to.toISOString().split("T")[0];

  const today = new Date();
  const season = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
  const nextSeason = today.getFullYear();

  let apiFootballCount = 0;
  let betboomCount = 0;
  let apiFootballSample: string[] = [];
  let betboomSample: string[] = [];

  if (apiKey) {
    const url = `https://v3.football.api-sports.io/fixtures?from=${fromDate}&to=${toDate}&league=71&season=${season}`;
    const res = await fetch(url, {
      headers: { "x-apisports-key": apiKey },
      cache: "no-store",
    });
    const data = await res.json();
    const fixtures = (data.response ?? []) as Array<{ fixture?: { date?: string }; teams?: { home?: { name?: string }; away?: { name?: string } } }>;
    apiFootballCount = fixtures.length;
    apiFootballSample = fixtures.slice(0, 3).map((f) =>
      `${f.teams?.home?.name ?? "?"} - ${f.teams?.away?.name ?? "?"} (${f.fixture?.date ?? "?"})`
    );

    if (apiFootballCount === 0) {
      const url2 = `https://v3.football.api-sports.io/fixtures?from=${fromDate}&to=${toDate}&league=71&season=${nextSeason}`;
      const res2 = await fetch(url2, {
        headers: { "x-apisports-key": apiKey },
        cache: "no-store",
      });
      const data2 = await res2.json();
      const fixtures2 = data2.response ?? [];
      apiFootballCount = fixtures2.length;
      apiFootballSample = fixtures2.slice(0, 3).map((f: any) =>
        `${f.teams?.home?.name ?? "?"} - ${f.teams?.away?.name ?? "?"} (${f.fixture?.date ?? "?"})`
      );
    }
  }

  if (betboomKey) {
    const res = await fetch(
      "https://com-br-partner-feed.sporthub.bet/api/partner_feed/v1/matches/get_by_category_ids",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": betboomKey,
          "x-partner": process.env.BETBOOM_PARTNER_ID ?? "id_7557",
        },
        body: JSON.stringify({
          locale: "en",
          category_ids: [161],
          market_ids: [1],
          type: "prematch",
        }),
        cache: "no-store",
      }
    );
    if (res.ok) {
      const data = (await res.json()) as { matches?: Array<{ start_dttm?: string; teams?: { home_team?: { name?: string }; away_team?: { name?: string } } }> };
      const matches = data.matches ?? [];
      const from = new Date(fromDate + "T00:00:00Z").getTime();
      const toMs = new Date(toDate + "T23:59:59Z").getTime();
      const inRange = matches.filter((m) => {
        const start = m.start_dttm ? new Date(m.start_dttm).getTime() : 0;
        return start >= from && start <= toMs;
      });
      betboomCount = inRange.length;
      betboomSample = inRange.slice(0, 5).map((m) =>
        `${m.teams?.home_team?.name ?? "?"} - ${m.teams?.away_team?.name ?? "?"} (${m.start_dttm ?? "?"})`
      );
    }
  }

  const total = apiFootballCount > 0 ? apiFootballCount : betboomCount;

  return NextResponse.json({
    ok: true,
    dateRange: { from: fromDate, to: toDate },
    serverNow: new Date().toISOString(),
    seasonTried: [season, nextSeason],
    apiFootball: {
      count: apiFootballCount,
      sample: apiFootballSample,
    },
    betboom: {
      count: betboomCount,
      sample: betboomSample,
    },
    totalFixturesExpected: total,
    hint:
      total === 0
        ? "Nessuna partita nel range. Verifica date, API keys, o che la partita dell'11 marzo sia nel feed Betboom."
        : `Dovresti vedere ${total} partite su /pt-BR/`,
  });
}
