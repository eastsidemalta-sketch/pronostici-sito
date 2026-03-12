import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getMenuForCountry } from "@/lib/homeMenuData";
import { isSportEnabledForCountry } from "@/lib/sportsPerCountryData";
import { localeToCountryCode } from "@/i18n/routing";
import HomeDataLoader from "./HomeDataLoader";
import HomeLoadingSkeleton from "./HomeLoadingSkeleton";
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
  searchParams?: Promise<{ sport?: string; league?: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const sp = searchParams ? await searchParams : {};
  const hasFilters = Object.keys(sp ?? {}).length > 0;

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

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ refresh?: string }>;
}) {
  const { locale } = await params;
  const sp = searchParams ? await searchParams : {};
  const bypassCache = sp?.refresh === "1";

  const t = await getTranslations("home");
  const tPronostici = await getTranslations("pronosticiQuote");

  const country = localeToCountryCode[locale] ?? "IT";
  const menuItems = getMenuForCountry(country);
  const calcioEnabled = isSportEnabledForCountry(country, "calcio");

  const labels = {
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
  };

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Suspense fallback={<HomeLoadingSkeleton />}>
        <HomeDataLoader
          country={country}
          locale={locale}
          bypassCache={bypassCache}
          league={league}
          sport={sport}
          menuItems={menuItems}
          calcioEnabled={calcioEnabled}
          labels={labels}
        />
      </Suspense>
    </main>
  );
}
