import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getSportsConfig,
  saveSportsConfig,
} from "@/lib/sportsPerCountryData";
import type { SportsConfig } from "@/lib/sportsPerCountry";

export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const config = getSportsConfig();
  return NextResponse.json({ config });
}

export async function PUT(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const { config } = (await req.json()) as { config: SportsConfig };
    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { error: "config richiesto" },
        { status: 400 }
      );
    }
    if (!config.sports || !config.localePerCountry) {
      return NextResponse.json(
        { error: "config.sports e config.localePerCountry richiesti" },
        { status: 400 }
      );
    }

    saveSportsConfig(config);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Errore nel salvataggio" },
      { status: 500 }
    );
  }
}
