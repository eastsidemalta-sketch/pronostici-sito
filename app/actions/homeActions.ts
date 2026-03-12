"use server";

import { getCachedHomeData } from "@/lib/homePageCache";

export async function getPaginatedMatches(
  country: string, 
  leagueFilter: string, 
  offset: number, 
  limit: number = 15
) {
  // Prendi tutti i dati dalla cache globale (molto veloce)
  const data = await getCachedHomeData(country, false);

  // 1. Applica il filtro della lega se l'utente ne ha selezionata una
  let filtered = data.fixtures;
  if (leagueFilter !== "all") {
    filtered = filtered.filter((m: any) => m.league?.id === Number(leagueFilter));
  }

  // 2. Taglia l'array per restituire solo il blocco richiesto (es. da 15 a 30)
  const slicedFixtures = filtered.slice(offset, offset + limit);

  // 3. Estrai solo le quote e pronostici di queste specifiche partite
  // (Fondamentale per non ingombrare la rete con dati inutili)
  const quotesMap: Record<number, any> = {};
  const predictionsMap: Record<number, any> = {};
  
  slicedFixtures.forEach((m: any) => {
    const id = m.fixture.id;
    if (data.quotesMap[id]) quotesMap[id] = data.quotesMap[id];
    if (data.predictionsMap[id]) predictionsMap[id] = data.predictionsMap[id];
  });

  return {
    fixtures: slicedFixtures,
    quotesMap,
    predictionsMap,
    hasMore: offset + limit < filtered.length // true se ci sono ancora partite
  };
}