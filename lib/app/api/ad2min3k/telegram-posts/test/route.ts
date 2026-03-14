import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/** Endpoint di test: verifica che l'API sia raggiungibile e il token configurato */
export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Non autorizzato" }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token?.trim()) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN non configurato sul server" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "API raggiungibile, token configurato",
  });
}
