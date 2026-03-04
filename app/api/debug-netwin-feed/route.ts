/**
 * GET /api/debug-netwin-feed
 * Fetch raw Netwin API e restituisce la struttura per verificare il mapping.
 * Usa la config da bookmakers.json (Netwin IT-002).
 */
import { NextResponse } from "next/server";
import { getBookmakers } from "@/lib/quotes/bookmakers";

export async function GET() {
  const bookmakers = getBookmakers();
  const netwin = bookmakers.find(
    (b) => b.siteId === "IT-002" || b.id?.toLowerCase().includes("netwin")
  );

  if (!netwin?.apiEndpoint || !netwin.apiRequestConfig?.queryParams) {
    return NextResponse.json({
      error: "Netwin non configurato con apiEndpoint e apiRequestConfig",
      hint: "Esegui: node scripts/apply-netwin-config.mjs",
    });
  }

  const params = new URLSearchParams(
    netwin.apiRequestConfig.queryParams as Record<string, string>
  );
  const url = `${netwin.apiEndpoint}?${params}`;

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (netwin.apiAuthType === "header" && netwin.apiKey) {
      headers["X-Api-Key"] = netwin.apiKey;
    }

    const res = await fetch(url, { headers });
    const data = (await res.json()) as unknown;

    const keys = typeof data === "object" && data !== null
      ? Object.keys(data as object)
      : [];

    let eventsArray: unknown[] = [];
    let eventsPath = "?";
    if (Array.isArray(data)) {
      eventsArray = data;
      eventsPath = "$ (root è array)";
    } else if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const arr = obj.data ?? obj.events ?? obj.eventi ?? obj.risultati ?? obj.eventos;
      if (Array.isArray(arr)) {
        eventsArray = arr;
        const key = obj.data ? "data" : obj.events ? "events" : obj.eventi ? "eventi" : obj.risultati ? "risultati" : "eventos";
        eventsPath = key;
      } else if (keys.length > 0) {
        const firstVal = obj[keys[0]];
        if (Array.isArray(firstVal)) {
          eventsArray = firstVal;
          eventsPath = keys[0];
        }
      }
    }

    const firstEvent = eventsArray[0];
    const firstEventKeys =
      firstEvent && typeof firstEvent === "object"
        ? Object.keys(firstEvent as object)
        : [];

    return NextResponse.json({
      ok: true,
      httpStatus: res.status,
      url: url.replace(/system_code=[^&]+/, "system_code=***"),
      rootKeys: keys,
      eventsPath,
      eventsCount: eventsArray.length,
      firstEventKeys,
      firstEventSample:
        firstEvent != null
          ? JSON.stringify(firstEvent, null, 2).slice(0, 2000)
          : null,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
