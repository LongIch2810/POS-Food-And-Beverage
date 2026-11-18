import { CacheModule } from '@nestjs/cache-manager';
import { Global, Logger, Module } from '@nestjs/common';
import KeyvRedis from '@keyv/redis';
import Keyv from 'keyv';
import { CACHE_TTL_MS, StoreCache } from './store-cache';

@Global()
@Module({
  imports: [CacheModule.registerAsync({
    isGlobal: true,
    useFactory: () => {
      // Errors only emit events and reads/writes return no-ops, so a dead Redis never fails a request.
      const store = new KeyvRedis(process.env.REDIS_URL, { throwOnConnectError: false, throwOnErrors: false, connectionTimeout: 1000 });
      const keyv = new Keyv({ store });
      keyv.on('error', (error: Error) => new Logger('Cache').warn(`Redis error: ${error.message}`));
      return { stores: [keyv], ttl: CACHE_TTL_MS };
    },
  })],
  providers: [StoreCache],
  exports: [StoreCache],
})
export class RedisModule {}
