import Redis from 'ioredis';
import { envConfig } from '../config/env.config';
import { logger } from '../config/logger.config';
import { CACHE_INVALIDATE_THROTTLE_MS } from '../constants/cache.constants';

/**
 * Minimal cache interface so callers depend on behaviour rather than the backend.
 */
export interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Delete every key matching a prefix, e.g. `metrics:`. */
  delByPrefix(prefix: string): Promise<void>;
}

/**
 * In-memory fallback used when `REDIS_URL` is not configured (local dev, tests).
 * Values expire lazily on read which is sufficient for a single-process cache.
 */
class InMemoryCache implements CacheClient {
  private readonly store = new Map<string, { value: string; expiresAt: number | null }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds = envConfig.CACHE_TTL_SECONDS): Promise<void> {
    this.store.set(key, {
      value: JSON.stringify(value),
      expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

/**
 * Redis-backed cache with transparent error handling.
 *
 * A cache is an optimisation, never a correctness dependency: any Redis error
 * degrades to a cache miss so the request still succeeds against the database.
 */
class RedisCache implements CacheClient {
  constructor(private readonly client: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      logger.warn('Cache read failed, treating as miss', { key, error: (error as Error).message });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = envConfig.CACHE_TTL_SECONDS): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      logger.warn('Cache write failed', { key, error: (error as Error).message });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.warn('Cache delete failed', { key, error: (error as Error).message });
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    try {
      // SCAN is used instead of KEYS so a large keyspace cannot block Redis.
      let cursor = '0';
      do {
        const [next, keys] = await this.client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
        cursor = next;
        if (keys.length > 0) await this.client.del(...keys);
      } while (cursor !== '0');
    } catch (error) {
      logger.warn('Cache prefix delete failed', { prefix, error: (error as Error).message });
    }
  }
}

function createCache(): CacheClient {
  if (envConfig.REDIS_URL) {
    const client = new Redis(envConfig.REDIS_URL, {
      maxRetriesPerRequest: 2,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    client.on('error', (err) => logger.warn('Redis connection error', { error: err.message }));
    client.on('connect', () => logger.info('Redis cache connected'));
    return new RedisCache(client);
  }
  logger.info('REDIS_URL not set - using in-memory cache');
  return new InMemoryCache();
}

export const cache: CacheClient = createCache();

/**
 * Cache-aside helper: return the cached value when present, otherwise run
 * `producer`, store the result and return it.
 */
export async function cached<T>(
  key: string,
  producer: () => Promise<T>,
  ttlSeconds?: number
): Promise<T> {
  const hit = await cache.get<T>(key);
  if (hit !== null) return hit;
  const value = await producer();
  await cache.set(key, value, ttlSeconds);
  return value;
}

/**
 * Per-prefix throttling state for `invalidateByPrefixThrottled`.
 */
const invalidationState = new Map<string, { lastRun: number; timer: NodeJS.Timeout | null }>();

/**
 * Clear every key under `prefix`, but coalesce bursts.
 *
 * The first call in a window clears immediately so a single edit is reflected at
 * once; further calls within `throttleMs` schedule at most one trailing clear, so
 * a burst of thousands of writes still results in a handful of clears rather than
 * thousands. This keeps a write-heavy upload from thrashing the cache.
 */
export function invalidateByPrefixThrottled(
  prefix: string,
  throttleMs: number = CACHE_INVALIDATE_THROTTLE_MS
): void {
  const now = Date.now();
  const state = invalidationState.get(prefix) ?? { lastRun: 0, timer: null };

  if (now - state.lastRun >= throttleMs) {
    state.lastRun = now;
    invalidationState.set(prefix, state);
    void cache.delByPrefix(prefix);
    return;
  }

  if (state.timer) {
    invalidationState.set(prefix, state);
    return;
  }

  const delay = throttleMs - (now - state.lastRun);
  state.timer = setTimeout(() => {
    state.timer = null;
    state.lastRun = Date.now();
    void cache.delByPrefix(prefix);
  }, delay);
  state.timer.unref?.();
  invalidationState.set(prefix, state);
}

