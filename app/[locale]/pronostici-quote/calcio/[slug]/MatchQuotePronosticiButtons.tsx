"use client";

import { useState, useEffect } from "react";

type Props = {
  quotesLabel: string;
  predictionsLabel: string;
};

export default function MatchQuotePronosticiButtons({
  quotesLabel,
  predictionsLabel,
}: Props) {
  const [activeTab, setActiveTab] = useState<"quote" | "pronostici">("quote");

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash === "#pronostici") setActiveTab("pronostici");
    else setActiveTab("quote");
  }, []);

  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash;
      if (hash === "#pronostici") setActiveTab("pronostici");
      else if (hash === "#quote" || hash === "") setActiveTab("quote");
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  function handleClick(tab: "quote" | "pronostici") {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = window.location.pathname + window.location.search + "#" + tab;
      window.history.replaceState(null, "", url);
    }
    const el = document.getElementById(tab);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mt-4 flex gap-2 md:mt-6">
      <button
        type="button"
        onClick={() => handleClick("quote")}
        className={`min-h-[40px] flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition active:scale-[0.98] ${
          activeTab === "quote"
            ? "border-2 border-transparent bg-[var(--accent)] text-white shadow-sm"
            : "border-2 border-slate-300 bg-slate-100 text-[var(--foreground-muted)] hover:bg-slate-200"
        }`}
      >
        {quotesLabel}
      </button>
      <button
        type="button"
        onClick={() => handleClick("pronostici")}
        className={`min-h-[40px] flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition active:scale-[0.98] ${
          activeTab === "pronostici"
            ? "border-2 border-transparent bg-[var(--accent)] text-white shadow-sm"
            : "border-2 border-slate-300 bg-slate-100 text-[var(--foreground-muted)] hover:bg-slate-200"
        }`}
      >
        {predictionsLabel}
      </button>
    </div>
  );
}
