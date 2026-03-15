/**
 * ID competizioni da nascondere nella pagina Leghe admin e dalle partite.
 * API-Football predictions non copre Serie B (136), Conference (4), ecc.
 * Aggiungi qui le leghe senza pronostici se non vuoi mostrarle.
 */
export const HIDDEN_COMPETITION_IDS = new Set<number | string>([
  // 136, // Serie B - nessun pronostico API-Football
]);

export function isHiddenCompetition(id: number | string): boolean {
  return HIDDEN_COMPETITION_IDS.has(id);
}
