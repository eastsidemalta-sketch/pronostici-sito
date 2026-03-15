/**
 * Metadata Open Graph / Twitter per paese.
 * Usato per title e description nello share social (it, pt-BR, es-CO, ecc.).
 */

export type OgMetadata = {
  title: string;
  description: string;
};

/** Metadata per locale - titolo e descrizione per share social */
export const OG_METADATA_BY_LOCALE: Record<string, OgMetadata> = {
  it: {
    title: "PlaySignal | Calcio, Quote e Analisi Partite",
    description:
      "Analisi basate su dati, probabilità e segnali intelligenti per interpretare le quote dei bookmaker. Confronta eventi sportivi e prendi decisioni più informate.",
  },
  "pt-BR": {
    title: "PlaySignal | Futebol, Odds e Análise de Partidas",
    description:
      "Análises baseadas em dados, probabilidades e sinais inteligentes para interpretar as odds dos bookmakers. Compare eventos esportivos e tome decisões mais informadas.",
  },
  "es-CO": {
    title: "PlaySignal | Fútbol, Cuotas y Análisis de Partidos",
    description:
      "Análisis basados en datos, probabilidades y señales inteligentes para interpretar las cuotas de los bookmakers. Compara eventos deportivos y toma decisiones más informadas.",
  },
  // Fallback per altri mercati (en, fr, es, de, ecc.)
  en: {
    title: "PlaySignal | Football, Odds and Match Analysis",
    description:
      "Analysis based on data, probabilities and intelligent signals to interpret bookmaker odds. Compare sporting events and make more informed decisions.",
  },
  fr: {
    title: "PlaySignal | Football, Cotes et Analyse des Matchs",
    description:
      "Analyses basées sur les données, les probabilités et les signaux intelligents pour interpréter les cotes des bookmakers. Comparez les événements sportifs et prenez des décisions plus éclairées.",
  },
  es: {
    title: "PlaySignal | Fútbol, Cuotas y Análisis de Partidos",
    description:
      "Análisis basados en datos, probabilidades y señales inteligentes para interpretar las cuotas de los bookmakers. Compara eventos deportivos y toma decisiones más informadas.",
  },
  de: {
    title: "PlaySignal | Fußball, Quoten und Spielanalyse",
    description:
      "Analysen basierend auf Daten, Wahrscheinlichkeiten und intelligenten Signalen zur Interpretation von Buchmacher-Quoten. Vergleichen Sie Sportereignisse und treffen Sie fundiertere Entscheidungen.",
  },
  "en-NG": {
    title: "PlaySignal | Football, Odds and Match Analysis",
    description:
      "Analysis based on data, probabilities and intelligent signals to interpret bookmaker odds. Compare sporting events and make more informed decisions.",
  },
  "en-KE": {
    title: "PlaySignal | Football, Odds and Match Analysis",
    description:
      "Analysis based on data, probabilities and intelligent signals to interpret bookmaker odds. Compare sporting events and make more informed decisions.",
  },
  "en-GH": {
    title: "PlaySignal | Football, Odds and Match Analysis",
    description:
      "Analysis based on data, probabilities and intelligent signals to interpret bookmaker odds. Compare sporting events and make more informed decisions.",
  },
};

/** Restituisce metadata OG per locale, con fallback a 'it' */
export function getOgMetadata(locale: string): OgMetadata {
  return OG_METADATA_BY_LOCALE[locale] ?? OG_METADATA_BY_LOCALE.it;
}
