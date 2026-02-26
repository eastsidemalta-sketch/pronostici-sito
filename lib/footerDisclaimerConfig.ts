import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { allUrlSegments } from "@/i18n/routing";

export type Badge18Config = {
  text?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
};

export type FooterDisclaimerConfig = {
  badge?: Badge18Config;
} & Record<string, string[] | Badge18Config | undefined>;

const DATA_PATH = path.join(process.cwd(), "data", "footer-disclaimer.json");

const DEFAULTS: Record<string, string[]> = {
  it: [
    "Gioca responsabilmente | Solo maggiori di 18 anni",
    "Il gioco può causare dipendenza patologica.",
    "Sito informativo e di comparazione, non operatore di gioco.",
    "I bookmaker promossi operano con regolare licenza ADM.",
  ],
  "pt-BR": [
    "Proibido para menores de 18 anos (18+).",
    "Jogue com responsabilidade.",
    "Apostas podem causar dependência.",
    "Conteúdo informativo e de comparação. Não operamos apostas.",
  ],
  "en-NG": [
    "18+ Only. Gambling may be addictive.",
    "Bet responsibly.",
    "Information and comparison site only – not a betting operator.",
  ],
  "en-KE": [
    "18+ Only. Gambling may be addictive.",
    "Bet responsibly.",
    "Operators promoted are licensed and regulated by the Betting Control and Licensing Board (BCLB).",
  ],
  "en-GH": [
    "18+ Only. Gambling may be addictive.",
    "Bet responsibly.",
    "Gambling activities in Ghana are regulated by the Gaming Commission of Ghana.",
  ],
  en: [
    "18+ Only. Gambling may be addictive.",
    "Bet responsibly.",
    "Information and comparison site only – not a betting operator.",
  ],
  fr: [
    "18+ uniquement. Le jeu peut créer une dépendance.",
    "Jouez de manière responsable.",
    "Site d'information et de comparaison uniquement – pas d'opérateur de paris.",
  ],
  es: [
    "Solo mayores de 18 años. El juego puede crear adicción.",
    "Apuesta con responsabilidad.",
    "Sitio informativo y de comparación únicamente – no operador de apuestas.",
  ],
  de: [
    "Nur 18+. Glücksspiel kann süchtig machen.",
    "Spielen Sie verantwortungsvoll.",
    "Nur Informations- und Vergleichsseite – kein Wettanbieter.",
  ],
};

function getDefaultForLocale(locale: string): string[] {
  const val = DEFAULTS[locale];
  return Array.isArray(val) ? val : (DEFAULTS.en ?? []);
}

const BADGE_DEFAULTS: Badge18Config = {
  text: "18+",
  color: "#1e7b45",
  size: "md",
};

export function getFooterDisclaimerConfig(): FooterDisclaimerConfig {
  try {
    if (existsSync(DATA_PATH)) {
      const raw = readFileSync(DATA_PATH, "utf-8");
      const parsed = JSON.parse(raw) as FooterDisclaimerConfig;
      if (parsed && typeof parsed === "object") {
        const merged: FooterDisclaimerConfig = {};
        for (const locale of allUrlSegments) {
          const existing = parsed[locale];
          merged[locale] = Array.isArray(existing) && existing.length > 0
            ? existing
            : getDefaultForLocale(locale);
        }
        if (parsed.badge && typeof parsed.badge === "object") {
          merged.badge = { ...BADGE_DEFAULTS, ...parsed.badge };
        }
        return merged;
      }
    }
  } catch {
    // fallback
  }
  const result: FooterDisclaimerConfig = {};
  for (const locale of allUrlSegments) {
    result[locale] = getDefaultForLocale(locale);
  }
  return result;
}

export function saveFooterDisclaimerConfig(config: FooterDisclaimerConfig): void {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(config, null, 2));
}

/** Restituisce le righe del disclaimer per un locale */
export function getFooterDisclaimerLines(locale: string): string[] {
  const config = getFooterDisclaimerConfig();
  const lines = config[locale];
  if (Array.isArray(lines) && lines.length > 0) {
    return lines;
  }
  return getDefaultForLocale(locale);
}

/** Restituisce la config del badge 18+ */
export function getBadge18Config(): Badge18Config {
  const config = getFooterDisclaimerConfig();
  return config.badge ? { ...BADGE_DEFAULTS, ...config.badge } : BADGE_DEFAULTS;
}
