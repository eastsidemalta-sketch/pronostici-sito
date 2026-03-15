import {
  getBookmakers as loadBookmakers,
  getBookmakerBySiteId as getBySiteId,
} from "./bookmakersData";
import type { Bookmaker } from "./bookmaker.types";
import { getBookmakerUrlByUseCase } from "./bookmakerUrls";

/** Nome visibile sul sito: displayName se impostato, altrimenti name */
export function getBookmakerDisplayName(bm: { name: string; displayName?: string | null }): string {
  return (bm.displayName?.trim() || bm.name) || "";
}

/** Bookmakers caricati da data/bookmakers.json (o default). Chiama ogni volta per dati aggiornati. */
export function getBookmakers() {
  return loadBookmakers();
}

/** Trova bookmaker per siteId (es. IT-0001). Per bonus, API, integrazioni. */
export function getBookmakerBySiteId(siteId: string) {
  return getBySiteId(siteId);
}

/** ID del bookmaker in evidenza (da env FEATURED_BOOKMAKER_ID) o null per usare il primo con bonus */
const FEATURED_ID = process.env.FEATURED_BOOKMAKER_ID?.trim() || null;

export type FeaturedBookmaker = Bookmaker & {
  bonusDescription?: string;
  bonusUrl?: string;
  /** Testo bottone sotto "Tutte le quote" */
  buttonText: string;
  /** Mostra bonus nel box Pronostici */
  showInPronosticiBox?: boolean;
  /** Testo bottone sotto "Pronostici completi" (se vuoto usa buttonText) */
  pronosticiButtonText?: string;
  /** URL sotto "Pronostici completi" (se vuoto usa bonusUrl) */
  pronosticiButtonUrl?: string;
  /** Colore box: "yellow" | "orange" */
  buttonColor?: "yellow" | "orange";
};

/**
 * Restituisce il bookmaker in evidenza per la home (Bonus in Box partita).
 * Priorità: bookmaker con matchBoxBonusEnabled, poi FEATURED_BOOKMAKER_ID, poi primo con bonus.
 */
export function getFeaturedBookmaker(country: string): FeaturedBookmaker | null {
  const bookmakers = loadBookmakers().filter(
    (bm) =>
      bm.isActive &&
      (bm.countries?.includes(country) || bm.country === country || bm.countryConfig?.[country])
  );

  const cc = (bm: Bookmaker) => bm.countryConfig?.[country];

  // Preferisci bookmaker con matchBoxBonusEnabled attivo
  const withMatchBox = bookmakers.filter((bm) => cc(bm)?.matchBoxBonusEnabled);
  const candidates = withMatchBox.length > 0 ? withMatchBox : bookmakers;

  const withBonus = candidates
    .map((bm) => {
      const cfg = cc(bm);
      const bonusDescription = cfg?.bonusDescription;
      const bonusUrl =
        cfg?.matchBoxButtonUrl ||
        getBookmakerUrlByUseCase(bm.apiBookmakerKey || bm.id, "bonus", country) ||
        getBookmakerUrlByUseCase(bm.apiBookmakerKey || bm.id, "registrati", country) ||
        bm.affiliateUrl;
      const buttonText = cfg?.matchBoxButtonText || "100€ DI BONUS";
      return { ...bm, bonusDescription, bonusUrl, buttonText };
    })
    .filter((bm) => bm.bonusDescription || cc(bm)?.matchBoxBonusEnabled);

  // Se nessun bookmaker ha bonus configurato, usa il primo attivo per il paese (fallback)
  const toUse = withBonus.length > 0 ? withBonus : bookmakers.map((bm) => {
    const cfg = cc(bm);
    const bonusUrl =
      cfg?.matchBoxButtonUrl ||
      getBookmakerUrlByUseCase(bm.apiBookmakerKey || bm.id, "bonus", country) ||
      getBookmakerUrlByUseCase(bm.apiBookmakerKey || bm.id, "registrati", country) ||
      bm.affiliateUrl;
    return { ...bm, bonusDescription: cfg?.bonusDescription, bonusUrl, buttonText: cfg?.matchBoxButtonText || "100€ DI BONUS" };
  });

  if (toUse.length === 0) return null;

  let chosen = toUse[0];
  if (FEATURED_ID) {
    const byId = toUse.find(
      (bm) => bm.id.toLowerCase() === FEATURED_ID.toLowerCase() || bm.apiBookmakerKey?.toLowerCase() === FEATURED_ID.toLowerCase()
    );
    if (byId) chosen = byId;
  } else if (withMatchBox.length > 0) {
    chosen = withMatchBox
      .map((bm) => toUse.find((w) => w.id === bm.id))
      .find(Boolean) ?? chosen;
  }

  const cfgChosen = cc(chosen);
  const pronosticiText = cfgChosen?.matchBoxPronosticiButtonText || chosen.buttonText;
  const pronosticiUrl = cfgChosen?.matchBoxPronosticiButtonUrl || chosen.bonusUrl;

  return {
    ...chosen,
    name: getBookmakerDisplayName(chosen),
    bonusDescription: chosen.bonusDescription,
    bonusUrl: chosen.bonusUrl,
    buttonText: chosen.buttonText,
    showInPronosticiBox: cfgChosen?.matchBoxBonusInPronosticiEnabled ?? false,
    pronosticiButtonText: pronosticiText,
    pronosticiButtonUrl: pronosticiUrl,
    buttonColor: cfgChosen?.matchBoxButtonColor ?? "yellow",
  };
}
