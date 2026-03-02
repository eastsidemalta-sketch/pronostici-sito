import { NextResponse } from "next/server";
import { runLivePollCycle } from "@/lib/live/livePoller";
import { warmHomePageCache } from "@/lib/homePageCache";
import { localeToCountryCode } from "@/i18n/routing";
import { getActiveLocales } from "@/lib/markets";

/**
 * Cron endpoint for live match polling + cache warmer.
 * Triggered every minute. Mantiene la cache home calda così la pagina è veloce anche con 0 utenti.
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
    const [result, _] = await Promise.all([
      runLivePollCycle(),
      warmHomePageCache(
        getActiveLocales().map((locale) => localeToCountryCode[locale] ?? "IT")
      ),
    ]);
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
