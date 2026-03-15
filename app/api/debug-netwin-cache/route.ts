/**
 * GET /api/debug-netwin-cache
 * Mostra quando è stata fatta l'ultima FULL Netwin e quando è consentita la prossima.
 * ?showMatches=1 = include campione (max 100 partite)
 * ?showMatches=all = include TUTTE le partite (lettura diretta da file)
 * ?format=table = tabella CSV con colonne: #,evento,manifestazione (per analisi mapping)
 */
import { NextResponse } from "next/server";
import { getCacheDebugInfo, getCachedMatchSample, getAllCachedMatches } from "@/lib/quotes/providers/netwinCache";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const showMatches = searchParams.get("showMatches");
  const format = searchParams.get("format");
  const info = await getCacheDebugInfo();
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
    const matches =
      showMatches === "all" ? await getAllCachedMatches() : await getCachedMatchSample(100);
    body.matches = matches;
    body.matchesCount = matches.length;
    body.hintMatchNames =
      "Nomi squadre usati da Netwin (cache Redis). Aggiungi alias in data/teamAliasesByProvider.json se diversi da API Football.";

    if (format === "table" && showMatches === "all") {
      const rows = matches.map(
        (m, i) =>
          `${i + 1},"${(m.homeTeam ?? "")} - ${m.awayTeam ?? ""}","${(m.manifestazione ?? "").replace(/"/g, '""')}"`
      );
      const csv = "#,evento,manifestazione\n" + rows.join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=netwin-matches.csv",
        },
      });
    }
  }
  return NextResponse.json(body);
}
