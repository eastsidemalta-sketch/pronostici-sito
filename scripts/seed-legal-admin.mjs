#!/usr/bin/env node
/**
 * Genera data/legal.json con tutti i testi dai file legal-*.json (formato testo normale)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const LEGAL_DIR = path.join(ROOT, "messages");
const DATA_DIR = path.join(ROOT, "data");
const OUTPUT = path.join(DATA_DIR, "legal.json");

const LOCALES = ["it", "fr", "es", "de", "en", "pt-BR", "en-NG", "en-KE", "en-GH"];
const LEGAL_FILES = {
  it: "legal-it",
  "pt-BR": "legal-pt-BR",
  en: "legal-en",
  "en-NG": "legal-en-NG",
  "en-KE": "legal-en-KE",
  "en-GH": "legal-en-GH",
  fr: "legal-en",
  es: "legal-en",
  de: "legal-en",
};

function buildTermsText(L) {
  return [
    L.termsLastUpdate,
    "",
    L.termsIntro1,
    "",
    L.termsIntro2,
    "",
    L.termsIntro3,
    "",
    L.termsIntro4,
    "",
    L.termsS1Title,
    L.termsS1P1,
    L.termsS1P2,
    "",
    L.termsS2Title,
    L.termsS2P1,
    "",
    L.termsS3Title,
    L.termsS3P1,
    L.termsS3P2,
    "",
    L.termsS4Title,
    L.termsS4P1,
    "",
    L.termsS5Title,
    L.termsS5P1,
    "",
    L.termsS6Title,
    L.termsS6P1,
    "",
    L.termsS7Title,
    L.termsS7P1,
    "",
    L.termsS8Title,
    L.termsS8P1,
    "",
    L.termsS9Title,
    L.termsS9P1,
    "",
    L.termsFooter,
  ].join("\n");
}

function buildPrivacyText(L) {
  return [
    L.privacyLastUpdate,
    "",
    L.privacyIntro1,
    "",
    L.privacyIntro2,
    "",
    L.privacyIntro3,
    "",
    L.privacyS1Title,
    L.privacyS1aTitle,
    L.privacyS1aP1,
    "",
    L.privacyS1bTitle,
    L.privacyS1bP1,
    "",
    L.privacyS2Title,
    L.privacyS2P1,
    "",
    "- " + L.privacyS2Essential,
    "- " + L.privacyS2Analytics,
    "- " + L.privacyS2Marketing,
    "",
    L.privacyS2P2,
    "",
    L.privacyS3Title,
    L.privacyS3P1,
    "",
    L.privacyS4Title,
    L.privacyS4P1,
    "",
    L.privacyS5Title,
    L.privacyS5P1,
    "",
    "- " + L.privacyS5Access,
    "- " + L.privacyS5Rectify,
    "- " + L.privacyS5Delete,
    "- " + L.privacyS5Limit,
    "- " + L.privacyS5Portability,
    "- " + L.privacyS5Oppose,
    "- " + L.privacyS5Revoke,
    "- " + L.privacyS5Complaint,
    "",
    L.privacyS5P2,
    "",
    L.privacyS6Title,
    L.privacyS6P1,
    "",
    L.privacyS7Title,
    L.privacyS7P1,
    "",
    L.privacyS8Title,
    L.privacyS8P1,
    "",
    L.privacyFooterP1,
    "",
    L.privacyFooter,
  ].join("\n");
}

function loadLegal(locale) {
  const file = LEGAL_FILES[locale];
  const filepath = path.join(LEGAL_DIR, `${file}.json`);
  const raw = readFileSync(filepath, "utf-8");
  return JSON.parse(raw);
}

const config = {};

for (const locale of LOCALES) {
  const L = loadLegal(locale);
  config[locale] = {
    terms: {
      linkName: L.termsTitle,
      title: L.termsTitle,
      fullText: buildTermsText(L),
    },
    privacy: {
      linkName: L.privacyTitle,
      title: L.privacyTitle,
      fullText: buildPrivacyText(L),
    },
  };
}

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(config, null, 2));
console.log("Scritto:", OUTPUT);
