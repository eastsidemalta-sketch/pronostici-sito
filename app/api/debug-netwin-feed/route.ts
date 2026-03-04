/**
 * GET /api/debug-netwin-feed
 * Fetch raw Netwin API e restituisce la struttura per verificare il mapping.
 * Usa la config da bookmakers.json (Netwin IT-002).
 * Supporta risposta JSON e XML.
 */
import { NextResponse } from "next/server";
import { getBookmakers } from "@/lib/quotes/bookmakers";
import { XMLParser } from "fast-xml-parser";

function parseResponse(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("<")) {
    const parser = new XMLParser({ ignoreAttributes: false });
    return parser.parse(trimmed);
  }
  return JSON.parse(text) as unknown;
}

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
    const headers: Record<string, string> = { Accept: "application/json, application/xml" };
    if (netwin.apiAuthType === "header" && netwin.apiKey) {
      headers["X-Api-Key"] = netwin.apiKey;
    }

    const res = await fetch(url, { headers });
    const text = await res.text();
    let data: unknown;
    try {
      data = parseResponse(text);
    } catch {
      return NextResponse.json({
        ok: false,
        error: "Risposta non valida (né JSON né XML)",
        contentType: res.headers.get("content-type"),
        rawPreview: text.slice(0, 500),
      });
    }

    const keys = typeof data === "object" && data !== null
      ? Object.keys(data as object)
      : [];

    let eventsArray: unknown[] = [];
    let eventsPath = "?";

    function findEventsInObj(obj: unknown): unknown[] | null {
      if (Array.isArray(obj) && obj.length > 0) return obj;
      if (obj && typeof obj === "object") {
        const o = obj as Record<string, unknown>;
        for (const k of ["eventi", "evento", "events", "data", "risultati", "partite", "Exalogic"]) {
          const v = o[k];
          if (Array.isArray(v)) return v;
          if (v && typeof v === "object" && !Array.isArray(v)) {
            const inner = findEventsInObj(v);
            if (inner) return inner;
          }
        }
        for (const k of Object.keys(o)) {
          if (k === "?xml") continue;
          const v = o[k];
          if (Array.isArray(v) && v.length > 0) return v;
          if (v && typeof v === "object" && !Array.isArray(v)) {
            const inner = findEventsInObj(v);
            if (inner) return inner;
          }
        }
      }
      return null;
    }

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
      } else {
        const found = findEventsInObj(data);
        if (found) {
          eventsArray = found;
          eventsPath = "(XML nested)";
        } else if (keys.length > 0) {
          const firstVal = obj[keys[0]];
          if (Array.isArray(firstVal)) {
            eventsArray = firstVal;
            eventsPath = keys[0];
          }
        }
      }
    }

    const firstEvent = eventsArray[0];
    const firstEventKeys =
      firstEvent && typeof firstEvent === "object"
        ? Object.keys(firstEvent as object)
        : [];

    function toArray<T>(v: T | T[] | null | undefined): T[] {
      if (v == null) return [];
      return Array.isArray(v) ? v : [v];
    }

    let exalogicAvvenimenti: unknown[] = [];
    let firstAvvenimentoSample: string | null = null;
    for (const ev of eventsArray) {
      if (ev && typeof ev === "object") {
        const o = ev as Record<string, unknown>;
        const manifestazioni = toArray(o.Manifestazione);
        for (const man of manifestazioni) {
          if (man && typeof man === "object") {
            const m = man as Record<string, unknown>;
            exalogicAvvenimenti = exalogicAvvenimenti.concat(toArray(m.Avvenimento));
          }
        }
      }
    }
    const firstAvv = exalogicAvvenimenti[0];
    if (firstAvv != null) {
      firstAvvenimentoSample = JSON.stringify(firstAvv, null, 2).slice(0, 2000);
    }

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
      exalogicAvvenimentiCount: exalogicAvvenimenti.length,
      firstAvvenimentoSample,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
