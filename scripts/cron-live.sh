#!/bin/sh
# Cron: trigger live matches poll
url="${SITE_URL:-https://playsignal.fly.dev}/api/cron/live-matches"
secret="${CRON_SECRET}"
if [ -z "$secret" ]; then
  echo "CRON_SECRET not set" >&2
  exit 1
fi
curl -s -H "Authorization: Bearer $secret" "$url" || true
