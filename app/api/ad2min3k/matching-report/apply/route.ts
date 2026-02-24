import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBookmakers, saveBookmakers } from "@/lib/quotes/bookmakersData";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

const TEAM_ALIASES_PATH = path.join(process.cwd(), "data", "teamAliases.json");

export async function POST(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  let body: {
    type?: "team_alias" | "league_mapping";
    apiFootball?: string;
    bookmakerVariant?: string;
    bookmakerId?: string;
    leagueId?: number;
    suggestedValue?: string;
  };
  try {
    body = (await req.json()) ?? {};
  } catch {
    return NextResponse.json({ error: "Body JSON richiesto" }, { status: 400 });
  }

  if (!body?.type) {
    return NextResponse.json({ error: "type richiesto (team_alias o league_mapping)" }, { status: 400 });
  }

  if (body.type === "team_alias") {
    const { apiFootball, bookmakerVariant } = body;
    if (!apiFootball || !bookmakerVariant) {
      return NextResponse.json(
        { error: "apiFootball e bookmakerVariant richiesti" },
        { status: 400 }
      );
    }

    let aliases: Record<string, string[]> = {};
    try {
      if (existsSync(TEAM_ALIASES_PATH)) {
        aliases = JSON.parse(readFileSync(TEAM_ALIASES_PATH, "utf-8"));
      }
    } catch {
      // fresh
    }

    const existing = aliases[apiFootball] ?? [];
    if (!existing.includes(bookmakerVariant)) {
      aliases[apiFootball] = [...existing, bookmakerVariant];
    }

    const dir = path.dirname(TEAM_ALIASES_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(TEAM_ALIASES_PATH, JSON.stringify(aliases, null, 2));

    return NextResponse.json({ success: true, aliases });
  }

  if (body.type === "league_mapping") {
    const { bookmakerId, leagueId, suggestedValue } = body;
    if (!bookmakerId || leagueId == null) {
      return NextResponse.json(
        { error: "bookmakerId e leagueId richiesti" },
        { status: 400 }
      );
    }

    const bookmakers = getBookmakers();
    const bm = bookmakers.find((b) => b.id === bookmakerId);
    if (!bm) {
      return NextResponse.json({ error: "Bookmaker non trovato" }, { status: 404 });
    }

    const mapping = { ...(bm.apiLeagueMapping ?? {}) };
    mapping[String(leagueId)] = suggestedValue ?? String(leagueId);

    const updated = bookmakers.map((b) =>
      b.id === bookmakerId ? { ...b, apiLeagueMapping: mapping } : b
    );
    saveBookmakers(updated);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { error: "type deve essere team_alias o league_mapping" },
    { status: 400 }
  );
}
