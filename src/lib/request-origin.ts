/**
 * Cross-site request guard for cookie-authenticated JSON endpoints that the
 * customer pages call with fetch (CLAUDE.md §61). SameSite=Lax already keeps
 * the customer cookie off cross-site POSTs; this is the second lock.
 *
 * - `Sec-Fetch-Site: cross-site` → refused (browsers set it; page script cannot).
 * - `Origin: null` → only with `Sec-Fetch-Site: same-origin`: the /l and
 *   /hesap pages send `Referrer-Policy: no-referrer`, and under that policy
 *   a same-origin POST carries `Origin: null` (Fetch standard).
 * - any other Origin → must be the site origin or the request's own origin.
 * - no Origin and no Sec-Fetch-Site → allowed (non-browser client: it holds
 *   no victim cookie, so there is nothing to forge).
 */
import { SITE_URL } from '@/lib/site';

export function requestOrigin(headers: Headers): string | null {
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  if (!host) return null;
  const proto = (headers.get('x-forwarded-proto') ?? 'https').split(',')[0].trim();
  return `${proto === 'http' ? 'http' : 'https'}://${host.split(',')[0].trim()}`;
}

export function isCrossSiteRequest(headers: Headers, siteUrl: string = SITE_URL): boolean {
  const site = headers.get('sec-fetch-site');
  if (site === 'cross-site') return true;
  const origin = headers.get('origin');
  if (!origin) return false;
  if (origin === 'null') return site !== 'same-origin';
  let siteOrigin: string | null = null;
  try {
    siteOrigin = new URL(siteUrl).origin;
  } catch {
    siteOrigin = null;
  }
  const own = requestOrigin(headers);
  return origin !== siteOrigin && origin !== own;
}
