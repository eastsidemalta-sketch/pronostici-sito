/**
 * GET /api/ad2min3k/client-profiles?siteId=IT-0002
 * Restituisce la scheda cliente per l'admin (nome, API, logo, ecc.)
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readFileSync, existsSync } from "fs";
import path from "path";

const PROFILES_PATH = path.join(process.cwd(), "data", "clientProfiles.json");

export async function GET(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");

  if (!existsSync(PROFILES_PATH)) {
    return NextResponse.json({ profiles: {}, profile: null });
  }

  try {
    const raw = readFileSync(PROFILES_PATH, "utf-8");
    const profiles = JSON.parse(raw) as Record<string, unknown>;

    if (siteId) {
      const profile = profiles[siteId] ?? null;
      return NextResponse.json({ profile, profiles: Object.keys(profiles) });
    }

    return NextResponse.json({ profiles });
  } catch {
    return NextResponse.json({ profiles: {}, profile: null });
  }
}
