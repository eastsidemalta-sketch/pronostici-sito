/**
 * Helper per costruire l'URL della pagina redirect verso i siti di scommesse.
 * Tutti i link ai bookmaker devono passare da questa pagina intermedia.
 */

/**
 * Costruisce l'URL della pagina redirect.
 * @param targetUrl - URL finale del sito di scommesse
 * @param bookmakerName - Nome del bookmaker da mostrare
 * @param locale - Locale (es. it, pt-BR)
 * @param logoUrl - URL del logo del bookmaker (es. /logos/bet365.svg)
 */
export function getRedirectToBookmakerUrl(
  targetUrl: string,
  bookmakerName: string,
  locale: string,
  logoUrl?: string | null
): string {
  const params = new URLSearchParams({
    url: targetUrl,
    name: bookmakerName,
  });
  if (logoUrl) params.set("logo", logoUrl);
  return `/${locale}/redirect?${params.toString()}`;
}
