import { existsSync, readFileSync } from "fs";
import path from "path";

const ALIASES_PATH = path.join(process.cwd(), "data", "teamAliases.json");
const API_IDS_PATH = path.join(process.cwd(), "data", "teamApiIds.json");

type CanonicalAliases = Record<string, string[]>;

let normalizedToId: Map<string, number> | null = null;

function isFlatAliasToId(obj: unknown): obj is Record<string, number> {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const entries = Object.entries(obj as Record<string, unknown>);
  if (entries.length === 0) return false;
  return entries.every(([, v]) => typeof v === "number");
}

function loadNormalizedToId(): Map<string, number> {
  const map = new Map<string, number>();

  if (!existsSync(ALIASES_PATH)) {
    console.error(
      "[TeamMatcher] Missing data/teamAliases.json — cannot resolve team IDs."
    );
    return map;
  }

  let apiIds: Record<string, number> = {};
  if (existsSync(API_IDS_PATH)) {
    try {
      const rawIds = readFileSync(API_IDS_PATH, "utf-8");
      const parsed = JSON.parse(rawIds) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        apiIds = parsed as Record<string, number>;
      }
    } catch (err) {
      console.error("[TeamMatcher] Could not parse teamApiIds.json:", err);
    }
  }

  try {
    const raw = readFileSync(ALIASES_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;

    if (isFlatAliasToId(parsed)) {
      for (const [alias, id] of Object.entries(parsed)) {
        map.set(normalizeString(alias), id);
      }
      return map;
    }

    const aliases = parsed as CanonicalAliases;
    for (const [canonical, variants] of Object.entries(aliases)) {
      const id = apiIds[canonical];
      if (typeof id !== "number") continue;
      const names = [canonical, ...(Array.isArray(variants) ? variants : [])];
      for (const name of names) {
        map.set(normalizeString(name), id);
      }
    }
  } catch (err) {
    console.error("[TeamMatcher] Could not load teamAliases.json:", err);
  }

  return map;
}

function getMap(): Map<string, number> {
  if (!normalizedToId) normalizedToId = loadNormalizedToId();
  return normalizedToId;
}

/** Lowercase and strip non-alphanumeric characters for fuzzy key matching. */
export function normalizeString(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * API-Football team id for a bookmaker-side name, using data/teamAliases.json.
 * With the repo’s canonical→aliases JSON, add ids in data/teamApiIds.json (canonical → id).
 * Alternatively, use a flat teamAliases.json: { "alias": id, ... }.
 */
export function getUniversalTeamId(bookmakerTeamName: string): number | null {
  const id = getMap().get(normalizeString(bookmakerTeamName));
  return id ?? null;
}

/** Reload alias and id files (e.g. after deploy or hot config change). */
export function reloadTeamMatcher(): void {
  normalizedToId = null;
}
