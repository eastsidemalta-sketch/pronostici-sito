#!/usr/bin/env node
/**
 * Applica la scheda cliente (data/clientProfiles.json) al bookmaker Netwin_IT.
 * Eseguire sul server dopo deploy: node scripts/apply-netwin-config.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOKMAKERS_PATH = path.join(process.cwd(), "data", "bookmakers.json");
const PROFILES_PATH = path.join(process.cwd(), "data", "clientProfiles.json");
const USE_CASES = ["scommetti", "registrati", "bonus", "casino", "sport"];

function main() {
  if (!existsSync(PROFILES_PATH)) {
    console.error("data/clientProfiles.json non trovato (scheda cliente)");
    process.exit(1);
  }

  const profile = JSON.parse(readFileSync(PROFILES_PATH, "utf-8"))["IT-0002"];
  if (!profile) {
    console.error("Scheda cliente IT-0002 non trovata in clientProfiles.json");
    process.exit(1);
  }

  if (!existsSync(BOOKMAKERS_PATH)) {
    console.error("data/bookmakers.json non trovato. Crea prima Netwin_IT dall'admin.");
    process.exit(1);
  }

  const raw = readFileSync(BOOKMAKERS_PATH, "utf-8");
  const bookmakers = JSON.parse(raw);

  const idx = bookmakers.findIndex(
    (b) =>
      b.siteId === "IT-0002" ||
      (b.id && b.id.toLowerCase().includes("netwin"))
  );

  if (idx < 0) {
    console.error("Netwin_IT (IT-0002) non trovato in bookmakers.json");
    process.exit(1);
  }

  const bm = bookmakers[idx];
  const id = bm.id;

  // Attivo sul sito (non in pausa)
  bm.isActive = true;

  // URL per tutti i link e bottoni (dalla scheda cliente)
  bm.affiliateUrl = profile.affiliateUrl;
  bm.quoteButtonUrl = profile.affiliateUrl;
  bm.countryConfig = bm.countryConfig || {};
  bm.countryConfig.IT = bm.countryConfig.IT || { links: [] };
  bm.countryConfig.IT.links = USE_CASES.map((uc) => ({ url: profile.affiliateUrl, useCase: uc }));
  bm.countryConfig.IT.bonusDescription = profile.bonusDescription;

  // Logo e favicon (dalla scheda cliente)
  if (!bm.logoUrl || bm.logoUrl === "") {
    bm.logoUrl = profile.logoPath || `/logos/${id}.png`;
  }
  if (!bm.faviconUrl) {
    bm.faviconUrl = profile.faviconPath || `/favicons/${id}.png`;
  }

  // Config API (dalla scheda cliente)
  if (profile.api?.enabled) {
    const api = profile.api;
    bm.apiProvider = "direct";
    bm.apiEndpoint = api.endpoint;
    bm.apiDocumentationUrl = api.documentationUrl;
    bm.apiKey = api.params?.system_code || "";
    bm.apiAuthType = "header";
    bm.apiRequestConfig = {
      method: api.method || "GET",
      queryParams: { ...api.params },
    };
    bm.apiMappingConfig = profile.api.mapping || bm.apiMappingConfig || {
      eventsPath: "$",
      homeTeam: "homeTeam",
      awayTeam: "awayTeam",
      odds1: "odds1",
      oddsX: "oddsX",
      odds2: "odds2",
      odds1Personalized: "quote_personalizzate.1",
      oddsXPersonalized: "quote_personalizzate.X",
      odds2Personalized: "quote_personalizzate.2",
    };
  }

  bookmakers[idx] = bm;
  writeFileSync(BOOKMAKERS_PATH, JSON.stringify(bookmakers, null, 2));
  console.log(`Netwin_IT (${id}) configurato dalla scheda cliente IT-0002`);
}

main();
