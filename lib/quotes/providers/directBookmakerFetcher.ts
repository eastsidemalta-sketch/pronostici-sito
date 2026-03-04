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
  }

  return headers;
}

/**
 * Cerca ricorsivamente un array di eventi nell'oggetto (per XML nested).
 */
function findEventsArray(obj: unknown): unknown[] | null {
  if (Array.isArray(obj) && obj.length > 0) return obj;
  if (obj && typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    for (const k of ["eventi", "evento", "events", "data", "risultati", "partite"]) {
      const v = o[k];
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object") {
        const inner = findEventsArray(v);
        if (inner) return inner;
      }
    }
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (Array.isArray(v) && v.length > 0) return v;
    }
  }
  return null;
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

  const headers = buildHeaders(apiKey, bm.apiSecret ?? undefined, authType);

  let body: string | undefined;
  if (method === "POST" && reqConfig.bodyTemplate) {
    const bodyObj = { ...reqConfig.bodyTemplate, ...queryParams };
    body = JSON.stringify(bodyObj);
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    next: { revalidate: 60 },
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

  const events = getEventsArray(data, eventsPath);
  const quotes: DirectQuote[] = [];

  for (const ev of events) {
    if (ev == null || typeof ev !== "object") continue;

    const homeTeam = getString(ev, homeTeamPath);
    const awayTeam = getString(ev, awayTeamPath);
    const odds1Std = getNumber(ev, odds1Path);
    const oddsXStd = getNumber(ev, oddsXPath);
    const odds2Std = getNumber(ev, odds2Path);
    const odds1Pers = odds1Personalized ? getNumber(ev, odds1Personalized) : 0;
    const oddsXPers = oddsXPersonalized ? getNumber(ev, oddsXPersonalized) : 0;
    const odds2Pers = odds2Personalized ? getNumber(ev, odds2Personalized) : 0;
    const odds1 = odds1Pers > 0 ? odds1Pers : odds1Std;
    const oddsX = oddsXPers > 0 ? oddsXPers : oddsXStd;
    const odds2 = odds2Pers > 0 ? odds2Pers : odds2Std;

    if (!homeTeam || !awayTeam) continue;
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
