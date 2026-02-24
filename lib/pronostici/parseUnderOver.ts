/**
 * Parsing del campo under_over dalle predizioni API-Football.
 * L'API può restituire:
 * - stringa: "2.5", "-2.5", "3.5", "-3.5" (prefisso - = Under)
 * - oggetto: { "2.5": "Over"|"Under", "3.5": "Over"|"Under", ... }
 *
 * Regola: se 2.5 e 3.5 sono entrambi Under, NON mostrare mai Over 1.5
 * (sarebbe incoerente). Preferiamo sempre la soglia 2.5 come mercato principale.
 */

export type UnderOverResult =
  | { type: "over"; threshold: string }
  | { type: "under"; threshold: string }
  | null;

/** Soglie valide ordinate per priorità (2.5 è il mercato principale) */
const PREFERRED_THRESHOLDS = ["2.5", "3.5", "1.5", "4.5", "0.5", "5.5"];

function parseValue(val: unknown): "over" | "under" | null {
  if (val == null) return null;
  const s = String(val).trim().toLowerCase();
  if (s === "over") return "over";
  if (s === "under") return "under";
  if (s.startsWith("-")) return "under";
  if (s.startsWith("+") || /^[\d.]/.test(s)) return "over";
  return null;
}

function extractThreshold(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).replace(/^[-+]/, "").trim();
  const num = parseFloat(s.replace(",", "."));
  if (!isNaN(num) && num > 0) return String(num);
  return null;
}

/**
 * Estrae il consiglio Under/Over dalle predizioni API.
 * Gestisce sia stringhe ("-2.5", "2.5") che oggetti con più soglie.
 * Priorità: 2.5 > 3.5 > altre. Se 2.5 e 3.5 sono Under, non restituire Over 1.5.
 */
export function parseUnderOverFromApi(apiUnderOver: unknown): UnderOverResult | null {
  if (apiUnderOver == null) return null;

  // Caso 1: stringa semplice "-2.5", "2.5", "3.5", "-3.5"
  if (typeof apiUnderOver === "string") {
    const trimmed = apiUnderOver.trim();
    if (!trimmed) return null;
    const isUnder = trimmed.startsWith("-");
    const threshold = extractThreshold(trimmed) ?? trimmed.replace(/^[-+]/, "");
    if (!threshold) return null;
    return isUnder
      ? { type: "under", threshold }
      : { type: "over", threshold };
  }

  // Caso 2: oggetto { "2.5": "Over"|"Under", "3.5": "Over"|"Under", ... }
  if (typeof apiUnderOver === "object" && !Array.isArray(apiUnderOver)) {
    const obj = apiUnderOver as Record<string, unknown>;
    const entries: Array<{ threshold: string; type: "over" | "under" }> = [];

    for (const key of Object.keys(obj)) {
      const threshold = extractThreshold(key) ?? key;
      const val = obj[key];
      const type = parseValue(val);
      if (type && threshold) entries.push({ threshold, type });
    }

    if (entries.length === 0) return null;

    // Preferisci 2.5, poi 3.5
    for (const t of PREFERRED_THRESHOLDS) {
      const found = entries.find((e) => e.threshold === t || e.threshold === String(parseFloat(t)));
      if (found) {
        return found.type === "over"
          ? { type: "over", threshold: found.threshold }
          : { type: "under", threshold: found.threshold };
      }
    }

    // Fallback: prima entry
    const first = entries[0];
    return first.type === "over"
      ? { type: "over", threshold: first.threshold }
      : { type: "under", threshold: first.threshold };
  }

  // Caso 3: numero (es. 2.5 = Over 2.5, -2.5 = Under 2.5)
  if (typeof apiUnderOver === "number") {
    const isUnder = apiUnderOver < 0;
    const threshold = String(Math.abs(apiUnderOver));
    return isUnder ? { type: "under", threshold } : { type: "over", threshold };
  }

  return null;
}

/**
 * Sanity check: Over 1.5 è incoerente se 2.5 e 3.5 sono Under.
 * In quel caso restituiamo Under 2.5 (mercato principale).
 */
export function sanitizeUnderOver(
  parsed: UnderOverResult | null,
  apiUnderOver: unknown
): UnderOverResult | null {
  if (!parsed) return null;

  // Se abbiamo Over 1.5, verifichiamo che non ci siano Under per 2.5/3.5
  if (parsed.type === "over" && (parsed.threshold === "1.5" || parsed.threshold === "1")) {
    const obj = typeof apiUnderOver === "object" && apiUnderOver && !Array.isArray(apiUnderOver)
      ? (apiUnderOver as Record<string, unknown>)
      : null;

    if (obj) {
      const u25 = parseValue(obj["2.5"] ?? obj["2"]);
      const u35 = parseValue(obj["3.5"] ?? obj["3"]);
      if (u25 === "under" || u35 === "under") {
        return { type: "under", threshold: "2.5" };
      }
    }
  }

  return parsed;
}
