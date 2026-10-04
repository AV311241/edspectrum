/**
 * Cache key namespaces and invalidation tuning.
 *
 * Kept in a leaf module with no imports so both the HTTP layer (the metrics
 * controller that writes the keys) and the infrastructure layer (the Prisma
 * audit middleware that clears them) can share the values without creating an
 * import cycle.
 */
export const CACHE_PREFIX = {
  /** Every `/metrics/*` response. */
  METRICS: 'metrics:',
} as const;

/**
 * Minimum spacing between prefix invalidations triggered by data writes.
 *
 * A bulk upload can perform thousands of writes in one request; invalidating on
 * each one would turn the cache off entirely. Coalescing to at most one clear per
 * window keeps the cache useful while still bounding staleness to a few seconds.
 */
export const CACHE_INVALIDATE_THROTTLE_MS = 5000;
