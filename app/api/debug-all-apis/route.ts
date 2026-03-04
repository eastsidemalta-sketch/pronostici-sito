/**
 * Debug endpoint: testa TUTTE le API quote (The Odds API + Direct).
 * GET /api/debug-all-apis
 * GET /api/debug-all-apis?leagueId=135 (opzionale: filtra per lega)
 * GET /api/debug-all-apis?probe=1 (quando quotesCount=0, mostra struttura raw risposta API)
 */
import { NextResponse } from "next/server";
import { getBookmakers } from "@/lib/quotes/bookmakers";
import { fetchOddsFromTheOddsApi } from "@/lib/quotes/providers/theOddsApi";
import { fetchDirectBookmakerQuotes } from "@/lib/quotes/providers/directBookmakerFetcher";
import { LEAGUE_ID_TO_SPORT_KEY } from "@/lib/quotes/leagueToSportKey";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const leagueIdParam = searchParams.get("leagueId");
  const leagueId = leagueIdParam ? parseInt(leagueIdParam, 10) : 135; // default Serie A
  const sportKey = LEAGUE_ID_TO_SPORT_KEY[leagueId] ?? "soccer_italy_serie_a";
  const probe = searchParams.get("probe") === "1";

  const bookmakers = getBookmakers();
  const active = bookmakers.filter((b) => b.isActive);
  const oddsApiBms = active.filter((b) => b.apiProvider === "the_odds_api");
  const directBms = active.filter((b) => b.apiProvider === "direct");

  const report: {
    summary: { total: number; active: number; oddsApi: number; direct: number };
    theOddsApi: { ok: boolean; eventsCount?: number; error?: string; bookmakers: string[] };
    direct: Array<{
      id: string;
      name: string;
      ok: boolean;
      quotesCount: number;
      sampleTeams?: string[];
      error?: string;
      rawProbe?: { keys: string[]; firstEventKeys?: string[]; eventsPathHint: string; sample?: unknown };
    }>;
    combinedTest?: { h2hQuotesCount: number; sampleBookmakers: string[] };
  } = {
    summary: {
      total: bookmakers.length,
      active: active.length,
      oddsApi: oddsApiBms.length,
      direct: directBms.length,
    },
    theOddsApi: {
      ok: false,
      bookmakers: oddsApiBms.map((b) => b.name),
    },
    direct: [],
  };

  // 1. Test The Odds API
  const apiKey = process.env.THE_ODDS_API_KEY ?? oddsApiBms[0]?.apiKey;
  if (apiKey && oddsApiBms.length > 0) {
    try {
      const raw = await fetchOddsFromTheOddsApi({ apiKey, sportKey });
      const events = Array.isArray(raw) ? raw : [];
      report.theOddsApi.ok = true;
      report.theOddsApi.eventsCount = events.length;
    } catch (e) {
      report.theOddsApi.error = e instanceof Error ? e.message : String(e);
    }
  } else if (oddsApiBms.length > 0) {
    report.theOddsApi.error = "THE_ODDS_API_KEY mancante in .env";
  }

  // 2. Test ogni Direct API
  for (const bm of directBms) {
    const entry: (typeof report.direct)[0] = {
      id: bm.id,
      name: bm.name,
      ok: false,
      quotesCount: 0,
    };
    try {
      const quotes = await fetchDirectBookmakerQuotes(bm, leagueId);
      entry.ok = true;
      entry.quotesCount = quotes.length;
      if (quotes.length > 0) {
        entry.sampleTeams = quotes
          .slice(0, 3)
          .map((q) => `${q.homeTeam} vs ${q.awayTeam}`);
      } else if (probe && bm.apiEndpoint && bm.apiRequestConfig?.queryParams) {
        // Probe: fetch raw per capire la struttura
        const params = new URLSearchParams(bm.apiRequestConfig.queryParams as Record<string, string>);
        const url = `${bm.apiEndpoint}?${params}`;
        const res = await fetch(url, {
          headers: bm.apiAuthType === "header" && bm.apiKey
            ? { "X-Api-Key": bm.apiKey, Accept: "application/json" }
            : { Accept: "application/json" },
        });
        if (res.ok) {
          const data = (await res.json()) as unknown;
          const keys = typeof data === "object" && data !== null ? Object.keys(data as object) : [];
          let firstEvent: unknown = null;
          let eventsPathHint = bm.apiMappingConfig?.eventsPath ?? "$";
          if (Array.isArray(data)) {
            firstEvent = data[0];
            eventsPathHint = "$ (root è array, len=" + data.length + ")";
          } else if (data && typeof data === "object") {
            const obj = data as Record<string, unknown>;
            const arr = obj.data ?? obj.events ?? obj.eventi ?? obj.risultati;
            if (Array.isArray(arr) && arr.length > 0) {
              firstEvent = arr[0];
              const key = obj.data ? "data" : obj.events ? "events" : obj.eventi ? "eventi" : "risultati";
              eventsPathHint = `${key} (len=${arr.length})`;
            } else if (keys.length > 0) {
              const val = obj[keys[0]];
              if (Array.isArray(val) && val.length > 0) {
                firstEvent = val[0];
                eventsPathHint = `${keys[0]} (len=${val.length})`;
              }
            }
          }
          entry.rawProbe = {
            keys,
            firstEventKeys: firstEvent && typeof firstEvent === "object" ? Object.keys(firstEvent as object) : undefined,
            eventsPathHint,
            sample: firstEvent ? JSON.stringify(firstEvent).slice(0, 800) : undefined,
          };
        }
      }
    } catch (e) {
      entry.error = e instanceof Error ? e.message : String(e);
    }
    report.direct.push(entry);
  }

  // 3. Test combinato: getMultiMarketQuotes (simula la pagina partita)
  try {
    const { getMultiMarketQuotes } = await import("@/lib/quotes/quotesEngine");
    const multi = await getMultiMarketQuotes(sportKey, { leagueId });
    const h2h = multi.h2h ?? [];
    const bookmakerKeys = [...new Set(h2h.map((q) => q.bookmakerKey).filter(Boolean))];
    report.combinedTest = {
      h2hQuotesCount: h2h.length,
      sampleBookmakers: bookmakerKeys as string[],
    };
  } catch (e) {
    report.combinedTest = {
      h2hQuotesCount: 0,
      sampleBookmakers: [],
    };
  }

  const allOk =
    (report.theOddsApi.ok || oddsApiBms.length === 0) &&
    report.direct.every((d) => d.ok);

  return NextResponse.json({
    ok: allOk,
    leagueId,
    sportKey,
    report,
    fix:
      !allOk && report.theOddsApi.error
        ? "Aggiungi THE_ODDS_API_KEY in .env sul server"
        : report.direct.some((d) => d.error)
          ? "Verifica endpoint, apiKey e mapping in clientProfiles per i direct"
          : undefined,
  });
}
