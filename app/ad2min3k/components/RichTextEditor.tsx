"use client";

import { useMemo, useRef } from "react";
import { RichText, extractRichTextAlign, type RichTextAlign } from "@/lib/components/RichText";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  /** Se true, forza una sola riga (niente \n) */
  singleLine?: boolean;
  /** Mostra preview sotto il campo */
  preview?: boolean;
};

function setAlignDirective(value: string, align: RichTextAlign): string {
  const { text } = extractRichTextAlign(value);
  if (align === "left") return text;
  return `[[align:${align}]]\n${text}`;
}

export default function RichTextEditor({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  singleLine,
  preview = true,
}: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const align = useMemo(() => extractRichTextAlign(value).align, [value]);
  const displayValue = singleLine ? value.replace(/\n/g, " ") : value;

  function applyBold() {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const raw = displayValue;

    // If selection is empty: insert **** and put cursor in-between
    if (start === end) {
      const next = raw.slice(0, start) + "****" + raw.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        const n = ref.current;
        if (!n) return;
        n.focus();
        n.setSelectionRange(start + 2, start + 2);
      });
      return;
    }

    const selected = raw.slice(start, end);
    const before = raw.slice(0, start);
    const after = raw.slice(end);

    const alreadyWrapped =
      before.endsWith("**") && after.startsWith("**");

    const next = alreadyWrapped
      ? before.slice(0, -2) + selected + after.slice(2)
      : before + "**" + selected + "**" + after;

    onChange(next);
    requestAnimationFrame(() => {
      const n = ref.current;
      if (!n) return;
      n.focus();
      const delta = alreadyWrapped ? -2 : 2;
      n.setSelectionRange(start + (alreadyWrapped ? -2 : 2), end + delta);
    });
  }

  function applyAlign(nextAlign: RichTextAlign) {
    onChange(setAlignDirective(displayValue, nextAlign));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <label className="block text-sm font-medium text-neutral-700">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => applyAlign("left")}
            className={`rounded border px-2 py-1 text-xs font-medium ${
              align === "left"
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
            title="Allinea a sinistra"
          >
            Sinistra
          </button>
          <button
            type="button"
            onClick={() => applyAlign("center")}
            className={`rounded border px-2 py-1 text-xs font-medium ${
              align === "center"
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
            title="Centra testo"
          >
            Centro
          </button>
          <button
            type="button"
            onClick={applyBold}
            className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            title="Grassetto (**testo**)"
          >
            B
          </button>
        </div>
      </div>

      <textarea
        ref={ref}
        value={displayValue}
        onChange={(e) => onChange(singleLine ? e.target.value.replace(/\n/g, " ") : e.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        placeholder={placeholder}
      />

      <p className="text-xs text-neutral-500">
        A capo: premi Invio. Grassetto: seleziona testo e premi <span className="font-semibold">B</span> (usa sintassi <span className="font-mono">**grassetto**</span>).
      </p>

      {preview && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p className="mb-2 text-xs font-medium uppercase text-neutral-500">
            Anteprima
          </p>
          <RichText
            as="div"
            text={displayValue}
            className="text-sm text-neutral-800"
            singleLine={singleLine}
          />
        </div>
      )}
    </div>
  );
}

