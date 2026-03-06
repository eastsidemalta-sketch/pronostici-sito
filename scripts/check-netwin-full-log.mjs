#!/usr/bin/env node
/**
 * Mostra i tentativi FULL Netwin (successi e errori) da data/.netwin-full.log.
 * Retention automatica: 7 giorni.
 *
 * Uso:
 *   node scripts/check-netwin-full-log.mjs              # tutte le FULL nel log
 *   node scripts/check-netwin-full-log.mjs --hours 12    # ultime 12 ore
 *   node scripts/check-netwin-full-log.mjs --hours 24    # ultime 24 ore
 *
 * Sul server: cd /var/www/pronostici-sito && node scripts/check-netwin-full-log.mjs --hours 24
 * Prossima FULL: https://playsignal.io/api/debug-netwin-cache (campo nextFullAllowedIso)
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// L'app PM2 scrive in .next/standalone/data/ (cwd = standalone). Lo script può essere in project root.
const CANDIDATES = [
  path.join(ROOT, ".next", "standalone", "data", ".netwin-full.log"),
  path.join(ROOT, "data", ".netwin-full.log"),
];
const LOG_FILE = CANDIDATES.find((p) => existsSync(p)) ?? CANDIDATES[0];

const args = process.argv.slice(2);
const hoursIdx = args.indexOf("--hours");
const hours = hoursIdx >= 0 && args[hoursIdx + 1] ? parseInt(args[hoursIdx + 1], 10) : null;

if (!existsSync(LOG_FILE)) {
  console.log("Nessun log FULL trovato. Percorsi controllati:");
  CANDIDATES.forEach((p) => console.log("  -", p));
  console.log("Il file viene creato quando una FULL Netwin viene tentata (successo o errore).");
  process.exit(0);
}

const now = Date.now();
// Log usato (per debug)
if (process.env.DEBUG) console.log("Log letto da:", LOG_FILE);
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
  console.log(hours ? `Nessun tentativo FULL nelle ultime ${hours} ore.` : "Nessun tentativo FULL nel log.");
  process.exit(0);
}

const successCount = entries.filter((e) => e.success).length;
const errorCount = entries.filter((e) => !e.success).length;

console.log(`\n=== FULL Netwin (ultime ${hours || "tutte"} ore) ===\n`);
console.log(`  Successi: ${successCount}  |  Errori: ${errorCount}  |  Totale: ${entries.length}\n`);

// Tabella: Chiamata API | URL API | Buon fine | Errore (tutti) | Timestamp
const API_LABEL = "Netwin FULL";
const col1 = 14; // Chiamata API
const col2 = 60; // URL API
const col3 = 18; // Buon fine
const col4 = 60; // Errore (summary + raw Netwin)
const col5 = 25; // Timestamp

const pad = (s, n) => String(s ?? "").slice(0, n).padEnd(n);
const sep = `|${"-".repeat(col1 + 2)}|${"-".repeat(col2 + 2)}|${"-".repeat(col3 + 2)}|${"-".repeat(col4 + 2)}|${"-".repeat(col5 + 2)}|`;

console.log(`| ${pad("Chiamata API", col1)} | ${pad("URL API", col2)} | ${pad("Buon fine", col3)} | ${pad("Errore", col4)} | ${pad("Timestamp", col5)} |`);
console.log(sep);

for (const e of entries) {
  const buonFine = e.success ? "Sì" : "No";
  const dettaglio = e.success && e.h2hCount != null ? ` (${e.h2hCount} partite)` : "";
  const col3Val = buonFine + dettaglio;
  const errSummary = e.success ? "" : (e.error || "?");
  const errDisplay = e.errorRaw ? `${errSummary} | ${e.errorRaw}` : errSummary;
  const url = e.url || "";
  const ts = e.iso || new Date(e.timestamp).toISOString();
  console.log(`| ${pad(API_LABEL, col1)} | ${pad(url, col2)} | ${pad(col3Val, col3)} | ${pad(errDisplay, col4)} | ${pad(ts, col5)} |`);
}

console.log(sep);

// Dettaglio errori completi (raw Netwin) per ogni fallimento
const errorEntries = entries.filter((e) => !e.success && (e.error || e.errorRaw));
if (errorEntries.length > 0) {
  console.log("\n--- Risposta completa Netwin (errori) ---\n");
  for (let i = 0; i < errorEntries.length; i++) {
    const e = errorEntries[i];
    console.log(`[${i + 1}] ${e.iso} - ${e.error || "?"}`);
    if (e.errorRaw) console.log(`    Raw: ${e.errorRaw}\n`);
  }
}
console.log("\nPer verificare nei log PM2: cerca '[Netwin] FULL OK' o '[Netwin] FULL fallita'");
console.log("  pm2 logs pronostici --lines 500 | grep 'Netwin'");
console.log("  pm2 logs pronostici-test --lines 500 | grep 'Netwin'\n");
