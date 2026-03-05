#!/usr/bin/env node
/**
 * Aggiunge Betboom a data/bookmakers.json se non presente.
 * Esegui sul server: node scripts/add-betboom-to-bookmakers.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "..", "data", "bookmakers.json");

const BETBOOM = {
  id: "betboom",
  siteId: "BR-0001",
  name: "Betboom",
  slug: "betboom",
  country: "BR",
  countries: ["BR"],
  logoUrl: "/logos/betboom.png",
  faviconUrl: "/favicons/betboom.png",
  affiliateUrl: "https://click.betboom.com/0p7o0R0n",
  isActive: false,
  apiProvider: "direct",
  apiKey: "",
  apiBookmakerKey: "betboom",
  apiConfig: { markets: ["h2h"] },
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

if (!existsSync(DATA_PATH)) {
  console.log("data/bookmakers.json non trovato. Usa i default da bookmakersData.ts.");
  process.exit(0);
}

const raw = readFileSync(DATA_PATH, "utf-8");
const list = JSON.parse(raw);

if (list.some((b) => b.siteId === "BR-0001" || b.id === "betboom")) {
  console.log("Betboom già presente in bookmakers.json");
  process.exit(0);
}

list.push(BETBOOM);
writeFileSync(DATA_PATH, JSON.stringify(list, null, 2));
console.log("Betboom aggiunto a bookmakers.json. Riavvia: pm2 restart all --update-env");
console.log("La config API (endpoint, chiave) viene applicata da clientProfiles.json (BR-0001).");
