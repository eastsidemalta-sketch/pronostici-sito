/**
 * Logica per testare connessione e scoprire automaticamente il mapping
 * delle API dirette dei bookmaker.
 */

export type AuthType = "query" | "header" | "bearer";

export type TestApiInput = {
  apiEndpoint: string;
  apiKey: string;
  apiSecret?: string;
  authType?: AuthType;
  method?: "GET" | "POST";
};

export type TestApiResult = {
  ok: boolean;
  status?: number;
  rawBody?: string;
  error?: string;
  contentType?: string;
};

/**
 * Esegue una richiesta all'API del bookmaker e restituisce la risposta raw.
 */
export async function testBookmakerApi(input: TestApiInput): Promise<TestApiResult> {
  const { apiEndpoint, apiKey, apiSecret, authType = "query", method = "GET" } = input;

  let url = apiEndpoint;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (authType === "query") {
    const sep = url.includes("?") ? "&" : "?";
    url += `${sep}apiKey=${encodeURIComponent(apiKey)}`;
    if (apiSecret) url += `&apiSecret=${encodeURIComponent(apiSecret)}`;
  } else if (authType === "header") {
    headers["X-Api-Key"] = apiKey;
    if (apiSecret) headers["X-Api-Secret"] = apiSecret;
  } else if (authType === "bearer") {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") ?? "";
    const rawBody = await res.text();

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        rawBody: rawBody.slice(0, 2000),
        error: `HTTP ${res.status}`,
        contentType,
      };
    }

    return {
      ok: true,
      status: res.status,
      rawBody,
      contentType,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/** Chiavi comuni per squadra casa/trasferta */
const HOME_KEYS = ["home", "homeTeam", "home_team", "team1", "teamHome", "squadra1"];
const AWAY_KEYS = ["away", "awayTeam", "away_team", "team2", "teamAway", "squadra2"];
/** Chiavi comuni per quote 1X2 */
const ODDS_KEYS = [
  ["1", "home", "homeWin", "odds1", "odd1", "win1", "casa"],
  ["X", "draw", "drawWin", "oddsX", "oddX", "pareggio", "draw"],
  ["2", "away", "awayWin", "odds2", "odd2", "win2", "trasferta"],
];

/** Verifica se un valore sembra una quota (numero tra 1.01 e 100) */
function looksLikeOdds(v: unknown): boolean {
  if (typeof v !== "number") return false;
  return v >= 1.01 && v <= 100 && !Number.isNaN(v);
}

/** Verifica se un valore sembra un nome squadra (stringa non vuota) */
function looksLikeTeamName(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const s = v.trim();
  return s.length >= 2 && s.length <= 80 && !/^\d+$/.test(s);
}

/**
 * Cerca ricorsivamente negli oggetti array che potrebbero essere eventi.
 */
function findEventCandidates(obj: unknown, path = "$"): Array<{ path: string; items: unknown[] }> {
  const candidates: Array<{ path: string; items: unknown[] }> = [];

  if (Array.isArray(obj)) {
    const withTeams = obj.filter((item) => {
      if (item == null || typeof item !== "object") return false;
      const o = item as Record<string, unknown>;
      const values = Object.values(o);
      const teamCount = values.filter(looksLikeTeamName).length;
      const oddsCount = values.filter(looksLikeOdds).length;
      return teamCount >= 2 && oddsCount >= 2;
    });
    if (withTeams.length >= 1) {
      candidates.push({ path, items: withTeams });
    }
    obj.forEach((item, i) => {
      candidates.push(...findEventCandidates(item, `${path}[${i}]`));
    });
    return candidates;
  }

  if (obj != null && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      const newPath = path === "$" ? `$.${k}` : `${path}.${k}`;
      candidates.push(...findEventCandidates(v, newPath));
    }
  }

  return candidates;
}

/**
 * Per un singolo oggetto evento, suggerisce i path per home, away, odds.
 */
function suggestPathsForEvent(obj: Record<string, unknown>): {
  homeTeam?: string;
  awayTeam?: string;
  odds1?: string;
  oddsX?: string;
  odds2?: string;
} {
  const result: Record<string, string> = {};
  const keys = Object.keys(obj);

  for (const key of keys) {
    const k = key.toLowerCase();
    const v = obj[key];
    if (HOME_KEYS.some((h) => k.includes(h.toLowerCase())) && looksLikeTeamName(v)) {
      result.homeTeam = key;
    }
    if (AWAY_KEYS.some((a) => k.includes(a.toLowerCase())) && looksLikeTeamName(v)) {
      result.awayTeam = key;
    }
  }

  const odds: number[] = [];
  const oddsByKey: Record<string, string> = {};
  for (const key of keys) {
    const v = obj[key];
    if (looksLikeOdds(v)) {
      odds.push(v as number);
      oddsByKey[key] = key;
    }
  }
  if (odds.length >= 3) {
    const sorted = Object.entries(oddsByKey).sort(
      (a, b) => (obj[a[1]] as number) - (obj[b[1]] as number)
    );
    const k1 = sorted.find(([, key]) => {
      const keyLower = key.toLowerCase();
      return ODDS_KEYS[0].some((o) => keyLower.includes(o));
    })?.[1];
    const kX = sorted.find(([, key]) => {
      const keyLower = key.toLowerCase();
      return ODDS_KEYS[1].some((o) => keyLower.includes(o));
    })?.[1];
    const k2 = sorted.find(([, key]) => {
      const keyLower = key.toLowerCase();
      return ODDS_KEYS[2].some((o) => keyLower.includes(o));
    })?.[1];
    result.odds1 = k1 ?? Object.keys(oddsByKey)[0];
    result.oddsX = kX ?? Object.keys(oddsByKey)[1];
    result.odds2 = k2 ?? Object.keys(oddsByKey)[2];
  } else if (odds.length >= 2) {
    result.odds1 = Object.keys(oddsByKey)[0];
    result.odds2 = Object.keys(oddsByKey)[1];
  }

  return result;
}

/**
 * Cerca in strutture annidate (es. event.markets[0].outcomes).
 */
function findNestedOdds(obj: unknown): Record<string, string> | null {
  if (obj == null) return null;
  if (typeof obj === "object" && !Array.isArray(obj)) {
    const o = obj as Record<string, unknown>;
    const oddsKeys: string[] = [];
    for (const [k, v] of Object.entries(o)) {
      if (looksLikeOdds(v)) oddsKeys.push(k);
    }
    if (oddsKeys.length >= 2) return { odds1: oddsKeys[0], oddsX: oddsKeys[1], odds2: oddsKeys[2] };
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const r = findNestedOdds(item);
      if (r) return r;
    }
  }
  if (typeof obj === "object") {
    for (const v of Object.values(obj as Record<string, unknown>)) {
      const r = findNestedOdds(v);
      if (r) return r;
    }
  }
  return null;
}

export type DiscoveredMapping = {
  eventsPath: string;
  homeTeam: string;
  awayTeam: string;
  odds1: string;
  oddsX?: string;
  odds2: string;
  confidence: "high" | "medium" | "low";
  sampleEvent?: Record<string, unknown>;
};

/**
 * Analizza la risposta JSON e tenta di scoprire il mapping automaticamente.
 */
export function discoverMapping(rawBody: string): {
  ok: boolean;
  mapping?: DiscoveredMapping;
  candidates?: Array<{ path: string; sample: Record<string, unknown> }>;
  error?: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, error: "Risposta non è JSON valido" };
  }

  const candidates = findEventCandidates(parsed);
  if (candidates.length === 0) {
    return {
      ok: false,
      error: "Nessuna struttura evento rilevata. Verifica che la risposta contenga array di partite con squadre e quote.",
    };
  }

  const best = candidates[0];
  const first = best.items[0] as Record<string, unknown>;
  const suggested = suggestPathsForEvent(first);

  const hasTeams = suggested.homeTeam && suggested.awayTeam;
  const hasOdds = suggested.odds1 && suggested.odds2;

  if (!hasTeams) {
    return {
      ok: false,
      candidates: candidates.slice(0, 3).map((c) => ({
        path: c.path,
        sample: (c.items[0] as Record<string, unknown>) ?? {},
      })),
      error: "Impossibile identificare campi home/away. Controlla la struttura della risposta.",
    };
  }

  const nestedOdds = findNestedOdds(first);
  const odds1 = suggested.odds1 ?? nestedOdds?.odds1;
  const oddsX = suggested.oddsX ?? nestedOdds?.oddsX;
  const odds2 = suggested.odds2 ?? nestedOdds?.odds2;

  const confidence = hasTeams && odds1 && odds2 ? (oddsX ? "high" : "medium") : "low";

  return {
    ok: true,
    mapping: {
      eventsPath: best.path,
      homeTeam: suggested.homeTeam!,
      awayTeam: suggested.awayTeam!,
      odds1: odds1 ?? "odds1",
      oddsX,
      odds2: odds2 ?? "odds2",
      confidence,
      sampleEvent: first,
    },
    candidates: candidates.slice(0, 3).map((c) => ({
      path: c.path,
      sample: (c.items[0] as Record<string, unknown>) ?? {},
    })),
  };
}
