/**
 * Live polling configuration: thresholds, kill switch.
 * Sport-specific intervals are in sportPollingConfig.ts.
 * Budget and thresholds can be overridden via env.
 */

export const LIVE_POLLING_DISABLED =
  process.env.LIVE_POLLING_DISABLED === "1" ||
  process.env.LIVE_POLLING_DISABLED === "true";

/** Monthly API call budget (default 3000 = ~100/day) */
export const MONTHLY_BUDGET = parseInt(
  process.env.LIVE_API_MONTHLY_BUDGET || "3000",
  10
);

/** Usage tier based on % of monthly budget */
export type UsageTier = "normal" | "tier70" | "tier85" | "tier95";

export const THRESHOLD_70 = 0.7;
export const THRESHOLD_85 = 0.85;
export const THRESHOLD_95 = 0.95;

export function getUsageTier(monthlyUsed: number): UsageTier {
  const pct = monthlyUsed / MONTHLY_BUDGET;
  if (pct >= THRESHOLD_95) return "tier95";
  if (pct >= THRESHOLD_85) return "tier85";
  if (pct >= THRESHOLD_70) return "tier70";
  return "normal";
}

import { getSportLiveIntervalMs } from "./sportPollingConfig";

/** Minimum ms between external API calls for football at given tier */
export function getPollIntervalMs(tier: UsageTier): number {
  return getSportLiveIntervalMs("football", tier);
}
