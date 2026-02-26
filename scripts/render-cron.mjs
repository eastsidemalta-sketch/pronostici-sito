#!/usr/bin/env node
/**
 * Called by Render cron job every minute to update live matches.
 * Reads SITE_URL and CRON_SECRET from environment variables.
 */

const url = process.env.SITE_URL + "/api/cron/live-matches";
const secret = process.env.CRON_SECRET;

const headers = { Authorization: `Bearer ${secret}` };

fetch(url, { headers })
  .then((r) => r.json())
  .then((d) => {
    console.log(JSON.stringify(d));
    process.exit(d.ok === false ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
