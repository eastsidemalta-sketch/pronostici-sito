/**
 * Partite che l'API a volte non restituisce (es. Coppa Italia con date/status errati).
 * Aggiungi qui fixture da recuperare esplicitamente quando mancano per una squadra.
 * Formato: { teamName: string; fixtureId: number }
 */
export const FALLBACK_FIXTURES: Array<{ teamName: string; fixtureId: number }> = [
  { teamName: "Como", fixtureId: 1514890 },
];

/** Fixture ID da includere sempre quando presenti (anche con status/date errati) */
export const FORCE_INCLUDE_FIXTURE_IDS: number[] = [1514890];
