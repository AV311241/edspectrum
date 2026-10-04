import { HttpErrorResponse } from '@angular/common/http';

/**
 * Single place that turns a failed request into a message we can show a user.
 *
 * The NestJS backend reports validation problems in one of two shapes
 * depending on where the failure happened: a top-level `{ message }` for
 * business-rule conflicts (409 "Student code already exists"), and a nested
 * `{ error: { message } }` for class-validator payloads. Both are unwrapped
 * here so callers never have to know which one they received.
 */
export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const direct = error.error?.message;
    const nested = error.error?.error?.message;
    if (typeof direct === 'string' && direct.trim()) return direct;
    if (typeof nested === 'string' && nested.trim()) return nested;
    if (error.status === 0) return 'Cannot reach the server. Is the API running?';
  }
  return fallback;
}