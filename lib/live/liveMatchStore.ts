import path from "path";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import type { LiveMatchState } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "liveMatches.json");

/** In-memory store (used when Redis is unavailable) */
let memoryStore: Record<number, LiveMatchState> = {};

/** Load from JSON file */
function loadFromFile(): Record<number, LiveMatchState> {
  try {
    if (existsSync(DATA_PATH)) {
      const raw = readFileSync(DATA_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    // ignore
  }
  return {};
}

/** Persist to JSON file */
function saveToFile(data: Record<number, LiveMatchState>): void {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

/** Redis client (lazy) */
let redisClient: import("ioredis").default | null = null;

function getRedis(): import("ioredis").default | null {
  if (redisClient) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require("ioredis").default;
    redisClient = new Redis(url, { maxRetriesPerRequest: 1 });
    return redisClient;
  } catch {
    return null;
  }
}

const KEY_PREFIX = "live:fixture:";
const KEY_INDEX = "live:fixture_ids";

/** Store a single live match state */
export async function setLiveMatch(state: LiveMatchState): Promise<void> {
  const redis = getRedis();
  if (redis) {
    const key = `${KEY_PREFIX}${state.fixture_id}`;
    await redis.set(key, JSON.stringify(state), "EX", 86400);
    await redis.sadd(KEY_INDEX, String(state.fixture_id));
  } else {
    memoryStore[state.fixture_id] = state;
    saveToFile(memoryStore);
  }
}

/** Store multiple live match states (batch) */
export async function setLiveMatches(states: LiveMatchState[]): Promise<void> {
  const redis = getRedis();
  if (redis) {
    const pipeline = redis.pipeline();
    for (const state of states) {
      const key = `${KEY_PREFIX}${state.fixture_id}`;
      pipeline.set(key, JSON.stringify(state), "EX", 86400);
      pipeline.sadd(KEY_INDEX, String(state.fixture_id));
    }
    await pipeline.exec();
  } else {
    for (const state of states) {
      memoryStore[state.fixture_id] = state;
    }
    saveToFile(memoryStore);
  }
}

/** Get a single live match by fixture_id */
export async function getLiveMatch(fixtureId: number): Promise<LiveMatchState | null> {
  const redis = getRedis();
  if (redis) {
    const key = `${KEY_PREFIX}${fixtureId}`;
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as LiveMatchState;
  }
  if (Object.keys(memoryStore).length === 0) memoryStore = loadFromFile();
  return memoryStore[fixtureId] ?? null;
}

/** Get all live matches */
export async function getAllLiveMatches(): Promise<LiveMatchState[]> {
  const redis = getRedis();
  if (redis) {
    const ids = await redis.smembers(KEY_INDEX);
    const results: LiveMatchState[] = [];
    for (const id of ids) {
      const m = await getLiveMatch(Number(id));
      if (m) results.push(m);
    }
    return results;
  }
  if (Object.keys(memoryStore).length === 0) memoryStore = loadFromFile();
  return Object.values(memoryStore);
}

/** Remove a fixture from live store (when match ends) */
export async function removeLiveMatch(fixtureId: number): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.del(`${KEY_PREFIX}${fixtureId}`);
    await redis.srem(KEY_INDEX, String(fixtureId));
  } else {
    delete memoryStore[fixtureId];
    saveToFile(memoryStore);
  }
}

/** Remove fixtures that are no longer live */
export async function removeLiveMatches(fixtureIds: number[]): Promise<void> {
  const redis = getRedis();
  if (redis) {
    const pipeline = redis.pipeline();
    for (const id of fixtureIds) {
      pipeline.del(`${KEY_PREFIX}${id}`);
      pipeline.srem(KEY_INDEX, String(id));
    }
    await pipeline.exec();
  } else {
    for (const id of fixtureIds) {
      delete memoryStore[id];
    }
    saveToFile(memoryStore);
  }
}
