/**
 * Legge il report matching e restituisce se ci sono alert da mostrare.
 */
import { existsSync, readFileSync } from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "matchingReport.json");

export type MatchingAlert = {
  hasAlerts: boolean;
  unmatchedCount: number;
  teamSuggestionsCount: number;
  leagueSuggestionsCount: number;
  errorsCount: number;
  lastRun: string | null;
  message: string;
};

export function getMatchingReportAlerts(): MatchingAlert {
  const empty: MatchingAlert = {
    hasAlerts: false,
    unmatchedCount: 0,
    teamSuggestionsCount: 0,
    leagueSuggestionsCount: 0,
    errorsCount: 0,
    lastRun: null,
    message: "",
  };

  try {
    if (!existsSync(DATA_PATH)) return empty;

    const raw = readFileSync(DATA_PATH, "utf-8");
    const report = JSON.parse(raw) as {
      lastRun?: string;
      summary?: { totalUnmatched?: number };
      unmatched?: unknown[];
      teamSuggestions?: unknown[];
      leagueSuggestions?: unknown[];
      byBookmaker?: Record<string, { errors?: string[] }>;
    };

    const unmatchedCount = report.unmatched?.length ?? report.summary?.totalUnmatched ?? 0;
    const teamSuggestionsCount = report.teamSuggestions?.length ?? 0;
    const leagueSuggestionsCount = report.leagueSuggestions?.length ?? 0;

    let errorsCount = 0;
    for (const bm of Object.values(report.byBookmaker ?? {})) {
      errorsCount += (bm.errors ?? []).length;
    }

    const hasAlerts =
      unmatchedCount > 0 ||
      teamSuggestionsCount > 0 ||
      leagueSuggestionsCount > 0 ||
      errorsCount > 0;

    const parts: string[] = [];
    if (unmatchedCount > 0) parts.push(`${unmatchedCount} non matchati`);
    if (teamSuggestionsCount > 0) parts.push(`${teamSuggestionsCount} alias da applicare`);
    if (leagueSuggestionsCount > 0) parts.push(`${leagueSuggestionsCount} mapping leghe`);
    if (errorsCount > 0) parts.push(`${errorsCount} errori API`);

    return {
      hasAlerts,
      unmatchedCount,
      teamSuggestionsCount,
      leagueSuggestionsCount,
      errorsCount,
      lastRun: report.lastRun ?? null,
      message: parts.join(" · "),
    };
  } catch {
    return empty;
  }
}
