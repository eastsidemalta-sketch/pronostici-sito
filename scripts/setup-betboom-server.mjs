#!/usr/bin/env node
/**
 * Configura Betboom in data/bookmakers.json con API completa.
 * Esegui sul server: BETBOOM_API_KEY='xxx' node scripts/setup-betboom-server.mjs
 * Oppure: node scripts/setup-betboom-server.mjs
 * (legge BETBOOM_API_KEY da .env.local nella stessa cartella)
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataPath = path.join(root, "data", "bookmakers.json");

const apiKey = process.env.BETBOOM_API_KEY;
if (!apiKey) {
  console.error("BETBOOM_API_KEY mancante. Impostala: export BETBOOM_API_KEY='...'");
  process.exit(1);
}

const betboomConfig = {
  id: "betboom",
  siteId: "BR-0001",
  name: "Betboom",
  slug: "betboom",
  country: "BR",
  countries: ["BR"],
  logoUrl: "/logos/betboom.png",
  faviconUrl: "/favicons/betboom.png",
  affiliateUrl: "https://click.betboom.com/0p7o0R0n",
  isActive: true,
  apiProvider: "direct",
  apiKey,
  apiBookmakerKey: "betboom",
  apiConfig: { markets: ["h2h"] },
  apiAuthType: "bearer",
  apiEndpoint: "https://com-br-partner-feed.sporthub.bet/api/partner_feed/v1",
  apiRequestConfig: {
    method: "GET",
    queryParams: { partner_id: "7557" },
  },
  apiMappingConfig: {
    eventsPath: "$.data",
    homeTeam: "homeTeam",
    awayTeam: "awayTeam",
    odds1: "odds1",
    oddsX: "oddsX",
    odds2: "odds2",
  },
  countryConfig: {
    BR: {
      bonusDescription: "Bônus de boas-vindas para novos apostadores. Cadastre-se e aproveite as melhores odds em futebol, esportes e apostas ao vivo.",
      links: [
        { url: "https://click.betboom.com/0p7o0R0n", useCase: "scommetti" },
        { url: "https://click.betboom.com/0p7o0R0n", useCase: "registrati" },
        { url: "https://click.betboom.com/0p7o0R0n", useCase: "bonus" },
      ],
    },
  },
};

if (!existsSync(dataPath)) {
  console.error("data/bookmakers.json non trovato");
  process.exit(1);
}

const list = JSON.parse(readFileSync(dataPath, "utf-8"));
const idx = list.findIndex((b) => b.siteId === "BR-0001" || b.id === "betboom");
if (idx >= 0) {
  list[idx] = betboomConfig;
} else {
  list.push(betboomConfig);
}
writeFileSync(dataPath, JSON.stringify(list, null, 2));
console.log("Betboom configurato con API. Riavvia: pm2 restart pronostici-test --update-env");
