/**
 * Debug: mostra i codici Lista trovati nell'ultima risposta FULL Netwin.
 * Aggiornato ogni volta che viene eseguita una FULL (max 1 ogni 3h).
 *
 * GET /api/debug-netwin-lista
 */
import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";

const FILE = path.join(process.cwd(), "data", ".netwin-lista-codes.json");

const LISTA_NAMES: Record<number, string> = {
  3: "1X2",
  8: "Handicap",
  18: "BTTS (Gol/No Gol)",
  7989: "Over/Under",
  15: "Doppia chance",
  16: "Doppia chance",
  17: "Doppia chance",
};

export async function GET() {
  if (!existsSync(FILE)) {
    return NextResponse.json({
      ok: false,
      hint: "File non presente. Esegui una FULL Netwin (es. debug-quotes-match?raw=1&forceFull=1) per popolarlo. Attenzione: FULL max 1 ogni 3h.",
    });
  }

  try {
    const raw = readFileSync(FILE, "utf-8");
    const data = JSON.parse(raw) as {
      listaCodes?: number[];
      found?: number[];
      missing?: number[];
      at?: string;
    };

    const listaCodes = data.listaCodes ?? [];
    const found = data.found ?? [];
    const missing = data.missing ?? [];

    return NextResponse.json({
      ok: true,
      listaCodes,
      found: found.map((c) => ({ code: c, name: LISTA_NAMES[c] ?? `?` })),
      missing: missing.map((c) => ({ code: c, name: LISTA_NAMES[c] ?? `?` })),
      at: data.at,
      hint: "3=1X2, 7989=O/U, 8=Handicap, 18=BTTS, 15-17=Doppia chance. Se missing non è vuoto, quei mercati non sono nel feed FULL.",
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
