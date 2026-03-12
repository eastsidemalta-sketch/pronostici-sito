"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { MenuItem } from "@/lib/homeMenu";
import HomeBanner from "../../HomeBanner";
import HomeMatchesList from "../../HomeMatchesList";

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
    home: string;
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
  bonusSidebar: React.ReactNode;
  initialTab: "quotes" | "pronostici";
  introContent: React.ReactNode;
};

/** Path della pagina pronostici-quote (parent) per navigazione quando si cambia sport */
function getPronosticiQuotePath(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[parts.length - 1] === "calcio") {
    parts.pop();
    return "/" + parts.join("/");
  }
  return pathname;
}

export default function CalcioContent({
  menuItems,
  fixtures,
  quotesMap,
  predictionsMap,
  locale,
  country,
  labels,
  featuredBookmaker,
  telegramBanner,
  bonusSidebar,
  initialTab,
  introContent,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pronosticiQuotePath = getPronosticiQuotePath(pathname);

  const [league, setLeagueState] = useState(() => searchParams.get("league") ?? "all");

  const setSport = useCallback(
    (s: string) => {
      if (s === "calcio") return;
      const params = new URLSearchParams(searchParams.toString());
      if (s === "all") params.delete("sport");
      else params.set("sport", s);
      params.delete("league");
      const qs = params.toString();
      router.push(qs ? `${pronosticiQuotePath}?${qs}` : pronosticiQuotePath);
    },
    [pronosticiQuotePath, searchParams, router]
  );

  const setLeague = useCallback(
    (l: string) => {
      setLeagueState(l);
      const next = new URLSearchParams(searchParams.toString());
      if (l === "all") next.delete("league");
      else next.set("league", l);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, searchParams, router]
  );

  const filteredFixtures =
    league !== "all" && league
      ? fixtures.filter((m) => m.league?.id === Number(league))
      : fixtures;


  const initialFixtures = filteredFixtures.slice(0, 15);

  const hasFixtures = filteredFixtures.length > 0;

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="fixed left-0 right-0 top-[40px] z-40 border-b border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm md:top-[60px]">
        <div className="mx-auto max-w-6xl px-3 py-1.5 sm:px-4 sm:py-1.5 md:px-5 md:py-1.5">
          <HomeBanner
            menuItems={menuItems}
            labels={{ allSports: labels.allSports, allCompetitions: labels.allCompetitions }}
            sport="calcio"
            league={league}
            onSportChange={setSport}
            onLeagueChange={setLeague}
          />
        </div>
      </div>

      <div className="h-[76px] shrink-0 md:h-[108px]" aria-hidden />

      <div className="mx-auto max-w-6xl px-3 pt-4 pb-2 sm:px-4 sm:pt-3 sm:pb-3 md:px-5 md:py-4">
        {hasFixtures ? (
          <div className="flex flex-col gap-6 sm:gap-6 lg:flex-row lg:items-start lg:gap-6">
            <div className="min-w-0 flex-1">
              <HomeMatchesList
                key={country}
                fixtures={initialFixtures}
                country={country}
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
                {labels.noMatches}
              </p>
              <Link
                href="/"
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] md:min-h-[36px]"
              >
                {labels.home}
              </Link>
            </div>
          </div>
        )}
      </div>

      <section className="mx-auto max-w-6xl px-3 py-6 sm:px-4 md:px-5">
        {introContent}
      </section>
    </main>
  );
}
