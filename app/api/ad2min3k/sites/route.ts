import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getSitesOrderConfig,
  saveSitesOrderConfig,
  getSupportedCountries,
} from "@/lib/sitesOrderConfig";
import type { SitesOrderConfig } from "@/lib/sitesOrderConfig";
import { getBookmakers } from "@/lib/quotes/bookmakers";

function getBookmakersByCountry(): Record<string, { id: string; name: string }[]> {
  const bookmakers = getBookmakers();
  const countries = getSupportedCountries();
  const result: Record<string, { id: string; name: string }[]> = {};
  for (const country of countries) {
    const forCountry = bookmakers.filter(
      (bm) =>
        bm.isActive &&
        (bm.countries?.includes(country) ||
          bm.country === country ||
          bm.countryConfig?.[country])
    );
    result[country] = forCountry.map((b) => ({ id: b.id, name: b.name }));
  }
  return result;
}

export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const config = getSitesOrderConfig();
  const countries = getSupportedCountries();
  const bookmakersByCountry = getBookmakersByCountry();
  return NextResponse.json({ config, countries, bookmakersByCountry });
}

export async function PUT(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const { config } = (await req.json()) as { config: SitesOrderConfig };
    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { error: "config richiesto (oggetto)" },
        { status: 400 }
      );
    }

    saveSitesOrderConfig(config);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Errore nel salvataggio" },
      { status: 500 }
    );
  }
}
