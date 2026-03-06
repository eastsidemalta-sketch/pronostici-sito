/**
 * GET /api/debug-netwin-cache
 * Mostra quando è stata fatta l'ultima FULL Netwin e quando è consentita la prossima.
 * ?showMatches=1 = include campione di partite (nomi squadre usati da Netwin)
 */
import { NextResponse } from "next/server";
import { getCacheDebugInfo, getCachedMatchSample } from "@/lib/quotes/providers/netwinCache";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const showMatches = searchParams.get("showMatches") === "1";
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
    body.matchSample = getCachedMatchSample(100);
    body.hintMatchNames = "Cerca Napoli/Torino nel matchSample per vedere i nomi usati da Netwin. Aggiungi alias in data/teamAliases.json se diversi.";
  }
  return NextResponse.json(body);
}
