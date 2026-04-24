import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import type { PanelActor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function ownerRef(actor: PanelActor) {
  return actor.source === 'user' ? actor.id : `admin:${actor.id}`;
}

function redirectBack(req: NextRequest, status: string) {
  const url = new URL(req.nextUrl.origin);
  url.pathname = '/tr/dashboard/profile';
  url.searchParams.set('google', status);
  return Response.redirect(url.toString(), 302);
}

function redirectUri(req: NextRequest) {
  return process.env.GOOGLE_REDIRECT_URI || `${req.nextUrl.origin}/api/integrations/google/callback`;
}

export async function GET(req: NextRequest) {
  const error = req.nextUrl.searchParams.get('error');
  if (error) return redirectBack(req, `error:${error}`);

  const code = req.nextUrl.searchParams.get('code');
  if (!code) return redirectBack(req, 'cancelled');

  const actor = await getPanelActorFromRequest(req);
  if (!actor) return redirectBack(req, 'unauthorized');

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
