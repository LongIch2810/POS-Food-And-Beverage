import Redis from 'ioredis';

// Test-only: empties the Redis database named by REDIS_URL (use a dedicated one, e.g. /15). Silent when Redis is down.
export async function flushRedis(): Promise<void> {
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', { maxRetriesPerRequest: 1, lazyConnect: true, retryStrategy: () => null });
  redis.on('error', () => undefined);
  try {
    await redis.connect();
    await redis.flushdb();
  } catch {
    // fail-open like the app: tests without Redis simply run unthrottled
  } finally {
    redis.disconnect();
  }
}
