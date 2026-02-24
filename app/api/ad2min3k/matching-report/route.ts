import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runMatchingReport } from "@/lib/matchingReport";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function getReportPath(bookmakerId?: string | null): string {
  if (!bookmakerId) {
    return path.join(DATA_DIR, "matchingReport.json");
  }
  const safeId = bookmakerId.replace(/[^a-zA-Z0-9-_]/g, "_");
  return path.join(DATA_DIR, `matchingReport-${safeId}.json`);
}

const emptyReport = {
  lastRun: null,
  summary: { totalFixtures: 0, totalMatches: 0, totalUnmatched: 0, byBookmaker: {} },
  matches: [],
  unmatched: [],
  teamSuggestions: [],
  leagueSuggestions: [],
};

export async function GET(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bookmakerId = searchParams.get("bookmakerId") || undefined;

  const dataPath = getReportPath(bookmakerId);

  try {
    if (existsSync(dataPath)) {
      const raw = readFileSync(dataPath, "utf-8");
      const report = JSON.parse(raw);
      return NextResponse.json(report);
    }
  } catch {
    // fallback
  }

  return NextResponse.json(emptyReport);
}

export async function POST(req: Request) {
  const isAuth = await getSession();
  if (!isAuth) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { action, bookmakerId } = (await req.json().catch(() => ({}))) as {
    action?: string;
    bookmakerId?: string;
  };

  if (action === "run") {
    try {
      const report = await runMatchingReport(bookmakerId);
      const dataPath = getReportPath(bookmakerId);
      if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(dataPath, JSON.stringify(report, null, 2));
      return NextResponse.json(report);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "action richiesta: run" }, { status: 400 });
}
