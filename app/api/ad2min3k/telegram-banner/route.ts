import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getTelegramBannerConfig,
  saveTelegramBannerConfig,
  getSupportedCountries,
} from "@/lib/telegramBannerConfig";
import type { TelegramBannerConfig } from "@/lib/telegramBannerConfig";

export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const config = getTelegramBannerConfig();
  const countries = getSupportedCountries();
  return NextResponse.json({ config, countries });
}

export async function PUT(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const { config } = (await req.json()) as { config: TelegramBannerConfig };
    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { error: "config richiesto (oggetto)" },
        { status: 400 }
      );
    }

    saveTelegramBannerConfig(config);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Errore nel salvataggio" },
      { status: 500 }
    );
  }
}
