export const COOKIE_CONSENT_KEY = "playsignal-cookie-consent";

/** Locale in cui l'utente ha dato il consenso (per determinare il periodo di validità) */
const LOCALES_6_MONTHS = ["it", "fr", "es", "de", "en"] as const;
const LOCALES_12_MONTHS = ["pt-BR", "en-NG", "en-KE", "en-GH"] as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SIX_MONTHS_MS = 180 * MS_PER_DAY;   // Italia: 6 mesi
const TWELVE_MONTHS_MS = 365 * MS_PER_DAY; // Brasile, Nigeria, Kenya, Ghana: 12 mesi

export type CookiePreferences = {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
  /** Locale al momento del consenso (per determinare scadenza) */
  locale?: string;
};

export const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  timestamp: 0,
};

export function getCookieConsent(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as CookiePreferences;
    return parsed;
  } catch {
    return null;
  }
}

export function setCookieConsent(prefs: CookiePreferences, locale?: string): void {
  if (typeof window === "undefined") return;
  prefs.timestamp = Date.now();
  prefs.essential = true; // Always required
  prefs.locale = locale;
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
}

function getConsentValidityMs(locale: string): number {
  if (LOCALES_12_MONTHS.includes(locale as (typeof LOCALES_12_MONTHS)[number])) {
    return TWELVE_MONTHS_MS;
  }
  return SIX_MONTHS_MS;
}

/** Verifica se il consenso è valido (non scaduto) per il locale corrente */
export function hasUserConsented(locale: string): boolean {
  const prefs = getCookieConsent();
  if (!prefs) return false;
  const validityMs = getConsentValidityMs(prefs.locale ?? locale);
  const elapsed = Date.now() - prefs.timestamp;
  return elapsed < validityMs;
}
