import * as Sentry from '@sentry/nextjs';

const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const REVOKE_TIMEOUT_MS = 5000;

/**
 * Tells Google to invalidate the grant (revoking the refresh token revokes
 * the whole grant, including every access token issued from it). Best
 * effort: callers always delete local data afterwards, so a Google outage
 * never leaves a user unable to disconnect. Returns whether Google
 * confirmed. The token is sent in the POST body, never in the URL or a log.
 */
export async function revokeGoogleToken(
  token: string,
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<boolean> {
  if (!token) return false;
  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? REVOKE_TIMEOUT_MS);
  try {
    const res = await doFetch(GOOGLE_REVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }).toString(),
      signal: controller.signal,
    });
    // 200 = revoked. 400 invalid_token = already revoked/expired on Google's
    // side, which is the state we want anyway.
    return res.ok || res.status === 400;
  } catch (err) {
    Sentry.captureMessage('Google token revoke failed', {
      level: 'warning',
      tags: { integration: 'google-oauth', kind: 'revoke-failed' },
      extra: { reason: err instanceof Error ? err.name : 'unknown' },
    });
    return false;
  } finally {
    clearTimeout(timer);
  }
}
