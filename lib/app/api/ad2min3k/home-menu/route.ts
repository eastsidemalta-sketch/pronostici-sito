import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getHomeMenuConfig,
  saveHomeMenuConfig,
} from "@/lib/homeMenuData";
import type { HomeMenuConfig } from "@/lib/homeMenu";

export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const config = getHomeMenuConfig();
  return NextResponse.json({ config });
}

export async function PUT(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const { config } = (await req.json()) as { config: HomeMenuConfig };
    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { error: "config richiesto" },
        { status: 400 }
      );
    }

    saveHomeMenuConfig(config);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Errore nel salvataggio" },
      { status: 500 }
    );
  }
}
