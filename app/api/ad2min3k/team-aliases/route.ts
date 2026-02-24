import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "teamAliases.json");

export type TeamAliasesConfig = Record<string, string[]>;

function load(): TeamAliasesConfig {
  try {
    if (existsSync(DATA_PATH)) {
      const raw = readFileSync(DATA_PATH, "utf-8");
      return JSON.parse(raw) as TeamAliasesConfig;
    }
  } catch {
    // fallback
  }
  return {};
}

function save(data: TeamAliasesConfig) {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

export async function GET() {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  return NextResponse.json({ aliases: load() });
}

export async function PUT(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  try {
    const { aliases } = (await req.json()) as { aliases: TeamAliasesConfig };
    if (!aliases || typeof aliases !== "object") {
      return NextResponse.json({ error: "aliases richiesto" }, { status: 400 });
    }
    save(aliases);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Errore" }, { status: 500 });
  }
}
