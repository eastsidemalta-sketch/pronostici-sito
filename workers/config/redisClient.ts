import { Redis } from 'ioredis';

// REDIS_URL in .env.local (es. rediss://... per Upstash TLS) o sul VPS
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  console.error('[Redis Error] Connection failed:', err);
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully for Worker operations');
});
