import { logApiCall } from "./apiCallLog";
import { getEnabledLeagueIds } from "./leaguesConfig";
import { getTeamFixturesWithFallback, getCachedFixtureDetail, setCachedFixtureDetail } from "./teamFixturesCache";

/**
 * Ottiene i dettagli completi di una partita usando il fixture ID
 */
export async function getFixtureDetails(fixtureId: string | number) {
  const key = process.env.API_FOOTBALL_KEY;

  if (!key) {
    throw new Error("API_FOOTBALL_KEY mancante. Controlla .env.local");
  }

  const id = Number(fixtureId);

  try {
    const url = `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`;
    const res = await fetch(url, {
      headers: { "x-apisports-key": key },
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      throw new Error(`API-Football error ${res.status}`);
    }

    const data = await res.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      console.warn("Errori API:", data.errors);
    }

    const fixture = data.response?.[0] ?? null;

    if (fixture) {
      // Salva in cache ogni volta che l'API risponde correttamente
      await setCachedFixtureDetail(id, fixture).catch(() => {});
      return fixture;
    }

    // API ha risposto ma senza dati → prova cache
    const cached = await getCachedFixtureDetail(id);
    if (cached) {
      console.warn(`[getFixtureDetails] API vuota per ${id}, uso cache`);
      return cached;
    }

    return null;
  } catch (err) {
    // Errore di rete o HTTP → prova cache
    console.warn(`[getFixtureDetails] Errore API per ${id}:`, err);
    const cached = await getCachedFixtureDetail(id);
    if (cached) {
      console.warn(`[getFixtureDetails] Uso cache fallback per ${id}`);
      return cached;
    }
    return null;
  }
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

/** Formato API Football per una partita (usato da HomeMatchesList) */
type ApiFootballFixture = {
  fixture: { id: number; date: string; status?: { short?: string } };
  league: { id: number; name: string; logo?: string };
  teams: { home: { name: string; logo?: string }; away: { name: string; logo?: string } };
};

/**
 * Fallback: fetch partite da Betboom (category Brazil 161) e trasforma in formato API Football.
 * Usato quando API Football non restituisce partite per Brasileirão (league 71).
 */
async function fetchBetboomFixturesAsApiFootball(
  fromDate: string,
  toDate: string
): Promise<ApiFootballFixture[]> {
  const apiKey = process.env.BETBOOM_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch(
      "https://com-br-partner-feed.sporthub.bet/api/partner_feed/v1/matches/get_by_category_ids",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": apiKey,
          "x-partner": process.env.BETBOOM_PARTNER_ID ?? "id_7557",
        },
        body: JSON.stringify({
          locale: "en",
          category_ids: [161],
          market_ids: [1],
          type: "prematch",
        }),
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { matches?: Array<{ id: number; start_dttm?: string; teams?: { home_team?: { name?: string }; away_team?: { name?: string } } }> };
    const matches = data.matches ?? [];
    const from = new Date(fromDate + "T00:00:00Z").getTime();
    const to = new Date(toDate + "T23:59:59Z").getTime();
    const out: ApiFootballFixture[] = [];
    for (const m of matches) {
      const home = m.teams?.home_team?.name ?? "";
      const away = m.teams?.away_team?.name ?? "";
      if (!home || !away) continue;
      const start = m.start_dttm ? new Date(m.start_dttm).getTime() : 0;
      if (start < from || start > to) continue;
      out.push({
        fixture: {
          id: m.id,
          date: m.start_dttm ?? fromDate + "T12:00:00Z",
          status: { short: "NS" },
        },
        league: { id: 71, name: "Brasileirão Serie A" },
        teams: {
          home: { name: home },
          away: { name: away },
        },
      });
    }
    out.sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());
    return out;
  } catch {
    return [];
  }
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
  const apiKey = key;

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

  const BR_LEAGUE_ID = 71;

  async function fetchLeague(leagueId: number, useSeason?: number): Promise<any[]> {
    const s = useSeason ?? season;
    const url = `https://v3.football.api-sports.io/fixtures?from=${fromDate}&to=${toDate}&league=${leagueId}&season=${s}`;
    try {
      const res = await fetch(url, {
        headers: { "x-apisports-key": apiKey },
        next: { revalidate: 60 },
      });
      if (!res.ok) return [];
      const data = await res.json();
      if (data.errors && Object.keys(data.errors).length > 0) return [];
      return data.response ?? [];
    } catch {
      return [];
    }
  }

  // Richieste in batch di 4 per ridurre rate limit (API Football può throttlare)
  const BATCH_SIZE = 4;
  const results: any[][] = [];
  for (let i = 0; i < leagues.length; i += BATCH_SIZE) {
    const batch = leagues.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((lid) => fetchLeague(lid)));
    results.push(...batchResults);
    if (i + BATCH_SIZE < leagues.length) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  const nextSeason = today.getFullYear();
  // Fallback per leghe che restituiscono 0: retry con stessa season, poi prova next season
  for (let i = 0; i < leagues.length; i++) {
    if (results[i].length > 0) continue;
    const leagueId = leagues[i];
    await new Promise((r) => setTimeout(r, 400));
    const retry = await fetchLeague(leagueId, season);
    if (retry.length > 0) {
      results[i] = retry;
      continue;
    }
    const next = await fetchLeague(leagueId, nextSeason);
    if (next.length > 0) {
      results[i] = next;
      console.warn(`[API Football] league ${leagueId} vuota per season ${season}, usata season ${nextSeason}`);
    }
  }

  if (results.reduce((s, arr) => s + arr.length, 0) === 0 && leagues.includes(BR_LEAGUE_ID)) {
    const brazilFixtures = await fetchLeague(BR_LEAGUE_ID, nextSeason);
    if (brazilFixtures.length > 0) {
      const idx = leagues.indexOf(BR_LEAGUE_ID);
      results[idx] = brazilFixtures;
    } else {
      const betboomFixtures = await fetchBetboomFixturesAsApiFootball(fromDate, toDate);
      if (betboomFixtures.length > 0) {
        const idx = leagues.indexOf(BR_LEAGUE_ID);
        results[idx] = betboomFixtures;
      }
    }
  }
  for (const arr of results) {
    if (arr.length) allFixtures.push(...arr);
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

  logApiCall("API Football", "fixtures", true, { count: upcoming.length });
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
  try {
    const res = await fetch(url, {
      headers: { "x-apisports-key": key },
      next: { revalidate: 60 }, // ultime partite squadra: cache 60 sec
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data.errors?.["requests"] || (data.errors && Object.keys(data.errors).length > 0)) return [];
    return (data.response || []) as any[];
  } catch (err) {
    console.warn(`[fetchTeamFixtures] fetch failed per team ${teamId}:`, err);
    return [];
  }
}

/**
 * Ottiene le ultime N partite di una squadra (per statistiche form).
 * Usa team+last, intervallo di date, e Coppa Italia esplicita (l'API a volte
 * esclude le coppe o restituisce date/status errati).
 */
export async function getTeamLastFixtures(teamId: number, last = 30) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY mancante. Controlla .env.local");

  return getTeamFixturesWithFallback(teamId, async () => {
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

    return Array.from(byId.values()).sort(
      (a, b) =>
        new Date(b.fixture?.date || 0).getTime() -
        new Date(a.fixture?.date || 0).getTime()
    );
  });
}
