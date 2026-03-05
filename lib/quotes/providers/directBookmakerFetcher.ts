/**
 * Fetch quote da API dirette dei bookmaker.
 * Applica il mapping configurato e restituisce formato normalizzato.
 * Supporta risposta JSON e XML.
 */
import type { Bookmaker } from "../bookmaker.types";
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
  outcomes: { home: number; draw: number; away: number };
  bookmakerKey: string;
  bookmaker: string;
};

function buildUrl(
  endpoint: string,
  apiKey: string,
  apiSecret: string | undefined,
  authType: string,
  queryParams?: Record<string, string>
): string {
  let url = endpoint;
  const params = new URLSearchParams(queryParams ?? {});

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
    const quota = typeof o.quota === "number" ? o.quota : parseFloat(String(o.quota ?? 0)) || 0;
    const descr = String(o.descr ?? "").trim().toUpperCase();
    const cod = typeof o.cod === "number" ? o.cod : parseInt(String(o.cod ?? 0), 10);
    const qp = o.QuotePersonalizzate;
    const quotaPers =
      typeof qp === "string" && qp.startsWith("default=")
        ? parseFloat(qp.replace("default=", "")) || 0
        : 0;
    const q = quotaPers > 0 ? quotaPers : quota;
    if (descr === "1" || cod === 1) out.odds1 = q;
    else if (descr === "X" || descr === "N" || cod === 2) out.oddsX = q;
    else if (descr === "2" || cod === 3) out.odds2 = q;
  }
  return out;
}

/**
 * Trova la Scommessa 1X2 (Lista=1 o Esito con 3 outcome 1,X,2).
 */
function find1X2Scommessa(scommesse: unknown[]): Record<string, unknown> | null {
  for (const s of scommesse) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    if (o.Lista === 1 || o.Lista === "1") return o;
    const esiti = toArray(o.Esito);
    if (esiti.length >= 3) {
      const descrs = new Set(esiti.map((e) => String((e as Record<string, unknown>)?.descr ?? "").trim().toUpperCase()));
      if (descrs.has("1") && (descrs.has("X") || descrs.has("N")) && descrs.has("2")) return o;
    }
  }
  return null;
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
 * Processa un singolo Avvenimento/Partita/Incontro: se ha Scommessa 1X2, aggiunge a out.
 */
function processExalogicNode(
  node: Record<string, unknown>,
  parentManifestazione?: Record<string, unknown>,
  out: Array<Record<string, unknown>> = []
): void {
  const scommesse = toArray(node.Scommessa as unknown);
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
  out.push({
    homeTeam: home,
    awayTeam: away,
    odds1,
    oddsX,
    odds2,
  } as Record<string, unknown>);
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
    const factor = typeof o.factor === "number" ? o.factor : parseFloat(String(o.factor ?? 0)) || 0;
    const outcomeId = typeof o.outcome_id === "number" ? o.outcome_id : parseInt(String(o.outcome_id ?? 0), 10);
    const name = String(o.name ?? "").toLowerCase().trim();

    if (outcomeId === id1) out.odds1 = factor;
    else if (outcomeId === idX) out.oddsX = factor;
    else if (outcomeId === id2) out.odds2 = factor;
    else if (name && drawNames.has(name)) out.oddsX = factor;
    else if (name && homeNorm && name.includes(homeNorm)) out.odds1 = factor;
    else if (name && awayNorm && name.includes(awayNorm)) out.odds2 = factor;
  }
  return out;
}

/**
 * Fetch quote da un bookmaker con API diretta.
 */
export async function fetchDirectBookmakerQuotes(
  bm: Bookmaker,
  leagueId?: number
): Promise<DirectQuote[]> {
  const endpoint = bm.apiEndpoint;
  const mapping = bm.apiMappingConfig;
  const apiKey = bm.apiKey;

  if (!endpoint || !mapping || !apiKey) return [];

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

  const url = buildUrl(
    endpoint,
    apiKey,
    bm.apiSecret ?? undefined,
    authType,
    method === "GET" ? queryParams : undefined
  );

  const headers = { ...buildHeaders(apiKey, bm.apiSecret ?? undefined, authType), ...(reqConfig.headers ?? {}) };

  let body: string | undefined;
  if (method === "POST" && reqConfig.bodyTemplate) {
    const bodyObj = { ...reqConfig.bodyTemplate, ...queryParams } as Record<string, unknown>;
    if (leagueId != null && bm.apiLeagueMapping?.[String(leagueId)]) {
      const mapped = bm.apiLeagueMapping[String(leagueId)];
      const num = /^\d+$/.test(String(mapped)) ? parseInt(String(mapped), 10) : mapped;
      if (bodyObj.category_ids !== undefined) bodyObj.category_ids = [num];
      if (bodyObj.tournament_ids !== undefined) bodyObj.tournament_ids = [num];
    }
    body = JSON.stringify(bodyObj);
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    console.warn(`Direct API ${bm.name}: HTTP ${res.status}`);
    return [];
  }

  let data: unknown;
  try {
    const text = await res.text();
    data = parseApiResponse(text);
  } catch {
    return [];
  }

  const events = useExalogic
    ? flattenExalogicEvents(data)
    : getEventsArray(data, eventsPath);
  const stakesConfig = mapping.stakes1X2;
  const quotes: DirectQuote[] = [];

  for (const ev of events) {
    if (ev == null || typeof ev !== "object") continue;

    const homeTeam = getString(ev, homeTeamPath);
    const awayTeam = getString(ev, awayTeamPath);
    if (!homeTeam || !awayTeam) continue;

    let odds1: number;
    let oddsX: number;
    let odds2: number;

    if (stakesConfig) {
      const stakesPath = stakesConfig.stakesPath ?? "stakes";
      const stakesVal = getByPath(ev, stakesPath);
      const stakesArr = Array.isArray(stakesVal) ? stakesVal : [];
      const extracted = extract1X2FromStakes(stakesArr, homeTeam, awayTeam, stakesConfig);
      odds1 = extracted.odds1;
      oddsX = extracted.oddsX;
      odds2 = extracted.odds2;
    } else {
      const odds1Std = getNumber(ev, odds1Path);
      const oddsXStd = getNumber(ev, oddsXPath);
      const odds2Std = getNumber(ev, odds2Path);
      const odds1Pers = odds1Personalized ? getNumber(ev, odds1Personalized) : 0;
      const oddsXPers = oddsXPersonalized ? getNumber(ev, oddsXPersonalized) : 0;
      const odds2Pers = odds2Personalized ? getNumber(ev, odds2Personalized) : 0;
      odds1 = odds1Pers > 0 ? odds1Pers : odds1Std;
      oddsX = oddsXPers > 0 ? oddsXPers : oddsXStd;
      odds2 = odds2Pers > 0 ? odds2Pers : odds2Std;
    }

    if (odds1 <= 0 && oddsX <= 0 && odds2 <= 0) continue;

    quotes.push({
      homeTeam,
      awayTeam,
      outcomes: {
        home: odds1 || 0,
        draw: oddsX || 0,
        away: odds2 || 0,
      },
      bookmakerKey: bm.id,
      bookmaker: getBookmakerDisplayName(bm),
    });
  }

  return quotes;
}
