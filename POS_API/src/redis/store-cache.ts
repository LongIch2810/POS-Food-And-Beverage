import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Cache } from 'cache-manager';

export const CACHE_TTL_MS = 5 * 60 * 1000;
const log = new Logger('Cache');

// Cache-aside per store: miss -> load from PostgreSQL and store; hit -> return the stored value; write -> forget the store's keys.
// Every Redis failure is logged and skipped (fail-open), so the database stays the source of truth.
@Injectable()
export class StoreCache implements OnApplicationShutdown {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  private async safe<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      log.warn(`Redis unavailable, skipping cache: ${(error as Error).message}`);
      return fallback;
    }
  }

  private indexKey(group: string, storeId: string): string {
    return `cache:${group}:${storeId}:index`;
  }

  async remember<T>(group: string, storeId: string, parts: unknown, load: () => Promise<T>): Promise<T> {
    const key = `cache:${group}:${storeId}:${createHash('sha1').update(JSON.stringify(parts)).digest('hex')}`;
    const hit = await this.safe(() => this.cache.get<T>(key), undefined);
    if (hit !== undefined && hit !== null) return hit;
    const value = await load();
    await this.safe(async () => {
      await this.cache.set(key, value, CACHE_TTL_MS);
      const index = (await this.cache.get<string[]>(this.indexKey(group, storeId))) ?? [];
      // shortcut: read-modify-write on the index can drop a key when two first loads race; the entry then lives until its TTL (5 min), upgrade to a Redis SET if that matters.
      if (!index.includes(key)) await this.cache.set(this.indexKey(group, storeId), [...index, key], CACHE_TTL_MS);
    }, undefined);
    return value;
  }

  async forget(group: string, storeId: string): Promise<void> {
    await this.safe(async () => {
      const index = (await this.cache.get<string[]>(this.indexKey(group, storeId))) ?? [];
      await Promise.all([...index, this.indexKey(group, storeId)].map((key) => this.cache.del(key)));
    }, undefined);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.safe(() => this.cache.disconnect(), undefined);
  }
}
