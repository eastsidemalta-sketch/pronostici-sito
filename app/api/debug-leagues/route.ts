import { NextResponse } from "next/server";

/**
 * Debug: verifica se API-Football ha Super Lig, Liga Portugal, Serie C.
 * GET /api/debug-leagues
 */
export async function GET() {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    return NextResponse.json({ error: "API_FOOTBALL_KEY mancante" }, { status: 500 });
  }

  const searches = ["Super Lig", "Liga Portugal", "Primeira Liga", "Serie C"];
  const results: Record<string, { id: number; name: string; country: string; type: string }[]> = {};

  for (const search of searches) {
    const url = `https://v3.football.api-sports.io/leagues?search=${encodeURIComponent(search)}`;
    const res = await fetch(url, {
      headers: { "x-apisports-key": key },
      cache: "no-store",
    });
    const data = await res.json();
    if (data.response && Array.isArray(data.response)) {
      results[search] = data.response.slice(0, 5).map((r: any) => ({
        id: r.league?.id,
        name: r.league?.name,
        country: r.country?.name,
        type: r.league?.type,
      }));
    } else {
      results[search] = [];
    }
  }

  return NextResponse.json({
    note: "Cerca le leghe su API-Football. Usa 'id' per aggiungerle a CALCIO_COMPETITIONS.",
    results,
  });
}
