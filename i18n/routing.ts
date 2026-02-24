import { defineRouting } from "next-intl/routing";

/**
 * Configurazione routing per paesi e lingue.
 * Lingue supportate: Italiano, Francese, Spagnolo, Tedesco, Inglese, Brasiliano, Inglese (Nigeria, Kenya, Ghana).
 */
export const routing = defineRouting({
  locales: ["it", "fr", "es", "de", "en", "pt-BR", "en-NG", "en-KE", "en-GH"],
  defaultLocale: "it",
  localePrefix: "always",
});

/** Mappa locale -> nome paese (per footer, metadata, ecc.) */
export const localeToCountry: Record<string, string> = {
  it: "Italia",
  fr: "France",
  es: "España",
  de: "Deutschland",
  en: "United Kingdom",
  "pt-BR": "Brasil",
  "en-NG": "Nigeria",
  "en-KE": "Kenya",
  "en-GH": "Ghana",
};

/** Mappa locale -> codice paese ISO (per link bookmaker per paese) */
export const localeToCountryCode: Record<string, string> = {
  it: "IT",
  fr: "FR",
  es: "ES",
  de: "DE",
  en: "UK",
  "pt-BR": "BR",
  "en-NG": "NG",
  "en-KE": "KE",
  "en-GH": "GH",
};

/** Codice locale per formattazione date (Intl) */
export const localeToIntl: Record<string, string> = {
  it: "it-IT",
  fr: "fr-FR",
  es: "es-ES",
  de: "de-DE",
  en: "en-GB",
  "pt-BR": "pt-BR",
  "en-NG": "en-NG",
  "en-KE": "en-KE",
  "en-GH": "en-GH",
};
