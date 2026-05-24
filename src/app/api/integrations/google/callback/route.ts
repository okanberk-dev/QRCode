import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import type { PanelActor } from '@/lib/auth';
import { safeParseJson } from '@/lib/safe-json';
import { encryptToken } from '@/lib/google-token-crypto';
import { GOOGLE_OAUTH_STATE_COOKIE } from '../connect/route';

export const dynamic = 'force-dynamic';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

// CLAUDE.md §38 audit Fix #5 — state nonce 12 dakika geçerli. Cookie
// maxAge primary defense ama defense-in-depth için kod tarafında da check.
const STATE_TTL_MS = 12 * 60 * 1000;

function ownerRef(actor: PanelActor) {
  return actor.source === 'user' ? actor.id : `admin:${actor.id}`;
}

/**
 * CLAUDE.md §38 audit Fix #4 — OAuth callback failure path'lerinden
 * Sentry'ye warning seviyesi event. PII-free: actor.id, email, IP
 * loglanmaz; sadece actor source ve hostname (§37.7 + §40.4.A).
 *
 * `connected` → no-op (success tracking ayrı concern).
 */
function recordCallbackFailure(
  req: NextRequest,
  status: string,
  actor: PanelActor | null,
): void {
  if (status === 'connected') return;
  Sentry.captureMessage('Google OAuth callback failure', {
    level: 'warning',
    tags: {
      integration: 'google-oauth',
      reason: status,
      host: new URL(req.nextUrl.origin).hostname,
    },
    extra: {
      actorSource: actor?.source ?? null,
    },
  });
}

function clearStateCookie(res: NextResponse): NextResponse {
  res.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}

function safeReturnTo(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//')) return null;
  if (value.length > 300) return null;
  return value;
}

function redirectBack(req: NextRequest, status: string, returnTo?: string | null): NextResponse {
  const url = new URL(req.nextUrl.origin);
  const safePath = safeReturnTo(returnTo);
  if (safePath) {
    const target = new URL(safePath, req.nextUrl.origin);
    url.pathname = target.pathname;
    url.search = target.search;
  } else {
    // /profile redirects to /account; aim straight at the account hub.
    url.pathname = '/tr/dashboard/account';
    url.searchParams.set('section', 'notifications');
  }
  url.searchParams.set('google', status);
  return clearStateCookie(NextResponse.redirect(url.toString(), 302));
}

function redirectUri(req: NextRequest) {
  return process.env.GOOGLE_REDIRECT_URI || `${req.nextUrl.origin}/api/integrations/google/callback`;
}

// Constant-time compare so an attacker can't probe the cookie value
// byte-by-byte from response timing.
function nonceMatches(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length || ab.length === 0) return false;
  return timingSafeEqual(ab, bb);
}

export async function GET(req: NextRequest) {
  const error = req.nextUrl.searchParams.get('error');
  if (error) {
    recordCallbackFailure(req, `error:${error}`, null);
    return redirectBack(req, `error:${error}`);
  }

  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    recordCallbackFailure(req, 'cancelled', null);
    return redirectBack(req, 'cancelled');
  }

  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    recordCallbackFailure(req, 'unauthorized', null);
    return redirectBack(req, 'unauthorized');
  }

  // OAuth 2.0 RFC 6749 §10.12 — verify the `state` parameter Google
  // echoes back matches the nonce we stamped into the cookie at the
  // start of the flow. Without this check the callback is a CSRF sink:
  // an attacker can hand their own authorisation `code` to a victim's
  // browser (e.g. via a hidden iframe / redirect) and Buaze would
  // happily link the attacker's Google account to the victim's
  // workspace, granting the attacker the granted scopes against
  // someone else's data.
  const stateParam = req.nextUrl.searchParams.get('state');
  if (!stateParam) {
    recordCallbackFailure(req, 'state-missing', actor);
    return redirectBack(req, 'state-missing');
  }

  // safeParseJson tags malformed payloads to Sentry — useful when an
  // attacker (or a stale browser tab) hands us a state that no longer
  // round-trips. Görev G + CLAUDE.md §38.8.
  const parsedStateRaw = (() => {
    try {
      return Buffer.from(stateParam, 'base64url').toString('utf8');
    } catch {
      return null;
    }
  })();
  const parsedState = parsedStateRaw
    ? safeParseJson<{ owner?: unknown; nonce?: unknown; returnTo?: unknown; ts?: unknown }>(
        parsedStateRaw,
        { source: 'google-oauth-state' },
      )
    : null;
  const stateNonce = parsedState && typeof parsedState.nonce === 'string' ? parsedState.nonce : null;
  const stateOwner = parsedState && typeof parsedState.owner === 'string' ? parsedState.owner : null;
  const stateTs = parsedState && typeof parsedState.ts === 'number' ? parsedState.ts : 0;
  const returnTo = safeReturnTo(parsedState?.returnTo);
  if (!stateNonce || !stateOwner) {
    recordCallbackFailure(req, 'state-invalid', actor);
    return redirectBack(req, 'state-invalid', returnTo);
  }

  // Fix #5 — Defense-in-depth state TTL check. Cookie maxAge (12dk)
  // primary defense ama saat kayması / manuel cookie düzenleme /
  // browser storage anomalisi senaryosunda kod tarafı da kontrol etsin.
  if (Date.now() - stateTs > STATE_TTL_MS) {
    recordCallbackFailure(req, 'state-expired', actor);
    return redirectBack(req, 'state-expired', returnTo);
  }

  const cookieNonce = req.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  if (!cookieNonce || !nonceMatches(cookieNonce, stateNonce)) {
    recordCallbackFailure(req, 'state-mismatch', actor);
    return redirectBack(req, 'state-mismatch', returnTo);
  }

  // Defence-in-depth: the `owner` baked into state must match the
  // currently-authenticated actor. Stops a multi-user-shared-browser
  // scenario where one user's nonce could be replayed under another
  // user's session cookie.
  if (stateOwner !== ownerRef(actor)) {
    recordCallbackFailure(req, 'state-actor-mismatch', actor);
    return redirectBack(req, 'state-actor-mismatch', returnTo);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    recordCallbackFailure(req, 'missing-config', actor);
    return redirectBack(req, 'missing-config', returnTo);
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri(req),
    grant_type: 'authorization_code',
  });

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!tokenRes.ok) {
    recordCallbackFailure(req, 'token-error', actor);
    return redirectBack(req, 'token-error', returnTo);
  }

  const tokens = await tokenRes.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!tokens.access_token) {
    recordCallbackFailure(req, 'token-missing', actor);
    return redirectBack(req, 'token-missing', returnTo);
  }

  const userId = ownerRef(actor);
  const existing = await prisma.googleIntegration.findUnique({
    where: { userId },
    select: { refreshToken: true },
  });
  const expiresAt = new Date(Date.now() + Math.max(60, tokens.expires_in ?? 3600) * 1000);

  // Fix #6 — Token at-rest encryption. ENCRYPTION_KEY env yoksa
  // encryptToken plain text döner (graceful degrade, §40.12 + §38 audit).
  // Mevcut plain refresh token (existing?.refreshToken) backward-compat —
  // decryptToken `v1:` prefix yoksa plain kabul eder; bir sonraki refresh
  // sırasında otomatik encrypted format'a geçer.
  await prisma.googleIntegration.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: encryptToken(tokens.access_token),
      refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
      expiresAt,
    },
    update: {
      accessToken: encryptToken(tokens.access_token),
      refreshToken: tokens.refresh_token
        ? encryptToken(tokens.refresh_token)
        : existing?.refreshToken ?? null,
      expiresAt,
    },
  });

  return redirectBack(req, 'connected', returnTo);
}
