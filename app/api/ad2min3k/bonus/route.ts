import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getBonusOrderConfig,
  saveBonusOrderConfig,
  getSupportedCountries,
} from "@/lib/bonusOrderConfig";
import type { BonusOrderConfig } from "@/lib/bonusOrderConfig";
import { getBookmakers } from "@/lib/quotes/bookmakers";

function getBookmakersWithBonusByCountry(): Record<string, { id: string; name: string }[]> {
  const bookmakers = getBookmakers();
  const countries = getSupportedCountries();
  const result: Record<string, { id: string; name: string }[]> = {};
  for (const country of countries) {
    const withBonus = bookmakers.filter(
      (bm) =>
        bm.isActive &&
        (bm.countries?.includes(country) ||
          bm.country === country ||
          bm.countryConfig?.[country]) &&
        bm.countryConfig?.[country]?.bonusDescription
    );
    result[country] = withBonus.map((b) => ({ id: b.id, name: b.name }));
  }
  return result;
}

export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const config = getBonusOrderConfig();
  const countries = getSupportedCountries();
  const bookmakersByCountry = getBookmakersWithBonusByCountry();
  return NextResponse.json({ config, countries, bookmakersByCountry });
}

export async function PUT(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const { config } = (await req.json()) as { config: BonusOrderConfig };
    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { error: "config richiesto (oggetto)" },
        { status: 400 }
      );
    }

    saveBonusOrderConfig(config);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Errore nel salvataggio" },
      { status: 500 }
    );
  }
}
