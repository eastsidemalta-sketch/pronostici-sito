/**
 * Cache persistente delle ultime fixture valide per squadra.
 * Salva in Redis (se disponibile) o in memoria.
 * Usata come fallback quando l'API restituisce meno di MIN_VALID partite.
 */

const CACHE_TTL_SEC = 7 * 24 * 60 * 60; // 7 giorni
const KEY_PREFIX = "team:fixtures:";
const MIN_VALID = 6;

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

const memCache: Record<number, any[]> = {};

export async function getCachedTeamFixtures(teamId: number): Promise<any[] | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(`${KEY_PREFIX}${teamId}`);
      if (!raw) return null;
      return JSON.parse(raw) as any[];
    } catch {
      return null;
    }
  }
  return memCache[teamId] ?? null;
}

export async function setCachedTeamFixtures(teamId: number, fixtures: any[]): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(`${KEY_PREFIX}${teamId}`, JSON.stringify(fixtures), "EX", CACHE_TTL_SEC);
    } catch {
      // ignore
    }
  } else {
    memCache[teamId] = fixtures;
  }
}

/**
 * Ritorna le fixture valide per una squadra.
 * Se l'API ne restituisce >= MIN_VALID, salva in cache e ritorna quelle.
 * Altrimenti usa la cache come fallback, integrando con le nuove se ci sono.
 */
export async function getTeamFixturesWithFallback(
  teamId: number,
  fetchFn: () => Promise<any[]>
): Promise<any[]> {
  const fresh = await fetchFn();

  const FINISHED = ["FT", "AET", "FT_PEN", "PEN_LIVE", "AWARDED", "ABD", "AWD"];
  const validFresh = fresh.filter((f) => FINISHED.includes(f.fixture?.status?.short));

  if (validFresh.length >= MIN_VALID) {
    await setCachedTeamFixtures(teamId, fresh);
    return fresh;
  }

  // Meno di MIN_VALID partite finite → usa cache come fallback
  const cached = await getCachedTeamFixtures(teamId);
  if (!cached || cached.length === 0) {
    return fresh;
  }

  // Merge: fresh + cached, deduplicato per fixture_id
  const byId = new Map<number, any>();
  for (const f of cached) if (f.fixture?.id) byId.set(f.fixture.id, f);
  for (const f of fresh) if (f.fixture?.id) byId.set(f.fixture.id, f);

  const merged = Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.fixture?.date || 0).getTime() -
      new Date(a.fixture?.date || 0).getTime()
  );

  // Aggiorna cache con il merge
  await setCachedTeamFixtures(teamId, merged);
  return merged;
}
