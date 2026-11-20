import type { PrismaClient } from '@prisma/client';
import type { BillingCopyKey } from './billing-copy';
import { CLIENT_REF_RE, type PaymentResultStatus } from './return-flow';

/**
 * Data of the billing result page (`/billing/{locale}/result`, billing spec
 * §12.6). `p=<paymentId>` is used only when the payment belongs to the
 * signed-in owner (explicit select); otherwise the page shows a generic
 * message (IDOR-safe). The payment's own status wins over the query string.
 */

export interface ResultModel {
  status: PaymentResultStatus | null;
  titleKey: BillingCopyKey;
  bodyKey: BillingCopyKey;
  details: null | {
    planName: string | null;
    amountMinor: number;
    periodEnd: string | null;
    cycle: 'monthly' | 'yearly';
  };
  card: null | { state: 'saved'; last4: string | null } | { state: 'not_saved' } | { state: 'pending' };
  /** Review page for "try again" (failed only). */
  retryPath: string | null;
}

const COPY: Record<PaymentResultStatus, { title: BillingCopyKey; body: BillingCopyKey }> = {
  success: { title: 'result.success', body: 'result.successGeneric' },
  failed: { title: 'result.failed', body: 'result.failedBody' },
  pending: { title: 'result.pending', body: 'result.pendingBody' },
  review: { title: 'result.review', body: 'result.reviewBody' },
};

export function statusFromQuery(value: string | null): PaymentResultStatus | null {
  return value === 'success' || value === 'failed' || value === 'pending' || value === 'review' ? value : null;
}

function statusFromPayment(status: string): PaymentResultStatus {
  if (status === 'succeeded') return 'success';
  if (status === 'failed') return 'failed';
  if (status === 'needs_review') return 'review';
  return 'pending';
}

export async function loadResultModel(input: {
  db: PrismaClient;
  locale: 'tr' | 'en';
  query: PaymentResultStatus | null;
  paymentId: string | null;
  viewerUserId: string | null;
}): Promise<ResultModel> {
  const generic = (status: PaymentResultStatus | null): ResultModel => ({
    status,
    titleKey: status ? COPY[status].title : 'result.generic',
    bodyKey: status ? COPY[status].body : 'result.genericBody',
    details: null,
    card: null,
    retryPath: status === 'failed' ? `/billing/${input.locale}/checkout` : null,
  });
  if (!input.paymentId || !CLIENT_REF_RE.test(input.paymentId) || !input.viewerUserId) return generic(input.query);

  const payment = await input.db.billingPayment.findUnique({
    where: { id: input.paymentId },
    select: {
      userId: true,
      status: true,
      amountMinor: true,
      billingCycle: true,
      kind: true,
      subscriptionPlanId: true,
      saveCard: true,
      cardSaveResult: true,
    },
  });
  if (!payment || payment.userId !== input.viewerUserId) return generic(input.query);

  const status = statusFromPayment(payment.status);
  const cycle = payment.billingCycle === 'yearly' ? 'yearly' : 'monthly';
  const plan = payment.subscriptionPlanId
    ? await input.db.subscriptionPlan.findUnique({ where: { id: payment.subscriptionPlanId }, select: { nameTr: true, nameEn: true } })
    : null;
  const sub =
    status === 'success'
      ? await input.db.billingSubscription.findUnique({ where: { userId: payment.userId }, select: { renewsAt: true } })
      : null;

  let card: ResultModel['card'] = null;
  if (payment.saveCard && status === 'success') {
    if (payment.cardSaveResult === 'saved') {
      const row = await input.db.billingCard.findFirst({
        where: { userId: payment.userId, savedByPaymentId: input.paymentId, deletedAt: null },
        select: { last4: true },
      });
      card = { state: 'saved', last4: row?.last4 ?? null };
    } else if (payment.cardSaveResult === 'not_saved') {
      card = { state: 'not_saved' };
    } else {
      card = { state: 'pending' };
    }
  }

  const retry = new URLSearchParams();
  if (payment.kind === 'renewal_link') retry.set('intent', 'renew');
  else if (payment.subscriptionPlanId) {
    retry.set('planId', payment.subscriptionPlanId);
    retry.set('cycle', cycle);
  }
  return {
    status,
    titleKey: COPY[status].title,
    bodyKey: status === 'success' && sub?.renewsAt ? 'result.successBody' : COPY[status].body,
    details: {
      planName: plan ? (input.locale === 'en' ? plan.nameEn : plan.nameTr) : null,
      amountMinor: payment.amountMinor,
      periodEnd: sub?.renewsAt ? sub.renewsAt.toISOString() : null,
      cycle,
    },
    card,
    retryPath: status === 'failed' ? `/billing/${input.locale}/checkout?${retry.toString()}` : null,
  };
}
