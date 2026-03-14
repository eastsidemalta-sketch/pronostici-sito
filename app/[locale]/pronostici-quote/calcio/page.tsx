import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCachedHomeData } from "@/lib/homePageCache";
import { getMenuForCountry } from "@/lib/homeMenuData";
import { isSportEnabledForCountry } from "@/lib/sportsPerCountryData";
import { getTelegramBannerForCountryAsync } from "@/lib/telegramBannerConfig";
import { getFeaturedBookmaker } from "@/lib/quotes/bookmakers";
import { localeToCountryCode } from "@/i18n/routing";
import CalcioContent from "./CalcioContent";
import HomeBonusSidebar from "../../HomeBonusSidebar";
import {
  createIndexableMetadata,
  createNoindexMetadata,
} from "@/lib/seo";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ league?: string; tab?: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const hasFilters = Object.keys(sp).length > 0;

  const t = await getTranslations("calcio");
  const title = t("title");
  const description = t("description");

  if (hasFilters) {
    return createNoindexMetadata({
      title,
      description,
      countryCode: locale,
      pathWithoutCountry: "pronostici-quote/calcio",
    });
  }
  return createIndexableMetadata({
    title,
    description,
    countryCode: locale,
    pathWithoutCountry: "pronostici-quote/calcio",
  });
}

export const dynamic = "force-dynamic";

export default async function CalcioPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ league?: string; tab?: string }>;
}) {
  const { locale } = await params;
  // Extract league here with a default fallback
  const { tab = "quotes", league = "all" } = await searchParams;
  const initialTab = tab === "pronostici" ? "pronostici" : "quotes";
  const t = await getTranslations("calcio");
  const tCommon = await getTranslations("common");
  const tHome = await getTranslations("home");

  const country = localeToCountryCode[locale] ?? "IT";
  const menuItems = getMenuForCountry(country);
  const calcioItem = menuItems.find((m) => m.key === "calcio");
  const leagueIds = calcioItem?.subItems?.map((s) => s.id) ?? [];

  const calcioEnabled = isSportEnabledForCountry(country, "calcio");

  let filteredFixtures: any[] = [];
  let quotesMap: Record<number, any> = {};
  let predictionsMap: Record<number, any> = {};

  if (calcioEnabled) {
    // 1. Fetch EVERYTHING from the 30-minute Redis cache (Costs 0 API calls)
    const homeData = await getCachedHomeData(country);

    // 2. Filter the global cache down to just the allowed Calcio leagues
    const calcioFixtures = homeData.fixtures.filter((m: any) => {
      if (leagueIds.length > 0) return leagueIds.includes(m.league?.id);
      return true; // Fallback
    });

    // 3. Apply the URL league filter if one exists
    filteredFixtures = calcioFixtures;
    if (league !== "all") {
      filteredFixtures = filteredFixtures.filter((m: any) => m.league?.id === Number(league));
    }

    // 4. Grab the massive pre-loaded maps from the cron job
    quotesMap = homeData.quotesMap || {};
    predictionsMap = homeData.predictionsMap || {};
  }

  // 5. Pass ALL matches to the client instead of slicing to 15.
  // Because the data is already cached, loading 150 matches is completely free.
  const initialFixtures = filteredFixtures;

  const featuredBookmaker = getFeaturedBookmaker(country);
  const telegramBanner = await getTelegramBannerForCountryAsync(country);

  const introContent = (
    <div className="prose prose-sm max-w-none text-[var(--foreground-muted)]">
      <p>{t("intro")}</p>
      <h2 className="mt-6 text-base font-semibold text-[var(--foreground)]">Cosa trovi qui</h2>
      <p>{t("cosaTrovi")}</p>
      <h2 className="mt-6 text-base font-semibold text-[var(--foreground)]">Perché consultarla</h2>
      <p>{t("percheConsultarla")}</p>
      <h2 className="mt-6 text-base font-semibold text-[var(--foreground)]">Collegamenti utili</h2>
      <p>{t("collegamentiUtili")}</p>
    </div>
  );

  return (
    <CalcioContent
      menuItems={menuItems}
      fixtures={initialFixtures}
      quotesMap={quotesMap}
      predictionsMap={predictionsMap}
      locale={locale}
      country={country}
      labels={{
        allSports: tHome("allSports"),
        allCompetitions: tHome("allCompetitions"),
        noMatches: t("noMatches"),
        compareOdds: tHome("compareOdds"),
        allQuotes: tHome("allQuotes"),
        fullPredictions: tHome("fullPredictions"),
        quotesTab: tHome("quotesTab"),
        predictionsTab: tHome("predictionsTab"),
        home: tCommon("home"),
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
      bonusSidebar={<HomeBonusSidebar country={country} locale={locale} />}
      initialTab={initialTab}
      introContent={introContent}
    />
  );
}