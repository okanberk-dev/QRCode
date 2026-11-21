import type { Metadata } from 'next';
import { billingText } from '@/lib/billing/billing-copy';
import { prisma } from '@/lib/prisma';
import { loadHmacKeys, verifyOffLinkToken } from '@/lib/billing/vault-crypto';
import { offLinkSuperseded } from '@/lib/billing/auto-renew';
import AutoRenewOffClient, { type OffLinkState } from './AutoRenewOffClient';

export const dynamic = 'force-dynamic';

/**
 * The off-only mail link (billing spec §8.8): `/billing/{locale}/auto-renew-off?t=…`.
 * GET never changes anything (mail scanners and link previews follow links);
 * the single button POSTs the token to /api/billing/auto-renew/off-link.
 * Login is not required. The page shows nothing beyond the plan name.
 * Rendered under the billing root layout: no third-party script.
 */

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = (await params).locale === 'en' ? 'en' : 'tr';
  return { title: { absolute: `${billingText('off.title', locale)} · Buaze` }, robots: { index: false, follow: false } };
}

export default async function AutoRenewOffPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = (await params).locale === 'en' ? 'en' : 'tr';
  const raw = (await searchParams).t;
  const token = typeof raw === 'string' && raw.length <= 512 ? raw : '';

  let state: OffLinkState = 'invalid';
  let planName: string | null = null;
  let verified: { consentId: string; userId: string } | null = null;
  try {
    verified = token ? verifyOffLinkToken(token, loadHmacKeys(), new Date()) : null;
  } catch {
    verified = null;
  }
  if (verified) {
    const sub = await prisma.billingSubscription.findUnique({
      where: { userId: verified.userId },
      select: { autoRenew: true, autoRenewConsentId: true, subscriptionPlanId: true },
    });
    if (!sub?.autoRenew || !sub.autoRenewConsentId) {
      state = 'already';
    } else if (await offLinkSuperseded(prisma, verified, sub.autoRenewConsentId)) {
      state = 'superseded';
    } else {
      state = 'ready';
      if (sub.subscriptionPlanId) {
        const plan = await prisma.subscriptionPlan.findUnique({ where: { id: sub.subscriptionPlanId }, select: { nameTr: true, nameEn: true } });
        planName = plan ? (locale === 'en' ? plan.nameEn : plan.nameTr) : null;
      }
    }
  }

  return <AutoRenewOffClient locale={locale} token={state === 'ready' ? token : ''} initialState={state} planName={planName} />;
}
