"use server";

import { getCachedHomeData } from "@/lib/homePageCache";
import { getQuotesForFixtures } from "@/lib/quotes/fixturesQuotes"; // ADD IMPORT
import { getPredictionsForFixtures } from "@/app/pronostici-quote/lib/apiFootball"; // ADD IMPORT

export async function getPaginatedMatches(
  country: string, 
  leagueFilter: string, 
  offset: number, 
  limit: number = 15
) {
  // Get all data from global cache
  const data = await getCachedHomeData(country, false);

  // 1. Apply the league filter
  let filtered = data.fixtures;
  if (leagueFilter !== "all") {
    filtered = filtered.filter((m: any) => m.league?.id === Number(leagueFilter));
  }

  // 2. Slice the array for the requested chunk (e.g., 15 to 30)
  const slicedFixtures = filtered.slice(offset, offset + limit);

  // 3. Extract cached data and identify missing data
  const quotesMap: Record<number, any> = {};
  const predictionsMap: Record<number, any> = {};
  
  const missingQuoteFixtures: any[] = [];
  const missingPredictionIds: number[] = [];

  slicedFixtures.forEach((m: any) => {
    const id = m.fixture.id;
    if (data.quotesMap[id]) {
      quotesMap[id] = data.quotesMap[id];
    } else {
      missingQuoteFixtures.push(m);
    }
    
    if (data.predictionsMap[id]) {
      predictionsMap[id] = data.predictionsMap[id];
    } else {
      missingPredictionIds.push(id);
    }
  });

  // 4. Fetch missing quotes/predictions on the fly for pagination
  if (missingQuoteFixtures.length > 0 || missingPredictionIds.length > 0) {
    const [newQuotes, newPredictions] = await Promise.all([
      missingQuoteFixtures.length > 0 ? getQuotesForFixtures(missingQuoteFixtures, country) : Promise.resolve({}),
      missingPredictionIds.length > 0 ? getPredictionsForFixtures(missingPredictionIds) : Promise.resolve({})
    ]);
    
    Object.assign(quotesMap, newQuotes);
    Object.assign(predictionsMap, newPredictions);
  }

  return {
    fixtures: slicedFixtures,
    quotesMap,
    predictionsMap,
    hasMore: offset + limit < filtered.length
  };
}