import { getCachedHomeData } from "@/lib/homePageCache";
import { getTelegramBannerForCountryAsync } from "@/lib/telegramBannerConfig";
import { getFeaturedBookmaker } from "@/lib/quotes/bookmakers";
import HomeContent from "./HomeContent";
import HomeBonusSidebar from "./HomeBonusSidebar";
import type { MenuItem } from "@/lib/homeMenu";

type Props = {
  country: string;
  locale: string;
  bypassCache: boolean;
  menuItems: MenuItem[];
  calcioEnabled: boolean;
  labels: {
    allSports: string;
    allCompetitions: string;
    noMatches: string;
    compareOdds: string;
    allQuotes: string;
    fullPredictions: string;
    quotesTab: string;
    predictionsTab: string;
    selectSportForMatches: (opts: { sport: string }) => string;
    pronosticiTitle: string;
  };
};

/**
 * Componente async che carica i dati home e sospende durante il fetch.
 * Permette allo streaming di mostrare subito il fallback mentre i dati arrivano.
 */
export default async function HomeDataLoader({
  country,
  locale,
  bypassCache,
  menuItems,
  calcioEnabled,
  labels,
}: Props) {
  const [cachedData, telegramBanner] = await Promise.all([
    getCachedHomeData(country, bypassCache),
    getTelegramBannerForCountryAsync(country),
  ]);

  const featuredBookmaker = getFeaturedBookmaker(country);

  return (
    <HomeContent
      menuItems={menuItems}
      fixtures={cachedData.fixtures}
      quotesMap={cachedData.quotesMap}
      predictionsMap={cachedData.predictionsMap}
      locale={locale}
      country={country}
      labels={labels}
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
  );
}
