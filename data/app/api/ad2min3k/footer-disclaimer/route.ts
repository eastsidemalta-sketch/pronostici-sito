import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getFooterDisclaimerConfig,
  saveFooterDisclaimerConfig,
  type FooterDisclaimerConfig,
} from "@/lib/footerDisclaimerConfig";

export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const config = getFooterDisclaimerConfig();
  return NextResponse.json({ config });
}

export async function PUT(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const { config } = (await req.json()) as { config: FooterDisclaimerConfig };
    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { error: "config richiesto" },
        { status: 400 }
      );
    }

    saveFooterDisclaimerConfig(config);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Errore nel salvataggio" },
      { status: 500 }
    );
  }
}
