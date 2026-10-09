// Verifier for the "unsubscribe" link carried by customer campaign e-mails.
//
// The owner→customer campaign mail feature was removed, but mails already in
// customers' inboxes still link to /api/customers/unsubscribe. KVKK / ETK
// require that link to keep working, so the token verifier stays.
//
// Token format (minted by the former sender): base64url(`${campaignId}:${contactKey}:${sig}`)
// where sig = HMAC-SHA256(JWT_SECRET, `${campaignId}:${contactKey}`) in base64url.

import crypto from 'node:crypto';

// Dev-only fallback — byte-identical to the former sender so tokens minted in
// local dev keep verifying. Never used in production.
const DEV_UNSUBSCRIBE_SECRET = 'dev-secret-do-not-use-in-prod';

/** Mirrors `getSecret()` in auth.ts: no JWT_SECRET in production → throw. */
function requireUnsubscribeSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[Buaze] JWT_SECRET is not configured in production. Refusing to verify unsubscribe tokens.',
    );
  }
  return DEV_UNSUBSCRIBE_SECRET;
}

export function verifyUnsubscribeToken(token: string): { campaignId: string; contactKey: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const lastColon = decoded.lastIndexOf(':');
    if (lastColon === -1) return null;
    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);
    // Throws in prod without JWT_SECRET → caught below → null (fail closed).
    const secret = requireUnsubscribeSecret();
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    // Constant-time compare to prevent timing attacks.
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const firstColon = payload.indexOf(':');
    if (firstColon === -1) return null;
    return {
      campaignId: payload.slice(0, firstColon),
      contactKey: payload.slice(firstColon + 1),
    };
  } catch {
    return null;
  }
}
