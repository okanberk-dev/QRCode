import * as Sentry from '@sentry/nextjs';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/rate-limit';
import { hashToken } from '@/lib/session-hash';
import { computeDeviceFingerprint } from '@/lib/device-fingerprint';

export type UserSessionCreateResult =
  | { ok: true; fingerprint: string }
  | { ok: false; error: string; code: string | null };

interface CreateUserSessionArgs {
  req: NextRequest;
  userId: string;
  token: string;
  context: string;
}

/**
 * Creates the UserSession row required by auth.ts fail-closed checks.
 * Every route that sets `user_token` must call this before writing the cookie.
 *
 * The row also stores a coarse device fingerprint (UA major + IP /16, see
 * device-fingerprint.ts) for the account's session list. The "new device
 * login" alert mail that used it was retired in 2026-11: Chrome ships a new
 * major version every 4 weeks and mobile IPs rotate, so it fired for the
 * owner's own phone and browser updates.
 */
export async function createUserSessionForToken({
  req,
  userId,
  token,
  context,
}: CreateUserSessionArgs): Promise<UserSessionCreateResult> {
  const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null;
  const ipAddress = getClientIp(req.headers) ?? null;
  const fingerprint = computeDeviceFingerprint(userAgent, ipAddress);

  try {
    await prisma.userSession.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        userAgent,
        ipAddress,
        fingerprint,
      },
    });
    return { ok: true, fingerprint };
  } catch (err) {
    const errorObj = err as { code?: string; message?: string };
    const code = errorObj.code ?? null;
    if (code === 'P2002') {
      console.warn(`[${context}] UserSession create P2002 (duplicate tokenHash) - continuing with existing row`);
      // Token collision is a sub-second retry of the same login.
      return { ok: true, fingerprint };
    }

    console.error(`[${context}] UserSession create failed:`, errorObj.message ?? 'unknown', {
      code,
      userId,
    });
    Sentry.captureException(err, {
      tags: {
        kind: 'user-session-create-failure',
        context,
        prismaCode: code ?? 'unknown',
      },
      extra: {
        userId,
      },
    });
    return {
      ok: false,
      code,
      error: 'Oturum kaydedilemedi. Lütfen tekrar deneyin.',
    };
  }
}
