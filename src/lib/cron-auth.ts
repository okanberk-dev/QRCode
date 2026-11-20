import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Constant-time cron authorization: compares SHA-256 digests of the
 * `Authorization` header and `Bearer ${secret}`, so neither the length nor a
 * prefix of the secret leaks through timing. Fail-closed: an unset or empty
 * secret authorizes nothing. Used by the billing renewal cron; existing cron
 * routes may adopt it later.
 */
export function isCronAuthorized(authorizationHeader: string | null, secret: string | undefined): boolean {
  if (typeof secret !== 'string' || secret.length === 0) return false;
  if (typeof authorizationHeader !== 'string' || authorizationHeader.length === 0) return false;
  const given = createHash('sha256').update(authorizationHeader, 'utf8').digest();
  const expected = createHash('sha256').update(`Bearer ${secret}`, 'utf8').digest();
  return timingSafeEqual(given, expected);
}
