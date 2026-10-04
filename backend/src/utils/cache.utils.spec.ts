import { afterEach, describe, expect, it, vi } from 'vitest';
import { cache, cached, invalidateByPrefixThrottled } from './cache.utils';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('cache', () => {
  afterEach(async () => {
    await cache.delByPrefix('spec:');
    await cache.delByPrefix('spec2:');
  });

  it('stores and returns values through cached()', async () => {
    const producer = vi.fn().mockResolvedValue({ answer: 42 });

    const first = await cached('spec:a', producer);
    const second = await cached('spec:a', producer);

    expect(first).toEqual({ answer: 42 });
    expect(second).toEqual({ answer: 42 });
    // Second call must be served from the cache, not the producer.
    expect(producer).toHaveBeenCalledTimes(1);
  });

  it('re-runs the producer after the entry is deleted', async () => {
    const producer = vi.fn().mockResolvedValue('v1');
    await cached('spec:b', producer);

    await cache.del('spec:b');
    const value = await cached('spec:b', producer);

    expect(value).toBe('v1');
    expect(producer).toHaveBeenCalledTimes(2);
  });

  it('round-trips JSON values through get/set', async () => {
    await cache.set('spec:c', { nested: [1, 2, 3], label: 'ok' });
    const read = await cache.get<{ nested: number[]; label: string }>('spec:c');
    expect(read).toEqual({ nested: [1, 2, 3], label: 'ok' });
  });

  it('invalidateByPrefixThrottled clears every key under the prefix', async () => {
    await cache.set('spec:m:a', 1);
    await cache.set('spec:m:b', 2);
    await cache.set('spec2:keep', 3);

    invalidateByPrefixThrottled('spec:m:', 0);
    await flush();

    expect(await cache.get('spec:m:a')).toBeNull();
    expect(await cache.get('spec:m:b')).toBeNull();
    expect(await cache.get('spec2:keep')).toEqual(3);
  });
});
