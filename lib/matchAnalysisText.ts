/**
 * Genera il testo di analisi pronostico da MatchAnalysisData.
 * Stile editoriale SportyTrader: interpretativo, mai intro generiche.
 * Vietato: "X vs Y si affrontano", "Ecco cosa emerge dall'analisi", "Si affrontano in".
 * Lunghezza target: 180-230 parole.
 */
import type { MatchAnalysisData, MatchResult } from "./matchAnalysis";

/** Strutture vietate all'inizio della prima frase (case-insensitive) */
const STRUTTURE_VIETATE = [
  /^[^.]*\bsi affrontano\b/i,
  /^[^.]*\bsi incontrano\s+in\b/i,
  /^[^.]*\becco cosa emerge\b/i,
  /^[^.]*\bemerge dall'analisi\b/i,
  /^[^.]*\baffrontano in\b/i,
  /^[^.]*\bin\s+[^.]+si affrontano\b/i,
];

function primaFraseValida(frase: string): boolean {
  const prima = frase.split(/[.!?]/)[0]?.trim() ?? "";
  return !STRUTTURE_VIETATE.some((re) => re.test(prima));
}

const INTRO_NEUTRALI = [
  "La sfida di campionato in programma richiede un'analisi attenta.",
  "I dati delle ultime uscite offrono indicazioni utili per questa partita.",
  "La partita presenta elementi di interesse per chi scommette.",
  "Un confronto dai pronostici non scontati.",
];

/** Trasforma un motivo why_this_match in frase discorsiva (senza nomi squadre) */
function motivoToFrase(motivo: string): string {
  const map: Record<string, string> = {
    "trend recente favorevole a partite con molti gol":
      "Il trend recente punta verso partite ad alto punteggio.",
    "rendimento casalingo negativo della squadra di casa":
      "La squadra di casa fatica tra le mura amiche.",
    "difesa della squadra di casa in difficoltà":
      "La retroguardia dei padroni di casa ha mostrato cedimenti.",
    "difesa della squadra ospite in difficoltà":
      "La difesa degli ospiti ha subito diverse reti nelle ultime uscite.",
    "attacco della squadra ospite particolarmente efficace":
      "L'attacco in trasferta si è dimostrato prolifico.",
    "attacco della squadra di casa particolarmente efficace":
      "I padroni di casa segnano con regolarità.",
    "statistiche gol che puntano verso l'Over 2,5":
      "Le statistiche gol convergono verso l'Over 2,5.",
    "precedenti diretti con molti gol":
      "Quando si sono incontrate, le reti non sono mai mancate.",
  };
  return map[motivo] ?? motivo.charAt(0).toUpperCase() + motivo.slice(1) + ".";
}

/** Restituisce una frase interpretativa sulla forma */
function formToInterpretivePhrase(results: MatchResult[]): string {
  const wins = results.filter((r) => r === "V").length;
  const losses = results.filter((r) => r === "P").length;
  if (results.length === 0) return "";

  if (losses >= 3) return "un momento complicato";
  if (wins >= 4) return "ottima continuità di risultati";
  if (wins >= 3) return "buona continuità di risultati";
  if (wins <= 1 && losses >= 2) return "una fase altalenante";
  if (wins >= 2) return "discreta continuità";
  return "forma incostante";
}

/**
 * Genera i paragrafi dell'analisi pronostico.
 * Struttura: intro (guidata da why_this_match) → forma → gol → casa/trasferta → conclusione.
 */
export function generateMatchAnalysisText(data: MatchAnalysisData): string[] {
  const [homeName, awayName] = data.match.split(" vs ");
  const paragraphs: string[] = [];

  // 1) INTRO: guidata da why_this_match, con verifica strutture vietate
  let primaFrase = "";
  if (data.why_this_match.length > 0) {
    for (const motivo of data.why_this_match) {
      const frase = motivoToFrase(motivo);
      if (primaFraseValida(frase)) {
        primaFrase = frase;
        break;
      }
    }
  }
  if (!primaFrase) {
    const idx = (homeName.length + awayName.length) % INTRO_NEUTRALI.length;
    primaFrase = INTRO_NEUTRALI[idx];
  }
  const contesto = `In questo contesto, ${data.league} propone per il ${data.date} il confronto tra ${homeName} e ${awayName}.`;
  paragraphs.push(primaFrase + " " + contesto);

  // 2) Analisi forma recente
  if (data.form.home.length > 0 || data.form.away.length > 0) {
    const homeWins = data.form.home.filter((r) => r === "V").length;
    const awayWins = data.form.away.filter((r) => r === "V").length;
    const homeLosses = data.form.home.filter((r) => r === "P").length;
    const awayLosses = data.form.away.filter((r) => r === "P").length;
    const homePhrase = formToInterpretivePhrase(data.form.home);
    const awayPhrase = formToInterpretivePhrase(data.form.away);
    const verb = (p: string) => (p.includes("momento") || p.includes("fase") ? "attraversa" : "ha");

    let formText = "";
    if (homeWins > awayWins + 1) {
      formText =
        `${homeName} ${verb(homePhrase)} ${homePhrase} e nelle ultime uscite ha dimostrato più solidità. ` +
        `${awayName} invece ${verb(awayPhrase)} ${awayPhrase}: il trend favorisce la squadra di casa.`;
    } else if (awayWins > homeWins + 1) {
      formText =
        `${awayName} ${verb(awayPhrase)} ${awayPhrase} e arriva con più fiducia. ` +
        `${homeName} ${verb(homePhrase)} ${homePhrase}: la trasferta potrebbe sorprendere.`;
    } else if (homeLosses >= 3 || awayLosses >= 3) {
      const struggling = homeLosses >= 3 ? homeName : awayName;
      const other = homeLosses >= 3 ? awayName : homeName;
      const otherPhrase = formToInterpretivePhrase(homeLosses >= 3 ? data.form.away : data.form.home);
      formText =
        `${struggling} attraversa un periodo difficile. ` +
        `${other} invece ${verb(otherPhrase)} ${otherPhrase}: chi è in crisi potrebbe pagare dazio.`;
    } else {
      formText =
        `Nessuna delle due domina il trend: ${homeName} ${verb(homePhrase)} ${homePhrase}, ` +
        `${awayName} ${verb(awayPhrase)} ${awayPhrase}. Partita equilibrata.`;
    }
    paragraphs.push(formText);
  }

  // 3) Analisi gol (over/under, BTTS)
  const { home: hg, away: ag } = data.goals;
  const hasGoalsData = hg.avg_scored > 0 || hg.avg_conceded > 0 || ag.avg_scored > 0 || ag.avg_conceded > 0;
  if (hasGoalsData) {
    const combinedOver = Math.round((hg.over_2_5_pct + ag.over_2_5_pct) / 2);
    const expectedGoals = hg.avg_scored + ag.avg_scored;

    let goalsText = "";
    if (combinedOver >= 60 && expectedGoals >= 2.5) {
      goalsText =
        `Le statistiche gol puntano verso l'Over 2,5: entrambe superano il 55% di partite oltre i 2,5 gol. ` +
        `Media segnate/subite: ${homeName} ${hg.avg_scored}-${hg.avg_conceded}, ${awayName} ${ag.avg_scored}-${ag.avg_conceded}. ` +
        `Media attesa circa ${expectedGoals.toFixed(1)} reti a partita.`;
    } else if (hg.both_teams_scored_pct >= 50 && ag.both_teams_scored_pct >= 50) {
      goalsText =
        `Entrambe segnano spesso: oltre la metà delle partite recenti ha visto reti da entrambe le parti. ` +
        `"Entrambe segnano" è un'opzione da valutare, così come l'Over 2,5.`;
    } else if (hg.avg_conceded <= 0.8 || ag.avg_conceded <= 0.8) {
      const solid = hg.avg_conceded <= 0.8 ? homeName : awayName;
      goalsText =
        `${solid} ha una difesa solida. ` +
        `L'Under 2,5 potrebbe avere valore se l'avversario non è prolifico.`;
    } else {
      goalsText =
        `Medie gol: ${homeName} segna e subisce circa ${hg.avg_scored} e ${hg.avg_conceded}, ` +
        `${awayName} ${ag.avg_scored} e ${ag.avg_conceded}. Scelta Over/Under dipende dalle quote.`;
    }
    paragraphs.push(goalsText);
  }

  // 4) Casa vs trasferta (solo se rilevante)
  const homePct = data.home_away.home_win_pct;
  const awayPct = data.home_away.away_win_pct;
  if (homePct != null || awayPct != null) {
    const gap = homePct != null && awayPct != null ? homePct - awayPct : 0;
    if (homePct != null && homePct === 0) {
      paragraphs.push(
        `${homeName} non ha vinto nessuna delle ultime partite in casa: il fattore campo non aiuta.`
      );
    } else if (awayPct != null && awayPct === 0) {
      paragraphs.push(
        `${awayName} fatica in trasferta, senza vittorie nelle ultime uscite fuori casa.`
      );
    } else if (Math.abs(gap) >= 25) {
      paragraphs.push(
        `Rendimento casa/trasferta decisivo: ${homeName} forte in casa, ` +
          `${awayName} raccoglie meno successi in trasferta. Lo scarto influenza il 1X2.`
      );
    }
  }

  // 5) Conclusione con pronostico consigliato (usa final_pick)
  const conclusion =
    `Pronostico consigliato: ${data.final_pick.market} (confidenza ${data.final_pick.confidence}). ` +
    `Forma, statistiche gol e rendimento campo/trasferta convergono in questa direzione.`;
  paragraphs.push(conclusion);

  return paragraphs;
}
