/**
 * ID competizioni da nascondere nella pagina Leghe admin.
 * Nessun checkbox, non usate per le partite.
 * Aggiungi gli ID che non vuoi mostrare (es. 136 per Serie B, 4 per Conference League).
 */
export const HIDDEN_COMPETITION_IDS = new Set<number | string>([
  // Esempio: 136, 4
]);

export function isHiddenCompetition(id: number | string): boolean {
  return HIDDEN_COMPETITION_IDS.has(id);
}
