import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getTelegramChannelsConfig,
  saveTelegramChannelsConfig,
  getSupportedCountries,
  warmTelegramChannelsConfigCache,
} from "@/lib/telegramChannelsConfig";
import type { TelegramChannelsConfig } from "@/lib/telegramChannelsConfig";

export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  await warmTelegramChannelsConfigCache();
  const config = getTelegramChannelsConfig();
  const countries = getSupportedCountries();
  return NextResponse.json({ config, countries });
}

export async function PUT(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const { config } = (await req.json()) as { config: TelegramChannelsConfig };
    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { error: "config richiesto (oggetto)" },
        { status: 400 }
      );
    }

    await warmTelegramChannelsConfigCache();
    saveTelegramChannelsConfig(config);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Errore nel salvataggio" },
      { status: 500 }
    );
  }
}
