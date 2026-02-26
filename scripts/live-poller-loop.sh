#!/bin/bash
# Runs live-poller every 30 seconds in local dev.
# Usage: npm run live-poller:loop
# Keep this running alongside `npm run dev` in a separate terminal.

INTERVAL=30
BASE_URL="${NEXT_PUBLIC_SITE_URL:-http://127.0.0.1:3000}"

echo "[live-poller-loop] Starting. Polling every ${INTERVAL}s via ${BASE_URL}/api/cron/live-matches"

while true; do
  RESULT=$(curl -s "${BASE_URL}/api/cron/live-matches")
  echo "[live-poller-loop] $(date '+%H:%M:%S') → $RESULT"
  sleep $INTERVAL
done
