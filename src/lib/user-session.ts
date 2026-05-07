import * as Sentry from '@sentry/nextjs';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/rate-limit';
import { hashToken } from '@/lib/session-hash';

export type UserSessionCreateResult =
  | { ok: true }
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
 */
export async function createUserSessionForToken({
  req,
  userId,
  token,
  context,
}: CreateUserSessionArgs): Promise<UserSessionCreateResult> {
  try {
    await prisma.userSession.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        userAgent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
        ipAddress: getClientIp(req.headers) ?? null,
      },
    });
    return { ok: true };
  } catch (err) {
    const errorObj = err as { code?: string; message?: string };
    const code = errorObj.code ?? null;
    if (code === 'P2002') {
      console.warn(`[${context}] UserSession create P2002 (duplicate tokenHash) - continuing with existing row`);
      return { ok: true };
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
