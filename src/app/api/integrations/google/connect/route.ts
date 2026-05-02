import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getPanelActorFromRequest } from '@/lib/auth';
import type { PanelActor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = ['https://www.googleapis.com/auth/business.manage'];

// 12 minutes — comfortably covers a slow user authenticating with Google
// (consent screen can take a minute), but short enough that a leaked
// nonce expires before it can be replayed against a different actor.
const STATE_TTL_SECONDS = 12 * 60;
export const GOOGLE_OAUTH_STATE_COOKIE = 'bz_google_oauth_state';

function ownerRef(actor: PanelActor) {
  return actor.source === 'user' ? actor.id : `admin:${actor.id}`;
}

function redirectUri(req: NextRequest) {
  return process.env.GOOGLE_REDIRECT_URI || `${req.nextUrl.origin}/api/integrations/google/callback`;
}

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({
      ok: false,
      configured: false,
      error: 'missing_google_client_id',
      message: 'GOOGLE_CLIENT_ID env var is not configured.',
    });
  }

  // OAuth 2.0 RFC 6749 §10.12 — the `state` parameter MUST be
  // unguessable per-request and verified on callback. Without that
  // verification the callback is a CSRF sink: an attacker can hand
  // their own `code` to a victim's browser and end up linking their
  // Google account to the victim's Buaze workspace (account hijack).
  //
  // We generate a 32-byte random nonce, stamp it into both the
  // `state` query string we hand to Google AND an httpOnly cookie
  // on the user's browser. The callback handler matches the two
  // before doing the token exchange.
  const nonce = randomBytes(32).toString('base64url');
  const owner = ownerRef(actor);
  const state = Buffer.from(JSON.stringify({ owner, nonce, ts: Date.now() })).toString('base64url');

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri(req));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);

  const isSecure =
    process.env.NODE_ENV === 'production' &&
    (req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:');

  const response = NextResponse.json({ ok: true, configured: true, url: url.toString() });
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: STATE_TTL_SECONDS,
    path: '/',
  });
  return response;
}
