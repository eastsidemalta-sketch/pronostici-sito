import { NextResponse } from "next/server";
import { getBookmakers } from "@/lib/quotes/bookmakers";

/**
 * Endpoint di debug per diagnosticare perché le quote Odds API non vengono recuperate.
 * Chiama: GET /api/debug-odds
 */
export async function GET() {
  const apiKey = process.env.THE_ODDS_API_KEY;
  const bookmakers = getBookmakers();
  const withOddsApi = bookmakers.filter(
    (bm) => bm.isActive && bm.apiProvider === "the_odds_api"
  );

  const diagnostics: Record<string, unknown> = {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length ?? 0,
    bookmakersTotal: bookmakers.length,
    bookmakersWithOddsApi: withOddsApi.length,
    bookmakerDetails: withOddsApi.map((bm) => ({
      id: bm.id,
      name: bm.name,
      apiBookmakerKey: bm.apiBookmakerKey,
      hasOwnKey: !!bm.apiKey,
    })),
  };

  if (!apiKey && withOddsApi.every((bm) => !bm.apiKey)) {
    return NextResponse.json({
      ok: false,
      error: "THE_ODDS_API_KEY mancante in .env.local",
      fix: "Aggiungi THE_ODDS_API_KEY=la_tua_chiave in .env.local",
      diagnostics,
    });
  }

  const keyToUse = withOddsApi[0]?.apiKey || apiKey;
  if (!keyToUse) {
    return NextResponse.json({
      ok: false,
      error: "Nessuna chiave API disponibile",
      diagnostics,
    });
  }

  // 1. Prova a ottenere la lista degli sport
  let sportsList: unknown[] = [];
  let sportsError: string | null = null;
  try {
    const sportsRes = await fetch(
      `https://api.the-odds-api.com/v4/sports?apiKey=${keyToUse}`
    );
    const text = await sportsRes.text();
    if (!sportsRes.ok) {
      sportsError = `HTTP ${sportsRes.status}: ${text.slice(0, 200)}`;
    } else {
      sportsList = JSON.parse(text) as unknown[];
    }
  } catch (e) {
    sportsError = e instanceof Error ? e.message : String(e);
  }

  const soccerKeys = (sportsList as Array<{ key: string; group?: string }>)
    .filter((s) => s.key?.startsWith("soccer_"))
    .map((s) => s.key);

  // 2. Prova soccer_epl e soccer_italy_serie_a
  let oddsError: string | null = null;
  let oddsSample: unknown = null;
  const italianOdds: Record<string, number> = {};
  for (const sk of ["soccer_epl", "soccer_italy_serie_a", "soccer_italy_copa"]) {
    try {
      const res = await fetch(
        `https://api.the-odds-api.com/v4/sports/${sk}/odds?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=${keyToUse}`
      );
      const text = await res.text();
      if (!res.ok) {
        italianOdds[sk] = -1;
        if (sk === "soccer_epl") oddsError = `HTTP ${res.status}: ${text.slice(0, 300)}`;
      } else {
        const arr = JSON.parse(text) as unknown[];
        italianOdds[sk] = Array.isArray(arr) ? arr.length : 0;
        if (sk === "soccer_epl" && Array.isArray(arr) && arr.length > 0) oddsSample = arr[0];
      }
    } catch (e) {
      italianOdds[sk] = -2;
      if (sk === "soccer_epl") oddsError = e instanceof Error ? e.message : String(e);
    }
  }
  diagnostics.oddsBySport = italianOdds;
  if (italianOdds.soccer_epl >= 0) diagnostics.oddsEventsCount = italianOdds.soccer_epl;

  const ok = !sportsError && !oddsError;
  return NextResponse.json({
    ok,
    diagnostics: {
      ...diagnostics,
      sportsError,
      soccerKeys: soccerKeys.slice(0, 30),
      oddsError,
      oddsSample: oddsSample
        ? (Array.isArray(oddsSample) ? oddsSample[0] : oddsSample)
        : null,
    },
    fix:
      sportsError || oddsError
        ? "Verifica: 1) Chiave API valida su the-odds-api.com 2) Crediti residui 3) Sport key corretto (es. soccer_epl)"
        : undefined,
  });
}
