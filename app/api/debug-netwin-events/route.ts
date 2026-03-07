/**
 * GET /api/debug-netwin-events
 * Mostra gli eventi estratti dalla FULL Netwin per debug.
 * Legge .netwin-full-debug.json e .netwin-lista-codes.json (creati quando FULL restituisce 0 partite).
 */
import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";

const DEBUG_FILE = path.join(process.cwd(), "data", ".netwin-full-debug.json");
const LISTA_FILE = path.join(process.cwd(), "data", ".netwin-lista-codes.json");
const STANDALONE_DEBUG = path.join(process.cwd(), ".next", "standalone", "data", ".netwin-full-debug.json");
const STANDALONE_LISTA = path.join(process.cwd(), ".next", "standalone", "data", ".netwin-lista-codes.json");

export async function GET() {
  const debugPath = existsSync(DEBUG_FILE) ? DEBUG_FILE : existsSync(STANDALONE_DEBUG) ? STANDALONE_DEBUG : null;
  const listaPath = existsSync(LISTA_FILE) ? LISTA_FILE : existsSync(STANDALONE_LISTA) ? STANDALONE_LISTA : null;

  let debug: unknown = null;
  let lista: unknown = null;

  if (debugPath) {
    try {
      debug = JSON.parse(readFileSync(debugPath, "utf-8"));
    } catch {
      debug = { error: "Parse fallito" };
    }
  }

  if (listaPath) {
    try {
      lista = JSON.parse(readFileSync(listaPath, "utf-8"));
    } catch {
      lista = { error: "Parse fallito" };
    }
  }

  return NextResponse.json({
    ok: true,
    hint: "Questi file vengono creati quando una FULL Netwin restituisce 0 partite. eventsSample mostra la struttura dei primi 3 eventi estratti.",
    debugFile: debugPath ? "presente" : "assente (nessuna FULL con 0 partite di recente)",
    listaFile: listaPath ? "presente" : "assente",
    debug,
    lista,
  });
}
