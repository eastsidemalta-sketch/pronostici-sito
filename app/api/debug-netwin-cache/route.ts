/**
 * GET /api/debug-netwin-cache
 * Mostra quando è stata fatta l'ultima FULL Netwin e quando è consentita la prossima.
 */
import { NextResponse } from "next/server";
import { getCacheDebugInfo } from "@/lib/quotes/providers/netwinCache";

export async function GET() {
  const info = getCacheDebugInfo();
  const now = Date.now();
  return NextResponse.json({
    ok: true,
    ...info,
    nowIso: new Date(now).toISOString(),
    hint: info.hasCache
      ? `Prossima FULL consentita tra ${Math.round((info.nextFullAllowedAt! - now) / 60000)} minuti`
      : "Cache vuota: la prossima richiesta farà FULL",
  });
}
