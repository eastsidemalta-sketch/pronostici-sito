/**
 * GET /api/debug-netwin-cache
 * Mostra quando è stata fatta l'ultima FULL Netwin e quando è consentita la prossima.
 * ?showMatches=1 = include campione (max 100 partite)
 * ?showMatches=all = include TUTTE le partite (lettura diretta da file)
 */
import { NextResponse } from "next/server";
import { getCacheDebugInfo, getCachedMatchSample, getAllCachedMatchesFromFile } from "@/lib/quotes/providers/netwinCache";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const showMatches = searchParams.get("showMatches");
  const info = getCacheDebugInfo();
  const now = Date.now();
  const body: Record<string, unknown> = {
    ok: true,
    ...info,
    nowIso: new Date(now).toISOString(),
    hint: info.hasCache
      ? `Prossima FULL consentita tra ${Math.round((info.nextFullAllowedAt! - now) / 60000)} minuti`
      : "Cache vuota: la prossima richiesta farà FULL",
  };
  if (showMatches && info.hasCache) {
    // showMatches=all: lettura diretta da file per avere tutte le partite (bypass cache in-memory)
    const matches = showMatches === "all" ? getAllCachedMatchesFromFile() : getCachedMatchSample(100);
    body.matches = matches;
    body.matchesCount = matches.length;
    body.hintMatchNames = "Nomi squadre usati da Netwin. Aggiungi alias in data/teamAliasesByProvider.json se diversi da API Football.";
  }
  return NextResponse.json(body);
}
