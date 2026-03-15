import type { RemunerationConfig, RemunerationModel } from "./bookmaker.types";

/**
 * Peso per categoria di remunerazione (più alto = migliore).
 * Revenue Share > CPA > CPL > nessuna remunerazione
 */
const MODEL_WEIGHT: Record<RemunerationModel, number> = {
  revenue_share: 3,
  CPA: 2,
  CPL: 1,
};

/**
 * Calcola un punteggio numerico per ordinare i bookmaker.
 * Usato quando due o più bookmaker hanno la stessa quota su un mercato.
 *
 * Regole (priorità decrescente):
 * 1. manualPriority impostato → posizione fissa (inverte: priorità 1 = score più alto)
 * 2. Categoria: Revenue Share (3) > CPA (2) > CPL (1) > nessuna (0)
 * 3. Dentro la stessa categoria: valore più alto → score più alto
 *
 * Formato score per categorie automatiche:
 *   categoryWeight * 10_000 + value
 * Così Revenue Share 35% (3 * 10000 + 35 = 30035) batte CPA €80 (2 * 10000 + 80 = 20080).
 */
export function getBookmakerScore(remuneration?: RemunerationConfig | null): number {
  if (!remuneration) return 0;

  const { model, value, manualPriority } = remuneration;

  // manualPriority viene gestito separatamente in sortBookmakers,
  // ma se qualcuno chiama getBookmakerScore direttamente restituiamo 0
  // per i bookmaker con priorità manuale (non paragonabile numericamente).
  if (manualPriority != null) return 0;

  const weight = MODEL_WEIGHT[model] ?? 0;
  return weight * 10_000 + (value ?? 0);
}

/**
 * Confronta due bookmaker per la graduatoria quote.
 * Ritorna un numero negativo se `a` va prima di `b`, positivo se `b` va prima di `a`.
 *
 * Usa lo stesso ordinamento per:
 * - Tabella quote in home page (parità di quota)
 * - Pagina singolo match (tutte le quote per mercato)
 */
export function compareBookmakers(
  a: { remuneration?: RemunerationConfig | null },
  b: { remuneration?: RemunerationConfig | null }
): number {
  const prioA = a.remuneration?.manualPriority ?? null;
  const prioB = b.remuneration?.manualPriority ?? null;

  // Entrambi con priorità manuale → ordina per numero crescente (1 = primo)
  if (prioA != null && prioB != null) return prioA - prioB;

  // Solo A ha priorità manuale → A va prima
  if (prioA != null) return -1;

  // Solo B ha priorità manuale → B va prima
  if (prioB != null) return 1;

  // Nessuno ha priorità manuale → ordina per score decrescente (score più alto = prima)
  return getBookmakerScore(b.remuneration) - getBookmakerScore(a.remuneration);
}

/**
 * Ordina un array di bookmaker (con campo `remuneration`) secondo la graduatoria.
 * Non muta l'array originale.
 */
export function sortBookmakers<T extends { remuneration?: RemunerationConfig | null }>(
  bookmakers: T[]
): T[] {
  return [...bookmakers].sort(compareBookmakers);
}

/**
 * Dato un array di quote per un mercato (ogni entry ha `bookmakerKey`),
 * e la mappa bookmakerKey → RemunerationConfig, ordina le quote:
 * - Se la quota è identica ad altre → usa la graduatoria di remunerazione
 * - Quote diverse → ordina per quota decrescente (migliore quota prima)
 *
 * `outcomeKey`: la chiave dell'outcome da confrontare (es. "home", "away", "draw", "over", ecc.)
 */
export function sortQuotesByRemunerationTiebreak<
  T extends { bookmakerKey: string; outcomes: Record<string, number> }
>(
  quotes: T[],
  outcomeKey: string,
  remunerationMap: Record<string, RemunerationConfig | null | undefined>
): T[] {
  return [...quotes].sort((a, b) => {
    const oddsA = a.outcomes[outcomeKey] ?? 0;
    const oddsB = b.outcomes[outcomeKey] ?? 0;

    // Quote diverse: prima la più alta
    if (Math.abs(oddsA - oddsB) > 0.001) return oddsB - oddsA;

    // Parità di quota: applica la graduatoria di remunerazione
    const remA = remunerationMap[a.bookmakerKey] ?? null;
    const remB = remunerationMap[b.bookmakerKey] ?? null;
    return compareBookmakers({ remuneration: remA }, { remuneration: remB });
  });
}
