import Redis from 'ioredis';

// Loaded with `node --import` in every test file process: each file starts with empty throttle counters and cache.
// Use a dedicated Redis database in REDIS_URL (for example /15): it is emptied. Silent when Redis is down.
for (const name of ['THROTTLE_LOGIN_IP_LIMIT', 'THROTTLE_LOGIN_USER_LIMIT', 'THROTTLE_REFRESH_IP_LIMIT']) process.env[name] ??= '100000';
const redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', { maxRetriesPerRequest: 1, lazyConnect: true, retryStrategy: () => null });
redis.on('error', () => undefined);
try {
  await redis.connect();
  await redis.flushdb();
} catch {
  // tests without Redis run unthrottled, like the app's fail-open
} finally {
  redis.disconnect();
}
