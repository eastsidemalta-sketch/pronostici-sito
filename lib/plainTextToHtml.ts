/**
 * Converte testo normale in HTML sicuro per il rendering.
 * Paragrafi separati da riga vuota (\n\n). A capo singolo (\n) diventa <br>.
 */
export function plainTextToHtml(text: string): string {
  const escaped = (s: string) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const paragraphs = text.split(/\n\n+/);
  return paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return "";
      const withBreaks = escaped(trimmed).replace(/\n/g, "<br>");
      return `<p class="leading-relaxed mt-4 first:mt-0">${withBreaks}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}
