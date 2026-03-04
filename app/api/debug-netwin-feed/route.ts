/**
 * GET /api/debug-netwin-feed
 * Fetch raw Netwin API e restituisce la struttura per verificare il mapping.
 * ?explore=1 = esplora tutto il feed e lista manifestazioni + tutte le partite estratte.
 * Usa la config da bookmakers.json (Netwin IT-002).
 */
import { NextResponse } from "next/server";
import { getBookmakers } from "@/lib/quotes/bookmakers";
import { fetchDirectBookmakerQuotes } from "@/lib/quotes/providers/directBookmakerFetcher";
import { XMLParser } from "fast-xml-parser";

function parseResponse(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("<")) {
    const parser = new XMLParser({ ignoreAttributes: false });
    return parser.parse(trimmed);
  }
  return JSON.parse(text) as unknown;
}

function toArray<T>(v: T | T[] | null | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function extractMatchFromNode(node: Record<string, unknown>): string | null {
  const home = String(node.squadraCasa ?? node.squadra1 ?? node.homeTeam ?? "").trim();
  const away = String(node.squadraOspite ?? node.squadra2 ?? node.awayTeam ?? "").trim();
  if (home && away) return `${home} - ${away}`;
  const descr = String(node.descr ?? "").trim();
  if (descr.includes(" - ")) {
    const [h, aw] = descr.split(" - ").map((s) => s.trim());
    if (h && aw && h.length > 2 && aw.length > 2) return `${h} - ${aw}`;
  }
  return null;
}

/** Raccolta ricorsiva: tutte le Manifestazione e tutte le coppie home-away dal feed */
function exploreFeed(obj: unknown, depth = 0): { manifestazioni: string[]; matchPairs: string[] } {
  const manifestazioni = new Set<string>();
  const matchPairs = new Set<string>();
  if (depth > 20) return { manifestazioni: [], matchPairs: [] };

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        if (o.Manifestazione) {
          for (const m of toArray(o.Manifestazione)) {
            if (m && typeof m === "object") {
              const md = String((m as Record<string, unknown>).descr ?? "").trim();
              if (md) manifestazioni.add(md);
              for (const a of toArray((m as Record<string, unknown>).Avvenimento)) {
                if (a && typeof a === "object") {
                  const pair = extractMatchFromNode(a as Record<string, unknown>);
                  if (pair) matchPairs.add(pair);
                  for (const childKey of ["Partita", "Incontro", "Evento", "Avvenimento", "Palinsesto", "Giornata"]) {
                    for (const c of toArray((a as Record<string, unknown>)[childKey])) {
                      if (c && typeof c === "object") {
                        const p = extractMatchFromNode(c as Record<string, unknown>);
                        if (p) matchPairs.add(p);
                      }
                    }
                  }
                  const res = exploreFeed(a, depth + 1);
                  res.manifestazioni.forEach((x) => manifestazioni.add(x));
                  res.matchPairs.forEach((x) => matchPairs.add(x));
                }
              }
            }
          }
        }
        const pair = extractMatchFromNode(o);
        if (pair) matchPairs.add(pair);
        const res = exploreFeed(item, depth + 1);
        res.manifestazioni.forEach((x) => manifestazioni.add(x));
        res.matchPairs.forEach((x) => matchPairs.add(x));
      }
    }
  } else if (obj && typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    for (const v of Object.values(o)) {
      const res = exploreFeed(v, depth + 1);
      res.manifestazioni.forEach((x) => manifestazioni.add(x));
      res.matchPairs.forEach((x) => matchPairs.add(x));
    }
  }
  return {
    manifestazioni: [...manifestazioni].filter(Boolean).sort(),
    matchPairs: [...matchPairs].filter(Boolean).sort(),
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const explore = searchParams.get("explore") === "1";
  const codiceSitoOverride = searchParams.get("codiceSito");
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
  if (codiceSitoOverride) params.set("codiceSito", codiceSitoOverride);
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

    let exploreResult: {
      manifestazioni: string[];
      matchPairs: string[];
      directQuotes: string[];
      italiaSerieA?: { avvCount: number; firstAvvKeys?: string[]; nestedCount?: number; sampleNested?: unknown };
    } | undefined;
    if (explore) {
      const { manifestazioni, matchPairs } = exploreFeed(data);
      let directQuotes: string[] = [];
      try {
        const quotes = await fetchDirectBookmakerQuotes(netwin!, 135);
        directQuotes = quotes.map((q) => `${q.homeTeam} - ${q.awayTeam}`);
      } catch {
        directQuotes = ["(errore fetch)"];
      }
      let italiaSerieA: { avvCount: number; firstAvvKeys?: string[]; nestedCount?: number; sampleNested?: unknown } | undefined;
      for (const ev of eventsArray) {
        if (!ev || typeof ev !== "object") continue;
        const mans = toArray((ev as Record<string, unknown>).Manifestazione);
        for (const man of mans) {
          if (!man || typeof man !== "object") continue;
          const m = man as Record<string, unknown>;
          if (String(m.descr ?? "").includes("ITALIA") && String(m.descr ?? "").includes("I DIVISIONE")) {
            const avv = toArray(m.Avvenimento);
            let nested: unknown[] = [];
            for (const a of avv) {
              if (a && typeof a === "object") {
                const aa = a as Record<string, unknown>;
                for (const k of ["Partita", "Incontro", "Evento", "Avvenimento", "Palinsesto", "Giornata"]) {
                  nested = nested.concat(toArray(aa[k]));
                }
              }
            }
            const firstAvvKeys = avv[0] && typeof avv[0] === "object" ? Object.keys(avv[0] as object) : [];
            italiaSerieA = {
              avvCount: avv.length,
              firstAvvKeys,
              nestedCount: nested.length,
              sampleNested: nested.length > 0 ? nested.slice(0, 3).map((n) => (n && typeof n === "object" ? { keys: Object.keys(n as object), descr: (n as Record<string, unknown>).descr, scommessaCount: toArray((n as Record<string, unknown>).Scommessa).length } : n)) : (firstAvvKeys.length ? "nessun Partita/Incontro/Avvenimento annidato" : undefined),
            };
            break;
          }
        }
        if (italiaSerieA) break;
      }
      exploreResult = { manifestazioni, matchPairs, directQuotes, italiaSerieA };
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
      ...(exploreResult && { explore: exploreResult }),
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
