import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getBookmakers,
  saveBookmakers,
  generateSiteId,
} from "@/lib/quotes/bookmakersData";
import type { Bookmaker } from "@/lib/quotes/bookmaker.types";

export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const bookmakers = getBookmakers();
  return NextResponse.json({ bookmakers });
}

export async function PUT(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const bm = (await req.json()) as Bookmaker;
    if (!bm?.id) {
      return NextResponse.json(
        { error: "id richiesto" },
        { status: 400 }
      );
    }

    const bookmakers = getBookmakers();
    const idx = bookmakers.findIndex((b) => b.id === bm.id);
    if (idx < 0) {
      return NextResponse.json(
        { error: "Bookmaker non trovato" },
        { status: 404 }
      );
    }

    const updated = [...bookmakers];
    updated[idx] = { ...updated[idx], ...bm };
    saveBookmakers(updated);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Errore nel salvataggio" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Partial<Bookmaker> & { pauseOddsApi?: boolean };
    const country = (body.country || "IT").toUpperCase().slice(0, 2) || "IT";
    const name = (body.name || "Nuovo sito").trim() || "Nuovo sito";
    const countries = Array.isArray(body.countries) && body.countries.length > 0
      ? body.countries
      : [country];

    const bookmakers = getBookmakers();
    const siteId = generateSiteId(country, bookmakers);

    const slug = (name || "nuovo")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const baseId = slug || "nuovo";
    let id = baseId;
    let n = 1;
    while (bookmakers.some((b) => b.id === id)) {
      id = `${baseId}-${n}`;
      n++;
    }

    const newBm: Bookmaker = {
      id,
      siteId,
      name,
      displayName: body.displayName || null,
      slug: id,
      country,
      countries,
      logoUrl: body.logoUrl || "",
      affiliateUrl: body.affiliateUrl || "",
      isActive: false,
      apiProvider: body.apiProvider || "the_odds_api",
      apiKey: body.apiKey || "",
      apiConfig: { markets: ["h2h"] },
      apiDocumentationUrl: body.apiDocumentationUrl || null,
      apiEndpoint: body.apiEndpoint || null,
      apiAuthType: body.apiAuthType || undefined,
    };

    let updated = [...bookmakers, newBm];

    // Se richiesto, metti in pausa tutti i bookmaker The Odds API
    if (body.pauseOddsApi === true) {
      updated = updated.map((b) =>
        b.apiProvider === "the_odds_api" ? { ...b, isActive: false } : b
      );
    }

    saveBookmakers(updated);

    return NextResponse.json({
      success: true,
      bookmaker: newBm,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Errore nella creazione" },
      { status: 500 }
    );
  }
}
