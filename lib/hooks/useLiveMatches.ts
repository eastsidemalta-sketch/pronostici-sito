"use client";

import { useEffect, useState, useRef } from "react";
import type { LiveMatchPayload } from "@/lib/live/types";

const POLL_INTERVAL_MS = 30_000;

/**
 * Polls /api/live-matches every 30 seconds.
 * Returns a map fixture_id -> LiveMatchPayload.
 * Keeps last known state on error. Polling continues regardless of empty results
 * so that live updates resume when matches become live later.
 */
export function useLiveMatches(): Record<number, LiveMatchPayload> {
  const [liveMap, setLiveMap] = useState<Record<number, LiveMatchPayload>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const fetchLive = async () => {
      try {
        const res = await fetch("/api/live-matches", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const matches = data.matches as LiveMatchPayload[] | undefined;
        if (!Array.isArray(matches)) return;

        if (matches.length === 0) {
          setLiveMap((prev) => (Object.keys(prev).length === 0 ? prev : {}));
          return;
        }

        const next: Record<number, LiveMatchPayload> = {};
        for (const m of matches) {
          next[m.fixture_id] = m;
        }
        setLiveMap(next);
      } catch {
        // Keep last known state on error
      }
    };

    void fetchLive();
    intervalRef.current = setInterval(() => void fetchLive(), POLL_INTERVAL_MS);

    const onFocus = () => void fetchLive();
    window.addEventListener("focus", onFocus);

    return () => {
      stopPolling();
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return liveMap;
}
