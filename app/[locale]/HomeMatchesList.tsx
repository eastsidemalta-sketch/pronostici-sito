"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { trackEvent } from "@/lib/analytics/ga";
import { useRouter } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { localeToIntl } from "@/i18n/routing";
import { normalizeTeamName, buildMatchSlug } from "@/lib/textEncoding";
import { useLiveMatches } from "@/lib/hooks/useLiveMatches";
import LiveLastUpdatedBadge from "@/lib/components/LiveLastUpdatedBadge";
import TelegramBanner from "./TelegramBanner";
import type { FixtureQuoteSummary } from "@/lib/quotes/fixturesQuotes";
import type { FixturePredictions } from "@/app/pronostici-quote/lib/apiFootball";

type DesignPreviewFavicon = { url: string; name: string };

interface HomeMatchesListProps {
  fixtures: any[];
  locale: string;
  /** Tab iniziale: "quotes" o "pronostici" - per mostrare quote o pronostici di default */
  initialTab?: "quotes" | "pronostici";
  noMatchesLabel?: string;
  compareLabel?: string;
  allQuotesLabel?: string;
  fullPredictionsLabel?: string;
  quotesTabLabel?: string;
  predictionsTabLabel?: string;
  quotesMap?: Record<number, FixtureQuoteSummary>;
  /** Pronostici da API-Football (percentuali 1X2) - usati al posto del calcolo da quote */
  predictionsMap?: Record<number, FixturePredictions>;
  /** Un favicon per colonna (1, X, 2) per anteprima design */
  designPreviewFavicons?: {
    favicon1?: DesignPreviewFavicon;
    faviconX?: DesignPreviewFavicon;
    favicon2?: DesignPreviewFavicon;
  };
  /** Bookmaker in evidenza: bottone bonus dentro ogni box partita */
  featuredBookmaker?: {
    bonusUrl: string;
    buttonText: string;
    faviconUrl?: string;
    logoUrl?: string;
    name?: string;
    /** Mostra bonus nel box Pronostici */
    showInPronosticiBox?: boolean;
    /** Testo e URL per box Pronostici (se vuoti usa buttonText/bonusUrl) */
    pronosticiButtonText?: string;
    pronosticiButtonUrl?: string;
    /** Colore box: yellow | orange */
    buttonColor?: "yellow" | "orange";
  } | null;
  /** Banner Telegram (ogni 5 partite). Se null non viene mostrato */
  telegramBanner?: {
    text: string;
    buttonText: string;
    channelUrl: string;
  } | null;
}

export default function HomeMatchesList({
  fixtures,
  locale,
  initialTab = "quotes",
  noMatchesLabel = "Nessuna partita nei prossimi 7 giorni per i filtri selezionati.",
  compareLabel = "Compara quote",
  allQuotesLabel = "Tutte le quote >",
  fullPredictionsLabel = "Pronostici completi >",
  quotesTabLabel = "Quote",
  predictionsTabLabel = "Pronostici",
  quotesMap = {},
  predictionsMap = {},
  designPreviewFavicons,
  featuredBookmaker,
  telegramBanner,
}: HomeMatchesListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileTab, setMobileTab] = useState<"quotes" | "pronostici">(initialTab);
  const liveMap = useLiveMatches();

  useEffect(() => {
    setMobileTab(initialTab);
  }, [initialTab]);

  const handleTabClick = (tab: "quotes" | "pronostici") => {
    setMobileTab(tab);
    if (pathname.includes("pronostici-quote")) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`${pathname}?${params.toString()}`);
    }
  };

  const hasDesignPreview = designPreviewFavicons && (designPreviewFavicons.favicon1 || designPreviewFavicons.faviconX || designPreviewFavicons.favicon2);
  const intlLocale = localeToIntl[locale] ?? "it-IT";

  const byDate = new Map<string, any[]>();
  fixtures.forEach((m: any) => {
    const dateStr = new Date(m.fixture.date).toISOString().split("T")[0];
    if (!byDate.has(dateStr)) byDate.set(dateStr, []);
    byDate.get(dateStr)!.push(m);
  });
  const dates = Array.from(byDate.keys()).sort();

  if (fixtures.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-center shadow-sm md:p-8">
        <p className="text-sm leading-relaxed text-[var(--foreground-muted)] md:text-base">{noMatchesLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      {/* Tab mobile: Quote / Pronostici - dimensioni ridotte per evitare overlap con sotto-menu */}
      {hasDesignPreview || Object.keys(quotesMap).length > 0 ? (
      <div className="mt-1.5 flex gap-1.5 sm:hidden">
        <button
          type="button"
          onClick={() => handleTabClick("quotes")}
          className={`min-h-[30px] flex-1 rounded-md px-2 py-1.5 text-[10px] font-semibold transition active:scale-[0.98] ${
            mobileTab === "quotes"
              ? "bg-[var(--accent)] text-white shadow-sm border-2 border-transparent"
              : "bg-slate-100 text-[var(--foreground-muted)] hover:bg-slate-200 active:bg-slate-200 border-2 border-slate-300"
          }`}
        >
          {quotesTabLabel}
        </button>
        <button
          type="button"
          onClick={() => handleTabClick("pronostici")}
          className={`min-h-[30px] flex-1 rounded-md px-2 py-1.5 text-[10px] font-semibold transition active:scale-[0.98] ${
            mobileTab === "pronostici"
              ? "bg-[var(--accent)] text-white shadow-sm border-2 border-transparent"
              : "bg-slate-100 text-[var(--foreground-muted)] hover:bg-slate-200 active:bg-slate-200 border-2 border-slate-300"
          }`}
        >
          {predictionsTabLabel}
        </button>
      </div>
      ) : null}

      {(() => {
        let matchCount = 0;
        return dates.map((dateStr) => {
          const matches = byDate.get(dateStr)!;
          const dateLabel = new Date(dateStr + "T12:00:00").toLocaleDateString(
            intlLocale,
            { weekday: "long", day: "numeric", month: "long", year: "numeric" }
          );

          return (
            <section key={dateStr}>
              <h2 className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--foreground-muted)] md:mb-2 md:text-xs">
                {dateLabel}
              </h2>
              <div className="space-y-2 md:space-y-3">
                {matches.flatMap((match: any) => {
                  matchCount++;
                  const result: React.ReactNode[] = [];
                  if (telegramBanner && matchCount > 1 && (matchCount - 1) % 5 === 0) {
                    result.push(
                      <TelegramBanner
                        key={`telegram-${matchCount}`}
                        text={telegramBanner.text}
                        buttonText={telegramBanner.buttonText}
                        channelUrl={telegramBanner.channelUrl}
                      />
                    );
                  }
                const slug = buildMatchSlug(
                  match.teams.home.name,
                  match.teams.away.name,
                  match.fixture.id
                );
                const q = quotesMap[match.fixture.id];
                const pred = predictionsMap[match.fixture.id];
                const best1 = q?.best1 || (hasDesignPreview ? 2.1 : 0);
                const bestX = q?.bestX || (hasDesignPreview ? 3.4 : 0);
                const best2 = q?.best2 || (hasDesignPreview ? 3.2 : 0);
                const totalImplied = best1 > 0 && bestX > 0 && best2 > 0
                  ? 100 / best1 + 100 / bestX + 100 / best2
                  : 0;
                const fromQuote = totalImplied > 0;
                const fromAllOdds = q?.oddsBasedPct1 != null || q?.oddsBasedPctX != null || q?.oddsBasedPct2 != null;
                const pct1 = fromAllOdds ? (q?.oddsBasedPct1 ?? null) : (pred?.home != null ? pred.home : (fromQuote ? Math.round((100 / best1) / totalImplied * 100) : (hasDesignPreview ? 38 : null)));
                const pctX = fromAllOdds ? (q?.oddsBasedPctX ?? null) : (pred?.draw != null ? pred.draw : (fromQuote ? Math.round((100 / bestX) / totalImplied * 100) : (hasDesignPreview ? 25 : null)));
                const pct2 = fromAllOdds ? (q?.oddsBasedPct2 ?? null) : (pred?.away != null ? pred.away : (fromQuote ? Math.round((100 / best2) / totalImplied * 100) : (hasDesignPreview ? 37 : null)));
                const maxPct = Math.max(pct1 ?? 0, pctX ?? 0, pct2 ?? 0);
                const isMax1 = pct1 != null && pct1 === maxPct;
                const isMaxX = pctX != null && pctX === maxPct;
                const isMax2 = pct2 != null && pct2 === maxPct;

                const live = liveMap[match.fixture.id];
                const statusShort = live?.status ?? match.fixture?.status?.short ?? "";
                const isLive = ["1H", "2H", "HT", "ET", "PEN_LIVE", "BT", "SUSP", "INT"].includes(statusShort);
                const elapsed = live?.minute ?? match.fixture?.status?.elapsed;

                result.push(
                  <div
                    key={match.fixture.id}
                    className={`rounded-lg border p-3 shadow-sm transition-all hover:shadow-md sm:p-3.5 md:p-4 ${
                      isLive
                        ? "border-red-400 bg-red-50/50"
                        : "border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--accent)]/40"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:gap-5">
                      {/* Teams + time - parte sinistra (link alla partita) */}
                      <Link
                        href={`/pronostici-quote/calcio/${slug}`}
                        className="min-w-0 flex-1"
                      >
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            {isLive && (
                              <span className="shrink-0 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white animate-pulse md:text-[10px]">
                                Live
                              </span>
                            )}
                            {match.league.logo && (
                              <Image
                                src={match.league.logo}
                                alt=""
                                width={20}
                                height={20}
                                className="h-4 w-4 shrink-0 object-contain md:h-5 md:w-5"
                              />
                            )}
                            <span className="break-words text-[10px] font-medium text-[var(--foreground-muted)] md:text-xs">
                              {match.league.name}
                            </span>
                            <span className="ml-auto shrink-0 text-[10px] font-medium text-[var(--foreground-muted)] md:text-xs">
                              {isLive && elapsed != null
                                ? `${elapsed}'`
                                : `${new Date(match.fixture.date).toLocaleDateString(
                                    intlLocale,
                                    { day: "numeric", month: "short" }
                                  )} · ${new Date(match.fixture.date).toLocaleTimeString(
                                    intlLocale,
                                    { hour: "2-digit", minute: "2-digit" }
                                  )}`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-1.5 sm:gap-2 sm:justify-between">
                            <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5">
                              {match.teams.home.logo && (
                                <Image
                                  src={match.teams.home.logo}
                                  alt=""
                                  width={32}
                                  height={32}
                                  className="h-6 w-6 shrink-0 object-contain md:h-7 md:w-7"
                                />
                              )}
                              <span className="line-clamp-2 break-words text-center text-sm font-semibold leading-tight text-[var(--foreground)] md:text-sm">
                                {normalizeTeamName(match.teams.home.name)}
                              </span>
                            </div>
                            <div className="shrink-0 px-3 text-center">
                              <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-bold text-[var(--foreground)] md:px-3 md:py-1.5 md:text-sm">
                                {live
                                  ? `${live.score.home} - ${live.score.away}`
                                  : match.goals != null
                                    ? `${match.goals.home ?? 0} - ${match.goals.away ?? 0}`
                                    : new Date(match.fixture.date).toLocaleTimeString(
                                        intlLocale,
                                        { hour: "2-digit", minute: "2-digit" }
                                      )}
                              </span>
                              {isLive && elapsed != null && (
                                <div className="mt-1.5 text-xs font-semibold text-red-600 md:text-sm">
                                  {elapsed}&apos;
                                </div>
                              )}
                              {isLive && live?.last_updated_at && (
                                <div className="mt-1">
                                  <LiveLastUpdatedBadge lastUpdatedAt={live.last_updated_at} />
                                </div>
                              )}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5">
                              {match.teams.away.logo && (
                                <Image
                                  src={match.teams.away.logo}
                                  alt=""
                                  width={32}
                                  height={32}
                                  className="h-6 w-6 shrink-0 object-contain md:h-7 md:w-7"
                                />
                              )}
                              <span className="line-clamp-2 break-words text-center text-sm font-semibold leading-tight text-[var(--foreground)] md:text-sm">
                                {normalizeTeamName(match.teams.away.name)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>

                      {/* Quote 1X2 + Pronostici */}
                      <div className="flex shrink-0 flex-col items-stretch gap-2 border-t-2 border-[var(--card-border)] pt-3 sm:gap-1.5 sm:pt-2 lg:border-t-0 lg:border-l-2 lg:gap-1.5 lg:pl-4 lg:pt-0">
                        {(hasDesignPreview || (q && (q.best1 > 0 || q.bestX > 0 || q.best2 > 0))) ? (
                          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-x-4 sm:justify-end">
                            <div className={`flex flex-col items-center gap-2 ${mobileTab === "pronostici" ? "hidden sm:flex" : ""}`}>
                              <div className="flex items-center justify-center gap-2 sm:gap-2">
                                <div className="flex flex-col items-center">
                                  <span className="mb-1 text-[10px] font-medium text-[var(--foreground-muted)] sm:text-[10px]">1</span>
                                  <div className="flex min-h-[40px] min-w-[4.5rem] overflow-hidden rounded-lg border border-[var(--card-border)] sm:min-h-0 sm:min-w-0 md:min-w-[5rem]">
                                    <div className="flex shrink-0 items-center justify-center border-r border-gray-200 bg-white px-2 py-2 sm:px-1.5 sm:py-1.5">
                                      {designPreviewFavicons?.favicon1 ? (
                                        <Image src={designPreviewFavicons.favicon1.url} alt="" width={28} height={28} className="h-6 w-6 shrink-0 object-contain md:h-7 md:w-7" title={designPreviewFavicons.favicon1.name} />
                                      ) : (q.bookmaker1?.faviconUrl || q.bookmaker1?.logoUrl) ? (
                                        <Image src={q.bookmaker1.faviconUrl || q.bookmaker1.logoUrl!} alt="" width={28} height={28} className="h-6 w-6 shrink-0 object-contain md:h-7 md:w-7" title={q.bookmaker1.name} />
                                      ) : null}
                                    </div>
                                    <div className="flex flex-1 items-center justify-center bg-slate-100 px-1.5 py-1.5 sm:px-1 sm:py-1">
                                      <span className="text-[10px] font-bold text-[var(--best-odds)] md:text-xs">
                                        {q?.best1 ? q.best1.toFixed(2) : hasDesignPreview ? "2.10" : "-"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="mb-1 text-[10px] font-medium text-[var(--foreground-muted)] sm:text-[10px]">X</span>
                                  <div className="flex min-h-[40px] min-w-[4.5rem] overflow-hidden rounded-lg border border-[var(--card-border)] sm:min-h-0 sm:min-w-0 md:min-w-[5rem]">
                                    <div className="flex shrink-0 items-center justify-center border-r border-gray-200 bg-white px-2 py-2 sm:px-1.5 sm:py-1.5">
                                      {designPreviewFavicons?.faviconX ? (
                                        <Image src={designPreviewFavicons.faviconX.url} alt="" width={28} height={28} className="h-6 w-6 shrink-0 object-contain md:h-7 md:w-7" title={designPreviewFavicons.faviconX.name} />
                                      ) : (q.bookmakerX?.faviconUrl || q.bookmakerX?.logoUrl) ? (
                                        <Image src={q.bookmakerX.faviconUrl || q.bookmakerX.logoUrl!} alt="" width={28} height={28} className="h-6 w-6 shrink-0 object-contain md:h-7 md:w-7" title={q.bookmakerX.name} />
                                      ) : null}
                                    </div>
                                    <div className="flex flex-1 items-center justify-center bg-slate-100 px-1.5 py-1.5 sm:px-1 sm:py-1">
                                      <span className="text-[10px] font-bold text-[var(--best-odds)] md:text-xs">
                                        {q?.bestX ? q.bestX.toFixed(2) : hasDesignPreview ? "3.40" : "-"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="mb-1 text-[10px] font-medium text-[var(--foreground-muted)] sm:text-[10px]">2</span>
                                  <div className="flex min-h-[40px] min-w-[4.5rem] overflow-hidden rounded-lg border border-[var(--card-border)] sm:min-h-0 sm:min-w-0 md:min-w-[5rem]">
                                    <div className="flex shrink-0 items-center justify-center border-r border-gray-200 bg-white px-2 py-2 sm:px-1.5 sm:py-1.5">
                                      {designPreviewFavicons?.favicon2 ? (
                                        <Image src={designPreviewFavicons.favicon2.url} alt="" width={28} height={28} className="h-6 w-6 shrink-0 object-contain md:h-7 md:w-7" title={designPreviewFavicons.favicon2.name} />
                                      ) : (q.bookmaker2?.faviconUrl || q.bookmaker2?.logoUrl) ? (
                                        <Image src={q.bookmaker2.faviconUrl || q.bookmaker2.logoUrl!} alt="" width={28} height={28} className="h-6 w-6 shrink-0 object-contain md:h-7 md:w-7" title={q.bookmaker2.name} />
                                      ) : null}
                                    </div>
                                    <div className="flex flex-1 items-center justify-center bg-slate-100 px-1.5 py-1.5 sm:px-1 sm:py-1">
                                      <span className="text-[10px] font-bold text-[var(--best-odds)] md:text-xs">
                                        {q?.best2 ? q.best2.toFixed(2) : hasDesignPreview ? "3.20" : "-"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <Link
                                href={`/pronostici-quote/calcio/${slug}`}
                                className="text-[10px] font-medium text-[var(--accent)] underline-offset-2 hover:underline md:text-xs"
                              >
                                {allQuotesLabel}
                              </Link>
                              {featuredBookmaker && (
                                <a
                                  href={featuredBookmaker.bonusUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() =>
                                    trackEvent("bookmaker_click", {
                                      bookmaker_name: featuredBookmaker.name ?? "",
                                      sport: "calcio",
                                      country: locale,
                                      ...(slug && { match_slug: slug }),
                                      page_path: typeof window !== "undefined" ? window.location.pathname : "",
                                    })
                                  }
                                  className="flex w-full overflow-hidden rounded-lg border border-[var(--card-border)] transition hover:opacity-95"
                                >
                                  {(featuredBookmaker.faviconUrl || featuredBookmaker.logoUrl) && (
                                    <div className="flex shrink-0 items-center justify-center border-r border-gray-200 bg-white px-2 py-1.5">
                                      <Image
                                        src={featuredBookmaker.faviconUrl || featuredBookmaker.logoUrl!}
                                        alt=""
                                        width={28}
                                        height={28}
                                        className="h-6 w-6 shrink-0 object-contain md:h-7 md:w-7"
                                      />
                                    </div>
                                  )}
                                  <div className={`flex flex-1 items-center justify-center gap-1.5 px-2.5 py-1.5 text-[10px] font-extrabold text-black ${featuredBookmaker.buttonColor === "orange" ? "bg-[#f57003]" : "bg-[#ffe71e]"}`}>
                                    {featuredBookmaker.buttonText}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-black" aria-hidden>
                                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                      <polyline points="15 3 21 3 21 9" />
                                      <line x1="10" y1="14" x2="21" y2="3" />
                                    </svg>
                                  </div>
                                </a>
                              )}
                            </div>
                            {(pct1 != null || pctX != null || pct2 != null) && (
                              <>
                                <div className="hidden w-0.5 shrink-0 self-stretch bg-[var(--card-border)] sm:block" aria-hidden="true" />
                                <div className={`flex flex-col items-center gap-2 border-t-2 border-[var(--card-border)] pt-3 sm:border-t-0 sm:border-l-0 sm:pt-0 sm:pl-4 ${mobileTab === "quotes" ? "hidden sm:flex" : ""}`}>
                                  <div className="flex items-center justify-center gap-2 sm:gap-2">
                                    <div className="flex flex-col items-center">
                                      <span className="mb-1 text-[10px] font-medium text-[var(--foreground-muted)] sm:text-[10px]">1</span>
                                      <div className={`flex min-h-[40px] min-w-[4rem] items-center justify-center rounded-lg px-2.5 py-2 sm:min-h-0 sm:min-w-[3rem] sm:px-2 sm:py-1 md:min-w-[4rem] ${isMax1 ? "bg-[var(--accent)]" : "bg-slate-100"}`}>
                                        <span className={`text-xs font-bold md:text-sm ${isMax1 ? "text-white" : "text-[var(--accent)]"}`}>{pct1 ?? "-"}%</span>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-center">
                                      <span className="mb-1 text-[10px] font-medium text-[var(--foreground-muted)] sm:text-[10px]">X</span>
                                      <div className={`flex min-h-[40px] min-w-[4rem] items-center justify-center rounded-lg px-2.5 py-2 sm:min-h-0 sm:min-w-[3rem] sm:px-2 sm:py-1 md:min-w-[4rem] ${isMaxX ? "bg-[var(--accent)]" : "bg-slate-100"}`}>
                                        <span className={`text-xs font-bold md:text-sm ${isMaxX ? "text-white" : "text-[var(--accent)]"}`}>{pctX ?? "-"}%</span>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-center">
                                      <span className="mb-1 text-[10px] font-medium text-[var(--foreground-muted)] sm:text-[10px]">2</span>
                                      <div className={`flex min-h-[40px] min-w-[4rem] items-center justify-center rounded-lg px-2.5 py-2 sm:min-h-0 sm:min-w-[3rem] sm:px-2 sm:py-1 md:min-w-[4rem] ${isMax2 ? "bg-[var(--accent)]" : "bg-slate-100"}`}>
                                        <span className={`text-xs font-bold md:text-sm ${isMax2 ? "text-white" : "text-[var(--accent)]"}`}>{pct2 ?? "-"}%</span>
                                      </div>
                                    </div>
                                  </div>
                                  <Link
                                    href={`/pronostici-quote/calcio/${slug}#pronostici`}
                                    className="text-[10px] font-medium text-[var(--accent)] underline-offset-2 hover:underline md:text-xs"
                                  >
                                    {fullPredictionsLabel}
                                  </Link>
                                  {featuredBookmaker?.showInPronosticiBox && (
                                    <a
                                      href={featuredBookmaker.pronosticiButtonUrl || featuredBookmaker.bonusUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() =>
                                        trackEvent("bookmaker_click", {
                                          bookmaker_name: featuredBookmaker.name ?? "",
                                          sport: "calcio",
                                          country: locale,
                                          ...(slug && { match_slug: slug }),
                                          page_path: typeof window !== "undefined" ? window.location.pathname : "",
                                        })
                                      }
                                      className="flex w-full overflow-hidden rounded-lg border border-[var(--card-border)] transition hover:opacity-95"
                                    >
                                      {(featuredBookmaker.faviconUrl || featuredBookmaker.logoUrl) && (
                                        <div className="flex shrink-0 items-center justify-center border-r border-gray-200 bg-white px-2 py-1.5">
                                          <Image
                                            src={featuredBookmaker.faviconUrl || featuredBookmaker.logoUrl!}
                                            alt=""
                                            width={28}
                                            height={28}
                                            className="h-6 w-6 shrink-0 object-contain md:h-7 md:w-7"
                                          />
                                        </div>
                                      )}
                                      <div className={`flex flex-1 items-center justify-center gap-1.5 px-2.5 py-1.5 text-[10px] font-extrabold text-black ${featuredBookmaker.buttonColor === "orange" ? "bg-[#f57003]" : "bg-[#ffe71e]"}`}>
                                        {featuredBookmaker.pronosticiButtonText || featuredBookmaker.buttonText}
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-black" aria-hidden>
                                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                          <polyline points="15 3 21 3 21 9" />
                                          <line x1="10" y1="14" x2="21" y2="3" />
                                        </svg>
                                      </div>
                                    </a>
                                  )}
                                </div>
                              </>
                            )}
                            {pct1 == null && pctX == null && pct2 == null && (
                              <div className={`flex flex-col items-center gap-2 ${mobileTab === "quotes" ? "hidden sm:flex" : ""}`}>
                                <Link
                                  href={`/pronostici-quote/calcio/${slug}#pronostici`}
                                  className="text-[10px] font-medium text-[var(--accent)] underline-offset-2 hover:underline md:text-xs"
                                >
                                  {fullPredictionsLabel}
                                </Link>
                                {featuredBookmaker?.showInPronosticiBox && (
                                  <a
                                    href={featuredBookmaker.pronosticiButtonUrl || featuredBookmaker.bonusUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() =>
                                      trackEvent("bookmaker_click", {
                                        bookmaker_name: featuredBookmaker.name ?? "",
                                        sport: "calcio",
                                        country: locale,
                                        ...(slug && { match_slug: slug }),
                                        page_path: typeof window !== "undefined" ? window.location.pathname : "",
                                      })
                                    }
                                    className="flex w-full overflow-hidden rounded-lg border border-[var(--card-border)] transition hover:opacity-95"
                                  >
                                    {(featuredBookmaker.faviconUrl || featuredBookmaker.logoUrl) && (
                                      <div className="flex shrink-0 items-center justify-center border-r border-gray-200 bg-white px-2 py-1.5">
                                        <Image
                                          src={featuredBookmaker.faviconUrl || featuredBookmaker.logoUrl!}
                                          alt=""
                                          width={28}
                                          height={28}
                                          className="h-6 w-6 shrink-0 object-contain md:h-7 md:w-7"
                                        />
                                      </div>
                                    )}
                                    <div className={`flex flex-1 items-center justify-center gap-1.5 px-2.5 py-1.5 text-[10px] font-extrabold text-black ${featuredBookmaker.buttonColor === "orange" ? "bg-[#f57003]" : "bg-[#ffe71e]"}`}>
                                      {featuredBookmaker.pronosticiButtonText || featuredBookmaker.buttonText}
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-black" aria-hidden>
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                        <polyline points="15 3 21 3 21 9" />
                                        <line x1="10" y1="14" x2="21" y2="3" />
                                      </svg>
                                    </div>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Link
                              href={`/pronostici-quote/calcio/${slug}`}
                              className="flex min-h-[36px] items-center justify-center rounded bg-[var(--accent)] px-2.5 py-1.5 text-[10px] font-semibold text-white transition hover:bg-[var(--accent-hover)] md:px-3 md:py-2 md:text-xs"
                            >
                              {compareLabel}
                            </Link>
                            <Link
                              href={`/pronostici-quote/calcio/${slug}#pronostici`}
                              className="text-[10px] font-medium text-[var(--accent)] underline-offset-2 hover:underline md:text-xs"
                            >
                              {fullPredictionsLabel}
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
                return result;
              })}
            </div>
          </section>
        );
      });
      })()}
    </div>
  );
}
