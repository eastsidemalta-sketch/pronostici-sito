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
  let filteredFixtures = cachedData.fixtures;

  if (!showCalcioFixtures) {
    filteredFixtures = [];
  } else if (league !== "all") {
    filteredFixtures = filteredFixtures.filter((m: any) => m.league?.id === Number(league));
  }

  // Prendi solo i primi 15 match
  const initialFixtures = filteredFixtures.slice(0, 15);

  // Filtra Quote e Pronostici in modo da inviare via rete SOLO quelli dei 15 match visibili
  const quotesMap: Record<number, any> = {};
  const predictionsMap: Record<number, any> = {};

  initialFixtures.forEach((m: any) => {
    const id = m.fixture.id;
    if (cachedData.quotesMap[id]) quotesMap[id] = cachedData.quotesMap[id];
    if (cachedData.predictionsMap[id]) predictionsMap[id] = cachedData.predictionsMap[id];
  });
  // ------------------------------------------------
  return (
    <HomeContent
      menuItems={menuItems}
      fixtures={initialFixtures}
      quotesMap={quotesMap}
      predictionsMap={predictionsMap}
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
