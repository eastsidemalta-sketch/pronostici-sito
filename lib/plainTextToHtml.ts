/**
 * Converte testo normale in HTML sicuro per il rendering.
 * Paragrafi separati da riga vuota (\n\n). A capo singolo (\n) diventa <br>.
 */
export function plainTextToHtml(text: string): string {
  const ALIGN_DIRECTIVE_RE = /^\[\[align:(left|center)\]\]\s*\n?/i;
  const m = (text ?? "").match(ALIGN_DIRECTIVE_RE);
  const alignClass = m?.[1]?.toLowerCase() === "center" ? " text-center" : "";
  const source = (text ?? "").replace(ALIGN_DIRECTIVE_RE, "");

  const escaped = (s: string) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const boldify = (s: string) => {
    const parts = s.split("**");
    // Applica solo se i marker sono bilanciati (numero parti dispari)
    if (parts.length % 2 === 0) return s;
    return parts
      .map((chunk, i) =>
        i % 2 === 1 ? `<strong class="font-semibold">${chunk}</strong>` : chunk
      )
      .join("");
  };

  const paragraphs = source.split(/\n\n+/);
  return paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return "";
      const safe = escaped(trimmed);
      const withBold = boldify(safe);
      const withBreaks = withBold.replace(/\n/g, "<br>");
      return `<p class="leading-relaxed mt-4 first:mt-0${alignClass}">${withBreaks}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}
