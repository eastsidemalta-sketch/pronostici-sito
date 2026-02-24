/**
 * Fetch quote da API dirette dei bookmaker.
 * Applica il mapping configurato e restituisce formato normalizzato.
 */
import type { Bookmaker } from "../bookmaker.types";
import { getByPath, getNumber, getString } from "@/lib/jsonPath";

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
 * Estrae gli eventi dalla risposta usando eventsPath.
 */
function getEventsArray(data: unknown, eventsPath: string): unknown[] {
  const val = getByPath(data, eventsPath);
  if (Array.isArray(val)) return val;
  if (val != null && typeof val === "object") return [val];
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
    data = await res.json();
  } catch {
    return [];
  }

  const events = getEventsArray(data, eventsPath);
  const quotes: DirectQuote[] = [];

  for (const ev of events) {
    if (ev == null || typeof ev !== "object") continue;

    const homeTeam = getString(ev, homeTeamPath);
    const awayTeam = getString(ev, awayTeamPath);
    const odds1 = getNumber(ev, odds1Path);
    const oddsX = getNumber(ev, oddsXPath);
    const odds2 = getNumber(ev, odds2Path);

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
      bookmaker: bm.name,
    });
  }

  return quotes;
}
