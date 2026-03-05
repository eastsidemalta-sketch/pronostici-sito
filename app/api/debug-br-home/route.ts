/**
 * Debug: replica esattamente il flusso della home BR bypassando la cache.
 * Utile per capire perché /pt-BR/ mostra "Nenhum jogo nos próximos 7 dias".
 *
 * GET /api/debug-br-home
 * GET /api/debug-br-home?invalidate=1  → invalida cache BR e poi mostra dati freschi
 */
import { NextResponse } from "next/server";
import { getUpcomingFixtures } from "@/lib/apiFootball";
import { getLeagueIdsForAllSports } from "@/lib/homeMenuData";
import { isSportEnabledForCountry } from "@/lib/sportsPerCountryData";
import { invalidateHomeCache } from "@/lib/homePageCache";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shouldInvalidate = searchParams.get("invalidate") === "1";

  if (shouldInvalidate) {
    await invalidateHomeCache("BR");
  }

  const leagueIds = getLeagueIdsForAllSports("BR");
  const calcioEnabled = isSportEnabledForCountry("BR", "calcio");

  let fixtures: any[] = [];
  let error: string | null = null;
  if (calcioEnabled && leagueIds.length > 0) {
    try {
      fixtures = await getUpcomingFixtures(leagueIds);
    } catch (e) {
      error = String(e);
    }
  }

  const sample = fixtures.slice(0, 3).map((f: any) => ({
    id: f.fixture?.id,
    home: f.teams?.home?.name,
    away: f.teams?.away?.name,
    date: f.fixture?.date,
    leagueId: f.league?.id,
  }));

  return NextResponse.json({
    ok: true,
    invalidated: shouldInvalidate,
    leagueIds,
    calcioEnabled,
    fixturesCount: fixtures.length,
    sample,
    error,
    hint:
      fixtures.length === 0
        ? "Se debug-br-fixtures mostra 8 partite ma qui 0: possibile cache Redis stale. Usa ?invalidate=1 e ricarica /pt-BR/"
        : `Dovresti vedere ${fixtures.length} partite su /pt-BR/`,
  });
}
