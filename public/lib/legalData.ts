import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { allUrlSegments } from "@/i18n/routing";

export type LegalDocument = {
  linkName: string;
  title: string;
  fullText: string;
};

export type LegalLocaleConfig = {
  terms: LegalDocument;
  privacy: LegalDocument;
};

export type LegalAdminConfig = Record<string, LegalLocaleConfig>;

const DATA_PATH = path.join(process.cwd(), "data", "legal.json");

function getDefaultTerms(locale: string): LegalDocument {
  const defaults: Record<string, LegalDocument> = {
    it: {
      linkName: "Termini e Condizioni",
      title: "Termini e Condizioni",
      fullText: "",
    },
    "pt-BR": {
      linkName: "Termos e Condições",
      title: "Termos e Condições",
      fullText: "",
    },
    en: {
      linkName: "Terms and Conditions",
      title: "Terms and Conditions",
      fullText: "",
    },
    fr: {
      linkName: "Termes et Conditions",
      title: "Termes et Conditions",
      fullText: "",
    },
    es: {
      linkName: "Términos y Condiciones",
      title: "Términos y Condiciones",
      fullText: "",
    },
    de: {
      linkName: "Allgemeine Geschäftsbedingungen",
      title: "Allgemeine Geschäftsbedingungen",
      fullText: "",
    },
  };
  return (
    defaults[locale] ?? {
      linkName: "Terms and Conditions",
      title: "Terms and Conditions",
      fullText: "",
    }
  );
}

function getDefaultPrivacy(locale: string): LegalDocument {
  const defaults: Record<string, LegalDocument> = {
    it: {
      linkName: "Informativa sulla privacy",
      title: "Informativa sulla privacy",
      fullText: "",
    },
    "pt-BR": {
      linkName: "Política de Privacidade",
      title: "Política de Privacidade",
      fullText: "",
    },
    en: {
      linkName: "Privacy Policy",
      title: "Privacy Policy",
      fullText: "",
    },
    fr: {
      linkName: "Politique de confidentialité",
      title: "Politique de confidentialité",
      fullText: "",
    },
    es: {
      linkName: "Política de privacidad",
      title: "Política de privacidad",
      fullText: "",
    },
    de: {
      linkName: "Datenschutzrichtlinie",
      title: "Datenschutzrichtlinie",
      fullText: "",
    },
  };
  return (
    defaults[locale] ?? {
      linkName: "Privacy Policy",
      title: "Privacy Policy",
      fullText: "",
    }
  );
}

function buildDefaultConfig(): LegalAdminConfig {
  const config: LegalAdminConfig = {};
  for (const locale of allUrlSegments) {
    config[locale] = {
      terms: getDefaultTerms(locale),
      privacy: getDefaultPrivacy(locale),
    };
  }
  return config;
}

export function getLegalAdminConfig(): LegalAdminConfig {
  try {
    if (existsSync(DATA_PATH)) {
      const raw = readFileSync(DATA_PATH, "utf-8");
      const parsed = JSON.parse(raw) as LegalAdminConfig;
      if (parsed && typeof parsed === "object") {
        const merged: LegalAdminConfig = {};
        for (const locale of allUrlSegments) {
          const existing = parsed[locale];
          merged[locale] = {
            terms: {
              ...getDefaultTerms(locale),
              ...existing?.terms,
            },
            privacy: {
              ...getDefaultPrivacy(locale),
              ...existing?.privacy,
            },
          };
        }
        return merged;
      }
    }
  } catch {
    // fallback
  }
  return buildDefaultConfig();
}

export function saveLegalAdminConfig(config: LegalAdminConfig): void {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(config, null, 2));
}

/** Restituisce linkName e title per un documento, da admin se presente altrimenti da defaults */
export function getLegalLinkAndTitle(
  locale: string,
  type: "terms" | "privacy"
): { linkName: string; title: string } {
  const config = getLegalAdminConfig();
  const doc = config[locale]?.[type];
  const def = type === "terms" ? getDefaultTerms(locale) : getDefaultPrivacy(locale);
  if (doc?.linkName || doc?.title) {
    return {
      linkName: doc.linkName || def.linkName,
      title: doc.title || def.title,
    };
  }
  return { linkName: def.linkName, title: def.title };
}

/** Restituisce il testo completo da admin se presente, altrimenti null (usa legal JSON) */
export function getLegalFullText(
  locale: string,
  type: "terms" | "privacy"
): string | null {
  const config = getLegalAdminConfig();
  const doc = config[locale]?.[type];
  if (doc?.fullText && doc.fullText.trim()) {
    return doc.fullText;
  }
  return null;
}
