/**
 * Risoluzione percorsi in oggetti JSON (dot notation e indici array).
 * Es: "data.events", "markets[0].outcomes", "items.0.name"
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (!path || path === "$" || path === "$.") return obj;
  let current: unknown = obj;
  const parts = path.replace(/^\$\.?/, "").split(/\.|\[|\]/).filter(Boolean);

  for (const part of parts) {
    if (current == null) return undefined;
    const num = parseInt(part, 10);
    if (!Number.isNaN(num) && Array.isArray(current)) {
      current = current[num];
    } else if (typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Estrae un valore numerico (quota) - supporta stringhe numeriche.
 */
export function getNumber(obj: unknown, path: string): number {
  const v = getByPath(obj, path);
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

/**
 * Estrae una stringa.
 */
export function getString(obj: unknown, path: string): string {
  const v = getByPath(obj, path);
  if (typeof v === "string") return v;
  if (v != null) return String(v);
  return "";
}
