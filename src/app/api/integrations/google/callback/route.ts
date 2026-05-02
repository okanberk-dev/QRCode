import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import type { PanelActor } from '@/lib/auth';
import { GOOGLE_OAUTH_STATE_COOKIE } from '../connect/route';

export const dynamic = 'force-dynamic';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function ownerRef(actor: PanelActor) {
  return actor.source === 'user' ? actor.id : `admin:${actor.id}`;
}

function clearStateCookie(res: NextResponse): NextResponse {
  res.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}

function redirectBack(req: NextRequest, status: string): NextResponse {
  const url = new URL(req.nextUrl.origin);
  // /profile redirects to /account; aim straight at the account hub.
  url.pathname = '/tr/dashboard/account';
  url.searchParams.set('section', 'notifications');
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
  if (error) return redirectBack(req, `error:${error}`);

  const code = req.nextUrl.searchParams.get('code');
  if (!code) return redirectBack(req, 'cancelled');

  const actor = await getPanelActorFromRequest(req);
  if (!actor) return redirectBack(req, 'unauthorized');

  // OAuth 2.0 RFC 6749 §10.12 — verify the `state` parameter Google
  // echoes back matches the nonce we stamped into the cookie at the
  // start of the flow. Without this check the callback is a CSRF sink:
  // an attacker can hand their own authorisation `code` to a victim's
  // browser (e.g. via a hidden iframe / redirect) and Buaze would
  // happily link the attacker's Google account to the victim's
  // workspace, granting the attacker the granted scopes against
  // someone else's data.
  const stateParam = req.nextUrl.searchParams.get('state');
  if (!stateParam) return redirectBack(req, 'state-missing');

  let parsedState: { owner?: unknown; nonce?: unknown } | null = null;
  try {
    const json = Buffer.from(stateParam, 'base64url').toString('utf8');
    parsedState = JSON.parse(json);
  } catch {
    parsedState = null;
  }
  const stateNonce = parsedState && typeof parsedState.nonce === 'string' ? parsedState.nonce : null;
  const stateOwner = parsedState && typeof parsedState.owner === 'string' ? parsedState.owner : null;
  if (!stateNonce || !stateOwner) return redirectBack(req, 'state-invalid');

  const cookieNonce = req.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  if (!cookieNonce || !nonceMatches(cookieNonce, stateNonce)) {
    return redirectBack(req, 'state-mismatch');
  }

  // Defence-in-depth: the `owner` baked into state must match the
  // currently-authenticated actor. Stops a multi-user-shared-browser
  // scenario where one user's nonce could be replayed under another
  // user's session cookie.
  if (stateOwner !== ownerRef(actor)) {
    return redirectBack(req, 'state-actor-mismatch');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return redirectBack(req, 'missing-config');

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

  if (!tokenRes.ok) return redirectBack(req, 'token-error');

  const tokens = await tokenRes.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!tokens.access_token) return redirectBack(req, 'token-missing');

  const userId = ownerRef(actor);
  const existing = await prisma.googleIntegration.findUnique({ where: { userId } });
  const expiresAt = new Date(Date.now() + Math.max(60, tokens.expires_in ?? 3600) * 1000);

  await prisma.googleIntegration.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? null,
      expiresAt,
    },
  });

  return redirectBack(req, 'connected');
}
