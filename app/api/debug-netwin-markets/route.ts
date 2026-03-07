/**
 * GET /api/debug-netwin-markets
 * Lista completa dei mercati (codici Lista) nel feed Netwin e numero di match per mercato.
 *
 * ?type=delta = usa DELTA (meno dati, non consuma quota FULL). Default: FULL.
 * Attenzione: FULL max 1 ogni 3 ore.
 */
import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { getBookmakers } from "@/lib/quotes/bookmakers";

function toArray<T>(v: T | T[] | null | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function getListaFromScommessa(o: Record<string, unknown>): number {
  const val = o.Lista ?? o.lista ?? o.cod ?? o.Cod ?? o.Codice ?? o.codice;
  if (val == null) return NaN;
  const n = parseInt(String(val), 10);
  return Number.isNaN(n) ? NaN : n;
}

function collectAllScommesse(node: Record<string, unknown>): unknown[] {
  const out = toArray((node.Scommessa ?? node.scommessa) as unknown);
  for (const key of ["Partita", "Incontro", "Evento", "Avvenimento", "Palinsesto", "Giornata"]) {
    const children = toArray(node[key] as unknown);
    for (const c of children) {
      if (c && typeof c === "object") {
        out.push(...collectAllScommesse(c as Record<string, unknown>));
      }
    }
  }
  return out;
}

/** Nomi mercati da docs/NETWIN-SPORTS-MARKETS.md */
const LISTA_NAMES: Record<number, string> = {
  3: "1X2 / Quote 1X2",
  4: "Risultato Primo/Secondo Tempo",
  5: "Totale gol esatto",
  6: "Qualificazione turno",
  7: "Risultato Esatto",
  8: "Handicap",
  15: "Doppia chance",
  16: "Doppia chance",
  17: "Doppia chance",
  18: "Gol/No Gol (BTTS)",
  19: "Pari/Dispari",
  26: "Handicap Basket",
  28: "1X2 Basket",
  30: "Margine Vittoria 7 Esiti",
  31: "Margine Vittoria 12 Esiti",
  51: "Set Betting a 3",
  52: "Set Betting a 5",
  110: "Vincente match Basket",
  191: "Pari/Dispari Basket",
  420: "Vincente a 0 Squadra Casa",
  421: "Vincente a 0 Squadra Ospite",
  561: "Combinazione Goal/No Goal",
  570: "Totale gol Squadra casa",
  571: "Totale gol Squadra Ospite",
  982: "U/O Set nell'incontro",
  983: "U/O Giochi nel match",
  1127: "T/T Handicap Giochi",
  4156: "Totale Set 2/3",
  6321: "Giocatore 1 Vin. almeno un set",
  6322: "Giocatore 2 Vin. almeno un set",
  6513: "U/O Giochi nel set",
  7842: "Primo/Secondo tempo 1X2 Basket",
  7989: "Over/Under",
  8291: "1X2 (senza scarto) Basket",
  9056: "1X2 (3 Punti) Basket",
  9942: "U/O Tempo",
  9943: "U/O x Squadra",
  12562: "U/O + Goal/No Goal",
  15529: "Risultato Primo/Secondo Tempo",
  16474: "(non descritto)",
  17875: "Rimborso in caso di parità",
  20540: "Vincente Match Singolo Tennis",
  22284: "Entrambi segnano PT/ST",
  22286: "Risultato esatto Primo tempo",
  22296: "Totale Gol Esatto PT/ST",
  22580: "(Basket)",
  23052: "Vincente entrambi i tempi",
  23140: "Entrambi segnano in entrambi i tempi",
  27905: "U/O Squadra X Tempo Y",
  2832: "Parziale/Finale Basket",
  14863: "Over/Under Basket",
};

function findEventsArray(obj: unknown): unknown[] | null {
  if (Array.isArray(obj) && obj.length > 0) return obj;
  if (obj && typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    for (const k of ["eventi", "evento", "events", "data", "risultati", "partite", "Exalogic"]) {
      const v = o[k];
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const inner = findEventsArray(v);
        if (inner) return inner;
      }
    }
    for (const k of Object.keys(o)) {
      if (k === "?xml") continue;
      const v = o[k];
      if (Array.isArray(v) && v.length > 0) return v;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const inner = findEventsArray(v);
        if (inner) return inner;
      }
    }
  }
  return null;
}

function parseResponse(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("<")) {
    const parser = new XMLParser({ ignoreAttributes: false });
    return parser.parse(trimmed);
  }
  return JSON.parse(text) as unknown;
}

/** Estrae tutti gli Avvenimenti (match) dalla struttura Exalogic. collectAllScommesse prende anche Scommesse da Partita/Incontro annidati. */
function collectAvvenimenti(eventsArray: unknown[]): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const ev of eventsArray) {
    if (!ev || typeof ev !== "object") continue;
    const o = ev as Record<string, unknown>;
    const manifestazioni = toArray(o.Manifestazione);
    for (const man of manifestazioni) {
      if (!man || typeof man !== "object") continue;
      const m = man as Record<string, unknown>;
      const avvenimenti = toArray(m.Avvenimento);
      for (const avv of avvenimenti) {
        if (avv && typeof avv === "object") out.push(avv as Record<string, unknown>);
      }
    }
  }
  return out;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const requestType = searchParams.get("type") === "delta" ? "delta" : "FULL";
  const systemCodeOverride = searchParams.get("systemCode") ?? process.env.NETWIN_SYSTEM_CODE_OVERRIDE;

  const bookmakers = getBookmakers();
  const netwin = bookmakers.find(
    (b) => b.siteId === "IT-0002" || b.id?.toLowerCase().includes("netwin")
  );

  if (!netwin?.apiEndpoint || !netwin.apiRequestConfig?.queryParams) {
    return NextResponse.json({
      error: "Netwin non configurato",
      hint: "Verifica data/bookmakers.json (IT-0002)",
    });
  }

  const q = netwin.apiRequestConfig.queryParams as Record<string, string>;
  const params = new URLSearchParams();
  params.set("isLive", "0");
  for (const [k, v] of Object.entries(q)) {
    if (k.toLowerCase() === "islive" || k === "is_live") continue;
    if (v != null && String(v).trim() !== "") params.set(k, String(v).trim());
  }
  params.set("type", requestType);
  if (systemCodeOverride) params.set("system_code", systemCodeOverride);

  const url = `${netwin.apiEndpoint}?${params}`;

  try {
    const headers: Record<string, string> = { Accept: "application/json, application/xml" };
    if (netwin.apiAuthType === "header" && netwin.apiKey) {
      headers["X-Api-Key"] = netwin.apiKey;
    }
    headers["X-IsLive"] = "0";

    const res = await fetch(url, { headers });
    const text = await res.text();

    const isLockError =
      text.includes("hash_lock") ||
      /richiesta\s+FULL/i.test(text) ||
      /FULL\s+e['']\s+gia['']?\s+in\s+corso/i.test(text);
    if (isLockError) {
      return NextResponse.json({
        ok: false,
        error: "Netwin: FULL già in corso (hash_lock)",
        hint: "Attendi 5-10 min o usa ?type=delta",
      });
    }
    if (text.includes("isLive") && /can be 0 or 1/i.test(text)) {
      return NextResponse.json({ ok: false, error: "Netwin: parametro isLive non valido" });
    }

    let data: unknown;
    try {
      data = parseResponse(text);
    } catch {
      return NextResponse.json({
        ok: false,
        error: "Risposta non valida",
        rawPreview: text.slice(0, 500),
      });
    }

    const eventsArray = findEventsArray(data);
    if (!eventsArray || eventsArray.length === 0) {
      return NextResponse.json({
        ok: true,
        requestType,
        totalMatches: 0,
        markets: [],
        hint: "Nessun evento nel feed. Prova type=FULL (consuma quota 3h).",
      });
    }

    const avvenimenti = collectAvvenimenti(eventsArray);

    // Per ogni match, raccogli i codici Lista dalle Scommesse
    const matchCountByLista = new Map<number, number>();
    for (const avv of avvenimenti) {
      const scommesse = collectAllScommesse(avv);
      const listasInMatch = new Set<number>();
      for (const s of scommesse) {
        if (s && typeof s === "object") {
          const lista = getListaFromScommessa(s as Record<string, unknown>);
          if (!Number.isNaN(lista)) listasInMatch.add(lista);
        }
      }
      for (const lista of listasInMatch) {
        matchCountByLista.set(lista, (matchCountByLista.get(lista) ?? 0) + 1);
      }
    }

    const markets = Array.from(matchCountByLista.entries())
      .map(([code, matchCount]) => ({
        code,
        name: LISTA_NAMES[code] ?? `? (codice ${code})`,
        matchCount,
      }))
      .sort((a, b) => a.code - b.code);

    const totalMatches = avvenimenti.length;

    return NextResponse.json({
      ok: true,
      requestType,
      totalMatches,
      markets,
      summary: `${markets.length} mercati, ${totalMatches} match totali`,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
