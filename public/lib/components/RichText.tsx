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

/** Processa *italic* e [testo](url) */
function renderInlineFormat(text: string, keyPrefix: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  let m;
  while ((m = linkRe.exec(text)) !== null) {
    if (m.index > lastIndex) {
      result.push(...renderItalicTokens(text.slice(lastIndex, m.index), keyPrefix + "-p"));
    }
    result.push(
      <a key={`${keyPrefix}-l-${m.index}`} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">
        {m[1]}
      </a>
    );
    lastIndex = linkRe.lastIndex;
  }
  if (lastIndex < text.length) {
    result.push(...renderItalicTokens(text.slice(lastIndex), keyPrefix + "-s"));
  }
  return result.length ? result : [text];
}

function renderItalicTokens(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/\*([^*]+)\*/);
  if (parts.length === 1) return [text];
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i] ?? "";
    const isItalic = i % 2 === 1;
    if (chunk) {
      nodes.push(
        isItalic ? (
          <em key={`${keyPrefix}-i-${i}`} className="italic">
            {chunk}
          </em>
        ) : (
          <React.Fragment key={`${keyPrefix}-t-${i}`}>{chunk}</React.Fragment>
        )
      );
    }
  }
  return nodes.length ? nodes : [text];
}

function renderBoldTokens(line: string): React.ReactNode[] {
  const parts = line.split("**");
  if (parts.length === 1) return renderInlineFormat(line, "b");

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
        <React.Fragment key={`t-${i}`}>{renderInlineFormat(chunk, `f-${i}`)}</React.Fragment>
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

