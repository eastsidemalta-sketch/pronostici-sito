"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics/ga";
import { BookmakerLink } from "@/lib/components/BookmakerLink";
import { BookmakerLogo } from "@/lib/components/BookmakerLogo";

type QuoteRow = {
  bookmaker: string;
  bookmakerKey: string;
  bookmakerUrl?: string | null;
  bookmakerLogoUrl?: string | null;
  outcomes: Record<string, number>;
  homeTeam?: string;
  awayTeam?: string;
};

function formatHandicap(point: number): string {
  if (point === 0) return "0";
  const str = point > 0 ? `+${point}` : `${point}`;
  return str.replace(".", ",");
}

type MarketDef = {
  key: string;
  title: string;
  columns: Array<{ key: string; label?: string; labelKey?: string; pointKey?: string; isHandicap?: boolean }>;
};

const MARKET_CATEGORIES: Record<
  string,
  { labelKey: string; markets: Array<MarketDef & { titleKey: string }> }
> = {
  principali: {
    labelKey: "quotePrincipals",
    markets: [
      { key: "h2h", titleKey: "outcome1X2", title: "", columns: [{ key: "home", label: "1" }, { key: "draw", label: "X" }, { key: "away", label: "2" }] },
      { key: "double_chance", titleKey: "doubleChance", title: "", columns: [{ key: "homeOrDraw", label: "1X" }, { key: "homeOrAway", label: "12" }, { key: "drawOrAway", label: "X2" }] },
      { key: "draw_no_bet", titleKey: "drawNoBet", title: "", columns: [{ key: "home", label: "1" }, { key: "away", label: "2" }] },
    ],
  },
  handicap: {
    labelKey: "handicapBets",
    markets: [
      { key: "spreads", titleKey: "asianHandicap", title: "", columns: [{ key: "home", label: "", pointKey: "homePoint", isHandicap: true }, { key: "away", label: "", pointKey: "awayPoint", isHandicap: true }] },
    ],
  },
  risultato: {
    labelKey: "resultBets",
    markets: [
      { key: "totals_25", titleKey: "overUnder25", title: "", columns: [{ key: "over", labelKey: "over25" }, { key: "under", labelKey: "under25" }] },
      { key: "totals_15", titleKey: "overUnder15", title: "", columns: [{ key: "over", labelKey: "over15" }, { key: "under", labelKey: "under15" }] },
      { key: "btts", titleKey: "bothTeamsScore", title: "", columns: [{ key: "yes", label: "Sì" }, { key: "no", label: "No" }] },
    ],
  },
  extra: {
    labelKey: "extraBets",
    markets: [
      { key: "h2h_3_way_h1", titleKey: "halfTimeOutcome", title: "", columns: [{ key: "home", label: "1" }, { key: "draw", label: "X" }, { key: "away", label: "2" }] },
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
  const t = useTranslations("quotes");
  const tMatch = useTranslations("match");
  const locale = (params?.locale as string) || "it";
  const matchSlug = params?.slug as string | undefined;
  const logoByKey = new Map<string, string>(Object.entries(bookmakerLogos));
  const faviconByKey = new Map<string, string>(Object.entries(bookmakerFavicons));
  const [multiMarket, setMultiMarket] = useState<Record<string, QuoteRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("principali");

  useEffect(() => {
    const ac = new AbortController();
    const q = new URLSearchParams({ sportKey });
    if (homeTeam) q.set("homeTeam", homeTeam);
    if (awayTeam) q.set("awayTeam", awayTeam);
    if (country) q.set("country", country);
    if (leagueId != null) q.set("leagueId", String(leagueId));
    if (searchParams?.get("debug") === "1") q.set("debug", "1");
    setLoading(true);
    fetch(`/api/quotes?${q.toString()}`, { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data._debug) console.log("[Quotes API debug]", data._debug);
        setMultiMarket(data.multiMarket || {});
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setMultiMarket({});
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [sportKey, homeTeam, awayTeam, country, leagueId, searchParams]);

  if (loading) {
    return (
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-center shadow-sm md:p-8">
        <p className="text-base text-[var(--foreground-muted)]">{t("loadingQuotes")}</p>
      </div>
    );
  }

  const hasAnyQuotes = Object.values(multiMarket).some((arr) => arr?.length > 0);
  if (!hasAnyQuotes) {
    return (
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-center shadow-sm md:p-8">
        <p className="text-base text-[var(--foreground-muted)]">{t("noQuotesAvailable")}</p>
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
              {t(cat.labelKey)}
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

          if (market.key === "spreads") {
            const byLine = new Map<string, QuoteRow[]>();
            for (const q of source) {
              const hp = q.outcomes?.homePoint ?? 0;
              const ap = q.outcomes?.awayPoint ?? 0;
              const lineKey = `${hp},${ap}`;
              const arr = byLine.get(lineKey) ?? [];
              arr.push(q);
              byLine.set(lineKey, arr);
            }
            return (
              <div key={market.key} className="mb-5 last:mb-0 md:mb-6">
                <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)] md:text-base">
                  {t(market.titleKey)}
                </h3>
                {Array.from(byLine.entries()).map(([lineKey, lineQuotes]) => {
                  const first = lineQuotes[0];
                  const homePoint = first?.outcomes?.homePoint ?? 0;
                  const awayPoint = first?.outcomes?.awayPoint ?? 0;
                  const hTeam = first?.homeTeam ?? homeTeam ?? "";
                  const aTeam = first?.awayTeam ?? awayTeam ?? "";
                  return (
                    <div key={lineKey} className="mb-4 last:mb-0">
                      <div className="mb-1.5 text-xs font-medium text-[var(--foreground-muted)]">
                        {t("handicapLine")} {formatHandicap(homePoint)} / {formatHandicap(awayPoint)}
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
                        <table className="w-full text-sm md:text-base">
                          <thead>
                            <tr className="border-b border-[var(--card-border)] bg-slate-50">
                              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--foreground)] md:px-4 md:py-2.5 md:text-sm">{t("bookmaker")}</th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-[var(--foreground)] md:px-4 md:py-2.5 md:text-sm">
                                {hTeam} {formatHandicap(homePoint)}
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-[var(--foreground)] md:px-4 md:py-2.5 md:text-sm">
                                {aTeam} {formatHandicap(awayPoint)}
                              </th>
                              <th className="w-20 px-3 py-2 text-center text-xs font-semibold text-[var(--foreground)] md:w-24 md:px-4 md:py-2.5 md:text-sm">
                                {t("site")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {lineQuotes.map((q, i) => (
                              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                <td className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5">
                                  {(faviconByKey.get((q.bookmakerKey || "").toLowerCase()) || logoByKey.get((q.bookmakerKey || "").toLowerCase())) ? (
                                    <>
                                      <div className="flex shrink-0 items-center justify-center rounded border border-gray-200 bg-white p-1.5">
                                        <BookmakerLogo
                                          src={faviconByKey.get((q.bookmakerKey || "").toLowerCase()) || logoByKey.get((q.bookmakerKey || "").toLowerCase())!}
                                          size="xs"
                                          title={q.bookmaker}
                                        />
                                      </div>
                                      <span className="text-xs font-medium text-[var(--foreground)] md:text-sm">{q.bookmaker}</span>
                                    </>
                                  ) : (
                                    <span className="text-xs font-medium text-[var(--foreground)] md:text-sm">{q.bookmaker}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center text-xs font-semibold text-[var(--foreground)] md:px-4 md:py-2.5 md:text-sm">
                                  {(q.outcomes?.home ?? 0) > 0 ? (q.outcomes!.home as number).toFixed(2) : "-"}
                                </td>
                                <td className="px-3 py-2 text-center text-xs font-semibold text-[var(--foreground)] md:px-4 md:py-2.5 md:text-sm">
                                  {(q.outcomes?.away ?? 0) > 0 ? (q.outcomes!.away as number).toFixed(2) : "-"}
                                </td>
                                <td className="px-3 py-2 text-center md:px-4 md:py-2.5">
                                  {q.bookmakerUrl ? (
                                    <BookmakerLink
                                      href={q.bookmakerUrl}
                                      bookmakerName={q.bookmaker}
                                      locale={locale}
                                      logoUrl={q.bookmakerLogoUrl}
                                      matchSlug={matchSlug}
                                      className="inline-flex min-h-[32px] items-center justify-center rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)] md:min-h-[36px] md:px-4 md:py-2 md:text-sm"
                                    >
                                      {t("bet")}
                                    </BookmakerLink>
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
            );
          }

          return (
            <div key={market.key} className="mb-5 last:mb-0 md:mb-6">
              <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)] md:text-base">
                {t((market as MarketDef & { titleKey?: string }).titleKey ?? market.key)}
              </h3>
              <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
                <table className="w-full text-sm md:text-base">
                  <thead>
                    <tr className="border-b border-[var(--card-border)] bg-slate-50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--foreground)] md:px-4 md:py-2.5 md:text-sm">{t("bookmaker")}</th>
                      {market.columns.map((col) => (
                        <th
                          key={col.key}
                          className="px-3 py-2 text-center text-xs font-semibold text-[var(--foreground)] md:px-4 md:py-2.5 md:text-sm"
                        >
                          {col.labelKey ? tMatch(col.labelKey) : (col.key === "yes" || col.key === "no") ? tMatch(col.key) : col.label}
                        </th>
                      ))}
                      <th className="w-20 px-3 py-2 text-center text-xs font-semibold text-[var(--foreground)] md:w-24 md:px-4 md:py-2.5 md:text-sm">
                        {t("site")}
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
                                <BookmakerLogo
                                  src={faviconByKey.get((q.bookmakerKey || "").toLowerCase()) || logoByKey.get((q.bookmakerKey || "").toLowerCase())!}
                                  size="xs"
                                  title={q.bookmaker}
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
                            pointKey && num > 0 && !("isHandicap" in col && col.isHandicap)
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
                            <BookmakerLink
                              href={q.bookmakerUrl}
                              bookmakerName={q.bookmaker}
                              locale={locale}
                              logoUrl={q.bookmakerLogoUrl}
                              matchSlug={matchSlug}
                              className="inline-flex min-h-[32px] items-center justify-center rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)] md:min-h-[36px] md:px-4 md:py-2 md:text-sm"
                            >
                              {t("bet")}
                            </BookmakerLink>
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
