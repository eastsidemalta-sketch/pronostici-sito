/**
 * Debug: diagnostica perché le partite non compaiono in home per IT e BR.
 * Replica il flusso getCachedHomeData per entrambi i paesi.
 *
 * GET /api/debug-home
 * GET /api/debug-home?country=IT
 * GET /api/debug-home?country=BR
 * GET /api/debug-home?bypass=1  → bypass cache, fetch fresco
 *
 * Protetto da CRON_SECRET (stesso di invalidate-cache).
 */
import { NextResponse } from "next/server";
import { getCachedHomeData } from "@/lib/homePageCache";
import { getLeagueIdsForAllSports } from "@/lib/homeMenuData";
import { isSportEnabledForCountry } from "@/lib/sportsPerCountryData";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const countryParam = searchParams.get("country") ?? "IT,BR";
  const bypass = searchParams.get("bypass") === "1";

  const countries = countryParam
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => ["IT", "BR"].includes(c));

  if (countries.length === 0) {
    return NextResponse.json({ error: "country deve essere IT, BR o IT,BR" }, { status: 400 });
  }

  const results: Record<
    string,
    {
      leagueIds: number[];
      calcioEnabled: boolean;
      fixturesCount: number;
      sample: Array<{ id: number; home: string; away: string; leagueId: number }>;
      hasSerieA: boolean;
    }
  > = {};

  for (const country of countries) {
    const leagueIds = getLeagueIdsForAllSports(country);
    const calcioEnabled = isSportEnabledForCountry(country, "calcio");
    const { fixtures } = await getCachedHomeData(country, bypass);

    const serieA = fixtures.filter((f: any) => f.league?.id === 135);
    results[country] = {
      leagueIds,
      calcioEnabled,
      fixturesCount: fixtures.length,
      sample: fixtures.slice(0, 3).map((f: any) => ({
        id: f.fixture?.id,
        home: f.teams?.home?.name ?? "",
        away: f.teams?.away?.name ?? "",
        leagueId: f.league?.id,
      })),
      hasSerieA: serieA.length > 0,
    };
  }

  const allOk = Object.values(results).every((r) => r.fixturesCount > 0 && r.hasSerieA);

  return NextResponse.json({
    ok: true,
    bypass,
    results,
    summary: allOk
      ? "Tutti i paesi hanno partite incluso Serie A"
      : "Alcuni paesi senza partite o senza Serie A. Controlla leagueIds, calcioEnabled, API_FOOTBALL_KEY.",
  });
}
