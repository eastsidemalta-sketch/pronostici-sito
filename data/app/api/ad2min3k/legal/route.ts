import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getLegalAdminConfig,
  saveLegalAdminConfig,
  type LegalAdminConfig,
} from "@/lib/legalData";

export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const config = getLegalAdminConfig();
  return NextResponse.json({ config });
}

export async function PUT(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const { config } = (await req.json()) as { config: LegalAdminConfig };
    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { error: "config richiesto" },
        { status: 400 }
      );
    }

    saveLegalAdminConfig(config);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Errore nel salvataggio" },
      { status: 500 }
    );
  }
}
