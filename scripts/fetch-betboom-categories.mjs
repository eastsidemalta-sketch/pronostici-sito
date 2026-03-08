#!/usr/bin/env node
/**
 * Fetch Betboom categories (football) per verificare ID La Liga (140) e Liga Portugal (94).
 * Esegui sul server (IP whitelist): node scripts/fetch-betboom-categories.mjs
 * Oppure: GET /api/debug-betboom-categories (mostra laLigaHint e ligaPortugalHint)
 */
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^BETBOOM_API_KEY=(.+)$/);
    if (m) process.env.BETBOOM_API_KEY = m[1].trim().replace(/^["']|["']$/g, "");
  }
}
let apiKey = process.env.BETBOOM_API_KEY;
if (!apiKey) {
  const bm = JSON.parse(readFileSync(join(__dirname, "..", "data", "bookmakers.json"), "utf-8"));
  const b = bm.find((x) => x.id === "betboom");
  if (b?.apiKey) apiKey = b.apiKey;
}
if (!apiKey) {
  console.error("BETBOOM_API_KEY mancante");
  process.exit(1);
}

const res = await fetch("https://com-br-partner-feed.sporthub.bet/api/partner_feed/v1/categories/get_by_sport_ids", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-access-token": apiKey,
    "x-partner": process.env.BETBOOM_PARTNER_ID ?? "id_7557",
  },
  body: JSON.stringify({ locale: "en", sport_ids: [2] }),
});
const data = await res.json();
if (!res.ok) {
  console.error("Errore:", data);
  process.exit(1);
}
const cats = data.categories ?? [];
const laLiga = cats.filter((c) => /la liga|spain|spagna|españa|primera/i.test(c.name));
const ligaPt = cats.filter((c) => /portugal|primeira|liga portugal/i.test(c.name));
console.log("La Liga (apiLeagueMapping 140):", laLiga.length ? laLiga.map((c) => `${c.id}: ${c.name}`) : "non trovata");
console.log("Liga Portugal (apiLeagueMapping 94):", ligaPt.length ? ligaPt.map((c) => `${c.id}: ${c.name}`) : "non trovata");
console.log("\nTutte:", cats.map((c) => `${c.id}: ${c.name}`).join("\n"));
