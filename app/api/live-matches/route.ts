import { NextResponse } from "next/server";
import type { LiveMatchState, LiveMatchPayload } from "@/lib/live/types";
import { getAllLiveMatches, getLiveMatch } from "@/lib/live/liveMatchStore";
import {
  LIVE_POLLING_DISABLED,
  getUsageTier,
} from "@/lib/live/pollingConfig";
import { getMonthlyCount } from "@/lib/live/usageStore";

export const dynamic = "force-dynamic";

export type { LiveMatchPayload };

export type PollingStatus = "active" | "degraded" | "paused" | "disabled";

function toLiveMatchPayload(m: LiveMatchState): LiveMatchPayload {
  return {
    fixture_id: m.fixture_id,
    status: m.status,
    minute: m.minute,
    score: { home: m.score_home, away: m.score_away },
    last_updated_at: m.last_updated_at,
  };
}

async function getPollingStatus(): Promise<PollingStatus> {
  if (LIVE_POLLING_DISABLED) return "disabled";
  const used = await getMonthlyCount();
  const tier = getUsageTier(used);
  if (tier === "tier95") return "paused";
  if (tier === "tier70" || tier === "tier85") return "degraded";
  return "active";
}

/**
 * Internal API: returns minimal live match state from central store (Redis/JSON).
 * NO external API calls. Store is updated ONLY by backend live poller.
 * Single source of truth for LIVE data.
 *
 * Response schema:
 *   GET /api/live-matches       → { matches, polling_status }
 *   GET /api/live-matches?id=N  → { match, polling_status } (filtered from store)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fixtureId = searchParams.get("id");
    const pollingStatus = await getPollingStatus();

    const basePayload = { polling_status: pollingStatus };

    if (fixtureId) {
      const match = await getLiveMatch(Number(fixtureId));
      return NextResponse.json(
        {
          ...basePayload,
          match: match ? toLiveMatchPayload(match) : null,
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            Pragma: "no-cache",
          },
        }
      );
    }

    const matches = await getAllLiveMatches();
    return NextResponse.json(
      {
        ...basePayload,
        matches: matches.map(toLiveMatchPayload),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (err) {
    console.error("[api/live-matches] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch live matches" },
      { status: 500 }
    );
  }
}
