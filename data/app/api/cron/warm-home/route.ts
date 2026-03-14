import { NextResponse } from "next/server";
import { warmHomePageCache } from "@/lib/homePageCache";
import { getActiveLocales } from "@/lib/markets";
import { localeToCountryCode } from "@/i18n/routing";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Cron endpoint to warm the home page cache in the background.
 * When triggered regularly (e.g. every 1–5 min), users virtually never hit a cache miss,
 * so the full payload (150+ matches with quotes) is instantly available.
 *
 * Protect with CRON_SECRET: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const activeCountries = getActiveLocales().map(
      (locale) => localeToCountryCode[locale] ?? "IT"
    );

    await warmHomePageCache(activeCountries);

    return NextResponse.json({
      success: true,
      message: "Cache warmed successfully",
    });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to warm cache" },
      { status: 500 }
    );
  }
}
