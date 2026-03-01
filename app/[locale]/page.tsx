import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getUpcomingFixtures } from "@/lib/apiFootball";
import { getPredictionsForFixtures } from "@/app/pronostici-quote/lib/apiFootball";
import { getMenuForCountry, getLeagueIdsForAllSports } from "@/lib/homeMenuData";
import { isSportEnabledForCountry } from "@/lib/sportsPerCountryData";
import { getTelegramBannerForCountryAsync } from "@/lib/telegramBannerConfig";
import { getQuotesForFixtures } from "@/lib/quotes/fixturesQuotes";
import { getFeaturedBookmaker } from "@/lib/quotes/bookmakers";
import { localeToCountryCode } from "@/i18n/routing";
import HomeBanner from "./HomeBanner";
import HomeMatchesList from "./HomeMatchesList";
import HomeBonusSidebar from "./HomeBonusSidebar";
import {
  createIndexableMetadata,
  createNoindexMetadata,
} from "@/lib/seo";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sport?: string; league?: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const hasFilters = Object.keys(sp).length > 0;

  const t = await getTranslations("home");
  const title = t("title");
  const description = t("description");

  if (hasFilters) {
    return createNoindexMetadata({
      title,
      description,
      countryCode: locale,
      pathWithoutCountry: "",
    });
  }
  return createIndexableMetadata({
    title,
    description,
    countryCode: locale,
    pathWithoutCountry: "",
  });
}

/** Cache 30 secondi: riduce carico API e velocizza il caricamento */
export const revalidate = 30;

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sport?: string; league?: string }>;
}) {
  const { locale } = await params;
  const { sport = "all", league = "all" } = await searchParams;
  const t = await getTranslations("home");
  const tPronostici = await getTranslations("pronosticiQuote");

  const country = localeToCountryCode[locale] ?? "IT";
  const menuItems = getMenuForCountry(country);
  const calcioItem = menuItems.find((m) => m.key === "calcio");
  const leagueIds =
    sport === "all"
      ? getLeagueIdsForAllSports(country)
      : (calcioItem?.subItems?.map((s) => s.id) ?? []);

  let fixtures: any[] = [];
  const calcioEnabled = isSportEnabledForCountry(country, "calcio");
  let showCalcioFixtures = (sport === "all" || sport === "calcio") && calcioEnabled;

  if (showCalcioFixtures && leagueIds.length > 0) {
    const ids =
      league === "all" || !league
        ? leagueIds
        : leagueIds.includes(Number(league))
          ? [Number(league)]
          : leagueIds;
    fixtures = await getUpcomingFixtures(ids);
    if (league !== "all" && league) {
      fixtures = fixtures.filter((m: any) => m.league?.id === Number(league));
    }
  }

  let quotesMap: Record<number, import("@/lib/quotes/fixturesQuotes").FixtureQuoteSummary> = {};
  let predictionsMap: Record<number, import("@/app/pronostici-quote/lib/apiFootball").FixturePredictions> = {};
  if (fixtures.length > 0) {
    try {
      [quotesMap, predictionsMap] = await Promise.all([
        getQuotesForFixtures(fixtures, country),
        getPredictionsForFixtures(fixtures.map((m: any) => m.fixture.id)),
      ]);
    } catch {
      // Quote API può fallire (rate limit, chiave mancante) - continua senza quote
    }
  }

  const labels = {
    allSports: t("allSports"),
    allCompetitions: t("allCompetitions"),
  };

  const featuredBookmaker = getFeaturedBookmaker(country);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Sport tabs + competizioni - fissi in alto */}
      <div className="fixed left-0 right-0 top-[40px] z-40 border-b border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm md:top-[60px]">
        <div className="mx-auto max-w-6xl px-3 py-1.5 sm:px-4 sm:py-1.5 md:px-5 md:py-1.5">
          <Suspense fallback={<div className="h-8 animate-pulse rounded bg-slate-100" />}>
            <HomeBanner menuItems={menuItems} labels={labels} />
          </Suspense>
        </div>
      </div>

      {/* Spacer per il menu fisso: più alto quando Calcio è selezionato (sotto-menu competizioni visibile) */}
      <div
        className={`shrink-0 ${sport === "calcio" ? "h-[76px] md:h-[108px]" : "h-[46px] md:h-[72px]"}`}
        aria-hidden
      />

      {/* Contenuto: lista partite + sidebar bonus */}
      <div className="mx-auto max-w-6xl px-3 pt-4 pb-2 sm:px-4 sm:pt-3 sm:pb-3 md:px-5 md:py-4">
        {showCalcioFixtures ? (
          <div className="flex flex-col gap-6 sm:gap-6 lg:flex-row lg:items-start lg:gap-6">
            <div className="min-w-0 flex-1">
              <HomeMatchesList
                fixtures={fixtures}
                locale={locale}
                noMatchesLabel={t("noMatches")}
                compareLabel={t("compareOdds")}
                allQuotesLabel={t("allQuotes")}
                fullPredictionsLabel={t("fullPredictions")}
                quotesTabLabel={t("quotesTab")}
                predictionsTabLabel={t("predictionsTab")}
                quotesMap={quotesMap}
                predictionsMap={predictionsMap}
                designPreviewFavicons={{
                  favicon1: { url: "/logos/unibet.webp", name: "Unibet" },
                  faviconX: { url: "/logos/parions.webp", name: "Parions Sport" },
                  favicon2: { url: "/logos/circular.svg", name: "Bet" },
                }}
                featuredBookmaker={featuredBookmaker ? { bonusUrl: featuredBookmaker.bonusUrl!, buttonText: featuredBookmaker.buttonText, faviconUrl: featuredBookmaker.faviconUrl ?? undefined, logoUrl: featuredBookmaker.logoUrl, name: featuredBookmaker.name, showInPronosticiBox: featuredBookmaker.showInPronosticiBox, pronosticiButtonText: featuredBookmaker.pronosticiButtonText, pronosticiButtonUrl: featuredBookmaker.pronosticiButtonUrl, buttonColor: featuredBookmaker.buttonColor } : null}
                telegramBanner={await getTelegramBannerForCountryAsync(country)}
              />
            </div>
            <HomeBonusSidebar country={country} locale={locale} />
          </div>
        ) : (
          <div className="min-w-0 flex-1 space-y-6">
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-center shadow-sm md:p-8">
              <p className="mb-4 text-sm leading-relaxed text-[var(--foreground-muted)] md:text-base">
                {t("selectSportForMatches", {
                  sport: sport === "tennis" ? tPronostici("tennis") : sport === "basket" ? tPronostici("basket") : tPronostici("rugby"),
                })}
              </p>
              <Link
                href="/pronostici-quote"
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] md:min-h-[36px]"
              >
                {tPronostici("title")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
