"use client";

import { useState, useCallback } from "react";
import { usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { MenuItem } from "@/lib/homeMenu";
import HomeBanner from "../HomeBanner";
import HomeMatchesList from "../HomeMatchesList";

type Fixture = any;
type QuoteSummary = import("@/lib/quotes/fixturesQuotes").FixtureQuoteSummary;
type Predictions = import("@/app/pronostici-quote/lib/apiFootball").FixturePredictions;

type Props = {
  menuItems: MenuItem[];
  fixtures: Fixture[];
  quotesMap: Record<number, QuoteSummary>;
  predictionsMap: Record<number, Predictions>;
  locale: string;
  country: string;
  labels: {
    allSports: string;
    allCompetitions: string;
    noMatches: string;
    compareOdds: string;
    allQuotes: string;
    fullPredictions: string;
    quotesTab: string;
    predictionsTab: string;
    pronosticiTitle: string;
  };
  featuredBookmaker: {
    bonusUrl: string;
    buttonText: string;
    faviconUrl?: string;
    logoUrl: string;
    name: string;
    showInPronosticiBox?: boolean;
    pronosticiButtonText?: string;
    pronosticiButtonUrl?: string;
    buttonColor?: "yellow" | "orange";
  } | null;
  telegramBanner: import("@/lib/telegramBannerConfig").TelegramBannerCountryConfig | null;
  calcioEnabled: boolean;
  bonusSidebar: React.ReactNode;
  initialTab: "quotes" | "pronostici";
};

export default function PronosticiQuoteContent({
  menuItems,
  fixtures,
  quotesMap,
  predictionsMap,
  locale,
  country,
  labels,
  featuredBookmaker,
  telegramBanner,
  calcioEnabled,
  bonusSidebar,
  initialTab,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("pronosticiQuote");
  const tHome = useTranslations("home");

  const [sport, setSportState] = useState(() => searchParams.get("sport") ?? "all");
  const [league, setLeagueState] = useState(() => searchParams.get("league") ?? "all");

  const setSport = useCallback(
    (s: string) => {
      setSportState(s);
      if (s !== "calcio") setLeagueState("all");
      const next = new URLSearchParams(searchParams.toString());
      next.set("sport", s);
      if (s !== "calcio") next.delete("league");
      const qs = next.toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, searchParams]
  );

  const setLeague = useCallback(
    (l: string) => {
      setLeagueState(l);
      const next = new URLSearchParams(searchParams.toString());
      if (l === "all") next.delete("league");
      else next.set("league", l);
      const qs = next.toString();
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, searchParams]
  );

  const calcioItem = menuItems.find((m) => m.key === "calcio");
  const showCalcioFixtures = (sport === "all" || sport === "calcio") && calcioEnabled;

  const filteredFixtures =
    showCalcioFixtures && league !== "all" && league
      ? fixtures.filter((m) => m.league?.id === Number(league))
      : fixtures;

  const sportLabel =
    sport === "tennis"
      ? t("tennis")
      : sport === "basket"
        ? t("basket")
        : t("rugby");

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="fixed left-0 right-0 top-[40px] z-40 border-b border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm md:top-[60px]">
        <div className="mx-auto max-w-6xl px-3 py-1.5 sm:px-4 sm:py-1.5 md:px-5 md:py-1.5">
          <HomeBanner
            menuItems={menuItems}
            labels={{ allSports: labels.allSports, allCompetitions: labels.allCompetitions }}
            sport={sport}
            league={league}
            onSportChange={setSport}
            onLeagueChange={setLeague}
          />
        </div>
      </div>

      <div
        className={`shrink-0 ${sport === "calcio" ? "h-[76px] md:h-[108px]" : "h-[46px] md:h-[72px]"}`}
        aria-hidden
      />

      <div className="mx-auto max-w-6xl px-3 pt-4 pb-2 sm:px-4 sm:pt-3 sm:pb-3 md:px-5 md:py-4">
        {showCalcioFixtures ? (
          <div className="flex flex-col gap-6 sm:gap-6 lg:flex-row lg:items-start lg:gap-6">
            <div className="min-w-0 flex-1">
              <HomeMatchesList
                fixtures={filteredFixtures}
                locale={locale}
                initialTab={initialTab}
                noMatchesLabel={labels.noMatches}
                compareLabel={labels.compareOdds}
                allQuotesLabel={labels.allQuotes}
                fullPredictionsLabel={labels.fullPredictions}
                quotesTabLabel={labels.quotesTab}
                predictionsTabLabel={labels.predictionsTab}
                quotesMap={quotesMap}
                predictionsMap={predictionsMap}
                featuredBookmaker={featuredBookmaker}
                telegramBanner={telegramBanner}
              />
            </div>
            {bonusSidebar}
          </div>
        ) : (
          <div className="min-w-0 flex-1 space-y-6">
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-center shadow-sm md:p-8">
              <p className="mb-4 text-sm leading-relaxed text-[var(--foreground-muted)] md:text-base">
                {tHome("selectSportForMatches", { sport: sportLabel })}
              </p>
              <Link
                href="/pronostici-quote"
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] md:min-h-[36px]"
              >
                {labels.pronosticiTitle}
              </Link>
            </div>
          </div>
        )}
      </div>

      <section className="mx-auto max-w-6xl px-3 py-6 sm:px-4 md:px-5">
        <div className="prose prose-sm max-w-none text-[var(--foreground-muted)]">
          <p>{t("intro")}</p>
          <h2 className="mt-6 text-base font-semibold text-[var(--foreground)]">Cosa trovi qui</h2>
          <p>{t("cosaTrovi")}</p>
          <h2 className="mt-6 text-base font-semibold text-[var(--foreground)]">Perché consultarla</h2>
          <p>{t("percheConsultarla")}</p>
          <h2 className="mt-6 text-base font-semibold text-[var(--foreground)]">Collegamenti utili</h2>
          <p>{t("collegamentiUtili")}</p>
        </div>
      </section>
    </main>
  );
}
