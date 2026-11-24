import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import type { PanelActor } from '@/lib/auth';
import { writePanelAuditLog } from '@/lib/audit-log';
import { decryptToken } from '@/lib/google-token-crypto';
import { deleteGoogleReviewDataForOwner } from '@/lib/google-review-showcase';
import { revokeGoogleToken } from '@/lib/google-revoke';

function ownerRef(actor: PanelActor) {
  return actor.source === 'user' ? actor.id : `admin:${actor.id}`;
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
      revoked = await revokeGoogleToken(decryptToken(stored));
    } catch {
      // Undecryptable token (key rotated): nothing usable to revoke — still
      // delete the row below so the user can reconnect cleanly.
      revoked = false;
    }
  }

  const result = await prisma.googleIntegration.deleteMany({
    where: { userId },
  });

  // §53 — data fetched with this connection goes with it: cached Google
  // reviews and AI reply drafts of the owner's businesses. Runs even when no
  // row was left (a half-finished earlier disconnect).
  let cleanedBusinesses = 0;
  try {
    cleanedBusinesses = (await deleteGoogleReviewDataForOwner(userId)).length;
  } catch (err) {
    Sentry.captureMessage('Google review data cleanup failed on disconnect', {
      level: 'warning',
      tags: { integration: 'google-oauth', kind: 'disconnect-cleanup' },
      extra: { reason: err instanceof Error ? err.name : 'unknown' },
    });
  }

  // Disconnecting stops Google review sync + replies for every restaurant of
  // the workspace — leave a trail (owner + admin audit views).
  if (result.count > 0) {
    await writePanelAuditLog(actor, 'owner.google.disconnect', actor.source === 'user' ? actor.id : null, {
      revokedAtGoogle: revoked,
      cleanedBusinesses,
    });
  }

  return NextResponse.json({ success: true, revokedAtGoogle: revoked, cleanedBusinesses });
}
