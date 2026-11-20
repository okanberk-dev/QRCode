import { cookies } from 'next/headers';
import { AlertTriangle, Check, CreditCard, Loader2, X } from 'lucide-react';
import { verifyUserTokenForLayout } from '@/lib/auth';
import { billingText, type BillingCopyKey } from '@/lib/billing/billing-copy';
import { formatIstanbulDate, formatTry } from '@/lib/billing/billing-format';
import { loadResultModel, statusFromQuery } from '@/lib/billing/result-model';
import { SUPPORT_EMAIL } from '@/lib/company-constants';
import { prisma } from '@/lib/prisma';
import ResultPoller from './ResultPoller';

export const dynamic = 'force-dynamic';

/**
 * Payment result (billing spec §12.6), outside the dashboard gate so a lapsed
 * owner sees it too, under the billing root layout (no third-party script, so
 * no analytics tool ever receives `payment=` or `p=`). Details only for the
 * payment's own owner; anyone else gets the generic message.
 */

const ICON = {
  success: { wrap: 'bg-[#EAF9B8]', Icon: Check, color: '#4D5C00' },
  failed: { wrap: 'bg-[#FEF2F2]', Icon: X, color: '#991B1B' },
  pending: { wrap: 'bg-[#F5F5F5]', Icon: Loader2, color: '#525252' },
  review: { wrap: 'bg-[#FFF7ED]', Icon: AlertTriangle, color: '#9A3412' },
} as const;

export default async function BillingResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === 'en' ? 'en' : 'tr';
  const sp = await searchParams;
  const query = statusFromQuery(typeof sp.payment === 'string' ? sp.payment : null);
  const paymentId = typeof sp.p === 'string' ? sp.p : null;

  let viewerUserId: string | null = null;
  const token = (await cookies()).get('user_token')?.value;
  if (token && paymentId) {
    const payload = await verifyUserTokenForLayout(token);
    if (payload && typeof payload.userId === 'string') viewerUserId = payload.userId;
  }
  const model = await loadResultModel({ db: prisma, locale, query, paymentId, viewerUserId });
  const t = (key: BillingCopyKey, vars?: Record<string, string | number>) => billingText(key, locale, vars);
  const icon = model.status ? ICON[model.status] : { wrap: 'bg-[#F5F5F5]', Icon: CreditCard, color: '#525252' };
  const Icon = icon.Icon;
  const dashboardUrl = `/${locale}/dashboard/account?section=billing`;
  const periodEnd = model.details?.periodEnd ? formatIstanbulDate(model.details.periodEnd, locale) : '';

  const rows: { label: string; value: string }[] = model.details
    ? [
        ...(model.details.planName ? [{ label: t('result.plan'), value: model.details.planName }] : []),
        {
          label: t('result.amount'),
          value: `${formatTry(model.details.amountMinor, locale)} · ${t(model.details.cycle === 'yearly' ? 'review.yearly' : 'review.monthly')}`,
        },
        ...(periodEnd ? [{ label: t('result.periodEnd'), value: periodEnd }] : []),
        ...(model.card?.state === 'saved' && model.card.last4 ? [{ label: t('result.card'), value: `•••• ${model.card.last4}` }] : []),
      ]
    : [];

  return (
    <main className="min-h-dvh bg-[#FAFAFA] text-[#0A0A0A]">
      <ResultPoller active={model.status === 'pending'} />
      <div className="mx-auto w-full max-w-[480px] px-4 py-16">
        <div className="bz-card p-6 text-center sm:p-8">
          <span aria-hidden="true" className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${icon.wrap}`}>
            <Icon
              size={26}
              strokeWidth={2.25}
              color={icon.color}
              className={model.status === 'pending' ? 'animate-spin motion-reduce:animate-none' : undefined}
            />
          </span>
          <div role="status" aria-live="polite">
            <h1 className="mt-5 text-[24px] font-medium leading-[1.2] tracking-[-0.02em] [font-family:var(--font-heading)]">{t(model.titleKey)}</h1>
            <p className="mx-auto mt-2 max-w-[360px] text-[14px] leading-[1.6] text-[#525252]">{t(model.bodyKey, { date: periodEnd })}</p>
          </div>

          {model.card ? (
            <p
              className={`mx-auto mt-4 max-w-[380px] rounded-xl px-4 py-3 text-[13px] leading-[1.55] ${
                model.card.state === 'saved' ? 'bg-[#EAF9B8] text-[#4D5C00]' : model.card.state === 'pending' ? 'bg-[#F5F5F5] text-[#525252]' : 'bg-[#FFFBEB] text-[#92400E]'
              }`}
            >
              {model.card.state === 'saved'
                ? model.card.last4
                  ? t('result.cardSaved', { last4: model.card.last4 })
                  : t('result.cardSavedGeneric')
                : model.card.state === 'pending'
                  ? t('result.cardPending')
                  : t('result.cardNotSaved')}
            </p>
          ) : null}

          {rows.length > 0 ? (
            <dl className="mt-6 divide-y divide-[#EDEDED] rounded-xl border border-[#EDEDED] text-left text-[13px]">
              {rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-3">
                  <dt className="text-[#737373]">{row.label}</dt>
                  <dd className="bz-mono text-right font-medium text-[#0A0A0A]">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <a href={dashboardUrl} className="bz-btn-primary inline-flex min-h-[44px] items-center justify-center">
              {t('result.back')}
            </a>
            {model.retryPath ? (
              <a href={model.retryPath} className="bz-btn-ghost inline-flex min-h-[44px] items-center justify-center">
                {t('result.retry')}
              </a>
            ) : null}
          </div>
          {model.status === 'failed' || model.status === 'review' ? (
            <p className="mt-5 text-[12px] text-[#737373]">
              {t('result.support', { email: SUPPORT_EMAIL })}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
