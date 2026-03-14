import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { discoverMapping } from "@/lib/bookmakerApiDiscovery";

/**
 * POST /api/ad2min3k/bookmakers/[id]/discover-mapping
 * Tenta di scoprire automaticamente il mapping dalla risposta API.
 * Body: { rawBody: string } - JSON raw della risposta
 */
export async function POST(
  req: Request,
  _ctx: { params: Promise<{ id: string }> }
) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  let body: { rawBody?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Body JSON richiesto con rawBody" },
      { status: 400 }
    );
  }

  const rawBody = body.rawBody;
  if (!rawBody || typeof rawBody !== "string") {
    return NextResponse.json(
      { error: "rawBody (stringa JSON) richiesto" },
      { status: 400 }
    );
  }

  const result = discoverMapping(rawBody);
  return NextResponse.json(result);
}
