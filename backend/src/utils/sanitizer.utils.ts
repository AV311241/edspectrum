/**
 * Utility to sanitize sensitive PII (Personally Identifiable Information) before logging.
 */
const SENSITIVE_FIELDS = new Set([
  'firstname',
  'lastname',
  'dateofbirth',
  'contactphone',
  'contactemail',
  'email',
  'password',
  'passwordhash',
]);

export function sanitizePII<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePII(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
        sanitizedObj[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitizedObj[key] = sanitizePII(value);
      } else {
        sanitizedObj[key] = value;
      }
    }
    return sanitizedObj as T;
  }

  return data;
}
