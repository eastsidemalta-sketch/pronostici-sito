/**
 * Debug: verifica quante partite restituisce API Football per ogni lega.
 * Utile per diagnosticare leghe mancanti (es. Serie A).
 *
 * GET /api/debug-api-football-leagues
 * GET /api/debug-api-football-leagues?country=IT
 */
import { NextResponse } from "next/server";
import { getEnabledLeagueIds } from "@/lib/leaguesConfig";

const LEAGUE_NAMES: Record<number, string> = {
  2: "Champions League",
  3: "Europa League",
  4: "Conference League",
  39: "Premier League",
  61: "Ligue 1",
  66: "Liga Portugal",
  71: "Brasileirão",
  72: "Brasileirão B",
  78: "Bundesliga",
  94: "Super League CH",
  135: "Serie A",
  136: "Serie B",
  137: "Eredivisie",
  140: "La Liga",
  142: "Super League GR",
  143: "Super League BE",
  148: "Super League AT",
  203: "Super League",
};

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

export async function GET(request: Request) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    return NextResponse.json({
      ok: false,
      error: "API_FOOTBALL_KEY mancante",
    });
  }

  const { searchParams } = new URL(request.url);
  const countryParam = searchParams.get("country") ?? "IT";
  const leagueIds = getEnabledLeagueIds(countryParam);

  const fromDate = getTodayInSiteTz();
  const to = new Date(fromDate + "T00:00:00Z");
  to.setUTCDate(to.getUTCDate() + 7);
  const toDate = to.toISOString().split("T")[0];

  const today = new Date();
  const season = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;

  const perLeague: Array<{ leagueId: number; name: string; count: number; season: number }> = [];

  for (const leagueId of leagueIds) {
    const url = `https://v3.football.api-sports.io/fixtures?from=${fromDate}&to=${toDate}&league=${leagueId}&season=${season}`;
    try {
      const res = await fetch(url, {
        headers: { "x-apisports-key": key },
        cache: "no-store",
      });
      const data = await res.json();
      const count = Array.isArray(data.response) ? data.response.length : 0;
      perLeague.push({
        leagueId,
        name: LEAGUE_NAMES[leagueId] ?? `League ${leagueId}`,
        count,
        season,
      });
      await new Promise((r) => setTimeout(r, 150));
    } catch (e) {
      perLeague.push({
        leagueId,
        name: LEAGUE_NAMES[leagueId] ?? `League ${leagueId}`,
        count: -1,
        season,
      });
    }
  }

  const serieA = perLeague.find((p) => p.leagueId === 135);
  const total = perLeague.reduce((s, p) => s + (p.count > 0 ? p.count : 0), 0);

  return NextResponse.json({
    ok: true,
    country: countryParam,
    fromDate,
    toDate,
    season,
    total,
    serieA: serieA ? { count: serieA.count, leagueId: 135 } : null,
    perLeague,
  });
}
