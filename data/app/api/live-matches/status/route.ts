import { NextResponse } from "next/server";
import {
  getHourlyCount,
  getDailyCount,
  getMonthlyCount,
  getLastPollTime,
} from "@/lib/live/usageStore";
import {
  LIVE_POLLING_DISABLED,
  MONTHLY_BUDGET,
  getUsageTier,
  getPollIntervalMs,
} from "@/lib/live/pollingConfig";

/**
 * Internal status endpoint for monitoring.
 * Returns usage stats and polling state. No external API calls.
 */
export async function GET() {
  try {
    const [hourly, daily, monthly, lastPoll] = await Promise.all([
      getHourlyCount(),
      getDailyCount(),
      getMonthlyCount(),
      getLastPollTime(),
    ]);

    const tier = getUsageTier(monthly);
    const intervalMs = getPollIntervalMs(tier);
    const pct = Math.round((monthly / MONTHLY_BUDGET) * 100);

    return NextResponse.json({
      polling_disabled: LIVE_POLLING_DISABLED,
      tier,
      interval_ms: intervalMs === Infinity ? null : intervalMs,
      usage: {
        hourly,
        daily,
        monthly,
        budget: MONTHLY_BUDGET,
        pct,
      },
      last_poll_at: lastPoll,
    });
  } catch (err) {
    console.error("[api/live-matches/status] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
