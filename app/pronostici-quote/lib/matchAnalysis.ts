/* =========================================================
   Tipi di base
========================================================= */

type TeamFormInput = {
  wins: number;
  draws: number;
  losses: number;
  matches: number;
};

type GoalsStats = {
  scored: number;
  conceded: number;
};

/* =========================================================
   Helper: interpretazione dati
========================================================= */

function summarizeForm(form: TeamFormInput): string {
  if (form.wins >= 3) return "ottimo momento";
  if (form.wins === 2) return "buona continuità";
  if (form.wins === 1) return "periodo negativo";
  return "momento critico";
}

function formConfidence(form: TeamFormInput): "alta" | "media" | "bassa" {
  if (form.wins >= 3) return "alta";
  if (form.wins === 2) return "media";
  return "bassa";
}

function goalSignal(expectedAvgGoals: number): "molto forte" | "forte" | "moderato" | "debole" {
  if (expectedAvgGoals >= 3.8) return "molto forte";
  if (expectedAvgGoals >= 3.0) return "forte";
  if (expectedAvgGoals >= 2.4) return "moderato";
  return "debole";
}

/* =========================================================
   FUNZIONE PRINCIPALE
========================================================= */

export function buildMatchAnalysisData(input: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;

  formHome: TeamFormInput;
  formAway: TeamFormInput;

  goalsHome: GoalsStats;
  goalsAway: GoalsStats;

  over25Pct: number;

  homeWinsPct: number;
  awayWinsPct: number;
}) {
  /* -----------------------
     Calcoli base
  ----------------------- */

  const expectedAvgGoals =
    (input.goalsHome.scored +
      input.goalsHome.conceded +
      input.goalsAway.scored +
      input.goalsAway.conceded) /
    2;

  const overSignal = goalSignal(expectedAvgGoals);
  const poorHomePerformance = input.homeWinsPct < 30;

  /* -----------------------
     Reason-driven intro
  ----------------------- */

  const whyThisMatch: string[] = [
    ...(expectedAvgGoals >= 3
      ? ["trend recente favorevole a partite con molti gol"]
      : []),

    ...(poorHomePerformance
      ? ["rendimento casalingo negativo della squadra di casa"]
      : []),

    ...(input.goalsHome.conceded > 2
      ? ["difesa della squadra di casa in difficoltà"]
      : []),

    ...(input.goalsAway.scored >= 2
      ? ["attacco della squadra ospite particolarmente efficace"]
      : []),
  ];

  /* -----------------------
     Output finale
  ----------------------- */

  return {
    match: `${input.homeTeam} vs ${input.awayTeam}`,
    league: input.league,
    date: input.date,

    /* Stato di forma */
    form: {
      [input.homeTeam]: {
        summary: summarizeForm(input.formHome),
        confidence: formConfidence(input.formHome),
      },
      [input.awayTeam]: {
        summary: summarizeForm(input.formAway),
        confidence: formConfidence(input.formAway),
      },
    },

    /* Gol e Over */
    goals: {
      expected_avg: Number(expectedAvgGoals.toFixed(1)),
      over_2_5: {
        percentage: input.over25Pct,
        signal: overSignal,
      },
    },

    /* Casa / Trasferta */
    home_away: {
      home_advantage: !poorHomePerformance,
      impact: poorHomePerformance ? "negativo" : "positivo",
    },

    /* Alert editoriali */
    alerts: {
      defensive_issues:
        input.goalsHome.conceded > 2 || input.goalsAway.conceded > 2,
      high_goal_expectation: expectedAvgGoals >= 3,
    },

    /* INTRO GUIDATA */
    why_this_match: whyThisMatch,

    /* Pronostico finale */
    final_pick: {
      market: "Over 2.5",
      confidence:
        overSignal === "forte" || overSignal === "molto forte"
          ? "alta"
          : "media",
    },
  };
}