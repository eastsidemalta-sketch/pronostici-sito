#!/usr/bin/env node
/**
 * Fetch sample dalla API Netwin per determinare il mapping.
 * Legge URL dalla scheda cliente (data/clientProfiles.json).
 * Eseguire sul server (IP whitelistato): node scripts/fetch-netwin-api-sample.mjs
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFILES_PATH = path.join(process.cwd(), "data", "clientProfiles.json");

function getUrl() {
  if (existsSync(PROFILES_PATH)) {
    const profile = JSON.parse(readFileSync(PROFILES_PATH, "utf-8"))["IT-002"];
    if (profile?.api?.documentationUrl) return profile.api.documentationUrl;
    if (profile?.api?.endpoint && profile?.api?.params) {
      const params = new URLSearchParams(profile.api.params);
      return `${profile.api.endpoint}?${params}`;
    }
  }
  return "https://b2b.egamingsolutionsrl.it/WSSportFeed/get_eventi_psqf?type=FULL&system_code=PLAYSIGNAL&isLive=0&codiceSito=WINBET";
}

const url = getUrl();

async function main() {
  console.log("Fetching...", url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Keys:", Object.keys(data));
    // Primo evento per vedere la struttura
    const first = Array.isArray(data) ? data[0] : data?.data?.[0] ?? data?.eventi?.[0] ?? Object.values(data)[0]?.[0];
    if (first) {
      console.log("\nSample event (first):", JSON.stringify(first, null, 2).slice(0, 2000));
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}

main();
