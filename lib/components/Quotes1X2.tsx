"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { trackEvent } from "@/lib/analytics/ga";
import { compareBookmakers } from "@/lib/quotes/bookmakerRanking";
import type { RemunerationConfig } from "@/lib/quotes/bookmaker.types";

type Quote = {
  bookmaker: string;
  bookmakerKey?: string;
  bookmakerUrl?: string | null;
  bonusDescription?: string | null;
  remuneration?: RemunerationConfig | null;
  outcomes: {
    home?: number;
    draw?: number;
    away?: number;
  };
};

type Props = {
  sportKey: string;
  homeTeam?: string;
  awayTeam?: string;
  country?: string; // codice paese (IT, UK, DE...) per link bookmaker
  matchSlug?: string;
};

type SortBy = "bookmaker" | "home" | "draw" | "away";

export default function Quotes1X2({ sportKey, homeTeam, awayTeam, country, matchSlug }: Props) {
  const locale = useLocale();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>("bookmaker");

  useEffect(() => {
    const params = new URLSearchParams({ sportKey });
    if (homeTeam) params.set("homeTeam", homeTeam);
    if (awayTeam) params.set("awayTeam", awayTeam);
    if (country) params.set("country", country);
    fetch(`/api/quotes?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setQuotes(data.quotes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sportKey, homeTeam, awayTeam, country]);

  if (loading) return <p className="mt-6 text-gray-500">Caricamento quote…</p>;
  if (!quotes.length) return null;

  const validQuotes = quotes.filter(
    (q) => (q.outcomes.home || 0) > 0 && (q.outcomes.draw || 0) > 0 && (q.outcomes.away || 0) > 0
  );
  const source = validQuotes.length > 0 ? validQuotes : quotes;

  const bestHome = Math.max(...source.map((q) => q.outcomes.home || 0), 0);
  const bestDraw = Math.max(...source.map((q) => q.outcomes.draw || 0), 0);
  const bestAway = Math.max(...source.map((q) => q.outcomes.away || 0), 0);

  // In caso di parità di quota, sceglie il bookmaker con remunerazione migliore
  // (Revenue Share > CPA > CPL, poi valore più alto; manualPriority sovrascrive tutto)
  function pickBest(quotes: Quote[], outcomeKey: "home" | "draw" | "away", bestVal: number): Quote | undefined {
    const tied = quotes.filter((q) => (q.outcomes[outcomeKey] || 0) === bestVal);
    if (tied.length <= 1) return tied[0];
    return [...tied].sort((a, b) => compareBookmakers(a, b))[0];
  }

  const bestHomeQuote = pickBest(source, "home", bestHome);
  const bestDrawQuote = pickBest(source, "draw", bestDraw);
  const bestAwayQuote = pickBest(source, "away", bestAway);

  const sortedQuotes = [...source].sort((a, b) => {
    if (sortBy === "bookmaker") return (a.bookmaker || "").localeCompare(b.bookmaker || "");
    const key = sortBy === "home" ? "home" : sortBy === "draw" ? "draw" : "away";
    const va = a.outcomes[key as keyof typeof a.outcomes] || 0;
    const vb = b.outcomes[key as keyof typeof b.outcomes] || 0;
    return va - vb;
  });

  return (
    <section className="mt-10 rounded-2xl border p-6">
      <h2 className="text-xl font-semibold mb-4">Quote 1X2</h2>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="rounded-xl border p-4">
          <div className="text-sm text-gray-500">1</div>
          <div className="text-2xl font-bold">{bestHome > 0 ? bestHome.toFixed(2) : "-"}</div>
          <div className="text-xs text-gray-500 mt-1">{bestHomeQuote?.bookmaker ?? "-"}</div>
          {bestHomeQuote?.bookmakerUrl && (
            <a
              href={bestHomeQuote.bookmakerUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackEvent("bookmaker_click", {
                  bookmaker_name: bestHomeQuote.bookmaker ?? "",
                  sport: sportKey,
                  country: locale,
                  ...(matchSlug && { match_slug: matchSlug }),
                  page_path: typeof window !== "undefined" ? window.location.pathname : "",
                })
              }
              className="mt-2 inline-block rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Scommetti
            </a>
          )}
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-sm text-gray-500">X</div>
          <div className="text-2xl font-bold">{bestDraw > 0 ? bestDraw.toFixed(2) : "-"}</div>
          <div className="text-xs text-gray-500 mt-1">{bestDrawQuote?.bookmaker ?? "-"}</div>
          {bestDrawQuote?.bookmakerUrl && (
            <a
              href={bestDrawQuote.bookmakerUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackEvent("bookmaker_click", {
                  bookmaker_name: bestDrawQuote.bookmaker ?? "",
                  sport: sportKey,
                  country: locale,
                  ...(matchSlug && { match_slug: matchSlug }),
                  page_path: typeof window !== "undefined" ? window.location.pathname : "",
                })
              }
              className="mt-2 inline-block rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Scommetti
            </a>
          )}
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-sm text-gray-500">2</div>
          <div className="text-2xl font-bold">{bestAway > 0 ? bestAway.toFixed(2) : "-"}</div>
          <div className="text-xs text-gray-500 mt-1">{bestAwayQuote?.bookmaker ?? "-"}</div>
          {bestAwayQuote?.bookmakerUrl && (
            <a
              href={bestAwayQuote.bookmakerUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackEvent("bookmaker_click", {
                  bookmaker_name: bestAwayQuote.bookmaker ?? "",
                  sport: sportKey,
                  country: locale,
                  ...(matchSlug && { match_slug: matchSlug }),
                  page_path: typeof window !== "undefined" ? window.location.pathname : "",
                })
              }
              className="mt-2 inline-block rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Scommetti
            </a>
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-neutral-50">
                <th
                  className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-neutral-100 select-none"
                  onClick={() => setSortBy("bookmaker")}
                  title="Ordina per bookmaker"
                >
                  Bookmaker
                </th>
                <th
                  className="px-4 py-3 text-center font-semibold cursor-pointer hover:bg-neutral-100 select-none"
                  onClick={() => setSortBy("home")}
                  title="Ordina per quota 1 (crescente)"
                >
                  1
                </th>
                <th
                  className="px-4 py-3 text-center font-semibold cursor-pointer hover:bg-neutral-100 select-none"
                  onClick={() => setSortBy("draw")}
                  title="Ordina per quota X (crescente)"
                >
                  X
                </th>
                <th
                  className="px-4 py-3 text-center font-semibold cursor-pointer hover:bg-neutral-100 select-none"
                  onClick={() => setSortBy("away")}
                  title="Ordina per quota 2 (crescente)"
                >
                  2
                </th>
                <th className="px-4 py-3 text-center font-semibold w-24">Sito</th>
              </tr>
            </thead>
            <tbody>
              {sortedQuotes.map((q, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-neutral-50/50">
                    <td className="px-4 py-3 font-medium">{q.bookmaker}</td>
                    <td className="px-4 py-3 text-center">
                      {(q.outcomes.home || 0) > 0 ? (q.outcomes.home as number).toFixed(2) : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(q.outcomes.draw || 0) > 0 ? (q.outcomes.draw as number).toFixed(2) : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(q.outcomes.away || 0) > 0 ? (q.outcomes.away as number).toFixed(2) : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {q.bookmakerUrl ? (
                        <a
                          href={q.bookmakerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() =>
                            trackEvent("bookmaker_click", {
                              bookmaker_name: q.bookmaker ?? "",
                              sport: sportKey,
                              country: locale,
                              ...(matchSlug && { match_slug: matchSlug }),
                              page_path: typeof window !== "undefined" ? window.location.pathname : "",
                            })
                          }
                          className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          Scommetti
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
