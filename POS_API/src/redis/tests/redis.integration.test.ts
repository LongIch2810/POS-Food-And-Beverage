import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { ApiErrorFilter } from '../../http/api-error.filter';
import { UserSummary } from '../../auth/auth.service';
import { AuthThrottlerGuard } from '../auth-throttler.guard';
import { Cached, Invalidates } from '../cache.decorators';
import { RedisModule } from '../redis.module';
import { StoreCache } from '../store-cache';
import { throttlerStorage } from '../throttler-storage';
import { flushRedis } from './flush-redis';

const withRedisUrl = async <T>(url: string | undefined, run: () => Promise<T>): Promise<T> => {
  const original = process.env.REDIS_URL;
  if (url !== undefined) process.env.REDIS_URL = url;
  try { return await run(); } finally { process.env.REDIS_URL = original; }
};

const cacheOf = async (url?: string) => withRedisUrl(url, async () => {
  const module = await Test.createTestingModule({ imports: [RedisModule] }).compile();
  await module.init();
  return { module, cache: module.get(StoreCache) };
});

test('RD-1.AC-1 cache-aside: miss loads once, hit returns the stored value, forget loads again', { timeout: 30_000 }, async () => {
  const { module, cache } = await cacheOf();
  try {
    const store = randomUUID();
    let loads = 0;
    const load = async () => ({ items: ['tra-sua'], n: ++loads });
    assert.deepEqual(await cache.remember('menu', store, ['list', 1], load), { items: ['tra-sua'], n: 1 });
    assert.deepEqual(await cache.remember('menu', store, ['list', 1], load), { items: ['tra-sua'], n: 1 });
    assert.equal(loads, 1);
    assert.equal((await cache.remember('menu', store, ['list', 2], load)).n, 2, 'another key is a separate miss');
    await cache.forget('menu', store);
    assert.equal((await cache.remember('menu', store, ['list', 1], load)).n, 3);
    assert.equal((await cache.remember('menu', store, ['list', 2], load)).n, 4, 'forget clears every key of the store and group');
  } finally { await module.close(); }
});

test('RD-1.AC-2 cache is isolated between stores and groups', { timeout: 30_000 }, async () => {
  const { module, cache } = await cacheOf();
  try {
    const [a, b] = [randomUUID(), randomUUID()];
    let loads = 0;
    const load = async () => ++loads;
    await cache.remember('menu', a, ['x'], load);
    await cache.remember('menu', b, ['x'], load);
    await cache.remember('org', a, ['x'], load);
    assert.equal(loads, 3);
    await cache.forget('menu', a);
    assert.equal(await cache.remember('menu', b, ['x'], load), 2, 'other store keeps its cache');
    assert.equal(await cache.remember('org', a, ['x'], load), 3, 'other group keeps its cache');
    assert.equal(await cache.remember('menu', a, ['x'], load), 4);
  } finally { await module.close(); }
});

test('RD-1.AC-3 cache fails open: Redis down still returns database data', { timeout: 30_000 }, async () => {
  const { module, cache } = await cacheOf('redis://127.0.0.1:1');
  try {
    let loads = 0;
    const load = async () => ++loads;
    assert.equal(await cache.remember('menu', randomUUID(), ['x'], load), 1);
    assert.equal(await cache.remember('menu', randomUUID(), ['x'], load), 2);
    await assert.doesNotReject(cache.forget('menu', randomUUID()));
  } finally { await module.close(); }
});

@Controller('limited')
class LimitedController {
  @Get() @UseGuards(AuthThrottlerGuard) ping(): { ok: true } { return { ok: true }; }
}

const throttledApp = async (url?: string) => withRedisUrl(url, async () => {
  const module = await Test.createTestingModule({
    imports: [ThrottlerModule.forRoot({ throttlers: [{ name: 'test', ttl: 60_000, limit: 2 }], storage: throttlerStorage() })],
    controllers: [LimitedController], providers: [AuthThrottlerGuard],
  }).compile();
  const app = module.createNestApplication();
  app.useGlobalFilters(new ApiErrorFilter());
  await app.listen(0, '127.0.0.1');
  return { app, base: `http://127.0.0.1:${app.getHttpServer().address().port}/limited` };
});

test('RD-2.AC-1 throttle: fixed window counts every call, then 429 TOO_MANY_REQUESTS with Retry-After', { timeout: 30_000 }, async () => {
  const { app, base } = await throttledApp(`${process.env.REDIS_URL ?? 'redis://127.0.0.1:6379'}`);
  try {
    // Counter key follows the caller IP; the window is shared in Redis, so start from a clean slate.
    await flushRedis();
    assert.equal((await fetch(base)).status, 200);
    assert.equal((await fetch(base)).status, 200);
    const refused = await fetch(base);
    assert.equal(refused.status, 429);
    assert.equal((await refused.json()).error.code, 'TOO_MANY_REQUESTS');
    const retryAfter = Number(refused.headers.get('Retry-After'));
    assert.ok(retryAfter >= 1 && retryAfter <= 60, `Retry-After ${retryAfter}`);
  } finally { await app.close(); }
});

test('RD-2.AC-2 throttle fails open: Redis down lets requests through', { timeout: 30_000 }, async () => {
  const { app, base } = await throttledApp('redis://127.0.0.1:1');
  try {
    for (let call = 0; call < 5; call++) assert.equal((await fetch(base)).status, 200);
  } finally { await app.close(); }
});

class Menu {
  loads = 0;
  constructor(readonly cache?: StoreCache) {}
  @Cached('menu') async list(_user: UserSummary, page: number) { return { page, n: ++this.loads }; }
  @Invalidates('menu') async write(_user: UserSummary) { return 'ok'; }
}

const userOf = (storeId: string | null, branchId: string | null, permissions: string[] = []) =>
  ({ storeId, branchId, permissions }) as unknown as UserSummary;

test('RD-1.AC-4 decorators: cached read, write forgets the store, branch scope and args are part of the key', { timeout: 30_000 }, async () => {
  const { module, cache } = await cacheOf();
  try {
    const store = randomUUID();
    const menu = new Menu(cache);
    const owner = userOf(store, null, ['branch.access_all']);
    assert.equal((await menu.list(owner, 1)).n, 1);
    assert.equal((await menu.list(owner, 1)).n, 1, 'hit');
    assert.equal((await menu.list(owner, 2)).n, 2, 'other argument is another key');
    assert.equal((await menu.list(userOf(store, randomUUID()), 1)).n, 3, 'branch-scoped caller never reads the all-branches entry');
    assert.equal((await menu.list(userOf(randomUUID(), null, ['branch.access_all']), 1)).n, 4, 'other store');
    await menu.write(owner);
    assert.equal((await menu.list(owner, 1)).n, 5, 'write forgot the store');
    assert.equal((await new Menu().list(owner, 1)).n, 1, 'no StoreCache injected: always the database');
  } finally { await module.close(); }
});
