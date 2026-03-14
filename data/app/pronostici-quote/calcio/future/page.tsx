import type { Metadata } from "next";
import { getUpcomingFixtures } from "@/lib/apiFootball";
import FixturesList from "../FixturesList";

export const metadata: Metadata = {
  title: "Partite Calcio Future",
  description: "Calendario partite calcio da oggi ai prossimi 7 giorni. Pronostici e quote per le prossime partite di Serie A, Premier, Champions.",
};

export default async function FutureFixturesPage() {
  const fixtures = await getUpcomingFixtures(); // Da oggi ai prossimi 7 giorni

  const sortedFixtures = fixtures?.sort((a: any, b: any) => {
    const dateA = new Date(a.fixture.date).getTime();
    const dateB = new Date(b.fixture.date).getTime();
    return dateA - dateB;
  });

  // Raggruppa per campionato e data
  const acc: Record<string, { league: any; date: string; matches: any[] }> = {};
  sortedFixtures?.forEach((match: any) => {
    const dateStr = new Date(match.fixture.date).toISOString().split("T")[0];
    const key = `${match.league.id}-${dateStr}`;
    if (!acc[key]) acc[key] = { league: match.league, date: dateStr, matches: [] };
    acc[key].matches.push(match);
  });
  const leagues = Object.values(acc).sort((a, b) => a.date.localeCompare(b.date));
  const totalMatches = fixtures?.length ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Partite Future</h1>
        <a
          href="/pronostici-quote/calcio"
          className="text-sm text-[var(--foreground)] hover:text-[var(--foreground-muted)] underline"
        >
          Vedi partite in diretta →
        </a>
      </div>
      
      {totalMatches > 0 ? (
        <FixturesList leagues={leagues} totalMatches={totalMatches} />
      ) : (
        <div className="rounded-xl border bg-neutral-50 p-8 text-center">
          <p className="text-gray-600">Nessuna partita programmata nei prossimi 7 giorni</p>
        </div>
      )}
    </main>
  );
}
