/**
 * Debug: verifica stato API Football (fixtures).
 * GET /api/debug-api-football
 * Ritorna: chiave presente, test fetch, conteggio partite, eventuale errore.
 */
import { NextResponse } from "next/server";
import { getUpcomingFixtures } from "@/lib/apiFootball";
import { getEnabledLeagueIds } from "@/lib/leaguesConfig";

export async function GET() {
  const hasKey = !!process.env.API_FOOTBALL_KEY;
  const leagueIds = getEnabledLeagueIds();

  if (!hasKey) {
    return NextResponse.json({
      ok: false,
      error: "API_FOOTBALL_KEY mancante in .env.local",
      hint: "Copia .env.local in .next/standalone/ e riavvia PM2",
      hasKey: false,
      leagueIds: [],
    });
  }

  try {
    const fixtures = await getUpcomingFixtures(leagueIds.slice(0, 5));
    const sample = fixtures.slice(0, 3).map((m: any) => ({
      id: m.fixture?.id,
      date: m.fixture?.date,
      home: m.teams?.home?.name,
      away: m.teams?.away?.name,
      league: m.league?.name,
    }));

    return NextResponse.json({
      ok: true,
      hasKey: true,
      leagueIds: leagueIds.slice(0, 10),
      fixturesCount: fixtures.length,
      sample,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      hasKey: true,
      error: e instanceof Error ? e.message : String(e),
      leagueIds: leagueIds.slice(0, 10),
    });
  }
}
