#!/usr/bin/env node
/**
 * Mostra le FULL Netwin andate a buon fine (da data/.netwin-full-success.log).
 *
 * Uso:
 *   node scripts/check-netwin-full-log.mjs              # tutte le FULL nel log
 *   node scripts/check-netwin-full-log.mjs --hours 12    # ultime 12 ore
 *   node scripts/check-netwin-full-log.mjs --hours 24    # ultime 24 ore
 *
 * Sul server (dopo 12h): cd /var/www/pronostici-sito && node scripts/check-netwin-full-log.mjs --hours 12
 * Prossima FULL: https://playsignal.io/api/debug-netwin-cache (campo nextFullAllowedIso)
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const LOG_FILE = path.join(ROOT, "data", ".netwin-full-success.log");

const args = process.argv.slice(2);
const hoursIdx = args.indexOf("--hours");
const hours = hoursIdx >= 0 && args[hoursIdx + 1] ? parseInt(args[hoursIdx + 1], 10) : null;

if (!existsSync(LOG_FILE)) {
  console.log("Nessun log FULL trovato:", LOG_FILE);
  console.log("Il file viene creato quando una FULL Netwin va a buon fine.");
  process.exit(0);
}

const now = Date.now();
const cutoff = hours ? now - hours * 60 * 60 * 1000 : 0;

const raw = readFileSync(LOG_FILE, "utf-8");
const lines = raw.trim().split("\n").filter(Boolean);
const entries = [];

for (const line of lines) {
  try {
    const e = JSON.parse(line);
    if (e.timestamp && (cutoff === 0 || e.timestamp >= cutoff)) {
      entries.push(e);
    }
  } catch {
    // skip invalid lines
  }
}

if (entries.length === 0) {
  console.log(hours ? `Nessuna FULL nelle ultime ${hours} ore.` : "Nessuna FULL nel log.");
  process.exit(0);
}

console.log(`\n=== FULL Netwin andate a buon fine (${entries.length} totali) ===\n`);
if (hours) {
  console.log(`(ultime ${hours} ore)\n`);
}

for (const e of entries) {
  console.log(`  ${e.iso}  h2h: ${e.h2hCount} partite`);
}

console.log("\nPer verificare nei log PM2: cerca '[Netwin] FULL OK:'");
console.log("  pm2 logs pronostici --lines 500 | grep 'FULL OK'");
console.log("  pm2 logs pronostici-test --lines 500 | grep 'FULL OK'\n");
