"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { trackEvent } from "@/lib/analytics/ga";

type Quote = {
  bookmaker: string;
  bookmakerKey?: string;
  bookmakerUrl?: string | null;
  outcomes: Record<string, number>;
};

type Props = {
  sportKey: string;
  homeTeam?: string;
  awayTeam?: string;
  country?: string;
  marketKey: string;
  title: string;
  columns: Array<{ key: string; label: string }>;
  matchSlug?: string;
};

export default function QuoteMarket({
  sportKey,
  homeTeam,
  awayTeam,
  country,
  marketKey,
  title,
  columns,
  matchSlug,
}: Props) {
  const locale = useLocale();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ sportKey });
    if (homeTeam) params.set("homeTeam", homeTeam);
    if (awayTeam) params.set("awayTeam", awayTeam);
    if (country) params.set("country", country);
    fetch(`/api/quotes?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        const multi = data.multiMarket?.[marketKey] || [];
        setQuotes(multi);
      })
      .catch(() => setQuotes([]))
      .finally(() => setLoading(false));
  }, [sportKey, homeTeam, awayTeam, country, marketKey]);

  if (loading) return null;

  if (!quotes.length) return null;

  const validQuotes = quotes.filter((q) =>
    columns.some((c) => (q.outcomes[c.key] || 0) > 0)
  );
  const source = validQuotes.length > 0 ? validQuotes : quotes;

  const bestByCol = columns.map((col) => {
    const best = Math.max(...source.map((q) => q.outcomes[col.key] || 0), 0);
    const bestQuote = source.find((q) => (q.outcomes[col.key] || 0) === best);
    return { col, best, bestQuote };
  });

  return (
    <section className="mt-10 rounded-2xl border p-6">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      <div
        className="grid gap-4 text-center"
        style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}
      >
        {bestByCol.map(({ col, best, bestQuote }) => (
          <div key={col.key} className="rounded-xl border p-4">
            <div className="text-sm text-gray-500">{col.label}</div>
            <div className="text-2xl font-bold">
              {best > 0 ? best.toFixed(2) : "-"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {bestQuote?.bookmaker ?? "-"}
            </div>
            {bestQuote?.bookmakerUrl && (
              <a
                href={bestQuote.bookmakerUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent("bookmaker_click", {
                    bookmaker_name: bestQuote.bookmaker ?? "",
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
        ))}
      </div>

      <div className="mt-8">
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-neutral-50">
                <th className="px-4 py-3 text-left font-semibold">Bookmaker</th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-center font-semibold"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-semibold w-24">
                  Sito
                </th>
              </tr>
            </thead>
            <tbody>
              {source.map((q, i) => (
                <tr
                  key={i}
                  className="border-b last:border-0 hover:bg-neutral-50/50"
                >
                  <td className="px-4 py-3 font-medium">{q.bookmaker}</td>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-center">
                      {(q.outcomes[col.key] || 0) > 0
                        ? (q.outcomes[col.key] as number).toFixed(2)
                        : "-"}
                    </td>
                  ))}
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
