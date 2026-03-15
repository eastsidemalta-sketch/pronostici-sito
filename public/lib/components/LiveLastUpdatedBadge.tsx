"use client";

import { useEffect, useRef, useState } from "react";

const STALE_THRESHOLD_SEC = 300;

function getSecondsAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
}

/**
 * Lightweight badge showing "Aggiornato X secondi fa" for LIVE matches.
 * Only UI logic - no API calls. Uses last_updated_at from live store.
 */
export default function LiveLastUpdatedBadge({
  lastUpdatedAt,
  className = "",
}: {
  lastUpdatedAt: string | undefined;
  className?: string;
}) {
  const [secondsAgo, setSecondsAgo] = useState(() =>
    lastUpdatedAt ? getSecondsAgo(lastUpdatedAt) : 0
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!lastUpdatedAt) return;

    const tick = () => {
      const sec = getSecondsAgo(lastUpdatedAt);
      if (sec > STALE_THRESHOLD_SEC) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setSecondsAgo(STALE_THRESHOLD_SEC + 1);
        return;
      }
      setSecondsAgo(sec);
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [lastUpdatedAt]);

  if (!lastUpdatedAt || secondsAgo > STALE_THRESHOLD_SEC) return null;

  const text =
    secondsAgo <= 1
      ? "Aggiornato ora"
      : `Aggiornato ${secondsAgo} secondi fa`;

  return (
    <span
      className={`text-[10px] font-medium text-[var(--foreground-muted)] ${className}`}
      aria-live="polite"
    >
      {text}
    </span>
  );
}
