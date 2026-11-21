'use client';

import { AlertBanner, type AlertKind } from '@/components/ui';
import type { RenewalNoticeData } from '@/lib/billing/card-types';
import { billingText, formatIstanbulDate, type BillingLocale } from './billing-copy';

/**
 * The one renewal banner above the billing grid (billing spec §12.1),
 * priority danger > warn > info:
 *  - danger: the renewal needs the owner (needs_action);
 *  - warn: the subscription is past due, or a payment is being verified
 *    (manual_review);
 *  - info: reminder mode within 7 days of the period end.
 * Each comes with "Pay now" → the review page (3D Secure on PayNKolay).
 */

export interface RenewalNoticeInput {
  renewal: RenewalNoticeData | null;
  status: string | null;
  renewsAt: string | null;
  /** Renewal through the review page is possible (card subscription, saved cards on). */
  canRenew: boolean;
  /** Auto-renew status from the payment-method answer (null while unknown). */
  autoRenewStatus?: 'off' | 'on' | 'paused' | 'unavailable' | null;
  now: Date;
}

export function renewalNoticeFor(input: RenewalNoticeInput): {
  kind: AlertKind;
  key: 'notice.needsAction' | 'notice.manualReview' | 'notice.pastDue' | 'notice.reminder' | 'notice.processing' | 'notice.ownerPaying' | 'notice.autoScheduled' | 'ar.paused';
  date: string | null;
  grace: string | null;
} | null {
  const r = input.renewal;
  const grace = r?.graceEndsAt ?? r?.periodEnd ?? input.renewsAt;
  if (r?.state === 'needs_action') return { kind: 'danger', key: 'notice.needsAction', date: r.periodEnd, grace };
  if (r?.state === 'manual_review') return { kind: 'warn', key: 'notice.manualReview', date: r.periodEnd, grace };
  // The owner started a payment (maybe abandoned on PayNKolay's page): paying again is allowed and
  // supersedes it (checkout-post.ts), so this notice keeps the action.
  if (r?.state === 'owner_paying') return { kind: 'info', key: 'notice.ownerPaying', date: r.periodEnd, grace };
  if (r?.state === 'charging' || r?.state === 'awaiting_confirmation') {
    return { kind: 'info', key: 'notice.processing', date: r.periodEnd, grace };
  }
  if (input.status === 'past_due' || r?.state === 'retry_wait') return { kind: 'warn', key: 'notice.pastDue', date: r?.periodEnd ?? input.renewsAt, grace };
  // An auto renewal whose charge falls after the period end: access continues, nothing to do.
  if (r && r.mode === 'auto' && r.state === 'scheduled' && r.nextAttemptAt && input.autoRenewStatus === 'on') {
    const end = new Date(r.periodEnd).getTime();
    const left = end - input.now.getTime();
    if (new Date(r.nextAttemptAt).getTime() > end && left <= 7 * 24 * 60 * 60_000) {
      return { kind: 'info', key: 'notice.autoScheduled', date: r.nextAttemptAt, grace };
    }
    return null;
  }
  if (r && r.mode === 'reminder') {
    const end = new Date(r.periodEnd).getTime();
    const left = end - input.now.getTime();
    // A paused instruction (flag off, dry run, breaker) keeps access until the grace end (D4).
    if (input.autoRenewStatus === 'paused' && r.graceEndsAt && left <= 7 * 24 * 60 * 60_000) {
      return { kind: 'info', key: 'ar.paused', date: r.periodEnd, grace: r.graceEndsAt };
    }
    if (left > 0 && left <= 7 * 24 * 60 * 60_000) return { kind: 'info', key: 'notice.reminder', date: r.periodEnd, grace };
  }
  return null;
}

export default function RenewalNotice({ locale, ...input }: RenewalNoticeInput & { locale: BillingLocale }) {
  const notice = renewalNoticeFor(input);
  if (!notice) return null;
  const text = billingText(notice.key, locale, {
    date: formatIstanbulDate(notice.date, locale),
    grace: formatIstanbulDate(notice.grace, locale),
  });
  const action = input.canRenew && notice.key !== 'notice.processing' && notice.key !== 'notice.autoScheduled';
  return (
    <AlertBanner kind={notice.kind}>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span>{text}</span>
        {action ? (
          <a
            href={`/billing/${locale}/checkout?intent=renew`}
            className="inline-flex min-h-[32px] items-center font-semibold underline underline-offset-[3px] hover:no-underline"
          >
            {billingText(notice.kind === 'info' ? 'notice.renewNow' : 'hero.payNow', locale)}
          </a>
        ) : null}
      </span>
    </AlertBanner>
  );
}
