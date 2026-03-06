/**
 * Fetch quote da API dirette dei bookmaker.
 * Applica il mapping configurato e restituisce formato normalizzato.
 * Supporta risposta JSON e XML.
 */
import type { Bookmaker } from "../bookmaker.types";
import {
  isNetwinBookmaker,
  shouldUseFull,
  setCache,
  mergeDeltaWithCache,
  getCached,
  canDoDelta,
  recordDeltaCall,
  logFullAttempt,
} from "./netwinCache";

/** Cache Betboom category IDs (TTL 1h) per fallback quando non in config */
let betboomCategoriesCache: { ids: number[]; expires: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

async function fetchBetboomFootballCategoryIds(apiKey: string, partnerId: string): Promise<number[]> {
  if (betboomCategoriesCache && Date.now() < betboomCategoriesCache.expires) {
    return betboomCategoriesCache.ids;
  }
  try {
    const res = await fetch(
      "https://com-br-partner-feed.sporthub.bet/api/partner_feed/v1/categories/get_by_sport_ids",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": apiKey,
          "x-partner": partnerId,
        },
        body: JSON.stringify({ locale: "en", sport_ids: [2] }),
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { categories?: Array<{ id: number }> };
    const ids = (data.categories ?? []).map((c) => c.id).filter((n) => n > 0);
    betboomCategoriesCache = { ids, expires: Date.now() + CACHE_TTL_MS };
    return ids;
  } catch {
    return [];
  }
}
import { getBookmakerDisplayName } from "../bookmakers";
import { getByPath, getNumber, getString } from "@/lib/jsonPath";
import { XMLParser } from "fast-xml-parser";

function parseApiResponse(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("<")) {
    const parser = new XMLParser({ ignoreAttributes: false });
    return parser.parse(trimmed);
  }
  return JSON.parse(text) as unknown;
}

export type DirectQuote = {
  homeTeam: string;
  awayTeam: string;
  outcomes: Record<string, number>;
  bookmakerKey: string;
  bookmaker: string;
};

/** Chiavi mercati supportate (allineate a MatchQuotesTabs / quotesEngine) */
export type DirectMarketKey =
  | "h2h"
  | "spreads"
  | "totals_25"
  | "totals_15"
  | "btts"
  | "double_chance"
  | "draw_no_bet"
  | "h2h_3_way_h1";

function buildUrl(
  endpoint: string,
  apiKey: string,
  apiSecret: string | undefined,
  authType: string,
  queryParams?: Record<string, string>,
  /** Per Netwin: ordine parametri (isLive deve essere primo) */
  orderedKeys?: string[]
): string {
  let url = endpoint;
  const q = queryParams ?? {};
  let params: URLSearchParams;
  if (orderedKeys?.length) {
    params = new URLSearchParams();
    for (const k of orderedKeys) {
      if (q[k] != null && String(q[k]).trim() !== "") params.set(k, String(q[k]).trim());
    }
    for (const [k, v] of Object.entries(q)) {
      if (!orderedKeys.includes(k) && v != null && String(v).trim() !== "") params.set(k, String(v).trim());
    }
  } else {
    params = new URLSearchParams(q);
  }

  if (authType === "query") {
    params.set("apiKey", apiKey);
    if (apiSecret) params.set("apiSecret", apiSecret);
  }

  const qs = params.toString();
  if (qs) url += (url.includes("?") ? "&" : "?") + qs;

  return url;
}

function buildHeaders(
  apiKey: string,
  apiSecret: string | undefined,
  authType: string
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (authType === "header") {
    headers["X-Api-Key"] = apiKey;
    if (apiSecret) headers["X-Api-Secret"] = apiSecret;
  } else if (authType === "bearer") {
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else if (authType === "x-access-token") {
    headers["x-access-token"] = apiKey;
  }

  return headers;
}

/**
 * Cerca ricorsivamente un array di eventi nell'oggetto (per XML nested, es. Exalogic).
 */
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

/** Normalizza a array (XML single child = oggetto) */
function toArray<T>(v: T | T[] | null | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Estrae la quota da QuotePersonalizzate se popolato, altrimenti da quota.
 * QuotePersonalizzate può essere: numero, stringa "default=X", o stringa numerica.
 */
function getQuotaFromEsito(esito: Record<string, unknown>): number {
  const quota = typeof esito.quota === "number" ? esito.quota : parseFloat(String(esito.quota ?? 0)) || 0;
  const qp = esito.QuotePersonalizzate;
  if (qp == null || qp === "") return quota;
  let quotaPers = 0;
  if (typeof qp === "number" && qp > 0) {
    quotaPers = qp;
  } else if (typeof qp === "string" && qp.trim()) {
    const str = qp.trim();
    const numStr = str.startsWith("default=") ? str.replace("default=", "").trim() : str;
    quotaPers = parseFloat(numStr) || 0;
  }
  return quotaPers > 0 ? quotaPers : quota;
}

/**
 * Estrae quote 1X2 da Scommessa (Esito con descr "1","X","2" o cod 1,2,3).
 * Lista=1 tipicamente indica mercato 1X2.
 */
function extract1X2FromScommessa(scommessa: Record<string, unknown>): {
  odds1: number;
  oddsX: number;
  odds2: number;
} {
  const esiti = toArray(scommessa.Esito as unknown);
  const out = { odds1: 0, oddsX: 0, odds2: 0 };
  for (const e of esiti) {
    if (!e || typeof e !== "object") continue;
    const o = e as Record<string, unknown>;
    const q = getQuotaFromEsito(o);
    const descr = String(o.descr ?? "").trim().toUpperCase();
    const cod = typeof o.cod === "number" ? o.cod : parseInt(String(o.cod ?? 0), 10);
    if (descr === "1" || cod === 1) out.odds1 = q;
    else if (descr === "X" || descr === "N" || cod === 2) out.oddsX = q;
    else if (descr === "2" || cod === 3) out.odds2 = q;
  }
  return out;
}

/**
 * Trova la Scommessa 1X2 (Lista=1, Lista=3, o Esito con 3 outcome 1,X,2).
 */
function find1X2Scommessa(scommesse: unknown[]): Record<string, unknown> | null {
  for (const s of scommesse) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    const lista = getListaFromScommessa(o);
    if (lista === 1 || lista === 3) return o;
    const esiti = toArray(o.Esito ?? o.esito);
    if (esiti.length >= 3) {
      const descrs = new Set(esiti.map((e) => String((e as Record<string, unknown>)?.descr ?? "").trim().toUpperCase()));
      if (descrs.has("1") && (descrs.has("X") || descrs.has("N")) && descrs.has("2")) return o;
    }
  }
  return null;
}

/** Codici Lista Netwin per mercati calcio (v_scommesse) */
const NETWIN_LISTA = {
  H2H: [1, 3] as number[],
  DOUBLE_CHANCE: [15, 16, 17] as number[],
  HANDICAP: [8] as number[],
  TOTALS: [7989] as number[],
  BTTS: [18] as number[],
};

/** Estrae il codice mercato da Scommessa (Lista, cod, Codice) */
function getListaFromScommessa(o: Record<string, unknown>): number {
  const val = o.Lista ?? o.lista ?? o.cod ?? o.Cod ?? o.Codice ?? o.codice;
  if (val == null) return NaN;
  const n = parseInt(String(val), 10);
  return Number.isNaN(n) ? NaN : n;
}

/**
 * Converte Scommesse Exalogic/Netwin in formato stakes per extract*FromStakes.
 */
function scommesseToStakes(scommesse: unknown[]): Array<{ market_id?: number; market_name?: string; name?: string; factor?: number }> {
  const stakes: StakeLike[] = [];
  for (const s of scommesse) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    const lista = getListaFromScommessa(o);
    const esiti = toArray(o.Esito ?? o.esito);
    const getQuota = (e: unknown) => {
      if (!e || typeof e !== "object") return 0;
      return getQuotaFromEsito(e as Record<string, unknown>);
    };
    const getDescr = (e: unknown) => {
      const r = e as Record<string, unknown>;
      return String(r?.descr ?? r?.Descr ?? "").trim();
    };

    if (NETWIN_LISTA.H2H.includes(lista)) {
      const outcomeMap: Record<string, number> = { "1": 1, "X": 2, "2": 3 };
      for (const e of esiti) {
        const d = getDescr(e).toUpperCase();
        const name = d === "N" ? "X" : d;
        if (["1", "X", "2"].includes(name)) {
          stakes.push({
            market_id: 1,
            market_name: "Winner",
            outcome_id: outcomeMap[name],
            name,
            factor: getQuota(e),
          });
        }
      }
    } else if (NETWIN_LISTA.DOUBLE_CHANCE.includes(lista)) {
      const dcMap: Record<string, string> = { "1X": "1X", "12": "12", "1 2": "12", "X2": "X2", "X 2": "X2" };
      for (const e of esiti) {
        const d = getDescr(e).replace(/\s+/g, "");
        const name = dcMap[d] ?? d;
        if (name) stakes.push({ market_id: 20, market_name: "Double Chance", name, factor: getQuota(e) });
      }
    } else if (NETWIN_LISTA.HANDICAP.includes(lista)) {
      const handicapRe = /([+-]?\d+[,.]?\d*)/;
      for (const e of esiti) {
        const d = getDescr(e);
        const m = d.match(handicapRe);
        const point = m ? parseFloat(m[1].replace(",", ".")) : 0;
        const isHome = /casa|home|1|squadra\s*1/i.test(d) || (!/ospite|away|2|squadra\s*2/i.test(d) && point > 0);
        const name = isHome ? `Home ${point >= 0 ? "+" : ""}${point}` : `Away ${point >= 0 ? "+" : ""}${point}`;
        stakes.push({ market_id: 2, market_name: "Handicap", name, factor: getQuota(e) });
      }
    } else if (NETWIN_LISTA.TOTALS.includes(lista)) {
      const overRe = /over|sopra|oltre|o\s*(\d+[,.]?\d*)|^\s*o\s*(\d+[,.]?\d*)/i;
      const underRe = /under|sotto|meno|u\s*(\d+[,.]?\d*)|^\s*u\s*(\d+[,.]?\d*)/i;
      const numRe = /(\d+[,.]?\d*)/;
      for (const e of esiti) {
        const d = getDescr(e);
        const isOver = overRe.test(d);
        const isUnder = underRe.test(d);
        const numMatch = d.match(numRe);
        const line = numMatch ? parseFloat(numMatch[1].replace(",", ".")) : 2.5;
        const name = isOver ? `Over ${line}` : isUnder ? `Under ${line}` : null;
        if (name) stakes.push({ market_id: 3, market_name: "Total", name, factor: getQuota(e) });
      }
    } else if (NETWIN_LISTA.BTTS.includes(lista)) {
      for (const e of esiti) {
        const d = getDescr(e).toLowerCase();
        const name = /s[iì]|yes|sim|ja|^gol$/.test(d) ? "Yes" : /no|não|nao|nein|no\s*gol/.test(d) ? "No" : null;
        if (name) stakes.push({ market_id: 14, market_name: "Both Teams To Score", name, factor: getQuota(e) });
      }
    }
  }
  return stakes;
}

/**
 * Estrae home/away da Avvenimento o parent.
 */
function extractTeamsFromAvvenimento(avv: Record<string, unknown>, manifestazione?: Record<string, unknown>): { home: string; away: string } {
  const squadraCasa = String(avv.squadraCasa ?? avv.squadra1 ?? avv.homeTeam ?? "").trim();
  const squadraOspite = String(avv.squadraOspite ?? avv.squadra2 ?? avv.awayTeam ?? "").trim();
  if (squadraCasa && squadraOspite) return { home: squadraCasa, away: squadraOspite };
  const descr = String(avv.descr ?? manifestazione?.descr ?? "").trim();
  const sep = descr.includes(" - ") ? " - " : descr.includes(" vs ") ? " vs " : null;
  if (sep) {
    const [a, b] = descr.split(sep).map((s) => s.trim());
    if (a && b) return { home: a, away: b };
  }
  return { home: "", away: "" };
}

/**
 * Raccoglie tutte le Scommesse da un nodo e dai suoi discendenti (Partita, Incontro, ecc.).
 * Utile quando DC/O/U/Handicap/BTTS sono in nodi annidati diversi dall'1X2.
 */
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

/**
 * Processa un singolo Avvenimento/Partita/Incontro: se ha Scommessa 1X2, aggiunge a out.
 * Per Netwin/Exalogic costruisce anche stakes sintetici da tutte le Scommesse (DC, O/U, Handicap, BTTS).
 */
function processExalogicNode(
  node: Record<string, unknown>,
  parentManifestazione?: Record<string, unknown>,
  out: Array<Record<string, unknown>> = []
): void {
  const scommesse = collectAllScommesse(node);
  const s1x2 = find1X2Scommessa(scommesse);
  if (!s1x2) {
    for (const key of ["Partita", "Incontro", "Evento", "Avvenimento", "Palinsesto", "Giornata"]) {
      const children = toArray(node[key] as unknown);
      for (const c of children) {
        if (c && typeof c === "object") processExalogicNode(c as Record<string, unknown>, parentManifestazione ?? node as Record<string, unknown>, out);
      }
    }
    return;
  }
  const { odds1, oddsX, odds2 } = extract1X2FromScommessa(s1x2);
  if (odds1 <= 0 && oddsX <= 0 && odds2 <= 0) return;
  const { home, away } = extractTeamsFromAvvenimento(node, parentManifestazione);
  if (!home || !away) return;
  const stakes = scommesseToStakes(scommesse);
  const ev: Record<string, unknown> = {
    homeTeam: home,
    awayTeam: away,
    odds1,
    oddsX,
    odds2,
  };
  if (stakes.length > 0) ev.stakes = stakes;
  out.push(ev);
}

/**
 * Appiattisce Exalogic: Manifestazione[].Avvenimento → array di eventi.
 */
function flattenExalogicEvents(data: unknown): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const root = findEventsArray(data);
  if (!root) return out;
  for (const item of root) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const manifestazioni = toArray(o.Manifestazione as unknown);
    for (const man of manifestazioni) {
      if (!man || typeof man !== "object") continue;
      const m = man as Record<string, unknown>;
      const avvenimenti = toArray(m.Avvenimento as unknown);
      for (const avv of avvenimenti) {
        if (!avv || typeof avv !== "object") continue;
        processExalogicNode(avv as Record<string, unknown>, m, out);
      }
    }
  }
  return out;
}

/**
 * Estrae gli eventi dalla risposta usando eventsPath.
 * Se eventsPath è "$" e il root non è un array, cerca ricorsivamente (per XML).
 */
function getEventsArray(data: unknown, eventsPath: string): unknown[] {
  const val = getByPath(data, eventsPath);
  if (Array.isArray(val)) return val;
  if (val != null && typeof val === "object") {
    if (eventsPath === "$" || eventsPath === "$.") {
      const found = findEventsArray(data);
      if (found) return found;
    }
    return [val];
  }
  return [];
}

/**
 * Estrae quote 1X2 da array stakes (Betboom/Sporthub).
 * market_name "Winner". Mappa per outcome_id (1,2,3) o per name (home, Draw, away).
 */
function extract1X2FromStakes(
  stakes: unknown[],
  homeTeam: string,
  awayTeam: string,
  config: { marketName?: string; outcomeId1?: number; outcomeIdX?: number; outcomeId2?: number }
): { odds1: number; oddsX: number; odds2: number } {
  const marketName = (config.marketName ?? "Winner").toLowerCase();
  const id1 = config.outcomeId1 ?? 1;
  const idX = config.outcomeIdX ?? 2;
  const id2 = config.outcomeId2 ?? 3;
  const out = { odds1: 0, oddsX: 0, odds2: 0 };
  const homeNorm = homeTeam.toLowerCase().trim();
  const awayNorm = awayTeam.toLowerCase().trim();
  const drawNames = new Set(["draw", "empate", "x", "tie", "pareggio"]);

  for (const s of stakes) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    const mkt = String(o.market_name ?? "").toLowerCase();
    if (mkt !== marketName) continue;
    if (o.period_id != null && o.period_id !== "") continue;
    const factor = typeof o.factor === "number" ? o.factor : parseFloat(String(o.factor ?? 0)) || 0;
    const outcomeId = typeof o.outcome_id === "number" ? o.outcome_id : parseInt(String(o.outcome_id ?? 0), 10);
    const name = String(o.name ?? "").toLowerCase().trim();

    if (outcomeId === id1) out.odds1 = factor;
    else if (outcomeId === idX) out.oddsX = factor;
    else if (outcomeId === id2) out.odds2 = factor;
    else if (name && drawNames.has(name)) out.oddsX = factor;
    else if (name === "1") out.odds1 = factor;
    else if (name === "2") out.odds2 = factor;
    else if (name && homeNorm && name.includes(homeNorm)) out.odds1 = factor;
    else if (name && awayNorm && name.includes(awayNorm)) out.odds2 = factor;
  }
  return out;
}

type StakeLike = { market_id?: number; market_name?: string; outcome_id?: number; name?: string; factor?: number; period_id?: unknown };

/** Estrae Handicap (market_id 2) da stakes. Raggruppa per linea (handicap value) e restituisce array di linee. */
function extractHandicapFromStakes(
  stakes: unknown[],
  homeTeam: string,
  awayTeam: string
): Array<{ home: number; away: number; homePoint: number; awayPoint: number }> {
  const homeNorm = homeTeam.toLowerCase();
  const awayNorm = awayTeam.toLowerCase();
  const handicapRe = /([+-]?\d+\.?\d*)/;
  const stakesArr = (stakes || []) as StakeLike[];
  const byLine = new Map<number, { home: number; away: number }>();
  for (const s of stakesArr) {
    const mid = typeof s.market_id === "number" ? s.market_id : parseInt(String(s.market_id ?? 0), 10);
    const mkt = String(s.market_name ?? "").toLowerCase();
    if (mid !== 2 && mkt !== "handicap") continue;
    if (s.period_id != null && s.period_id !== "") continue;
    const factor = typeof s.factor === "number" ? s.factor : parseFloat(String(s.factor ?? 0)) || 0;
    const name = String(s.name ?? "").toLowerCase();
    const match = name.match(handicapRe);
    const point = match ? parseFloat(match[1]) : 0;
    const lineKey = Math.round(point * 10) / 10;
    const entry = byLine.get(lineKey) ?? { home: 0, away: 0 };
    if (name.includes(homeNorm) || name.includes("home") || name.includes("1")) {
      entry.home = factor;
    } else if (name.includes(awayNorm) || name.includes("away") || name.includes("2")) {
      entry.away = factor;
    }
    byLine.set(lineKey, entry);
  }
  return Array.from(byLine.entries())
    .filter(([, v]) => v.home > 0 || v.away > 0)
    .map(([point, v]) => ({
      home: v.home,
      away: v.away,
      homePoint: point,
      awayPoint: -point,
    }));
}

/** Estrae Total Over/Under (market_id 3) da stakes. Cerca linee 2.5 e 1.5. */
function extractTotalsFromStakes(stakes: unknown[]): { over25: number; under25: number; over15: number; under15: number } {
  const out = { over25: 0, under25: 0, over15: 0, under15: 0 };
  const stakesArr = (stakes || []) as StakeLike[];
  const overRe = /over|acima|mais|sopra|übert/i;
  const underRe = /under|abaixo|menos|sotto|unter/i;
  const point25Re = /2\.?5|2,5/;
  const point15Re = /1\.?5|1,5/;
  for (const s of stakesArr) {
    const mid = typeof s.market_id === "number" ? s.market_id : parseInt(String(s.market_id ?? 0), 10);
    const mkt = String(s.market_name ?? "").toLowerCase();
    if (mid !== 3 && mid !== 79120 && !mkt.includes("total")) continue;
    if (s.period_id != null && s.period_id !== "") continue;
    const factor = typeof s.factor === "number" ? s.factor : parseFloat(String(s.factor ?? 0)) || 0;
    const name = String(s.name ?? "");
    const isOver = overRe.test(name);
    const isUnder = underRe.test(name);
    const is25 = point25Re.test(name) || point25Re.test(String(s.market_name ?? ""));
    const is15 = point15Re.test(name) || point15Re.test(String(s.market_name ?? ""));
    if (isOver && is25) out.over25 = factor;
    else if (isUnder && is25) out.under25 = factor;
    else if (isOver && is15) out.over15 = factor;
    else if (isUnder && is15) out.under15 = factor;
    else if (isOver && !out.over25 && !out.over15) out.over25 = factor; // fallback
    else if (isUnder && !out.under25 && !out.under15) out.under25 = factor;
  }
  return out;
}

/** Estrae BTTS (market_id 14) da stakes. */
function extractBttsFromStakes(stakes: unknown[]): { yes: number; no: number } {
  const out = { yes: 0, no: 0 };
  const stakesArr = (stakes || []) as StakeLike[];
  for (const s of stakesArr) {
    const mid = typeof s.market_id === "number" ? s.market_id : parseInt(String(s.market_id ?? 0), 10);
    const mkt = String(s.market_name ?? "").toLowerCase();
    if (mid !== 14 && !mkt.includes("both") && !mkt.includes("btts") && !mkt.includes("score")) continue;
    if (s.period_id != null && s.period_id !== "") continue;
    const factor = typeof s.factor === "number" ? s.factor : parseFloat(String(s.factor ?? 0)) || 0;
    const name = String(s.name ?? "").toLowerCase();
    if (name === "yes" || name === "sì" || name === "si" || name === "sim") out.yes = factor;
    else if (name === "no" || name === "não" || name === "nao") out.no = factor;
  }
  return out;
}

/** Estrae Double Chance (market_id 20) da stakes. */
function extractDoubleChanceFromStakes(stakes: unknown[]): { homeOrDraw: number; homeOrAway: number; drawOrAway: number } {
  const out = { homeOrDraw: 0, homeOrAway: 0, drawOrAway: 0 };
  const stakesArr = (stakes || []) as StakeLike[];
  const dc1X = /1x|1 x|home.*draw|draw.*home/i;
  const dc12 = /12|1 2|home.*away|away.*home/i;
  const dcX2 = /x2|x 2|draw.*away|away.*draw/i;
  for (const s of stakesArr) {
    const mid = typeof s.market_id === "number" ? s.market_id : parseInt(String(s.market_id ?? 0), 10);
    const mkt = String(s.market_name ?? "").toLowerCase();
    if (mid !== 20 && !mkt.includes("double") && !mkt.includes("chance")) continue;
    if (s.period_id != null && s.period_id !== "") continue;
    const factor = typeof s.factor === "number" ? s.factor : parseFloat(String(s.factor ?? 0)) || 0;
    const name = String(s.name ?? "");
    if (dc1X.test(name)) out.homeOrDraw = factor;
    else if (dc12.test(name)) out.homeOrAway = factor;
    else if (dcX2.test(name)) out.drawOrAway = factor;
  }
  return out;
}

/**
 * Fetch quote da un bookmaker con API diretta.
 * Restituisce Record<marketKey, DirectQuote[]> per supportare multi-market (Betboom Handicap, Total, ecc.).
 */
export type DirectMultiMarketResult = Partial<Record<DirectMarketKey, DirectQuote[]>>;

export type FetchDirectOptions = { forceDelta?: boolean; forceFull?: boolean; systemCodeOverride?: string };

export async function fetchDirectBookmakerQuotes(
  bm: Bookmaker,
  leagueId?: number,
  options?: FetchDirectOptions
): Promise<DirectMultiMarketResult> {
  const endpoint = bm.apiEndpoint;
  const mapping = bm.apiMappingConfig;
  const apiKey = bm.apiKey;

  if (!endpoint || !mapping || !apiKey) return {};

  const eventsPath = mapping.eventsPath ?? "$";
  const homeTeamPath = mapping.homeTeam ?? "homeTeam";
  const awayTeamPath = mapping.awayTeam ?? "awayTeam";
  const odds1Path = mapping.odds1 ?? "odds1";
  const oddsXPath = mapping.oddsX ?? "oddsX";
  const odds2Path = mapping.odds2 ?? "odds2";
  const odds1Personalized = mapping.odds1Personalized;
  const oddsXPersonalized = mapping.oddsXPersonalized;
  const odds2Personalized = mapping.odds2Personalized;
  const useExalogic = mapping.exalogic === true;

  const authType = bm.apiAuthType ?? "query";
  const reqConfig = bm.apiRequestConfig ?? {};
  const method = reqConfig.method ?? "GET";
  let queryParams = { ...reqConfig.queryParams };

  if (leagueId != null && bm.apiLeagueMapping?.[String(leagueId)]) {
    queryParams = {
      ...queryParams,
      league: bm.apiLeagueMapping[String(leagueId)],
      leagueId: bm.apiLeagueMapping[String(leagueId)],
    };
  }

  const isNetwin = isNetwinBookmaker(bm.siteId, bm.id);
  const netwinUseFull = options?.forceFull ? true : options?.forceDelta ? false : (isNetwin ? shouldUseFull() : true);
  if (isNetwin) {
    if (netwinUseFull) {
      console.log(`[Netwin] Richiesta FULL (cache vuota o scaduta)`);
    }
    // isLive in URL + header X-IsLive (alcuni endpoint Netwin richiedono entrambi)
    const { isLive: _i, is_live: _il, islive: _ii, ...rest } = queryParams as Record<string, string>;
    queryParams = {
      isLive: "0",
      ...rest,
      type: netwinUseFull ? "FULL" : "delta",
    };
    const systemCode =
      options?.systemCodeOverride ?? process.env.NETWIN_SYSTEM_CODE_OVERRIDE;
    if (systemCode) queryParams = { ...queryParams, system_code: systemCode };
  }

  if (isNetwin && !netwinUseFull && !options?.forceDelta && !canDoDelta()) {
    const cached = getCached();
    return cached ?? {};
  }

  const url = buildUrl(
    endpoint,
    apiKey,
    bm.apiSecret ?? undefined,
    authType,
    method === "GET" ? queryParams : undefined,
    isNetwin ? ["isLive", "system_code", "type", "codiceSito", "v_sport", "v_scommesse"] : undefined
  );

  const headers = { ...buildHeaders(apiKey, bm.apiSecret ?? undefined, authType), ...(reqConfig.headers ?? {}) };
  if (isNetwin) {
    headers["X-IsLive"] = "0"; // Netwin: prova header invece di query param (evita "Error isLive")
  }

  let body: string | undefined;
  if (method === "POST" && reqConfig.bodyTemplate) {
    const bodyObj = { ...reqConfig.bodyTemplate, ...queryParams } as Record<string, unknown>;
    if (bodyObj.category_ids !== undefined) {
      if (leagueId != null && bm.apiLeagueMapping?.[String(leagueId)]) {
        const mapped = bm.apiLeagueMapping[String(leagueId)];
        const num = /^\d+$/.test(String(mapped)) ? parseInt(String(mapped), 10) : mapped;
        bodyObj.category_ids = [num];
        if (bodyObj.tournament_ids !== undefined) bodyObj.tournament_ids = [num];
      } else {
        let ids = bm.apiFallbackCategoryIds;
        if (!ids?.length && endpoint?.includes("sporthub.bet")) {
          const partnerId = reqConfig.headers?.["x-partner"] ?? "id_7557";
          ids = await fetchBetboomFootballCategoryIds(apiKey, partnerId);
        }
        if (ids?.length) {
          bodyObj.category_ids = ids;
        } else if (!Array.isArray(bodyObj.category_ids) || bodyObj.category_ids.length === 0) {
          return {};
        }
      }
    }
    for (const k of ["category_ids", "tournament_ids"]) {
      const arr = bodyObj[k];
      if (Array.isArray(arr) && arr.length === 0) return {};
    }
    body = JSON.stringify(bodyObj);
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    cache: "no-store",
  });

  const text = await res.text();
  const maskUrlForLog = (u: string) =>
    u.replace(/system_code=[^&]+/i, "system_code=***").replace(/apiKey=[^&]+/i, "apiKey=***");
  const netwinUrl = isNetwin && netwinUseFull ? maskUrlForLog(url) : undefined;

  if (isNetwin && netwinUseFull) {
    console.log(`[Netwin] FULL risposta: HTTP ${res.status}`);
  }

  if (!res.ok) {
    if (isNetwin && netwinUseFull) {
      console.warn(`[Netwin] FULL fallita: HTTP ${res.status}`);
      logFullAttempt(false, {
        url: netwinUrl,
        error: `HTTP ${res.status}`,
        errorRaw: text.slice(0, 1500).replace(/\s+/g, " ").trim(),
      });
    } else {
      console.warn(`Direct API ${bm.name}: HTTP ${res.status}`);
    }
    if (isNetwin && !netwinUseFull) {
      const cached = getCached();
      if (cached) return cached;
    }
    return {};
  }

  let data: unknown;
  try {
    /** Netwin restituisce testo per errori (non JSON/XML) — intercetta prima del parse */
    if (isNetwin) {
      const isLockError =
        text.includes("hash_lock") ||
        /richiesta\s+FULL/i.test(text) ||
        /FULL\s+.*\s+in\s+corso/i.test(text);
      if (isLockError) {
        if (netwinUseFull) {
          console.warn(`[Netwin] FULL bloccata: richiesta FULL già in corso (hash_lock). Riprova tra qualche minuto.`);
          logFullAttempt(false, {
            url: netwinUrl,
            error: "hash_lock (FULL già in corso)",
            errorRaw: text.slice(0, 1500).replace(/\s+/g, " ").trim(),
          });
        }
        const cached = getCached();
        return cached ?? {};
      }
      if (text.includes("isLive") && /can be 0 or 1/i.test(text)) {
        if (netwinUseFull) {
          const raw = text.slice(0, 300).replace(/\s+/g, " ");
          const urlParams = new URL(url).searchParams;
          const isLiveVal = urlParams.get("isLive") ?? urlParams.get("IsLive") ?? "(mancante)";
          console.warn(`[Netwin] FULL isLive error. Raw: ${raw}. URL isLive param: ${isLiveVal}`);
          logFullAttempt(false, {
            url: netwinUrl,
            error: "isLive non valido",
            errorRaw: text.slice(0, 1500).replace(/\s+/g, " ").trim(),
          });
        }
        return {};
      }
    }
    data = parseApiResponse(text);
  } catch (e) {
    if (isNetwin && netwinUseFull) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[Netwin] FULL parse fallito:`, msg);
      logFullAttempt(false, {
        url: netwinUrl,
        error: `Parse fallito: ${msg.slice(0, 150)}`,
        errorRaw: text.slice(0, 1500).replace(/\s+/g, " ").trim(),
      });
    }
    if (isNetwin && !netwinUseFull) {
      const cached = getCached();
      if (cached) return cached;
    }
    return {};
  }

  const events = useExalogic
    ? flattenExalogicEvents(data)
    : getEventsArray(data, eventsPath);
  if (isNetwin && netwinUseFull) {
    console.log(`[Netwin] FULL estratti ${events.length} eventi`);
  }
  const stakesConfig = mapping.stakes1X2;
  const result: DirectMultiMarketResult = {
    h2h: [],
    spreads: [],
    totals_25: [],
    totals_15: [],
    btts: [],
    double_chance: [],
  };

  for (const ev of events) {
    if (ev == null || typeof ev !== "object") continue;

    const homeTeam = getString(ev, homeTeamPath);
    const awayTeam = getString(ev, awayTeamPath);
    if (!homeTeam || !awayTeam) continue;

    const baseQuote = {
      homeTeam,
      awayTeam,
      bookmakerKey: bm.id,
      bookmaker: getBookmakerDisplayName(bm),
    };

    if (stakesConfig) {
      const stakesPath = stakesConfig.stakesPath ?? "stakes";
      const stakesVal = getByPath(ev, stakesPath);
      const stakesArr = Array.isArray(stakesVal) ? stakesVal : [];

      const extracted1X2 = extract1X2FromStakes(stakesArr, homeTeam, awayTeam, stakesConfig);
      if (extracted1X2.odds1 > 0 || extracted1X2.oddsX > 0 || extracted1X2.odds2 > 0) {
        result.h2h!.push({
          ...baseQuote,
          outcomes: {
            home: extracted1X2.odds1,
            draw: extracted1X2.oddsX,
            away: extracted1X2.odds2,
          },
        });
      }

      const handicapLines = extractHandicapFromStakes(stakesArr, homeTeam, awayTeam);
      for (const h of handicapLines) {
        result.spreads!.push({
          ...baseQuote,
          outcomes: {
            home: h.home,
            away: h.away,
            homePoint: h.homePoint,
            awayPoint: h.awayPoint,
          },
        });
      }

      const totals = extractTotalsFromStakes(stakesArr);
      if (totals.over25 > 0 || totals.under25 > 0) {
        result.totals_25!.push({
          ...baseQuote,
          outcomes: { over: totals.over25, under: totals.under25 },
        });
      }
      if (totals.over15 > 0 || totals.under15 > 0) {
        result.totals_15!.push({
          ...baseQuote,
          outcomes: { over: totals.over15, under: totals.under15 },
        });
      }

      const btts = extractBttsFromStakes(stakesArr);
      if (btts.yes > 0 || btts.no > 0) {
        result.btts!.push({
          ...baseQuote,
          outcomes: { yes: btts.yes, no: btts.no },
        });
      }

      const dc = extractDoubleChanceFromStakes(stakesArr);
      if (dc.homeOrDraw > 0 || dc.homeOrAway > 0 || dc.drawOrAway > 0) {
        result.double_chance!.push({
          ...baseQuote,
          outcomes: {
            homeOrDraw: dc.homeOrDraw,
            homeOrAway: dc.homeOrAway,
            drawOrAway: dc.drawOrAway,
          },
        });
      }
    } else {
      const odds1Std = getNumber(ev, odds1Path);
      const oddsXStd = getNumber(ev, oddsXPath);
      const odds2Std = getNumber(ev, odds2Path);
      const odds1Pers = odds1Personalized ? getNumber(ev, odds1Personalized) : 0;
      const oddsXPers = oddsXPersonalized ? getNumber(ev, oddsXPersonalized) : 0;
      const odds2Pers = odds2Personalized ? getNumber(ev, odds2Personalized) : 0;
      const odds1 = odds1Pers > 0 ? odds1Pers : odds1Std;
      const oddsX = oddsXPers > 0 ? oddsXPers : oddsXStd;
      const odds2 = odds2Pers > 0 ? odds2Pers : odds2Std;

      if (odds1 > 0 || oddsX > 0 || odds2 > 0) {
        result.h2h!.push({
          ...baseQuote,
          outcomes: { home: odds1, draw: oddsX, away: odds2 },
        });
      }
    }
  }

  if (isNetwin) {
    if (netwinUseFull) {
      const h2hCount = result.h2h?.length ?? 0;
      console.log(`[Netwin] FULL OK: ${h2hCount} partite in cache`);
      setCache(result);
      logFullAttempt(true, {
        url: maskUrlForLog(url),
        h2hCount,
      });
    } else {
      recordDeltaCall();
      return mergeDeltaWithCache(result);
    }
  }
  return result;
}
