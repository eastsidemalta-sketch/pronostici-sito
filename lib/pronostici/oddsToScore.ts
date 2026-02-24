/**
 * Stima un risultato (score) dalla quote 1X2 dei bookmaker.
 * Usa le probabilità implicite (1/odd normalizzate) per determinare
 * l'esito più probabile e mapparlo a un punteggio tipico.
 */

export type Odds1X2 = {
  home: number;
  draw: number;
  away: number;
};

export type ScoreResult = {
  home: number;
  away: number;
};

/**
 * Converte quote in probabilità implicite normalizzate (rimuove overround).
 */
function oddsToProbabilities(odds: Odds1X2): { home: number; draw: number; away: number } {
  const impliedHome = 1 / odds.home;
  const impliedDraw = 1 / odds.draw;
  const impliedAway = 1 / odds.away;
  const total = impliedHome + impliedDraw + impliedAway;
  return {
    home: impliedHome / total,
    draw: impliedDraw / total,
    away: impliedAway / total,
  };
}

/**
 * Stima un punteggio tipico dalle probabilità 1X2.
 * Usa euristiche basate su esiti dominanti: vittoria casa 1-0/2-1,
 * vittoria trasferta 0-1/1-2, pareggio 1-1.
 */
export function estimateScoreFromOdds(odds: Odds1X2): ScoreResult | null {
  if (odds.home <= 0 || odds.draw <= 0 || odds.away <= 0) return null;

  const p = oddsToProbabilities(odds);
  const pctHome = p.home * 100;
  const pctDraw = p.draw * 100;
  const pctAway = p.away * 100;

  const maxPct = Math.max(pctHome, pctDraw, pctAway);

  if (pctHome === maxPct) {
    if (pctHome >= 55) return { home: 2, away: 1 };
    return { home: 1, away: 0 };
  }
  if (pctAway === maxPct) {
    if (pctAway >= 55) return { home: 1, away: 2 };
    return { home: 0, away: 1 };
  }
  if (pctDraw >= 28) return { home: 1, away: 1 };
  return { home: 0, away: 0 };
}

/**
 * Restituisce l'esito unico 1, X o 2 più probabile dalle quote 1X2.
 * L'outcome con quota più bassa è considerato il più probabile dai bookmaker.
 */
export function getSingleResultFromOdds(odds: Odds1X2): "1" | "X" | "2" | null {
  if (odds.home <= 0 || odds.draw <= 0 || odds.away <= 0) return null;
  const min = Math.min(odds.home, odds.draw, odds.away);
  if (odds.home === min) return "1";
  if (odds.draw === min) return "X";
  return "2";
}
