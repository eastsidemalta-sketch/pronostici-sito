import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getBookmakers,
  saveBookmakers,
  generateSiteId,
} from "@/lib/quotes/bookmakersData";
import type { Bookmaker } from "@/lib/quotes/bookmaker.types";
import { readFileSync, existsSync } from "fs";
import path from "path";

const PROFILES_PATH = path.join(process.cwd(), "data", "clientProfiles.json");

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
    const body = (await req.json()) as Partial<Bookmaker> & { pauseOddsApi?: boolean; profileSiteId?: string };
    const country = (body.country || "IT").toUpperCase().slice(0, 2) || "IT";
    let name = (body.name || "Nuovo sito").trim() || "Nuovo sito";
    let countries = Array.isArray(body.countries) && body.countries.length > 0
      ? body.countries
      : [country];
    let logoUrl = body.logoUrl || "";
    let affiliateUrl = body.affiliateUrl || "";
    let apiProvider = body.apiProvider || "direct";
    let apiKey = body.apiKey || "";
    let apiDocumentationUrl = body.apiDocumentationUrl || null;
    let apiEndpoint = body.apiEndpoint || null;
    let apiAuthType = body.apiAuthType || undefined;
    let apiSecret = body.apiSecret ?? null;
    let apiMappingConfig = body.apiMappingConfig ?? null;
    let apiRequestConfig = body.apiRequestConfig ?? undefined;

    // Se profileSiteId è fornito, carica la scheda cliente e merge la config API
    const profileSiteId = body.profileSiteId;
    if (profileSiteId && existsSync(PROFILES_PATH)) {
      try {
        const raw = readFileSync(PROFILES_PATH, "utf-8");
        const profiles = JSON.parse(raw) as Record<string, { api?: { enabled?: boolean; endpoint?: string; documentationUrl?: string; params?: Record<string, string>; mapping?: Record<string, string> }; name?: string; affiliateUrl?: string; logoPath?: string; faviconPath?: string }>;
        const profile = profiles[profileSiteId];
        if (profile) {
          if (profile.name) name = profile.name;
          if (profile.affiliateUrl) affiliateUrl = profile.affiliateUrl;
          if (profile.logoPath) logoUrl = profile.logoPath;
          if (profile.api?.enabled) {
            apiProvider = "direct";
            apiEndpoint = profile.api.endpoint || apiEndpoint;
            apiDocumentationUrl = profile.api.documentationUrl || apiDocumentationUrl;
            apiKey = profile.api.params?.system_code || apiKey;
            apiAuthType = "header";
            apiMappingConfig = profile.api.mapping || apiMappingConfig;
            apiRequestConfig = {
              method: (profile.api as { method?: string }).method === "POST" ? "POST" : "GET",
              queryParams: { ...profile.api.params },
            };
          }
        }
      } catch {
        // ignora errori lettura profilo
      }
    }

    const bookmakers = getBookmakers();
    const siteId = profileSiteId || generateSiteId(country, bookmakers);

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
      logoUrl,
      affiliateUrl,
      isActive: false,
      apiProvider: apiProvider as "direct",
      apiKey,
      apiConfig: { markets: ["h2h"] },
      apiDocumentationUrl,
      apiEndpoint,
      apiAuthType,
      apiSecret,
      apiMappingConfig,
      apiRequestConfig,
    };

    const updated = [...bookmakers, newBm];
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
