import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { instructionBlockReason } from '@/lib/billing/auto-renew';
import { getSecret } from '@/lib/auth';
import { hashToken } from '@/lib/session-hash';
import { verifyToken } from '@/lib/totp';
import { verifyFirebaseIdToken } from '@/lib/firebase-admin';
import { loadBillingFlags } from '@/lib/billing/flags';
import { BILLING_NO_STORE, requireBillingOwner } from '@/lib/billing/owner-guard';
import { billingLog } from '@/lib/billing/redact';
import { issueStepUpCookie, serializeStepUpCookie, stepUpSessionKey, verifyStepUpProof } from '@/lib/billing/step-up';
import { RENEWAL_POLICY } from '@/lib/billing/renewal-policy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const Body = z.discriminatedUnion('method', [
  z.object({ method: z.literal('totp'), code: z.string().regex(/^\d{6}$/) }).strict(),
  z.object({ method: z.literal('password'), password: z.string().min(1).max(200) }).strict(),
  z.object({ method: z.literal('google'), idToken: z.string().min(1).max(4096) }).strict(),
]);

/**
 * POST /api/billing/step-up — the owner proves it is them before turning
 * auto-renew on (billing spec §8.7, D14). Owner only, never during
 * impersonation, same-origin, only while auto-charging is available.
 * 204 + `bz_bsu` cookie (5 min, this session only) on success; a generic
 * 401 `invalid_proof` otherwise. Only `{ userId, method, ok }` is logged.
 */
export async function POST(req: NextRequest) {
  const flags = await loadBillingFlags();
  const guard = await requireBillingOwner(req, { mutate: true, needFlag: 'autoCharge', flags });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status, headers: BILLING_NO_STORE });
  if (!RENEWAL_POLICY.panelEnable) return NextResponse.json({ error: 'use_checkout' }, { status: 409, headers: BILLING_NO_STORE });
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: 'unsupported_media_type' }, { status: 415, headers: BILLING_NO_STORE });
  }
  const userId = guard.userId;
  if (!(await rateLimit(`billing:stepup:${userId}`, 5, 15 * 60_000)).allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: BILLING_NO_STORE });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400, headers: BILLING_NO_STORE });

  const rawToken = req.cookies.get('user_token')?.value;
  if (!rawToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: BILLING_NO_STORE });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, twoFactorEnabled: true, totpSecret: true, passwordHash: true, isActive: true },
  });
  if (!user || !user.isActive) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: BILLING_NO_STORE });

  const now = new Date();
  const blocked = await instructionBlockReason(prisma, userId, now);
  if (blocked) return NextResponse.json({ error: blocked }, { status: 403, headers: BILLING_NO_STORE });
  const result = await verifyStepUpProof(
    user,
    parsed.data,
    { verifyTotp: verifyToken, verifyFirebase: verifyFirebaseIdToken },
    now,
  );
  billingLog('info', 'billing.step_up', { userId, method: parsed.data.method, ok: result.ok });
  if (!result.ok) {
    const status = result.error === 'method_mismatch' ? 400 : 401;
    return NextResponse.json({ error: result.error }, { status, headers: BILLING_NO_STORE });
  }

  const value = issueStepUpCookie({ userId, sessionKey: stepUpSessionKey(hashToken(rawToken)), method: result.method, now }, getSecret());
  const secure = process.env.NODE_ENV === 'production' || req.nextUrl.protocol === 'https:';
  const res = new NextResponse(null, { status: 204, headers: BILLING_NO_STORE });
  res.headers.append('Set-Cookie', serializeStepUpCookie(value, Math.floor(RENEWAL_POLICY.stepUpMaxAgeMs / 1000), secure));
  return res;
}
