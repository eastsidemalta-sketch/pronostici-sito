import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getUpcomingFixtures } from "@/lib/apiFootball";
import { getPredictionsForFixtures } from "@/app/pronostici-quote/lib/apiFootball";
import { getQuotesForFixtures } from "@/lib/quotes/fixturesQuotes";
import { getMenuForCountry, getLeagueIdsForAllSports } from "@/lib/homeMenuData";
import { isSportEnabledForCountry } from "@/lib/sportsPerCountryData";
import { getTelegramBannerForCountryAsync } from "@/lib/telegramBannerConfig";
import { getFeaturedBookmaker } from "@/lib/quotes/bookmakers";
import { localeToCountryCode } from "@/i18n/routing";
import PronosticiQuoteContent from "./PronosticiQuoteContent";
import HomeBonusSidebar from "../HomeBonusSidebar";
import { getOgMetadata } from "@/lib/seo/ogMetadata";
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

  const og = getOgMetadata(locale);
  const t = await getTranslations("pronosticiQuote");

  if (hasFilters) {
    return createNoindexMetadata({
      title: t("title"),
      description: t("description"),
      countryCode: locale,
      pathWithoutCountry: "pronostici-quote",
    });
  }
  return createIndexableMetadata({
    title: og.title,
    description: og.description,
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
  const { tab = "quotes" } = await searchParams;
  const initialTab = tab === "pronostici" ? "pronostici" : "quotes";
  const t = await getTranslations("pronosticiQuote");
  const tHome = await getTranslations("home");

  const country = localeToCountryCode[locale] ?? "IT";
  const menuItems = getMenuForCountry(country);
  const leagueIds = getLeagueIdsForAllSports(country);
  const calcioEnabled = isSportEnabledForCountry(country, "calcio");

  let fixtures: any[] = [];
  if (calcioEnabled && leagueIds.length > 0) {
    try {
      fixtures = await getUpcomingFixtures(leagueIds);
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

  const featuredBookmaker = getFeaturedBookmaker(country);
  const telegramBanner = await getTelegramBannerForCountryAsync(country);

  return (
    <PronosticiQuoteContent
      menuItems={menuItems}
      fixtures={fixtures}
      quotesMap={quotesMap}
      predictionsMap={predictionsMap}
      locale={locale}
      country={country}
      labels={{
        allSports: tHome("allSports"),
        allCompetitions: tHome("allCompetitions"),
        noMatches: tHome("noMatches"),
        compareOdds: tHome("compareOdds"),
        allQuotes: tHome("allQuotes"),
        fullPredictions: tHome("fullPredictions"),
        quotesTab: tHome("quotesTab"),
        predictionsTab: tHome("predictionsTab"),
        pronosticiTitle: t("title"),
      }}
      featuredBookmaker={
        featuredBookmaker
          ? {
              bonusUrl: featuredBookmaker.bonusUrl!,
              buttonText: featuredBookmaker.buttonText,
              faviconUrl: featuredBookmaker.faviconUrl ?? undefined,
              logoUrl: featuredBookmaker.logoUrl,
              name: featuredBookmaker.name,
              showInPronosticiBox: featuredBookmaker.showInPronosticiBox,
              pronosticiButtonText: featuredBookmaker.pronosticiButtonText,
              pronosticiButtonUrl: featuredBookmaker.pronosticiButtonUrl,
              buttonColor: featuredBookmaker.buttonColor,
            }
          : null
      }
      telegramBanner={telegramBanner}
      calcioEnabled={calcioEnabled}
      bonusSidebar={<HomeBonusSidebar country={country} locale={locale} />}
      initialTab={initialTab}
    />
  );
}
