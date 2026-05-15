import * as Sentry from '@sentry/nextjs';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/rate-limit';
import { hashToken } from '@/lib/session-hash';
import { computeDeviceFingerprint } from '@/lib/device-fingerprint';

export type UserSessionCreateResult =
  | { ok: true; isNewDevice: boolean; fingerprint: string }
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
 * Wave D (CLAUDE.md §38.195) — also computes the fuzzy fingerprint
 * (UA major + IP /16, see device-fingerprint.ts) and reports whether
 * this session matches a previously-seen one. Caller decides whether
 * to act on `isNewDevice`:
 *   - login + google paths fire the new-device alert mail
 *   - register / verify-email / refresh skip the alert (first session
 *     for register/verify; renewal for refresh)
 *
 * `isNewDevice` is true only when the user has ANY prior session row
 * AND none of them match the current fingerprint. First-ever session
 * returns false so a brand-new account doesn't trigger an alert.
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

  // Pre-flight check BEFORE the insert so the new row itself doesn't get
  // counted as "prior". $transaction batch keeps the two reads on a
  // single pool slot (§40.1 connection_limit=1).
  let isNewDevice = false;
  try {
    const [priorAny, priorMatching] = await prisma.$transaction([
      prisma.userSession.count({ where: { userId } }),
      prisma.userSession.count({ where: { userId, fingerprint } }),
    ]);
    isNewDevice = priorAny > 0 && priorMatching === 0;
  } catch (err) {
    // If the count query fails (transient DB issue) we proceed with
    // session create + skip the alert. Silent fail is better UX than
    // refusing the login over a marginal feature.
    console.error(`[${context}] fingerprint pre-check failed`, {
      userId,
      errName: err instanceof Error ? err.name : 'unknown',
    });
  }

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
    return { ok: true, isNewDevice, fingerprint };
  } catch (err) {
    const errorObj = err as { code?: string; message?: string };
    const code = errorObj.code ?? null;
    if (code === 'P2002') {
      console.warn(`[${context}] UserSession create P2002 (duplicate tokenHash) - continuing with existing row`);
      // Token collision is sub-second retry; we treat as ok but suppress
      // the alert because this is the same logical login attempt.
      return { ok: true, isNewDevice: false, fingerprint };
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
