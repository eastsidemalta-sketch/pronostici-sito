/**
 * Structured logging for live match system.
 * All messages prefixed with [live] for easy grep/inspection.
 */

type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, event: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const payload = JSON.stringify({ ts, event, ...data });
  const msg = `[live] ${payload}`;
  if (level === "error") console.error(msg);
  else if (level === "warn") console.warn(msg);
  else console.log(msg);
}

export const liveLog = {
  pollStart: (tier: string) =>
    log("info", "poll_start", { tier }),

  pollSkip: (reason: string, data?: Record<string, unknown>) =>
    log("info", "poll_skip", { reason, ...data }),

  pollSuccess: (updated: number, removed: number, usage: number, tier: string) =>
    log("info", "poll_success", { updated, removed, usage, tier }),

  pollError: (err: unknown) =>
    log("error", "poll_error", { error: String(err) }),

  thresholdCrossed: (tier: string, usage: number, budget: number, pct: number) =>
    log("warn", "threshold_crossed", { tier, usage, budget, pct }),

  downgrade: (fromTier: string, toTier: string, intervalMs: number) =>
    log("warn", "polling_downgrade", { fromTier, toTier, intervalMs }),

  killSwitchActive: () =>
    log("warn", "kill_switch_active", {}),

  usageSnapshot: (hourly: number, daily: number, monthly: number, budget: number) =>
    log("info", "usage_snapshot", { hourly, daily, monthly, budget }),
};
