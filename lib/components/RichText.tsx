import React from "react";

export type RichTextAlign = "left" | "center";

const ALIGN_DIRECTIVE_RE = /^\[\[align:(left|center)\]\]\s*\n?/i;

export function extractRichTextAlign(input: string): {
  align: RichTextAlign;
  text: string;
} {
  const raw = input ?? "";
  const m = raw.match(ALIGN_DIRECTIVE_RE);
  if (!m) return { align: "left", text: raw };
  const align = (m[1]?.toLowerCase() as RichTextAlign) || "left";
  const text = raw.replace(ALIGN_DIRECTIVE_RE, "");
  return { align, text };
}

function renderBoldTokens(line: string): React.ReactNode[] {
  // Minimal parser: **bold** toggles <strong>. No HTML allowed.
  // If ** markers are unbalanced, treat remaining tokens as plain text.
  const parts = line.split("**");
  if (parts.length === 1) return [line];

  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i] ?? "";
    const isBold = i % 2 === 1;
    if (!chunk) continue;
    nodes.push(
      isBold ? (
        <strong key={`b-${i}`} className="font-semibold">
          {chunk}
        </strong>
      ) : (
        <React.Fragment key={`t-${i}`}>{chunk}</React.Fragment>
      )
    );
  }
  return nodes.length ? nodes : [line];
}

export type RichTextProps = {
  text: string;
  as?: "div" | "p" | "span";
  className?: string;
  /** Se true, forza output su singola riga (newline → spazio) */
  singleLine?: boolean;
};

export function RichText({
  text,
  as = "div",
  className,
  singleLine,
}: RichTextProps) {
  const { align, text: contentRaw } = extractRichTextAlign(text ?? "");
  const content = singleLine ? contentRaw.replace(/\s*\n+\s*/g, " ") : contentRaw;
  const lines = content.split("\n");

  const alignClass = align === "center" ? "text-center" : "text-left";

  const children: React.ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (i > 0) children.push(<br key={`br-${i}`} />);
    children.push(...renderBoldTokens(line));
  }

  return React.createElement(
    as,
    { className: [alignClass, className].filter(Boolean).join(" ") },
    children
  );
}

