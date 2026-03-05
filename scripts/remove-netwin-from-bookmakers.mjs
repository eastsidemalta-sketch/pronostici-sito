#!/usr/bin/env node
/**
 * Rimuove Netwin (IT-002) da data/bookmakers.json.
 * Eseguire sul server: node scripts/remove-netwin-from-bookmakers.mjs
 * Oppure dalla root progetto: node scripts/remove-netwin-from-bookmakers.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CWD = process.cwd();
const ROOT = path.join(CWD, "data");
const STANDALONE = path.join(CWD, ".next", "standalone", "data");
const DATA_FILES = [
  path.join(ROOT, "bookmakers.json"),
  path.join(STANDALONE, "bookmakers.json"),
];

/** Rimuove solo il cliente IT-002 (Netwin da clientProfiles), non altri bookmaker con "netwin" nel nome */
function isNetwinIT002(b) {
  const siteId = (b.siteId || "").toUpperCase();
  return siteId === "IT-002";
}

for (const dataPath of DATA_FILES) {
  if (!existsSync(dataPath)) continue;
  try {
    const raw = readFileSync(dataPath, "utf-8");
    const bookmakers = JSON.parse(raw);
    const before = bookmakers.length;
    const filtered = bookmakers.filter((b) => !isNetwinIT002(b));
    const removed = before - filtered.length;
    if (removed > 0) {
      writeFileSync(dataPath, JSON.stringify(filtered, null, 2));
      console.log(`Rimosso Netwin da ${dataPath} (${removed} entry)`);
    } else {
      console.log(`Nessun Netwin trovato in ${dataPath}`);
    }
  } catch (err) {
    console.error(`Errore su ${dataPath}:`, err.message);
  }
}
