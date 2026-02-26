import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { getDefaultLocale } from "@/lib/markets";

const LEGAL_LOCALE_MAP: Record<string, string> = {
  it: "it",
  "pt-BR": "pt-BR",
  en: "en",
  "en-NG": "en-NG",
  "en-KE": "en-KE",
  "en-GH": "en-GH",
  fr: "en",
  es: "en",
  de: "en",
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages = (await import(`../messages/${locale}.json`)).default;
  const legalLocale = LEGAL_LOCALE_MAP[locale] ?? getDefaultLocale();
  try {
    const legal = (await import(`../messages/legal-${legalLocale}.json`)).default;
    (messages as Record<string, unknown>).legal = legal;
  } catch {
    // Fallback se il file legal non esiste
  }

  return {
    locale,
    messages,
    timeZone: "Europe/Rome",
  };
});
