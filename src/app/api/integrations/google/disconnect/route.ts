import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import type { PanelActor } from '@/lib/auth';
import { writePanelAuditLog } from '@/lib/audit-log';
import { decryptToken } from '@/lib/google-token-crypto';

const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const REVOKE_TIMEOUT_MS = 5000;

function ownerRef(actor: PanelActor) {
  return actor.source === 'user' ? actor.id : `admin:${actor.id}`;
}

/**
 * Tells Google to invalidate the grant (refresh token revokes the whole
 * grant, including every access token issued from it). Best effort: the
 * caller always deletes the local row afterwards, so a Google outage never
 * leaves the user unable to disconnect. Returns whether Google confirmed.
 */
async function revokeAtGoogle(token: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REVOKE_TIMEOUT_MS);
  try {
    const res = await fetch(GOOGLE_REVOKE_URL, {
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

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = ownerRef(actor);

  const integration = await prisma.googleIntegration.findUnique({
    where: { userId },
    select: { accessToken: true, refreshToken: true },
  });

  let revoked = false;
  if (integration) {
    try {
      const stored = integration.refreshToken || integration.accessToken;
      revoked = await revokeAtGoogle(decryptToken(stored));
    } catch {
      // Undecryptable token (key rotated): nothing usable to revoke — still
      // delete the row below so the user can reconnect cleanly.
      revoked = false;
    }
  }

  const result = await prisma.googleIntegration.deleteMany({
    where: { userId },
  });

  // Disconnecting stops Google review sync + replies for every restaurant of
  // the workspace — leave a trail (owner + admin audit views).
  if (result.count > 0) {
    await writePanelAuditLog(actor, 'owner.google.disconnect', actor.source === 'user' ? actor.id : null, {
      revokedAtGoogle: revoked,
    });
  }

  return NextResponse.json({ success: true, revokedAtGoogle: revoked });
}
