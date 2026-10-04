import { AsyncLocalStorage } from 'async_hooks';

/**
 * Per-request context carried through async call chains via AsyncLocalStorage.
 *
 * This is what lets infrastructure that has no access to the Express `Request`
 * object - most importantly the Prisma audit middleware in `db.config.ts` -
 * attribute a write to the authenticated user without threading a `userId`
 * parameter through every repository method signature.
 *
 * The store is established once per request by `requestContextMiddleware` and is
 * automatically discarded when the request's async chain completes.
 */
export interface RequestContext {
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Run `callback` with `context` bound to the current async chain. */
export function runWithRequestContext<T>(context: RequestContext, callback: () => T): T {
  return storage.run(context, callback);
}

/** The context for the current async chain, or `undefined` outside a request. */
export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/** The authenticated user id for the current chain, when there is one. */
export function getCurrentUserId(): number | undefined {
  return storage.getStore()?.userId;
}

export { storage as requestContextStorage };
