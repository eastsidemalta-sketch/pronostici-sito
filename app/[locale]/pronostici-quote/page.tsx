import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getUpcomingFixtures } from "@/lib/apiFootball";
import { getPredictionsForFixtures } from "@/app/pronostici-quote/lib/apiFootball";
import { getQuotesForFixtures } from "@/lib/quotes/fixturesQuotes";
import { getMenuForCountry, getLeagueIdsForAllSports } from "@/lib/homeMenuData";
import { isSportEnabledForCountry } from "@/lib/sportsPerCountryData";
import { getTelegramBannerForCountryAsync } from "@/lib/telegramBannerConfig";
import { getFeaturedBookmaker } from "@/lib/quotes/bookmakers";
import { localeToCountryCode } from "@/i18n/routing";
import HomeBanner from "../HomeBanner";
import HomeMatchesList from "../HomeMatchesList";
import HomeBonusSidebar from "../HomeBonusSidebar";
import {
  createIndexableMetadata,
  createNoindexMetadata,
} from "@/lib/seo";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sport?: string; league?: string; tab?: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const hasFilters = Object.keys(sp).length > 0;

  const t = await getTranslations("pronosticiQuote");
  const title = t("title");
  const description = t("description");

  if (hasFilters) {
    return createNoindexMetadata({
      title,
      description,
      countryCode: locale,
      pathWithoutCountry: "pronostici-quote",
    });
  }
  return createIndexableMetadata({
    title,
    description,
    countryCode: locale,
    pathWithoutCountry: "pronostici-quote",
  });
}

export const dynamic = "force-dynamic";

export default async function PronosticiQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sport?: string; league?: string; tab?: string }>;
}) {
  const { locale } = await params;
  const { sport = "all", league = "all", tab = "quotes" } = await searchParams;
  const initialTab = tab === "pronostici" ? "pronostici" : "quotes";
  const t = await getTranslations("pronosticiQuote");
  const tHome = await getTranslations("home");

  const country = localeToCountryCode[locale] ?? "IT";
  const menuItems = getMenuForCountry(country);
  const calcioItem = menuItems.find((m) => m.key === "calcio");
  const leagueIds =
    sport === "all"
      ? getLeagueIdsForAllSports(country)
      : (calcioItem?.subItems?.map((s) => s.id) ?? []);

  let fixtures: any[] = [];
  const calcioEnabled = isSportEnabledForCountry(country, "calcio");
  const showCalcioFixtures = (sport === "all" || sport === "calcio") && calcioEnabled;

  if (showCalcioFixtures && leagueIds.length > 0) {
    try {
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
    } catch (e) {
      console.error("getUpcomingFixtures error:", e);
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
      // Quote API può fallire - continua senza quote
    }
  }

  const labels = {
    allSports: tHome("allSports"),
    allCompetitions: tHome("allCompetitions"),
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

      {/* Contenuto: lista partite + sidebar bonus - stesso layout della home */}
      <div className="mx-auto max-w-6xl px-3 pt-4 pb-2 sm:px-4 sm:pt-3 sm:pb-3 md:px-5 md:py-4">
        {showCalcioFixtures ? (
          <div className="flex flex-col gap-6 sm:gap-6 lg:flex-row lg:items-start lg:gap-6">
            <div className="min-w-0 flex-1">
              <HomeMatchesList
                fixtures={fixtures}
                locale={locale}
                initialTab={initialTab}
                noMatchesLabel={tHome("noMatches")}
                compareLabel={tHome("compareOdds")}
                allQuotesLabel={tHome("allQuotes")}
                fullPredictionsLabel={tHome("fullPredictions")}
                quotesTabLabel={tHome("quotesTab")}
                predictionsTabLabel={tHome("predictionsTab")}
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
                {tHome("selectSportForMatches", {
                  sport:
                    sport === "tennis"
                      ? t("tennis")
                      : sport === "basket"
                        ? t("basket")
                        : t("rugby"),
                })}
              </p>
              <Link
                href="/pronostici-quote"
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] md:min-h-[36px]"
              >
                {t("title")}
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
