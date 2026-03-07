/**
 * Log unificato delle chiamate API esterne. Retention 7 giorni.
 * Usato per monitoraggio: Netwin, API Football, Betboom, ecc.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from "fs";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "data", ".api-calls.log");
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 giorni

export type ApiCallEntry = {
  timestamp: number;
  iso: string;
  provider: string;
  type: string;
  success: boolean;
  durationMs?: number;
  count?: number;
  error?: string;
  errorPreview?: string;
};

export function logApiCall(
  provider: string,
  type: string,
  success: boolean,
  details?: { durationMs?: number; count?: number; error?: string }
): void {
  try {
    const dir = path.dirname(LOG_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const timestamp = Date.now();
    const entry: ApiCallEntry = {
      timestamp,
      iso: new Date(timestamp).toISOString(),
      provider,
      type,
      success,
      ...(details?.durationMs != null && { durationMs: details.durationMs }),
      ...(details?.count != null && { count: details.count }),
      ...(details?.error && { error: details.error, errorPreview: details.error.slice(0, 200) }),
    };
    appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n", "utf-8");
    trimToRetention();
  } catch {
    // ignora errori di log
  }
}

function trimToRetention(): void {
  try {
    if (!existsSync(LOG_FILE)) return;
    const raw = readFileSync(LOG_FILE, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    const cutoff = Date.now() - RETENTION_MS;
    const kept = lines.filter((line) => {
      try {
        const e = JSON.parse(line) as ApiCallEntry;
        return e.timestamp >= cutoff;
      } catch {
        return true;
      }
    });
    if (kept.length < lines.length) {
      writeFileSync(LOG_FILE, kept.join("\n") + (kept.length ? "\n" : ""), "utf-8");
    }
  } catch {
    // ignora
  }
}

/** Legge le ultime N ore dal log. Cerca in data/ e .next/standalone/data/ */
export function readApiCallLog(hours = 24): ApiCallEntry[] {
  const candidates = [
    path.join(process.cwd(), "data", ".api-calls.log"),
    path.join(process.cwd(), ".next", "standalone", "data", ".api-calls.log"),
    path.join(process.cwd(), "..", "data", ".api-calls.log"),
  ];
  const logPath = candidates.find((p) => existsSync(p));
  if (!logPath || !existsSync(logPath)) return [];

  try {
    const raw = readFileSync(logPath, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const entries: ApiCallEntry[] = [];
    for (const line of lines) {
      try {
        const e = JSON.parse(line) as ApiCallEntry;
        if (e.timestamp >= cutoff) entries.push(e);
      } catch {
        // skip
      }
    }
    return entries.reverse(); // più recenti prima
  } catch {
    return [];
  }
}

/** Legge anche il log Netwin FULL (stesso formato concettuale) e lo unisce */
export function readNetwinFullLog(hours = 24): Array<{ timestamp: number; iso: string; provider: string; type: string; success: boolean; h2hCount?: number; eventsExtracted?: number; error?: string }> {
  const candidates = [
    path.join(process.cwd(), "data", ".netwin-full.log"),
    path.join(process.cwd(), ".next", "standalone", "data", ".netwin-full.log"),
  ];
  const logPath = candidates.find((p) => existsSync(p));
  if (!logPath || !existsSync(logPath)) return [];

  try {
    const raw = readFileSync(logPath, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const entries: Array<{ timestamp: number; iso: string; provider: string; type: string; success: boolean; h2hCount?: number; eventsExtracted?: number; error?: string }> = [];
    for (const line of lines) {
      try {
        const e = JSON.parse(line) as { timestamp?: number; iso?: string; success?: boolean; h2hCount?: number; eventsExtracted?: number; error?: string };
        if (e.timestamp && e.timestamp >= cutoff) {
          entries.push({
            timestamp: e.timestamp,
            iso: e.iso ?? new Date(e.timestamp).toISOString(),
            provider: "Netwin",
            type: "FULL",
            success: e.success ?? false,
            h2hCount: e.h2hCount,
            eventsExtracted: e.eventsExtracted,
            error: e.error,
          });
        }
      } catch {
        // skip
      }
    }
    return entries.reverse();
  } catch {
    return [];
  }
}
