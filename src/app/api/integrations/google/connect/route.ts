import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { getPanelActorFromRequest } from '@/lib/auth';
import type { PanelActor } from '@/lib/auth';
import { GOOGLE_BUSINESS_SCOPE } from '@/lib/google-business';
import { getLocaleFromRequest } from '@/lib/api/locale';
import { ownerGoogleMessage } from '@/lib/google-owner-copy';

export const dynamic = 'force-dynamic';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = [GOOGLE_BUSINESS_SCOPE];

// 12 minutes — comfortably covers a slow user authenticating with Google
// (consent screen can take a minute), but short enough that a leaked
// nonce expires before it can be replayed against a different actor.
const STATE_TTL_SECONDS = 12 * 60;
export const GOOGLE_OAUTH_STATE_COOKIE = 'bz_google_oauth_state';

// CLAUDE.md §38 audit Fix #3 — GOOGLE_REDIRECT_URI yoksa fallback ile
// request origin'i kullanır. Production'da www.buaze.com vs buaze.com gibi
// subdomain mismatch'i Google "redirect_uri_mismatch" hatası üretir.
// Cold start başına bir kez Sentry warn → ops fark eder.
let warnedRedirectUriFallback = false;

function ownerRef(actor: PanelActor) {
  return actor.source === 'user' ? actor.id : `admin:${actor.id}`;
}

function redirectUri(req: NextRequest) {
  return process.env.GOOGLE_REDIRECT_URI || `${req.nextUrl.origin}/api/integrations/google/callback`;
}

function safeReturnTo(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//')) return null;
  if (value.length > 300) return null;
  return value;
}

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({
      ok: false,
      configured: false,
      // Machine code stays; the message is owner-safe (the panel can render
      // it) — it must never name an env var (§38.233).
      error: 'missing_google_client_id',
      message: ownerGoogleMessage('missing_google_client_id', getLocaleFromRequest(req)),
    });
  }

  // Fix #3 — Vercel env'de GOOGLE_REDIRECT_URI yok ise Sentry warn
  // (cold start başına 1 kez). Google Cloud Console authorized URI ile
  // mismatch → callback 400 → owner stranded.
  if (!process.env.GOOGLE_REDIRECT_URI && !warnedRedirectUriFallback) {
    warnedRedirectUriFallback = true;
    Sentry.captureMessage(
      'GOOGLE_REDIRECT_URI env not set; OAuth fallback uses request origin which may not match Google Cloud Console authorized URI.',
      {
        level: 'warning',
        tags: { integration: 'google-oauth', reason: 'redirect-uri-fallback' },
        extra: { fallbackOrigin: req.nextUrl.origin },
      },
    );
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
  const body = await req.json().catch(() => null);
  const returnTo = safeReturnTo((body as { returnTo?: unknown } | null)?.returnTo);
  const nonce = randomBytes(32).toString('base64url');
  const owner = ownerRef(actor);
  const state = Buffer.from(JSON.stringify({ owner, nonce, ts: Date.now(), returnTo })).toString('base64url');

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri(req));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('access_type', 'offline');
  // §38.205 — `consent select_account` ikilisi: owner her Google connect'te
  // hem consent ekranını hem account chooser'ı görür. Daha önce sadece
  // `consent` vardı → Google "son login olunan hesap" ile auto-login
  // yapıyordu, bu da "yanlış hesapla bağlandım" durumunu kullanıcı için
  // görünmez yapıyordu (especially Business Profile başka hesapta ise).
  // `select_account` Google'ın multi-account picker'ını tetikler.
  url.searchParams.set('prompt', 'consent select_account');
  url.searchParams.set('state', state);

  const isSecure =
    process.env.NODE_ENV === 'production' &&
    (req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:');

  const response = NextResponse.json({
    ok: true,
    configured: true,
    url: url.toString(),
    // Debug-only field: prod'a config leak yok, sadece dev'de görünür.
    // Owner "neden bağlanmıyor" troubleshooting'inde redirect URI'yi
    // doğrulamak için.
    ...(process.env.NODE_ENV === 'development' && {
      redirectUri: redirectUri(req),
    }),
  });
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: STATE_TTL_SECONDS,
    path: '/',
  });
  return response;
}
