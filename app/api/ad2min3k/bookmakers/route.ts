import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBookmakers, saveBookmakers } from "@/lib/quotes/bookmakersData";
import type { Bookmaker } from "@/lib/quotes/bookmaker.types";

export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const bookmakers = getBookmakers();
  return NextResponse.json({ bookmakers });
}

export async function PUT(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const bm = (await req.json()) as Bookmaker;
    if (!bm?.id) {
      return NextResponse.json(
        { error: "id richiesto" },
        { status: 400 }
      );
    }

    const bookmakers = getBookmakers();
    const idx = bookmakers.findIndex((b) => b.id === bm.id);
    if (idx < 0) {
      return NextResponse.json(
        { error: "Bookmaker non trovato" },
        { status: 404 }
      );
    }

    const updated = [...bookmakers];
    updated[idx] = { ...updated[idx], ...bm };
    saveBookmakers(updated);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Errore nel salvataggio" },
      { status: 500 }
    );
  }
}
