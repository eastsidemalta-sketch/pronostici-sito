import { NextResponse } from "next/server";
import { getFixtureDetails } from "@/lib/apiFootball";

async function fetchTeamFixturesRaw(
  teamId: number,
  params: { last?: number; from?: string; to?: string }
): Promise<{ url: string; data: any }> {
  const q: Record<string, string> = { team: String(teamId) };
  if (params.last != null) q.last = String(params.last);
  if (params.from != null) q.from = params.from;
  if (params.to != null) q.to = params.to;
  const search = new URLSearchParams(q);
  const url = `https://v3.football.api-sports.io/fixtures?${search}`;
  const key = process.env.API_FOOTBALL_KEY;
  const res = await fetch(url, {
    headers: { "x-apisports-key": key ?? "" },
    cache: "no-store",
  });
  const data = await res.json();
  return { url, data };
}

export async function GET() {
  const fixture = await getFixtureDetails("1378119");
  if (!fixture) return NextResponse.json({ error: "Fixture not found" });

  const awayId = fixture.teams.away.id;
  const awayName = fixture.teams.away.name;

  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - 90);
  const fromStr = fromDate.toISOString().split("T")[0];
  const toStr = today.toISOString().split("T")[0];

  const [byLast, byDateRange] = await Promise.all([
    fetchTeamFixturesRaw(awayId, { last: 30 }),
    fetchTeamFixturesRaw(awayId, { from: fromStr, to: toStr }),
  ]);

  const fixtures = byDateRange.data.response || [];
  const napoliComo = fixtures.filter(
    (f: any) =>
      (f.teams?.home?.name?.toLowerCase().includes("napoli") &&
        f.teams?.away?.name?.toLowerCase().includes("como")) ||
      (f.teams?.home?.name?.toLowerCase().includes("como") &&
        f.teams?.away?.name?.toLowerCase().includes("napoli"))
  );

  const napoliComoDetail = napoliComo.map((f: any) => ({
    id: f.fixture?.id,
    date: f.fixture?.date,
    status: f.fixture?.status?.short,
    goals: f.goals,
    home: f.teams?.home?.name,
    away: f.teams?.away?.name,
  }));

  return NextResponse.json({
    team: { id: awayId, name: awayName },
    byLast: {
      url: byLast.url,
      count: byLast.data.response?.length ?? 0,
      fixtures: (byLast.data.response || []).map((f: any) => ({
        id: f.fixture?.id,
        date: f.fixture?.date,
        home: f.teams?.home?.name,
        away: f.teams?.away?.name,
        league: f.league?.name,
        status: f.fixture?.status?.short,
      })),
    },
    byDateRange: {
      url: byDateRange.url,
      count: fixtures.length,
      napoliComoFound: napoliComo.length,
      napoliComoDetail,
      fixtures: fixtures.map((f: any) => ({
        id: f.fixture?.id,
        date: f.fixture?.date,
        home: f.teams?.home?.name,
        away: f.teams?.away?.name,
        league: f.league?.name,
        status: f.fixture?.status?.short,
      })),
    },
  });
}
