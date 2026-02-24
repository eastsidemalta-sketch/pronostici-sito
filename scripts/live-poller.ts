#!/usr/bin/env npx tsx
/**
 * Standalone live match poller - runs one cycle and exits.
 * Run by cron every 30 seconds for football (sport-specific intervals):
 *   * * * * * cd /path && npm run live-poller
 *   * * * * * sleep 30 && cd /path && npm run live-poller
 * Or use a scheduler that supports sub-minute intervals.
 * Completely independent from frontend traffic.
 */

import { runLivePollCycle } from "@/lib/live/livePoller";

async function main() {
  const result = await runLivePollCycle();
  console.log(
    `[live-poller] updated=${result.updated} removed=${result.removed}`
  );
  if (result.error) {
    console.error("[live-poller] error:", result.error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[live-poller] fatal:", err);
  process.exit(1);
});
