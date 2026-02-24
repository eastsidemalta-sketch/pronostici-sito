"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics/ga";

type QuoteRow = {
  bookmaker: string;
  bookmakerKey: string;
  bookmakerUrl?: string | null;
  outcomes: Record<string, number>;
};

type MarketDef = {
  key: string;
  title: string;
  columns: Array<{ key: string; label: string; pointKey?: string }>;
};

/** Solo mercati che possiamo recuperare da The Odds API. Nessun placeholder. */
const MARKET_CATEGORIES: Record<
  string,
  { label: string; markets: MarketDef[] }
> = {
  principali: {
    label: "Quote Principali",
    markets: [
      { key: "h2h", title: "Esito 1X2", columns: [{ key: "home", label: "1" }, { key: "draw", label: "X" }, { key: "away", label: "2" }] },
      { key: "double_chance", title: "Doppia Chance", columns: [{ key: "homeOrDraw", label: "1X" }, { key: "homeOrAway", label: "12" }, { key: "drawOrAway", label: "X2" }] },
      { key: "draw_no_bet", title: "Draw No Bet", columns: [{ key: "home", label: "1" }, { key: "away", label: "2" }] },
    ],
  },
  handicap: {
    label: "Scommesse con Handicap",
    markets: [
      {
        key: "spreads",
        title: "Handicap",
        columns: [
          { key: "home", label: "Casa", pointKey: "homePoint" },
          { key: "away", label: "Ospiti", pointKey: "awayPoint" },
        ],
      },
    ],
  },
  risultato: {
    label: "Scommesse sul risultato",
    markets: [
      { key: "totals_25", title: "Over/Under 2.5 gol", columns: [{ key: "over", label: "Over 2.5" }, { key: "under", label: "Under 2.5" }] },
      { key: "totals_15", title: "Over/Under 1.5 gol", columns: [{ key: "over", label: "Over 1.5" }, { key: "under", label: "Under 1.5" }] },
      { key: "btts", title: "Entrambe segnano", columns: [{ key: "yes", label: "Sì" }, { key: "no", label: "No" }] },
    ],
  },
  extra: {
    label: "Scommesse Extra",
    markets: [
      { key: "h2h_3_way_h1", title: "Esito 1° Tempo", columns: [{ key: "home", label: "1" }, { key: "draw", label: "X" }, { key: "away", label: "2" }] },
    ],
  },
};

type Props = {
  sportKey: string;
  homeTeam: string;
  awayTeam: string;
  country?: string;
  leagueId?: number;
  bookmakerLogos?: Record<string, string>;
  bookmakerFavicons?: Record<string, string>;
};

export default function MatchQuotesTabs({ sportKey, homeTeam, awayTeam, country, leagueId, bookmakerLogos = {}, bookmakerFavicons = {} }: Props) {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || "it";
  const matchSlug = params?.slug as string | undefined;
  const logoByKey = new Map<string, string>(Object.entries(bookmakerLogos));
  const faviconByKey = new Map<string, string>(Object.entries(bookmakerFavicons));
  const [multiMarket, setMultiMarket] = useState<Record<string, QuoteRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("principali");

  useEffect(() => {
    const q = new URLSearchParams({ sportKey });
    if (homeTeam) q.set("homeTeam", homeTeam);
    if (awayTeam) q.set("awayTeam", awayTeam);
    if (country) q.set("country", country);
    if (leagueId != null) q.set("leagueId", String(leagueId));
    if (searchParams?.get("debug") === "1") q.set("debug", "1");
    fetch(`/api/quotes?${q.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data._debug) console.log("[Quotes API debug]", data._debug);
        setMultiMarket(data.multiMarket || {});
      })
      .catch(() => setMultiMarket({}))
      .finally(() => setLoading(false));
  }, [sportKey, homeTeam, awayTeam, country, leagueId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-center shadow-sm md:p-8">
        <p className="text-base text-[var(--foreground-muted)]">Caricamento quote…</p>
      </div>
    );
  }

  const hasAnyQuotes = Object.values(multiMarket).some((arr) => arr?.length > 0);
  if (!hasAnyQuotes) {
    return (
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-center shadow-sm md:p-8">
        <p className="text-base text-[var(--foreground-muted)]">Quote non disponibili per questa partita</p>
      </div>
    );
  }

  const tabs = Object.entries(MARKET_CATEGORIES).filter(([_, cat]) =>
    cat.markets.some((m) => (multiMarket[m.key] ?? []).length > 0)
  );

  const firstTabWithData = tabs[0]?.[0] ?? "principali";
  const currentTab = tabs.some(([k]) => k === activeTab) ? activeTab : firstTabWithData;

  const marketsWithData = MARKET_CATEGORIES[currentTab]?.markets.filter(
    (m) => (multiMarket[m.key] ?? []).length > 0
  ) ?? [];

  return (
    <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
      <div className="border-b border-[var(--card-border)]">
        <div className="flex overflow-x-auto">
          {tabs.map(([key, cat]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`min-h-[40px] shrink-0 border-b-2 px-4 py-2 text-sm font-semibold transition md:min-h-[36px] ${
                currentTab === key
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 md:p-5">
        {marketsWithData.map((market) => {
          const quotes = (multiMarket[market.key] || []) as QuoteRow[];
          const validQuotes = quotes.filter((q) =>
            market.columns.some((c) => (q.outcomes?.[c.key] || 0) > 0)
          );
          const source = validQuotes.length > 0 ? validQuotes : quotes;

          return (
            <div key={market.key} className="mb-5 last:mb-0 md:mb-6">
              <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)] md:text-base">
                {market.title}
              </h3>
              <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
                <table className="w-full text-sm md:text-base">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] bg-slate-50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--foreground)] md:px-4 md:py-2.5 md:text-sm">Bookmaker</th>
                      {market.columns.map((col) => (
                        <th
                          key={col.key}
                          className="px-3 py-2 text-center text-xs font-semibold text-[var(--foreground)] md:px-4 md:py-2.5 md:text-sm"
                        >
                          {col.label}
                        </th>
                      ))}
                      <th className="w-20 px-3 py-2 text-center text-xs font-semibold text-[var(--foreground)] md:w-24 md:px-4 md:py-2.5 md:text-sm">
                        Sito
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {source.map((q, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                      >
                        <td className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5">
                          {(faviconByKey.get((q.bookmakerKey || "").toLowerCase()) || logoByKey.get((q.bookmakerKey || "").toLowerCase())) ? (
                            <>
                              <div className="flex shrink-0 items-center justify-center rounded border border-gray-200 bg-white p-1.5">
                                <img
                                  src={faviconByKey.get((q.bookmakerKey || "").toLowerCase()) || logoByKey.get((q.bookmakerKey || "").toLowerCase())!}
                                  alt={q.bookmaker}
                                  title={q.bookmaker}
                                  className="h-6 w-6 shrink-0 object-contain md:h-8 md:w-8"
                                />
                              </div>
                              <span className="text-xs font-medium text-[var(--foreground)] md:text-sm">{q.bookmaker}</span>
                            </>
                          ) : (
                            <span className="text-xs font-medium text-[var(--foreground)] md:text-sm">{q.bookmaker}</span>
                          )}
                        </td>
                        {market.columns.map((col) => {
                          const val = q.outcomes?.[col.key];
                          const num = typeof val === "number" ? val : 0;
                          const pointKey = "pointKey" in col ? col.pointKey : undefined;
                          const point = pointKey ? (q.outcomes?.[pointKey] ?? 0) : 0;
                          const display =
                            pointKey && num > 0
                              ? `${num.toFixed(2)} (${point > 0 ? "+" : ""}${point})`
                              : num > 0
                                ? num.toFixed(2)
                                : "-";
                          return (
                            <td
                              key={col.key}
                              className="px-3 py-2 text-center text-xs font-semibold text-[var(--foreground)] md:px-4 md:py-2.5 md:text-sm"
                            >
                              {display}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center md:px-4 md:py-2.5">
                          {q.bookmakerUrl ? (
                            <a
                              href={q.bookmakerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                trackEvent("bookmaker_click", {
                                  bookmaker_name: q.bookmaker,
                                  sport: sportKey,
                                  country: locale,
                                  ...(matchSlug && { match_slug: matchSlug }),
                                  page_path: typeof window !== "undefined" ? window.location.pathname : "",
                                })
                              }
                              className="inline-flex min-h-[32px] items-center justify-center rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)] md:min-h-[36px] md:px-4 md:py-2 md:text-sm"
                            >
                              Scommetti
                            </a>
                          ) : (
                            <span className="text-[var(--foreground-muted)]">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
