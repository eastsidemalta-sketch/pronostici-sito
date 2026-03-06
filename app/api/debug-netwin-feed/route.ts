/**
 * GET /api/debug-netwin-feed
 * Fetch raw Netwin API e restituisce la struttura per verificare il mapping.
 * ?explore=1 = esplora tutto il feed e lista manifestazioni + tutte le partite estratte.
 * Per i test di configurazione usa SOLO richieste DELTA (quota FULL limitata, max 1 ogni 2-3h).
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

/** Esplora gerarchia Disciplina > Manifestazione > Avvenimento > Scommessa > Esito */
function exploreHierarchy(obj: unknown): {
  disciplina: unknown[];
  manifestazione: unknown[];
  avvenimento: unknown[];
  scommessa: unknown[];
  esito: unknown[];
} {
  const out = { disciplina: [] as unknown[], manifestazione: [] as unknown[], avvenimento: [] as unknown[], scommessa: [] as unknown[], esito: [] as unknown[] };
  function walk(o: unknown, depth: number) {
    if (depth > 15) return;
    if (Array.isArray(o)) {
      for (const item of o) walk(item, depth + 1);
      return;
    }
    if (!o || typeof o !== "object") return;
    const rec = o as Record<string, unknown>;
    if (rec.Disciplina) {
      const arr = toArray(rec.Disciplina);
      out.disciplina.push(...arr);
      for (const d of arr) walk(d, depth + 1);
    }
    if (rec.Manifestazione) {
      const arr = toArray(rec.Manifestazione);
      if (out.manifestazione.length < 5) out.manifestazione.push(...arr.slice(0, 5 - out.manifestazione.length));
      for (const m of arr) walk(m, depth + 1);
    }
    if (rec.Avvenimento) {
      const arr = toArray(rec.Avvenimento);
      if (out.avvenimento.length < 5) out.avvenimento.push(...arr.slice(0, 5 - out.avvenimento.length));
      for (const a of arr) walk(a, depth + 1);
    }
    if (rec.Scommessa) {
      const arr = toArray(rec.Scommessa);
      if (out.scommessa.length < 5) out.scommessa.push(...arr.slice(0, 5 - out.scommessa.length));
      for (const s of arr) walk(s, depth + 1);
    }
    if (rec.Esito) {
      const arr = toArray(rec.Esito);
      if (out.esito.length < 10) out.esito.push(...arr.slice(0, 10 - out.esito.length));
    }
    for (const v of Object.values(rec)) {
      if (v !== rec.Disciplina && v !== rec.Manifestazione && v !== rec.Avvenimento && v !== rec.Scommessa && v !== rec.Esito) {
        walk(v, depth + 1);
      }
    }
  }
  walk(obj, 0);
  return out;
}

function sampleNode(n: unknown): unknown {
  if (n == null) return null;
  if (typeof n !== "object") return n;
  const o = n as Record<string, unknown>;
  return { keys: Object.keys(o), descr: o.descr, cod: o.cod, Lista: o.Lista, quota: o.quota, sample: JSON.stringify(o).slice(0, 300) };
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
  /** systemCode override: usa ?systemCode=XXX o env NETWIN_SYSTEM_CODE_OVERRIDE per test (evita lock con produzione) */
  const systemCodeOverride = searchParams.get("systemCode") ?? process.env.NETWIN_SYSTEM_CODE_OVERRIDE;
  /** Solo DELTA per i test di configurazione — non consumare quota FULL. */
  const requestType = "delta";
  const bookmakers = getBookmakers();
  const netwin = bookmakers.find(
    (b) => b.siteId === "IT-002" || b.siteId === "IT-0002" || b.id?.toLowerCase().includes("netwin")
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
  params.set("type", requestType);
  if (codiceSitoOverride) params.set("codiceSito", codiceSitoOverride);
  if (systemCodeOverride) params.set("system_code", systemCodeOverride);
  const url = `${netwin.apiEndpoint}?${params}`;

  try {
    const headers: Record<string, string> = { Accept: "application/json, application/xml" };
    if (netwin.apiAuthType === "header" && netwin.apiKey) {
      headers["X-Api-Key"] = netwin.apiKey;
    }

    const res = await fetch(url, { headers });
    const text = await res.text();

    /** Netwin restituisce testo quando una FULL è in corso — intercetta prima del parse */
    const isLockError =
      text.includes("hash_lock") ||
      /richiesta\s+FULL/i.test(text) ||
      /FULL\s+e['']\s+gia['']?\s+in\s+corso/i.test(text) ||
      (text.includes("Attenzione") && text.includes("FULL") && text.includes("in corso"));
    if (isLockError) {
      return NextResponse.json({
        ok: false,
        error: "Netwin: una richiesta FULL è già in corso",
        hint: "L'API blocca le richieste finché la FULL non termina. Soluzioni: (1) Attendi 5-10 min e riprova. (2) Chiedi a Netwin un system_code separato per test (es. PLAYSIGNAL_TEST) e usa ?systemCode=PLAYSIGNAL_TEST oppure env NETWIN_SYSTEM_CODE_OVERRIDE.",
        rawPreview: text.slice(0, 500),
      });
    }

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

    const hierarchy = exploreHierarchy(data);
    const disciplinaList = hierarchy.disciplina.map((d) => {
      if (d == null) return null;
      if (typeof d !== "object") return String(d);
      const o = d as Record<string, unknown>;
      const descr = String(o.descr ?? "").trim();
      const cod = o.cod != null ? String(o.cod) : "";
      return descr || cod || JSON.stringify(o).slice(0, 200);
    }).filter(Boolean) as string[];
    const calcioInDisciplina = hierarchy.disciplina.filter((d) => {
      if (d == null || typeof d !== "object") return String(d).toUpperCase().includes("CALCIO");
      const o = d as Record<string, unknown>;
      return Object.values(o).some((v) => String(v ?? "").toUpperCase().includes("CALCIO"));
    });
    const disciplinaInfo = {
      count: hierarchy.disciplina.length,
      list: disciplinaList,
      hasCalcio: calcioInDisciplina.length > 0,
      calcioItems: calcioInDisciplina.map((d) => (d && typeof d === "object" ? { keys: Object.keys(d as object), ...(d as Record<string, unknown>) } : d)),
      items: hierarchy.disciplina.map((d) => {
        if (d == null) return null;
        if (typeof d !== "object") return d;
        const o = d as Record<string, unknown>;
        return { keys: Object.keys(o), ...o, _full: JSON.stringify(o).slice(0, 800) };
      }),
    };

    let exploreResult: {
      manifestazioni: string[];
      matchPairs: string[];
      directQuotes: string[];
      directMultiMarket?: Record<string, unknown>;
      italiaSerieA?: { avvCount: number; firstAvvKeys?: string[]; nestedCount?: number; sampleNested?: unknown; aliasSample?: unknown };
      foundSerieAMatches?: string[];
      hierarchy?: {
        disciplina: unknown[];
        manifestazione: unknown[];
        avvenimento: unknown[];
        scommessa: unknown[];
        esito: unknown[];
      };
    } | undefined;
    if (explore) {
      const { manifestazioni, matchPairs } = exploreFeed(data);
      let directQuotes: string[] = [];
      let directMultiMarket: Record<string, unknown> | undefined;
      try {
        const directResult = await fetchDirectBookmakerQuotes(netwin!, 135, {
          forceDelta: true,
          ...(systemCodeOverride && { systemCodeOverride }),
        });
        const h2h = directResult.h2h ?? [];
        directQuotes = h2h.map((q) => `${q.homeTeam} - ${q.awayTeam}`);
        directMultiMarket = {
          h2hCount: h2h.length,
          spreadsCount: (directResult.spreads ?? []).length,
          totals_25Count: (directResult.totals_25 ?? []).length,
          totals_15Count: (directResult.totals_15 ?? []).length,
          bttsCount: (directResult.btts ?? []).length,
          double_chanceCount: (directResult.double_chance ?? []).length,
          sampleSpreads: (directResult.spreads ?? []).slice(0, 2),
          sampleBtts: (directResult.btts ?? []).slice(0, 2),
          sampleDc: (directResult.double_chance ?? []).slice(0, 2),
        };
      } catch {
        directQuotes = ["(errore fetch)"];
      }
      let italiaSerieA: { avvCount: number; firstAvvKeys?: string[]; nestedCount?: number; sampleNested?: unknown; aliasSample?: unknown } | undefined;
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
            const firstAvv = avv[0] && typeof avv[0] === "object" ? (avv[0] as Record<string, unknown>) : null;
            const firstAvvKeys = firstAvv ? Object.keys(firstAvv) : [];
            let aliasSample: unknown = null;
            if (firstAvv?.Alias) {
              const alias = firstAvv.Alias;
              aliasSample = Array.isArray(alias)
                ? { type: "array", length: alias.length, first: alias[0] }
                : { type: typeof alias, keys: typeof alias === "object" && alias ? Object.keys(alias as object) : [], sample: JSON.stringify(alias).slice(0, 500) };
            }
            italiaSerieA = {
              avvCount: avv.length,
              firstAvvKeys,
              nestedCount: nested.length,
              sampleNested: nested.length > 0 ? nested.slice(0, 3).map((n) => (n && typeof n === "object" ? { keys: Object.keys(n as object), descr: (n as Record<string, unknown>).descr, scommessaCount: toArray((n as Record<string, unknown>).Scommessa).length } : n)) : (firstAvvKeys.length ? "nessun Partita/Incontro annidato" : undefined),
              aliasSample,
            };
            break;
          }
        }
        if (italiaSerieA) break;
      }
      const serieATeams = ["Inter", "Juventus", "Milan", "Napoli", "Roma", "Lazio"];
      const foundSerieA = matchPairs.filter((p) => serieATeams.some((t) => p.includes(t)));
      exploreResult = {
        manifestazioni,
        matchPairs,
        directQuotes,
        ...(directMultiMarket && { directMultiMarket }),
        italiaSerieA,
        foundSerieAMatches: foundSerieA,
        hierarchy: {
          disciplina: hierarchy.disciplina.map(sampleNode),
          manifestazione: hierarchy.manifestazione.map(sampleNode),
          avvenimento: hierarchy.avvenimento.map(sampleNode),
          scommessa: hierarchy.scommessa.map(sampleNode),
          esito: hierarchy.esito.map(sampleNode),
        },
      };
    }

    return NextResponse.json({
      ok: true,
      httpStatus: res.status,
      requestType,
      ...(systemCodeOverride && { systemCodeUsed: systemCodeOverride }),
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
      disciplina: disciplinaInfo,
      ...(exploreResult && { explore: exploreResult }),
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
