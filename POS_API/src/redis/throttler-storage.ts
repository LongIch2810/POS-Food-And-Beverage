import { Logger } from '@nestjs/common';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import type Redis from 'ioredis';

export function throttlerStorage(): ThrottlerStorageRedisService {
  const storage = new ThrottlerStorageRedisService(process.env.REDIS_URL, { maxRetriesPerRequest: 1, commandTimeout: 1000, retryStrategy: (n) => Math.min(n * 200, 2000) });
  const redis = storage.redis as Redis;
  redis.on('error', (error) => new Logger('Throttler').warn(`Redis error: ${error.message}`));
  redis.on('connect', () => redis.stream.unref()); // a test that never closes the app must not keep node alive
  return storage;
}
