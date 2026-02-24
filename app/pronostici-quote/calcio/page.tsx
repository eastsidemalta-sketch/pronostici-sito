import type { Metadata } from "next";
import { getUpcomingFixtures } from "@/lib/apiFootball";
import FixturesList from "./FixturesList";

export const metadata: Metadata = {
  title: "Partite Calcio",
  description:
    "Partite calcio da oggi ai prossimi 7 giorni. Live, pronostici e quote. Serie A, Premier League, Champions e altre competizioni.",
};

export const dynamic = "force-dynamic";

/* =====================
   Utils
===================== */

function groupByLeagueAndDate(fixtures: any[]) {
  const acc: Record<
    string,
    { league: any; date: string; matches: any[] }
  > = {};

  fixtures?.forEach((match: any) => {
    const dateStr = new Date(match.fixture.date)
      .toISOString()
      .split("T")[0];

    const key = `${match.league.id}-${dateStr}`;

    if (!acc[key]) {
      acc[key] = {
        league: match.league,
        date: dateStr,
        matches: [],
      };
    }

    acc[key].matches.push(match);
  });

  return Object.values(acc).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

/* =====================
   Page
===================== */

export default async function CalcioPage() {
  const fixtures = await getUpcomingFixtures();
  const leagues = groupByLeagueAndDate(fixtures);
  const hasFixtures = fixtures?.length > 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Partite Calcio</h1>
      </div>

      {hasFixtures ? (
        <FixturesList
          leagues={leagues}
          totalMatches={fixtures.length}
        />
      ) : (
        <div className="rounded-xl border bg-neutral-50 p-8 text-center">
          <p className="text-gray-600">
            Nessuna partita nei prossimi 7 giorni
          </p>
        </div>
      )}
    </main>
  );
}