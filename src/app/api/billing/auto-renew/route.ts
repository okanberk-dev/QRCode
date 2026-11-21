import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { getSecret } from '@/lib/auth';
import { hashToken } from '@/lib/session-hash';
import { getTrustedClientIp } from '@/lib/client-ip';
import { disableAutoRenew, enableAutoRenew } from '@/lib/billing/auto-renew';
import { loadAutoRenewDeps } from '@/lib/billing/auto-renew-deps';
import { loadBillingFlags } from '@/lib/billing/flags';
import { BILLING_NO_STORE, requireBillingOwner } from '@/lib/billing/owner-guard';
import { RENEWAL_POLICY } from '@/lib/billing/renewal-policy';
import { clearStepUpCookie, readStepUp, STEP_UP_COOKIE, stepUpSessionKey } from '@/lib/billing/step-up';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const Body = z.discriminatedUnion('enabled', [
  z
    .object({
      enabled: z.literal(true),
      consent: z.object({ accepted: z.literal(true), textVersion: z.string().max(32), textHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
      expected: z
        .object({
          amountMinor: z.number().int().positive(),
          planId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
          cardHandle: z.string().regex(/^cd_[A-Za-z0-9_-]{22}$/),
          firstChargeDate: z.string().datetime(),
        })
        .strict(),
    })
    .strict(),
  z.object({ enabled: z.literal(false) }).strict(),
]);

/**
 * POST /api/billing/auto-renew — turns the auto-renew instruction on or off
 * (billing spec §8.3). On needs a step-up of this session (D14, the
 * `bz_bsu` cookie, cleared in every response) and the exact terms the owner
 * confirmed (409 `terms_changed` with the new offer otherwise). Off is one
 * click and never needs more than the session: turning off is never harder
 * than turning on.
 */
export async function POST(req: NextRequest) {
  const flags = await loadBillingFlags();
  const guard = await requireBillingOwner(req, { mutate: true, needFlag: null, flags });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status, headers: BILLING_NO_STORE });
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: 'unsupported_media_type' }, { status: 415, headers: BILLING_NO_STORE });
  }
  const userId = guard.userId;
  const secure = process.env.NODE_ENV === 'production' || req.nextUrl.protocol === 'https:';
  const respond = (body: unknown, status: number) => {
    const res = NextResponse.json(body, { status, headers: BILLING_NO_STORE });
    res.headers.append('Set-Cookie', clearStepUpCookie(secure));
    return res;
  };
  if (!(await rateLimit(`billing:auto-renew:${userId}`, 10, 10 * 60_000)).allowed) return respond({ error: 'rate_limited' }, 429);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return respond({ error: 'invalid_body' }, 400);
  const deps = await loadAutoRenewDeps(flags);
  const ip = getTrustedClientIp(req.headers);
  const ua = req.headers.get('user-agent');

  if (!parsed.data.enabled) {
    const res = await disableAutoRenew(deps, { userId, authMethod: 'session', ip, ua });
    return respond(
      { ok: true, autoRenew: 'off', accessUntil: res.accessUntil ? res.accessUntil.toISOString() : null, chargeInProgress: res.chargeInProgress },
      200,
    );
  }

  if (!flags.autoCharge || !flags.binding.ok) return respond({ error: 'unavailable' }, 503);
  if (!RENEWAL_POLICY.panelEnable) return respond({ error: 'use_checkout' }, 409);

  const rawToken = req.cookies.get('user_token')?.value ?? '';
  const stepUp = rawToken
    ? readStepUp(req.cookies.get(STEP_UP_COOKIE)?.value, { userId, sessionKey: stepUpSessionKey(hashToken(rawToken)), now: new Date() }, getSecret())
    : null;
  const res = await enableAutoRenew(deps, { userId, stepUp, ip, ua }, { consent: parsed.data.consent, expected: parsed.data.expected });
  return respond(res.body, res.status);
}
