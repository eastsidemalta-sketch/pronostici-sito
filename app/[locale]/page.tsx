import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getMenuForCountry } from "@/lib/homeMenuData";
import { getCachedHomeData } from "@/lib/homePageCache";
import { isSportEnabledForCountry } from "@/lib/sportsPerCountryData";
import { getTelegramBannerForCountryAsync } from "@/lib/telegramBannerConfig";
import { getQuotesForFixtures } from "@/lib/quotes/fixturesQuotes";
import { getFeaturedBookmaker } from "@/lib/quotes/bookmakers";
import { localeToCountryCode } from "@/i18n/routing";
import HomeContent from "./HomeContent";
import HomeBonusSidebar from "./HomeBonusSidebar";
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
  searchParams: Promise<{ sport?: string; league?: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const hasFilters = Object.keys(sp).length > 0;

  const og = getOgMetadata(locale);
  const t = await getTranslations("home");

  if (hasFilters) {
    return createNoindexMetadata({
      title: t("title"),
      description: t("description"),
      countryCode: locale,
      pathWithoutCountry: "",
    });
  }
  return createIndexableMetadata({
    title: og.title,
    description: og.description,
    countryCode: locale,
    pathWithoutCountry: "",
  });
}

/** Cache 30 secondi: riduce carico API e velocizza il caricamento */
export const revalidate = 30;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const tPronostici = await getTranslations("pronosticiQuote");

  const country = localeToCountryCode[locale] ?? "IT";
  const menuItems = getMenuForCountry(country);
  const calcioEnabled = isSportEnabledForCountry(country, "calcio");

  const { fixtures, quotesMap, predictionsMap } = await getCachedHomeData(country);

  const featuredBookmaker = getFeaturedBookmaker(country);
  const telegramBanner = await getTelegramBannerForCountryAsync(country);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <HomeContent
        menuItems={menuItems}
        fixtures={fixtures}
        quotesMap={quotesMap}
        predictionsMap={predictionsMap}
        locale={locale}
        country={country}
        labels={{
          allSports: t("allSports"),
          allCompetitions: t("allCompetitions"),
          noMatches: t("noMatches"),
          compareOdds: t("compareOdds"),
          allQuotes: t("allQuotes"),
          fullPredictions: t("fullPredictions"),
          quotesTab: t("quotesTab"),
          predictionsTab: t("predictionsTab"),
          selectSportForMatches: t.raw("selectSportForMatches") as (opts: { sport: string }) => string,
          pronosticiTitle: tPronostici("title"),
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
      />
    </main>
  );
}
