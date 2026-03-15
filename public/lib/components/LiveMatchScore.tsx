"use client";

import { useLiveMatches } from "@/lib/hooks/useLiveMatches";
import { STATUS_LABELS } from "@/lib/live/types";
import LiveLastUpdatedBadge from "./LiveLastUpdatedBadge";

interface LiveMatchScoreProps {
  fixtureId: number;
  initialScore: { home: number | null; away: number | null };
  initialStatus: string | null;
  initialMinute: number | null;
  kickoffTime: string;
  intlLocale: string;
  /** Mobile: compact. Desktop: larger */
  variant?: "mobile" | "desktop";
}

/**
 * Displays live match score with polling updates.
 * Polls /api/live-matches every 30s. Data from central store only (no external API calls).
 */
export default function LiveMatchScore({
  fixtureId,
  initialScore,
  initialStatus,
  initialMinute,
  kickoffTime,
  intlLocale,
  variant = "desktop",
}: LiveMatchScoreProps) {
  const liveMap = useLiveMatches();
  const live = liveMap[fixtureId];

  const score = live
    ? { home: live.score.home, away: live.score.away }
    : { home: initialScore.home ?? 0, away: initialScore.away ?? 0 };
  const status = live?.status ?? initialStatus;
  const minute = live?.minute ?? initialMinute;
  const hasScore = score.home !== null || score.away !== null;
  const isNotStarted = status === "NS";

  const timeStr = new Date(kickoffTime).toLocaleTimeString(intlLocale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const statusLabel = status ? (STATUS_LABELS[status] ?? status) : "";
  const isLive = status && status !== "NS" && status !== "FT" && status !== "AET" && status !== "FT_PEN";

  if (variant === "mobile") {
    return (
      <>
        <div>
          {hasScore && !isNotStarted ? (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-sm font-bold text-[var(--foreground)]">
              {score.home} - {score.away}
            </span>
          ) : (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-sm font-bold text-[var(--foreground)]">
              {timeStr}
            </span>
          )}
        </div>
        {status && status !== "NS" && (
          <div className="text-xs font-medium text-[var(--foreground-muted)]">
            {statusLabel}
            {minute != null && ` · ${minute}'`}
          </div>
        )}
        {isLive && live?.last_updated_at && (
          <div className="mt-1">
            <LiveLastUpdatedBadge lastUpdatedAt={live.last_updated_at} />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {hasScore && !isNotStarted ? (
        <>
          <div className="text-2xl font-bold text-[var(--foreground)] md:text-3xl">
            {score.home} - {score.away}
          </div>
          <div className="mt-1 text-sm text-[var(--foreground-muted)]">
            {statusLabel}
            {minute != null && ` • ${minute}'`}
          </div>
          {isLive && live?.last_updated_at && (
            <div className="mt-1">
              <LiveLastUpdatedBadge lastUpdatedAt={live.last_updated_at} />
            </div>
          )}
        </>
      ) : (
        <div className="text-xl font-bold text-[var(--foreground)] md:text-2xl">
          {timeStr}
        </div>
      )}
    </>
  );
}
