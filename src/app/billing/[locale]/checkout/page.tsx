import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyUserTokenForLayout } from '@/lib/auth';
import { billingText, reviewErrorCode } from '@/lib/billing/billing-copy';
import { loadCheckoutReview, type ReviewModel } from '@/lib/billing/checkout-review';
import { loadBillingFlags } from '@/lib/billing/flags';
import { getPaynkolayConfig } from '@/lib/payment/paynkolay';
import { prisma } from '@/lib/prisma';
import { isRecaptchaServerConfigured } from '@/lib/recaptcha';
import CheckoutReviewClient from './CheckoutReviewClient';

export const dynamic = 'force-dynamic';

/** A page title per intent (WCAG 2.4.2): the review page, the renewal and the card replacement are told apart. */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const locale = (await params).locale === 'en' ? 'en' : 'tr';
  const intent = (await searchParams).intent;
  const key = intent === 'renew' ? 'review.renewTitle' : intent === 'replace_card' ? 'review.replaceTitle' : 'review.title';
  return { title: { absolute: `${billingText(key, locale)} · Buaze` } };
}

/**
 * Review + consent page (billing spec §12.4, D11): the order, the period it
 * buys, and — with saved cards on — the option to save the card at PayNKolay
 * with its consent text, all BEFORE the hand-off to PayNKolay's card page. A
 * native form posts to /api/billing/paynkolay/checkout, which re-checks
 * everything. Rendered under the billing root layout: no third-party script.
 */

type SearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | null {
  return typeof v === 'string' ? v : null;
}

export default async function CheckoutReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === 'en' ? 'en' : 'tr';
  const sp = await searchParams;
  const intentRaw = one(sp.intent);
  const intent = intentRaw === 'renew' || intentRaw === 'replace_card' ? intentRaw : 'new';
  const planIdRaw = (one(sp.planId) ?? '').trim();
  const planId = /^[A-Za-z0-9_-]{1,64}$/.test(planIdRaw) ? planIdRaw : null;
  const cycle = one(sp.cycle) === 'yearly' ? 'yearly' : 'monthly';
  const error = reviewErrorCode(one(sp.error));
  const focusSave = one(sp.saveCard) === '1';

  const self = new URLSearchParams();
  if (intent !== 'new') self.set('intent', intent);
  if (intent === 'new' && planId) self.set('planId', planId);
  if (intent === 'new') self.set('cycle', cycle);
  const loginUrl = `/${locale}/auth/login?redirect=${encodeURIComponent(`/billing/${locale}/checkout?${self.toString()}`)}`;

  const token = (await cookies()).get('user_token')?.value;
  if (!token) redirect(loginUrl);
  const payload = await verifyUserTokenForLayout(token);
  if (!payload || typeof payload.userId !== 'string') redirect(loginUrl);
  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { role: true, isActive: true } });
  if (!user || !user.isActive) redirect(loginUrl);

  const base = {
    db: prisma,
    userId: payload.userId,
    locale,
    intent,
    planId,
    cycle,
    error,
    recaptchaConfigured: isRecaptchaServerConfigured(),
    now: new Date(),
  } as const;
  let model: ReviewModel;
  const impersonating = typeof payload.impersonating === 'object' && payload.impersonating !== null;
  if (user.role !== 'restaurant_owner' || impersonating) {
    model = await loadCheckoutReview({ ...base, flags: { cardStorage: false, hostedCardSelect: false }, configured: false });
    model = { ...model, blocked: impersonating ? 'impersonating' : 'owner_only' };
  } else {
    const flags = await loadBillingFlags();
    model = await loadCheckoutReview({ ...base, flags, configured: getPaynkolayConfig() !== null });
  }

  return <CheckoutReviewClient model={model} focusSave={focusSave} loginUrl={loginUrl} />;
}
