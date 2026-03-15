/** Sport/rubrica disponibili */
export const SPORTS = [
  { key: "calcio", label: "Calcio" },
  { key: "basket", label: "Basket" },
  { key: "tennis", label: "Tennis" },
  { key: "rugby", label: "Rugby" },
] as const;

export type SportKey = (typeof SPORTS)[number]["key"];

/** Per ogni paese (IT, UK, DE...), quali sport sono attivi */
export type SportsPerCountry = Record<string, SportKey[]>;

/** Per ogni paese, quale locale/lingua usare */
export type LocalePerCountry = Record<string, string>;

/** Config completa: sport + lingua per paese */
export type SportsConfig = {
  sports: SportsPerCountry;
  localePerCountry: LocalePerCountry;
};
