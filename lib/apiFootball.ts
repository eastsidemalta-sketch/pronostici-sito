import { getEnabledLeagueIds } from "./leaguesConfig";

/**
 * Ottiene i dettagli completi di una partita usando il fixture ID
 */
export async function getFixtureDetails(fixtureId: string | number) {
  const key = process.env.API_FOOTBALL_KEY;

  if (!key) {
    throw new Error("API_FOOTBALL_KEY mancante. Controlla .env.local");
  }

  const url = `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`;
  const res = await fetch(url, {
    headers: {
      "x-apisports-key": key,
    },
    next: { revalidate: 30 }, // dettaglio partita: 30 sec se live (risultati aggiornati)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API-Football error ${res.status}: ${text}`);
  }

  const data = await res.json();
  
  if (data.errors && Object.keys(data.errors).length > 0) {
    console.warn("Errori API:", data.errors);
  }
  
  return data.response?.[0] || null;
}

/** Come getFixtureDetails ma senza cache (per fallback partite mancanti) */
export async function getFixtureDetailsNoCache(fixtureId: string | number) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY mancante. Controlla .env.local");
  const url = `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`;
  const res = await fetch(url, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.response?.[0] || null;
}

/** Re-export pronostici da app/pronostici-quote (fonte unica) */
export { getFixturePredictions } from "@/app/pronostici-quote/lib/apiFootball";

/** Indica se una partita è femminile (da escludere) */
function isWomenFixture(m: any): boolean {
  const leagueName = (m.league?.name ?? "").toLowerCase();
  const homeName = (m.teams?.home?.name ?? "").toLowerCase();
  const awayName = (m.teams?.away?.name ?? "").toLowerCase();
  const womenPatterns = ["women", "femenina", "féminine", "frauen", "donne"];
  const check = (s: string) => womenPatterns.some((p) => s.includes(p));
  return check(leagueName) || check(homeName) || check(awayName);
}

/** Leghe di default se la config non è disponibile */
const DEFAULT_LEAGUE_IDS = [
  39, 135, 136, 140, 78, 61, 2, 3, 4, 137, 143, 142, 148, 66,
];

/** Timezone di riferimento per le date (sito italiano) */
const SITE_TIMEZONE = "Europe/Rome";

/** Restituisce la data di oggi in YYYY-MM-DD nel timezone del sito */
function getTodayInSiteTz(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

/** Formatta una data nel timezone del sito come YYYY-MM-DD */
function formatDateInSiteTz(date: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

/**
 * Ottiene le partite future dalla data di oggi fino a 7 giorni successivi.
 * Usa Europe/Rome per "oggi" così le partite del giorno sono sempre visibili.
 * Se leagueIds è fornito, usa solo quelle leghe; altrimenti usa la config admin.
 */
export async function getUpcomingFixtures(leagueIds?: number[]) {
  const key = process.env.API_FOOTBALL_KEY;

  if (!key) {
    console.warn("API_FOOTBALL_KEY mancante. Controlla .env.local");
    return [];
  }

  const fromDate = getTodayInSiteTz();
  const from = new Date(fromDate + "T00:00:00Z");
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 7);
  const toDate = to.toISOString().split("T")[0];

  const allFixtures: any[] = [];
  const today = new Date();
  const season = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
  const configIds = getEnabledLeagueIds();
  const leagues =
    leagueIds && leagueIds.length > 0
      ? leagueIds
      : configIds.length > 0
        ? configIds
        : DEFAULT_LEAGUE_IDS;

  for (const leagueId of leagues) {
    const url = `https://v3.football.api-sports.io/fixtures?from=${fromDate}&to=${toDate}&league=${leagueId}&season=${season}`;
    try {
      const res = await fetch(url, {
        headers: { "x-apisports-key": key },
        next: { revalidate: 60 },
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.errors && Object.keys(data.errors).length > 0) continue;
      if (data.response?.length) allFixtures.push(...data.response);
    } catch {
      continue;
    }
  }

  const todayStr = fromDate;
  const todayDate = new Date(todayStr + "T12:00:00Z");
  const lastDay = new Date(todayDate);
  lastDay.setUTCDate(lastDay.getUTCDate() + 7);
  const lastDayStr = formatDateInSiteTz(lastDay);
  // Solo partite da cominciare (NS) o live (1H, 2H, HT, ET, ecc.), escludi femminili
  const LIVE_OR_UPCOMING = ["NS", "1H", "2H", "HT", "ET", "PEN_LIVE", "BT", "SUSP", "INT"];
  const upcoming = allFixtures.filter((m: any) => {
    if (isWomenFixture(m)) return false;
    const matchDate = new Date(m.fixture.date);
    const matchDateStr = formatDateInSiteTz(matchDate);
    const status = m.fixture?.status?.short ?? "";
    const isLiveOrUpcoming = LIVE_OR_UPCOMING.includes(status);
    return matchDateStr >= todayStr && matchDateStr <= lastDayStr && isLiveOrUpcoming;
  });
  upcoming.sort(
    (a: any, b: any) =>
      new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
  );

  return upcoming as any[];
}

/** Stati considerati "partita finita" */
const FINISHED_STATUSES = ["FT", "AET", "FT_PEN", "PEN_LIVE", "AWARDED", "ABD", "AWD"];

/**
 * Ottiene le partite degli ultimi giorni (risultati) - prova ieri, poi 2-3 giorni fa
 */
export async function getYesterdayFixtures() {
  const key = process.env.API_FOOTBALL_KEY;

  if (!key) {
    throw new Error("API_FOOTBALL_KEY mancante. Controlla .env.local");
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 3);
  const fromStr = startDate.toISOString().split("T")[0];
  const toStr = endDate.toISOString().split("T")[0];
  const season = startDate.getMonth() >= 7 ? startDate.getFullYear() : startDate.getFullYear() - 1;

  const allFixtures: any[] = [];
  const configLeagueIds = getEnabledLeagueIds();
  const leagueIds =
    configLeagueIds.length > 0 ? configLeagueIds : DEFAULT_LEAGUE_IDS;
  for (const leagueId of leagueIds) {
    const url = `https://v3.football.api-sports.io/fixtures?from=${fromStr}&to=${toStr}&league=${leagueId}&season=${season}`;
    try {
      const res = await fetch(url, {
        headers: { "x-apisports-key": key },
        next: { revalidate: 60 }, // risultati finiti: cache 60 sec
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.errors?.length) continue;
      if (data.response?.length) allFixtures.push(...data.response);
    } catch {
      continue;
    }
  }

  const now = new Date();
  const finished = allFixtures.filter((m: any) => {
    if (isWomenFixture(m)) return false;
    const status = m.fixture?.status?.short;
    const matchDate = new Date(m.fixture.date);
    return FINISHED_STATUSES.includes(status) && matchDate < now;
  });

  // Ordina per data (più recenti prima)
  finished.sort(
    (a: any, b: any) =>
      new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime()
  );

  // Limita a ~50 partite per non sovraccaricare
  return finished.slice(0, 50) as any[];
}

async function fetchTeamFixtures(
  key: string,
  teamId: number,
  params: { last?: number; league?: number; season?: number; from?: string; to?: string }
): Promise<any[]> {
  const q: Record<string, string> = { team: String(teamId) };
  if (params.last != null) q.last = String(params.last);
  if (params.league != null) q.league = String(params.league);
  if (params.season != null) q.season = String(params.season);
  if (params.from != null) q.from = params.from;
  if (params.to != null) q.to = params.to;
  const search = new URLSearchParams(q);
  const url = `https://v3.football.api-sports.io/fixtures?${search}`;
  const res = await fetch(url, {
    headers: { "x-apisports-key": key },
    next: { revalidate: 60 }, // ultime partite squadra: cache 60 sec
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (data.errors?.["requests"] || (data.errors && Object.keys(data.errors).length > 0)) return [];
  return (data.response || []) as any[];
}

/**
 * Ottiene le ultime N partite di una squadra (per statistiche form).
 * Usa team+last, intervallo di date, e Coppa Italia esplicita (l'API a volte
 * esclude le coppe o restituisce date/status errati).
 */
export async function getTeamLastFixtures(teamId: number, last = 30) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY mancante. Controlla .env.local");

  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - 180);
  const toDate = new Date(today);
  toDate.setFullYear(toDate.getFullYear() + 1);
  const fromStr = fromDate.toISOString().split("T")[0];
  const toStr = toDate.toISOString().split("T")[0];
  const season = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;

  const [main, byDateRange, coppaItalia] = await Promise.all([
    fetchTeamFixtures(key, teamId, { last }),
    fetchTeamFixtures(key, teamId, { from: fromStr, to: toStr }),
    fetchTeamFixtures(key, teamId, { league: 137, last: 10, season }),
  ]);

  const byId = new Map<number, any>();
  for (const f of main) if (f.fixture?.id) byId.set(f.fixture.id, f);
  for (const f of byDateRange) if (f.fixture?.id) byId.set(f.fixture.id, f);
  for (const f of coppaItalia) if (f.fixture?.id) byId.set(f.fixture.id, f);

  const merged = Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.fixture?.date || 0).getTime() -
      new Date(a.fixture?.date || 0).getTime()
  );

  return merged;
}
