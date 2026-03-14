import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBookmakers, saveBookmakers } from "@/lib/quotes/bookmakersData";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id richiesto" }, { status: 400 });
  }

  const bookmakers = getBookmakers();
  const idx = bookmakers.findIndex((b) => b.id === id);
  if (idx < 0) {
    return NextResponse.json({ error: "Bookmaker non trovato" }, { status: 404 });
  }

  const updated = bookmakers.filter((b) => b.id !== id);
  saveBookmakers(updated);

  return NextResponse.json({ success: true });
}
