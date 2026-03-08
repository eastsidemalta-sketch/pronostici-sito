/**
 * Debug: replica il flusso getCachedHomeData per BR (bypass cache).
 * Utile per capire perché /pt-BR/ mostra "Nenhum jogo nos próximos 7 dias".
 *
 * GET /api/debug-br-home
 * GET /api/debug-br-home?invalidate=1  → invalida cache e mostra dati freschi
 */
import { NextResponse } from "next/server";
import { getCachedHomeData } from "@/lib/homePageCache";
import { getLeagueIdsForAllSports } from "@/lib/homeMenuData";
import { invalidateHomeCache } from "@/lib/homePageCache";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shouldInvalidate = searchParams.get("invalidate") === "1";

  if (shouldInvalidate) {
    await invalidateHomeCache("*");
  }

  const leagueIds = getLeagueIdsForAllSports("BR");
  const { fixtures, usingFallback } = await getCachedHomeData("BR", true);

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
    fixturesCount: fixtures.length,
    usingFallback: usingFallback ?? false,
    sample,
    hint:
      fixtures.length === 0
        ? "Pool globale vuoto o filtraggio BR senza match. Usa ?invalidate=1. Fallback: cacheFallback BR→IT in leaguesConfig."
        : `Dovresti vedere ${fixtures.length} partite su /pt-BR/`,
  });
}
