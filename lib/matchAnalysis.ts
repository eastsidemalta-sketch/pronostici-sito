/**
 * Estrae e riorganizza i dati di una partita da API-Football
 * per generare analisi testuali ai pronostici.
 * Non effettua chiamate API: lavora solo su dati già disponibili.
 */

/** Risultato singola partita: V=Vittoria, X=Pareggio, P=Sconfitta */
export type MatchResult = "V" | "X" | "P";

/** Statistiche gol di una squadra */
export type TeamGoalsStats = {
  avg_scored: number;
  avg_conceded: number;
  over_2_5_pct: number;
  both_teams_scored_pct: number;
};

/** Rendimento casa/trasferta */
export type HomeAwayStats = {
  home_win_pct: number | null;
  away_win_pct: number | null;
};

/** Scontri diretti */
export type HeadToHeadStats = {
  last_matches: number;
  home_wins: number;
  draws: number;
  away_wins: number;
  avg_goals: number;
};

/** Probabilità 1X2 */
export type Probabilities1X2 = {
  home_win: number | null;
  draw: number | null;
  away_win: number | null;
};

/** Migliori quote 1X2 */
export type BestOdds1X2 = {
  home_win: number | null;
  draw: number | null;
  away_win: number | null;
};

/** Motivi editoriali per introdurre la partita (evita intro generiche) */
export type WhyThisMatch = string[];

/** Pronostico finale suggerito */
export type FinalPick = {
  market: string;
  confidence: "alta" | "media" | "bassa";
};

/** Output completo per analisi pronostici */
export type MatchAnalysisData = {
  match: string;
  league: string;
  date: string;
  form: {
    home: MatchResult[];
    away: MatchResult[];
  };
  goals: {
    home: TeamGoalsStats;
    away: TeamGoalsStats;
  };
  home_away: HomeAwayStats;
  h2h: HeadToHeadStats | null;
  absences: {
    home: string[];
    away: string[];
  };
  probabilities: Probabilities1X2;
  best_odds: BestOdds1X2;
  /** Motivi per cui questa partita merita attenzione (guida l'intro) */
  why_this_match: WhyThisMatch;
  /** Pronostico consigliato */
  final_pick: FinalPick;
};

/** Fixture singola da API-Football (struttura semplificata) */
type ApiFixture = {
  fixture?: { date?: string; status?: { short?: string } };
  league?: { name?: string };
  teams?: { home?: { id?: number; name?: string }; away?: { id?: number; name?: string } };
  goals?: { home?: number | null; away?: number | null };
};

/** Predizioni da API-Football */
type ApiPredictions = {
  predictions?: {
    percent?: { home?: string; draw?: string; away?: string };
    winner?: { percent?: { home?: string; draw?: string; away?: string } };
  };
};

/** Input per buildMatchAnalysisData */
export type MatchAnalysisInput = {
  fixture: ApiFixture;
  predictions?: ApiPredictions | null;
  homeFixtures?: ApiFixture[];
  awayFixtures?: ApiFixture[];
  h2hFixtures?: ApiFixture[];
  injuries?: {
    home?: Array<{ player?: { name?: string }; type?: string }>;
    away?: Array<{ player?: { name?: string }; type?: string }>;
  } | null;
  odds?: {
    home_win?: number;
    draw?: number;
    away_win?: number;
  } | null;
  /** Locale per formattazione date (es. "it-IT", "en-GB"). Default: "it-IT" */
  locale?: string;
};

const FINISHED = ["FT", "AET", "FT_PEN", "PEN_LIVE", "AWARDED", "ABD", "AWD"];

function parsePct(value: string | number | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "string" ? parseFloat(value.replace(",", ".")) : value;
  return isNaN(n) ? null : Math.round(n);
}

function computeFormAndGoals(
  fixtures: ApiFixture[],
  teamId: number,
  limit = 5
): { results: MatchResult[]; goalsScored: number; goalsConceded: number; over25: number; bothScored: number; homeWins: number; homeTotal: number; awayWins: number; awayTotal: number } {
  const results: MatchResult[] = [];
  let goalsScored = 0,
    goalsConceded = 0,
    over25 = 0,
    bothScored = 0;
  let homeWins = 0,
    homeTotal = 0,
    awayWins = 0,
    awayTotal = 0;

  const sorted = [...fixtures].sort(
    (a, b) =>
      new Date(b.fixture?.date || 0).getTime() -
      new Date(a.fixture?.date || 0).getTime()
  );
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  for (const f of sorted) {
    if (results.length >= limit) break;
    const status = f.fixture?.status?.short;
    const matchDate = new Date(f.fixture?.date || 0).getTime();
    const daysFromNow = (matchDate - now) / DAY_MS;
    const isFinished = FINISHED.includes(status ?? "");
    const likelyDateError = status === "NS" && daysFromNow > 100 && daysFromNow < 500;

    if (!isFinished && !likelyDateError) continue;

    let gh = f.goals?.home;
    let ga = f.goals?.away;
    if (gh == null || ga == null) {
      gh = gh ?? 0;
      ga = ga ?? 0;
    }

    const homeId = f.teams?.home?.id;
    const wasHome = homeId === teamId;
    const scoreFor = wasHome ? gh : ga;
    const scoreAgainst = wasHome ? ga : gh;

    let result: MatchResult = "X";
    if (scoreFor > scoreAgainst) {
      result = "V";
      if (wasHome) {
        homeWins++;
        homeTotal++;
      } else {
        awayWins++;
        awayTotal++;
      }
    } else if (scoreFor < scoreAgainst) {
      result = "P";
      if (wasHome) homeTotal++;
      else awayTotal++;
    } else {
      if (wasHome) homeTotal++;
      else awayTotal++;
    }

    results.push(result);
    goalsScored += scoreFor;
    goalsConceded += scoreAgainst;
    if (gh > 0 && ga > 0) bothScored++;
    if (gh + ga > 2.5) over25++;

    if (results.length >= limit) break;
  }

  return {
    results,
    goalsScored,
    goalsConceded,
    over25,
    bothScored,
    homeWins,
    homeTotal,
    awayWins,
    awayTotal,
  };
}

function computeH2H(
  fixtures: ApiFixture[],
  homeId: number,
  awayId: number
): HeadToHeadStats | null {
  const valid = fixtures.filter((f) => {
    const status = f.fixture?.status?.short;
    if (!FINISHED.includes(status ?? "")) return false;
    const gh = f.goals?.home;
    const ga = f.goals?.away;
    return gh != null && ga != null;
  });

  if (valid.length === 0) return null;

  let homeWins = 0,
    awayWins = 0,
    draws = 0,
    totalGoals = 0,
    counted = 0;

  for (const f of valid) {
    const gh = f.goals!.home!;
    const ga = f.goals!.away!;
    const fixtureHomeId = f.teams?.home?.id;
    const fixtureAwayId = f.teams?.away?.id;
    const hasHome = fixtureHomeId === homeId || fixtureAwayId === homeId;
    const hasAway = fixtureHomeId === awayId || fixtureAwayId === awayId;
    if (!hasHome || !hasAway) continue;

    counted++;
    totalGoals += gh + ga;
    const homeScored = fixtureHomeId === homeId ? gh : ga;
    const awayScored = fixtureHomeId === awayId ? gh : ga;
    if (homeScored > awayScored) homeWins++;
    else if (homeScored < awayScored) awayWins++;
    else draws++;
  }

  if (counted === 0) return null;

  return {
    last_matches: counted,
    home_wins: homeWins,
    draws,
    away_wins: awayWins,
    avg_goals: counted > 0 ? Math.round((totalGoals / counted) * 10) / 10 : 0,
  };
}

/**
 * Costruisce l'oggetto MatchAnalysisData a partire dai dati API-Football.
 * Usa solo dati già disponibili, senza chiamate esterne.
 */
export function buildMatchAnalysisData(input: MatchAnalysisInput): MatchAnalysisData {
  const { fixture, predictions, homeFixtures = [], awayFixtures = [], h2hFixtures = [], injuries, odds, locale = "it-IT" } = input;

  const homeId = fixture.teams?.home?.id ?? 0;
  const awayId = fixture.teams?.away?.id ?? 0;
  const homeName = fixture.teams?.home?.name ?? "Casa";
  const awayName = fixture.teams?.away?.name ?? "Trasferta";
  const league = fixture.league?.name ?? "";
  const dateStr = fixture.fixture?.date
    ? new Date(fixture.fixture.date).toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const homeStats = computeFormAndGoals(homeFixtures, homeId, 5);
  const awayStats = computeFormAndGoals(awayFixtures, awayId, 5);

  const nHome = homeStats.results.length;
  const nAway = awayStats.results.length;

  const homeGoals: TeamGoalsStats = {
    avg_scored: nHome > 0 ? Math.round((homeStats.goalsScored / nHome) * 10) / 10 : 0,
    avg_conceded: nHome > 0 ? Math.round((homeStats.goalsConceded / nHome) * 10) / 10 : 0,
    over_2_5_pct: nHome > 0 ? Math.round((homeStats.over25 / nHome) * 100) : 0,
    both_teams_scored_pct: nHome > 0 ? Math.round((homeStats.bothScored / nHome) * 100) : 0,
  };

  const awayGoals: TeamGoalsStats = {
    avg_scored: nAway > 0 ? Math.round((awayStats.goalsScored / nAway) * 10) / 10 : 0,
    avg_conceded: nAway > 0 ? Math.round((awayStats.goalsConceded / nAway) * 10) / 10 : 0,
    over_2_5_pct: nAway > 0 ? Math.round((awayStats.over25 / nAway) * 100) : 0,
    both_teams_scored_pct: nAway > 0 ? Math.round((awayStats.bothScored / nAway) * 100) : 0,
  };

  const home_away: HomeAwayStats = {
    home_win_pct: homeStats.homeTotal > 0 ? Math.round((homeStats.homeWins / homeStats.homeTotal) * 100) : null,
    away_win_pct: awayStats.awayTotal > 0 ? Math.round((awayStats.awayWins / awayStats.awayTotal) * 100) : null,
  };

  const h2h = computeH2H(h2hFixtures, homeId, awayId);

  const pred = predictions?.predictions;
  const percent = pred?.percent ?? pred?.winner?.percent;
  const probabilities: Probabilities1X2 = {
    home_win: parsePct(percent?.home),
    draw: parsePct(percent?.draw),
    away_win: parsePct(percent?.away),
  };

  const best_odds: BestOdds1X2 = {
    home_win: odds?.home_win ?? null,
    draw: odds?.draw ?? null,
    away_win: odds?.away_win ?? null,
  };

  const absences = {
    home: (injuries?.home ?? []).map((i) => i.player?.name ?? i.type ?? "Giocatore").filter(Boolean),
    away: (injuries?.away ?? []).map((i) => i.player?.name ?? i.type ?? "Giocatore").filter(Boolean),
  };

  const expectedAvgGoals = homeGoals.avg_scored + awayGoals.avg_scored;
  const combinedOverPct = Math.round((homeGoals.over_2_5_pct + awayGoals.over_2_5_pct) / 2);
  const poorHomePerformance = home_away.home_win_pct != null && home_away.home_win_pct < 30;

  const why_this_match: string[] = [];
  if (expectedAvgGoals >= 3.0) why_this_match.push("trend recente favorevole a partite con molti gol");
  if (poorHomePerformance) why_this_match.push("rendimento casalingo negativo della squadra di casa");
  if (homeGoals.avg_conceded >= 2.0) why_this_match.push("difesa della squadra di casa in difficoltà");
  if (awayGoals.avg_conceded >= 2.0) why_this_match.push("difesa della squadra ospite in difficoltà");
  if (awayGoals.avg_scored >= 2.0) why_this_match.push("attacco della squadra ospite particolarmente efficace");
  if (homeGoals.avg_scored >= 2.0) why_this_match.push("attacco della squadra di casa particolarmente efficace");
  if (combinedOverPct >= 60 && expectedAvgGoals >= 2.5) why_this_match.push("statistiche gol che puntano verso l'Over 2,5");
  if (h2h && h2h.avg_goals >= 2.8) why_this_match.push("precedenti diretti con molti gol");

  let finalPickMarket = "Over 2,5";
  let finalPickConfidence: "alta" | "media" | "bassa" = "media";
  if (combinedOverPct >= 60 && expectedAvgGoals >= 2.5) {
    finalPickMarket = "Over 2,5";
    finalPickConfidence = expectedAvgGoals >= 3 ? "alta" : "media";
  } else if (combinedOverPct >= 55 && (homeGoals.both_teams_scored_pct >= 50 || awayGoals.both_teams_scored_pct >= 50)) {
    finalPickMarket = "Entrambe segnano";
    finalPickConfidence = "media";
  } else if (probabilities.home_win != null && probabilities.home_win >= 48 && (home_away.home_win_pct == null || home_away.home_win_pct >= 50)) {
    finalPickMarket = `Vittoria ${homeName}`;
    finalPickConfidence = probabilities.home_win >= 52 ? "alta" : "media";
  } else if (probabilities.away_win != null && probabilities.away_win >= 48 && (home_away.away_win_pct == null || home_away.away_win_pct >= 40)) {
    finalPickMarket = `Vittoria ${awayName}`;
    finalPickConfidence = probabilities.away_win >= 52 ? "alta" : "media";
  } else if (probabilities.draw != null && probabilities.draw >= 28 && (probabilities.home_win ?? 0) < 45 && (probabilities.away_win ?? 0) < 45) {
    finalPickMarket = "Pareggio";
    finalPickConfidence = "media";
  } else if (homeGoals.avg_conceded <= 0.8 || awayGoals.avg_conceded <= 0.8) {
    finalPickMarket = "Under 2,5";
    finalPickConfidence = "media";
  }

  return {
    match: `${homeName} vs ${awayName}`,
    league,
    date: dateStr,
    form: {
      home: homeStats.results,
      away: awayStats.results,
    },
    goals: {
      home: homeGoals,
      away: awayGoals,
    },
    home_away,
    h2h,
    absences,
    probabilities,
    best_odds,
    why_this_match,
    final_pick: { market: finalPickMarket, confidence: finalPickConfidence },
  };
}
