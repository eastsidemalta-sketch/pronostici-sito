/**
 * Registry competizioni per sport.
 * Ogni sport ha una lista di competizioni disponibili.
 * Per aggiungere un nuovo sport: aggiungerlo a SPORTS_WITH_COMPETITIONS e definire le competizioni.
 */

import { CALCIO_COMPETITIONS } from "./homeMenu";
import { SPORTS } from "./sportsPerCountry";

export type CompetitionItem =
  | { id: number; name: string; type?: "league" | "cup" }
  | { id: string; name: string; type?: "league" | "cup" };

export type SportCompetitionsConfig = {
  sportKey: string;
  label: string;
  /** Competizioni disponibili (id numerico per calcio/API-Football, string per altri) */
  competitions: CompetitionItem[];
};

/** Competizioni Tennis */
const TENNIS_COMPETITIONS: CompetitionItem[] = [
  { id: "grand-slam", name: "Grand Slam", type: "cup" },
  { id: "australian-open", name: "Australian Open", type: "cup" },
  { id: "roland-garros", name: "Roland Garros", type: "cup" },
  { id: "wimbledon", name: "Wimbledon", type: "cup" },
  { id: "us-open", name: "US Open", type: "cup" },
  { id: "atp-masters", name: "ATP Masters 1000", type: "league" },
  { id: "atp-500", name: "ATP 500", type: "league" },
  { id: "atp-250", name: "ATP 250", type: "league" },
  { id: "atp-challenger", name: "ATP Challenger", type: "league" },
  { id: "davis-cup", name: "Davis Cup", type: "cup" },
];

/** Competizioni Rugby (placeholder - da collegare a API quando disponibile) */
const RUGBY_COMPETITIONS: CompetitionItem[] = [
  { id: "six-nations", name: "Six Nations", type: "league" },
  { id: "rugby-championship", name: "The Rugby Championship", type: "league" },
  { id: "premiership", name: "Premiership Rugby", type: "league" },
  { id: "top14", name: "Top 14", type: "league" },
  { id: "pro14", name: "United Rugby Championship", type: "league" },
  { id: "world-cup", name: "Rugby World Cup", type: "cup" },
];

/** Competizioni Basket (placeholder - da collegare a API quando disponibile) */
const BASKET_COMPETITIONS: CompetitionItem[] = [
  { id: "nba", name: "NBA", type: "league" },
  { id: "euroleague", name: "EuroLeague", type: "league" },
  { id: "serie-a-basket", name: "Serie A Basket", type: "league" },
  { id: "lba", name: "LBA", type: "league" },
  { id: "fibas-world-cup", name: "FIBA World Cup", type: "cup" },
];

/** Registry: sportKey -> competizioni disponibili */
export const SPORTS_COMPETITIONS: SportCompetitionsConfig[] = [
  {
    sportKey: "calcio",
    label: "Calcio",
    competitions: CALCIO_COMPETITIONS.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
    })),
  },
  {
    sportKey: "tennis",
    label: "Tennis",
    competitions: TENNIS_COMPETITIONS,
  },
  {
    sportKey: "rugby",
    label: "Rugby",
    competitions: RUGBY_COMPETITIONS,
  },
  {
    sportKey: "basket",
    label: "Basket",
    competitions: BASKET_COMPETITIONS,
  },
];

/** Restituisce le competizioni per uno sport */
export function getCompetitionsForSport(sportKey: string): CompetitionItem[] {
  return SPORTS_COMPETITIONS.find((s) => s.sportKey === sportKey)?.competitions ?? [];
}

/** Restituisce tutti gli sport con competizioni configurate */
export function getSportsWithCompetitions(): SportCompetitionsConfig[] {
  return SPORTS_COMPETITIONS;
}

/** Verifica se un id è numerico (calcio) o stringa */
export function isNumericId(id: number | string): id is number {
  return typeof id === "number";
}
