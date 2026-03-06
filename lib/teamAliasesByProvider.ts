/**
 * Mapping per-provider: API Football → nome usato dal provider.
 * Formato: { providerKey: { apiFootballName: providerName | providerName[] } }
 *
 * Esempio: { "netwinit": { "Inter": "FC Internazionale", "Napoli": "Napoli" } }
 * Se il provider usa lo stesso nome di API Football, puoi omettere la voce.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "teamAliasesByProvider.json");
const ALIASES_PATH = path.join(process.cwd(), "data", "teamAliases.json");

function getTeamAliases(): Record<string, string[]> {
  try {
    if (existsSync(ALIASES_PATH)) {
      return (JSON.parse(readFileSync(ALIASES_PATH, "utf-8")) as Record<string, string[]>) ?? {};
    }
  } catch {
    // fallback
  }
  return {};
}

export type ProviderMapping = Record<string, string | string[]>;
export type TeamAliasesByProviderConfig = Record<string, ProviderMapping>;

function load(): TeamAliasesByProviderConfig {
  try {
    if (existsSync(DATA_PATH)) {
      const raw = readFileSync(DATA_PATH, "utf-8");
      return (JSON.parse(raw) as TeamAliasesByProviderConfig) ?? {};
    }
  } catch {
    // fallback
  }
  return {};
}

export function getTeamAliasesByProvider(): TeamAliasesByProviderConfig {
  return load();
}

export function saveTeamAliasesByProvider(config: TeamAliasesByProviderConfig): void {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(config, null, 2));
}

/** Varianti accettate per un nome API Football quando si matcha contro un provider */
export function getAcceptedNamesForProvider(
  apiFootballName: string,
  providerKey: string
): Set<string> {
  const providerKeyNorm = providerKey.toLowerCase().trim();
  const base = apiFootballName.toLowerCase().trim();
  const result = new Set<string>([base]);

  // 1. Alias generici (teamAliases.json)
  const aliases = getTeamAliases();
  for (const [canonical, variants] of Object.entries(aliases)) {
    const all = [canonical.toLowerCase(), ...variants.map((v) => v.toLowerCase())];
    if (all.some((v) => v === base || base.includes(v) || v.includes(base))) {
      all.forEach((x) => result.add(x));
    }
  }

  // 2. Mapping specifico per provider
  const byProvider = load();
  const providerMap: ProviderMapping | undefined =
    byProvider[providerKeyNorm] ??
    byProvider[providerKey] ??
    (Object.entries(byProvider).find(([k]) => k.toLowerCase() === providerKeyNorm)?.[1] as ProviderMapping | undefined);
  if (providerMap && typeof providerMap === "object") {
    const val = providerMap[apiFootballName];
    if (val) {
      const arr = Array.isArray(val) ? val : [val];
      arr.forEach((v) => result.add(v.toLowerCase().trim()));
    }
    // Anche per varianti già in result
    for (const r of Array.from(result)) {
      const val2 = providerMap[r];
      if (val2) {
        const arr = Array.isArray(val2) ? val2 : [val2];
        arr.forEach((v) => result.add(v.toLowerCase().trim()));
      }
    }
  }

  return result;
}

/** Verifica se providerName matcha apiFootballName per il provider */
export function matchTeamNamesForProvider(
  providerName: string,
  apiFootballName: string,
  providerKey: string
): boolean {
  if (!providerName || !apiFootballName) return false;
  const pNorm = providerName.toLowerCase().trim();
  const accepted = getAcceptedNamesForProvider(apiFootballName, providerKey);
  if (accepted.has(pNorm)) return true;
  for (const a of accepted) {
    if (pNorm === a || pNorm.includes(a) || a.includes(pNorm)) return true;
  }
  return false;
}
