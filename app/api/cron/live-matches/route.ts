import { NextResponse } from "next/server";
import { runLivePollCycle } from "@/lib/live/livePoller";

/**
 * Cron endpoint for live match polling.
 * Triggered by external cron (e.g. Vercel Cron, GitHub Actions) every 2 minutes.
 * Completely independent from frontend traffic.
 *
 * Protect with CRON_SECRET: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runLivePollCycle();
    return NextResponse.json({
      ok: true,
      updated: result.updated,
      removed: result.removed,
    });
  } catch (err) {
    console.error("[cron/live-matches] error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
