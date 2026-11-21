import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { getTrustedClientIp } from '@/lib/client-ip';
import { disableAutoRenew } from '@/lib/billing/auto-renew';
import { loadAutoRenewDeps } from '@/lib/billing/auto-renew-deps';
import { loadBillingFlags } from '@/lib/billing/flags';
import { allowedBillingOrigins, BILLING_NO_STORE } from '@/lib/billing/owner-guard';
import { loadHmacKeys, verifyOffLinkToken } from '@/lib/billing/vault-crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const Body = z.object({ t: z.string().min(10).max(512) }).strict();

/**
 * POST /api/billing/auto-renew/off-link — the off-only mail link (billing
 * spec §8.8). Login is not required: the token (HMAC, 30 days) names the
 * consent and the owner, and can only turn auto-renew OFF, and only while
 * that consent is still the effective one. The GET page never changes
 * anything (mail scanners follow links); this POST comes from its button.
 * The answer never shows account data beyond the plan name.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin || !allowedBillingOrigins(req.nextUrl.origin).includes(origin)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: BILLING_NO_STORE });
  }
  const ip = getTrustedClientIp(req.headers);
  if (!(await rateLimit(`billing:off-link:${ip ?? 'unknown'}`, 10, 10 * 60_000)).allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: BILLING_NO_STORE });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_link' }, { status: 400, headers: BILLING_NO_STORE });

  let token: { consentId: string; userId: string } | null = null;
  try {
    token = verifyOffLinkToken(parsed.data.t, loadHmacKeys(), new Date());
  } catch {
    token = null;
  }
  if (!token) return NextResponse.json({ error: 'invalid_link' }, { status: 400, headers: BILLING_NO_STORE });

  const sub = await prisma.billingSubscription.findUnique({
    where: { userId: token.userId },
    select: { autoRenew: true, autoRenewConsentId: true },
  });
  if (!sub?.autoRenew || !sub.autoRenewConsentId) {
    return NextResponse.json({ ok: true, alreadyOff: true }, { status: 200, headers: BILLING_NO_STORE });
  }
  // Only the instruction this link was sent for: its own consent, or a card-change amendment of it (D6).
  // After an off and a new opt-in, an older link no longer works; that opt-in mailed its own link.
  if (sub.autoRenewConsentId !== token.consentId) {
    const [linked, latestOn] = await prisma.$transaction([
      prisma.billingConsent.findFirst({ where: { id: token.consentId, userId: token.userId }, select: { createdAt: true } }),
      prisma.billingConsent.findFirst({ where: { userId: token.userId, kind: 'auto_renew_on' }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    ]);
    if (!linked || !latestOn || linked.createdAt.getTime() < latestOn.createdAt.getTime()) {
      return NextResponse.json({ error: 'link_superseded' }, { status: 409, headers: BILLING_NO_STORE });
    }
  }
  const flags = await loadBillingFlags();
  const deps = await loadAutoRenewDeps(flags);
  const res = await disableAutoRenew(deps, { userId: token.userId, authMethod: 'mail_link', ip, ua: req.headers.get('user-agent') });
  return NextResponse.json(
    { ok: true, alreadyOff: !res.changed, chargeInProgress: res.chargeInProgress, accessUntil: res.accessUntil ? res.accessUntil.toISOString() : null },
    { status: 200, headers: BILLING_NO_STORE },
  );
}
