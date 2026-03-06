import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getTeamAliasesByProvider,
  saveTeamAliasesByProvider,
  type TeamAliasesByProviderConfig,
} from "@/lib/teamAliasesByProvider";
import {
  getCategoryMappingByProvider,
  saveCategoryMappingByProvider,
  getDefaultCategories,
  type CategoryMappingByProviderConfig,
} from "@/lib/categoryMappingByProvider";
import { getCachedMatchSample } from "@/lib/quotes/providers/netwinCache";
import { getBookmakers } from "@/lib/quotes/bookmakers";
import { fetchDirectBookmakerQuotes } from "@/lib/quotes/providers/directBookmakerFetcher";
/** GET: restituisce mapping attuale + campioni da ogni provider per confronto */
export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const mapping = getTeamAliasesByProvider();
  const providers = getBookmakers()
    .filter((b) => b.apiProvider === "direct" && b.isActive)
    .map((b) => ({
      key: (b.apiBookmakerKey ?? b.id ?? "").toLowerCase(),
      name: b.name,
    }));

  const samples: Record<string, Array<{ homeTeam: string; awayTeam: string }>> = {};
  for (const p of providers) {
    if (p.key === "netwinit") {
      samples[p.key] = getCachedMatchSample(30);
    } else if (p.key === "betboom") {
      try {
        const bm = getBookmakers().find(
          (b) => (b.apiBookmakerKey ?? b.id)?.toLowerCase() === p.key
        );
        if (bm) {
          const res = await fetchDirectBookmakerQuotes(bm, 71);
          const h2h = res.h2h ?? [];
          samples[p.key] = h2h.slice(0, 30).map((q) => ({
            homeTeam: q.homeTeam,
            awayTeam: q.awayTeam,
          }));
        }
      } catch {
        samples[p.key] = [];
      }
    } else {
      samples[p.key] = [];
    }
  }

  const categoryMapping = getCategoryMappingByProvider();
  const defaultCategories = getDefaultCategories();

  return NextResponse.json({
    mapping,
    categoryMapping,
    defaultCategories,
    providers,
    samples,
    hint: "API Football usa nomi come Napoli, Torino, Inter. Confronta con samples per vedere differenze. Aggiungi mapping in teamAliasesByProvider: apiFootballName -> providerName.",
  });
}

/** PUT: salva mapping per-provider */
export async function PUT(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as {
      mapping?: TeamAliasesByProviderConfig;
      categoryMapping?: CategoryMappingByProviderConfig;
    };
    if (body?.mapping && typeof body.mapping === "object") {
      saveTeamAliasesByProvider(body.mapping);
    }
    if (body?.categoryMapping && typeof body.categoryMapping === "object") {
      saveCategoryMappingByProvider(body.categoryMapping);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore scrittura file";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
