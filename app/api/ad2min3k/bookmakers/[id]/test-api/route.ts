import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBookmakers } from "@/lib/quotes/bookmakersData";
import { testBookmakerApi } from "@/lib/bookmakerApiDiscovery";

/**
 * POST /api/ad2min3k/bookmakers/[id]/test-api
 * Testa la connessione all'API diretta del bookmaker.
 * Body: { apiEndpoint?, apiKey?, apiSecret?, authType?, method? }
 * Se mancano, usa i valori salvati nel bookmaker.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = await params;
  const bookmakers = getBookmakers();
  const bm = bookmakers.find((b) => b.id === id);
  if (!bm) {
    return NextResponse.json({ error: "Bookmaker non trovato" }, { status: 404 });
  }

  let body: Partial<{
    apiEndpoint: string;
    apiKey: string;
    apiSecret: string;
    authType: "query" | "header" | "bearer";
    method: "GET" | "POST";
  }> = {};
  try {
    body = await req.json();
  } catch {
    // body vuoto, usa valori dal bookmaker
  }

  const apiEndpoint = body.apiEndpoint ?? bm.apiEndpoint ?? "";
  const apiKey = body.apiKey ?? bm.apiKey ?? "";
  const apiSecret = body.apiSecret ?? bm.apiSecret ?? undefined;
  const authType = body.authType ?? bm.apiAuthType ?? "query";
  const method = body.method ?? "GET";

  if (!apiEndpoint) {
    return NextResponse.json(
      { error: "Endpoint API richiesto. Inseriscilo nella form o nel body." },
      { status: 400 }
    );
  }

  const result = await testBookmakerApi({
    apiEndpoint,
    apiKey,
    apiSecret,
    authType,
    method,
  });

  return NextResponse.json(result);
}
