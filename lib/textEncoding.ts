/**
 * Corregge problemi di encoding nei nomi (es. squadre spagnole con ñ, accenti).
 * L'API può restituire caratteri corrotti se l'encoding non è UTF-8.
 */
export function normalizeTeamName(name: string): string {
  if (!name || typeof name !== "string") return name;

  // Mojibake comuni: UTF-8 interpretato come Latin-1
  const fixes: [string, string][] = [
    ["Ã±", "ñ"],
    ["Ã³", "ó"],
    ["Ã­", "í"],
    ["Ã¡", "á"],
    ["Ã©", "é"],
    ["Ãº", "ú"],
  ];

  let result = name;
  for (const [from, to] of fixes) {
    result = result.split(from).join(to);
  }
  return result;
}

/** Crea uno slug URL-safe per una partita. Rimuove slash e altri caratteri che rompono il routing. */
export function buildMatchSlug(
  homeName: string,
  awayName: string,
  fixtureId: number
): string {
  const safe = (s: string) =>
    (s || "")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[/\\]/g, "-")
      .replace(/[^\w\-]/g, "") // solo lettere, numeri, underscore, hyphen
      .replace(/-+/g, "-") // collapse multiple hyphens
      .replace(/^-|-$/g, ""); // trim leading/trailing hyphens
  const home = safe(homeName) || "home";
  const away = safe(awayName) || "away";
  return `${home}-${away}-fixture-${fixtureId}`;
}
