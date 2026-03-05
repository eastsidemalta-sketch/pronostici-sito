#!/usr/bin/env node
/**
 * Aggiunge Netwin con siteId IT-0002 a data/bookmakers.json.
 * Per ripristinare il bookmaker rimosso per errore.
 * Eseguire sul server: node scripts/add-netwin-it0002.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CWD = process.cwd();
const ROOT = path.join(CWD, "data");
const STANDALONE = path.join(CWD, ".next", "standalone", "data");

const NETWIN_IT0002 = {
  id: "netwinit",
  siteId: "IT-0002",
  name: "Netwin",
  slug: "netwinit",
  country: "IT",
  countries: ["IT"],
  logoUrl: "/logos/netwin-it-2.png",
  faviconUrl: "/favicons/netwin-it.png",
  affiliateUrl: "https://m.netwin.it/redirect.aspx?mid=26&sid=6165&cid=&pid=&affid=3281",
  quoteButtonUrl: "https://m.netwin.it/redirect.aspx?mid=26&sid=6165&cid=&pid=&affid=3281",
  isActive: true,
  apiProvider: "direct",
  apiKey: "PLAYSIGNAL",
  apiBookmakerKey: "netwinit",
  apiConfig: { markets: ["h2h"] },
  apiEndpoint: "https://b2b.egamingsolutionsrl.it/WSSportFeed/get_eventi_psqf",
  apiAuthType: "header",
  apiRequestConfig: {
    method: "GET",
    queryParams: {
      system_code: "PLAYSIGNAL",
      type: "FULL",
      isLive: "0",
      codiceSito: "WINBET",
    },
  },
  apiMappingConfig: {
    eventsPath: "$",
    exalogic: true,
    homeTeam: "homeTeam",
    awayTeam: "awayTeam",
    odds1: "odds1",
    oddsX: "oddsX",
    odds2: "odds2",
    odds1Personalized: "quote_personalizzate.1",
    oddsXPersonalized: "quote_personalizzate.X",
    odds2Personalized: "quote_personalizzate.2",
  },
  countryConfig: {
    IT: {
      bonusDescription: "300€ di Bonus totale : 250€ subito + 50€ di real bonus sul primo deposito",
      links: [
        { url: "https://m.netwin.it/redirect.aspx?mid=26&sid=6165&cid=&pid=&affid=3281", useCase: "scommetti" },
        { url: "https://m.netwin.it/redirect.aspx?mid=26&sid=6165&cid=&pid=&affid=3281", useCase: "registrati" },
        { url: "https://m.netwin.it/redirect.aspx?mid=26&sid=6165&cid=&pid=&affid=3281", useCase: "bonus" },
        { url: "https://m.netwin.it/redirect.aspx?mid=26&sid=6165&cid=&pid=&affid=3281", useCase: "casino" },
        { url: "https://m.netwin.it/redirect.aspx?mid=26&sid=6165&cid=&pid=&affid=3281", useCase: "sport" },
      ],
    },
  },
};

function addToFile(dataPath) {
  let bookmakers = [];
  if (existsSync(dataPath)) {
    const raw = readFileSync(dataPath, "utf-8");
    bookmakers = JSON.parse(raw);
  }
  const exists = bookmakers.some((b) => (b.siteId || "").toUpperCase() === "IT-0002");
  if (exists) {
    console.log(`IT-0002 già presente in ${dataPath}`);
    return;
  }
  bookmakers.push(NETWIN_IT0002);
  const dir = path.dirname(dataPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(dataPath, JSON.stringify(bookmakers, null, 2));
  console.log(`Aggiunto Netwin IT-0002 a ${dataPath}`);
}

addToFile(path.join(ROOT, "bookmakers.json"));
addToFile(path.join(STANDALONE, "bookmakers.json"));
