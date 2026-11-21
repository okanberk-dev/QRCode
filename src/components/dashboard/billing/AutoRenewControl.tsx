'use client';

import { useEffect, useRef, useState } from 'react';
import { APSwitch } from '@/components/ui';
import type { PaymentMethodResponse } from '@/lib/billing/card-types';
import AutoRenewConsentModal from './AutoRenewConsentModal';
import { BILLING_COPY, billingText, formatIstanbulDate, formatTry, type BillingCopyKey, type BillingLocale } from './billing-copy';
import { BillingApiError, useSetAutoRenew } from './usePaymentMethod';

/**
 * The auto-renew row of the payment-method card (billing spec §12.3).
 *  - ON never toggles directly: it opens the step-up + consent dialog.
 *  - OFF is one click, optimistic, reverted on error, confirmed by a status
 *    line ("planınız {date} tarihine kadar açık", or the in-flight refund
 *    line). Turning off is never harder than turning on.
 *  - Hidden while auto-charging is unavailable, unless an instruction exists
 *    (then it reads paused and can still be turned off).
 */
export default function AutoRenewControl({
  locale,
  data,
}: {
  locale: BillingLocale;
  data: PaymentMethodResponse;
}) {
  const t = (key: BillingCopyKey, vars?: Record<string, string | number>) => billingText(key, locale, vars);
  const ar = data.autoRenew;
  const setAuto = useSetAutoRenew();
  const [modalOpen, setModalOpen] = useState(false);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [line, setLine] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const lineTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (lineTimer.current) window.clearTimeout(lineTimer.current);
  }, []);

  if (!data.autoChargeAvailable && ar.status !== 'paused') return null;

  const isOn = optimistic ?? (ar.status === 'on' || ar.status === 'paused');
  const amount = ar.nextCharge ? formatTry(ar.nextCharge.amountMinor, locale) : '';
  const nextDate = ar.nextCharge ? formatIstanbulDate(ar.nextCharge.date, locale) : '';
  const last4 = data.card?.bound ? data.card.last4 : null;

  const say = (next: { tone: 'ok' | 'error'; text: string }) => {
    setLine(next);
    if (lineTimer.current) window.clearTimeout(lineTimer.current);
    if (next.tone === 'ok') lineTimer.current = window.setTimeout(() => setLine(null), 8000);
  };

  const sublabel = (() => {
    if (ar.status === 'on') {
      if (!nextDate) return t('ar.off');
      return last4 ? t('ar.on', { date: nextDate, amount, last4 }) : t('ar.onNoCard', { date: nextDate, amount });
    }
    if (ar.status === 'paused') return t('ar.pausedShort');
    if (ar.status === 'off') return t('ar.off');
    const reasonKey = `ar.na.${ar.unavailableReason ?? 'no_card'}`;
    return reasonKey in BILLING_COPY ? t(reasonKey as BillingCopyKey) : t('ar.notEligible');
  })();

  const turnOff = async () => {
    setOptimistic(false);
    try {
      const res = await setAuto.mutateAsync({ enabled: false });
      say({
        tone: 'ok',
        text: res.chargeInProgress
          ? t('ar.inFlightRefund')
          : res.accessUntil
            ? t('ar.offNotice', { date: formatIstanbulDate(res.accessUntil, locale) })
            : t('ar.offNoticeGeneric'),
      });
    } catch (err) {
      say({ tone: 'error', text: err instanceof BillingApiError && err.code === 'impersonation_blocked' ? t('pm.impersonating') : t('ar.error') });
    } finally {
      setOptimistic(null);
    }
  };

  const onChange = (next: boolean) => {
    setLine(null);
    if (!next) {
      void turnOff();
      return;
    }
    if (ar.offer && ar.stepUp) setModalOpen(true);
  };

  if (ar.status === 'off' && ar.enableVia === 'checkout') {
    return (
      <div className="mt-4 border-t border-[#EDEDED] pt-4">
        <p className="text-[13px] font-medium text-[#0A0A0A]">{t('ar.label')}</p>
        <a
          href={`/billing/${locale}/checkout?intent=renew`}
          className="mt-1 inline-flex min-h-[44px] items-center text-[12.5px] text-[#525252] underline decoration-[#C6F24E] underline-offset-4 hover:text-[#0A0A0A] sm:min-h-0"
        >
          {t('ar.useCheckout')}
        </a>
      </div>
    );
  }

  const canToggle = data.canManage && (isOn || (ar.status === 'off' && !!ar.offer && !!ar.stepUp));

  return (
    <div className="mt-4 border-t border-[#EDEDED] pt-4">
      <APSwitch
        size="md"
        checked={isOn}
        onChange={onChange}
        label={t('ar.label')}
        sublabel={sublabel}
        loading={setAuto.isPending}
        disabled={!canToggle}
      />
      <p
        role="status"
        aria-live="polite"
        className={`mt-2 min-h-[16px] text-[12px] leading-[1.45] ${line?.tone === 'error' ? 'text-[#991B1B]' : 'text-[#4D5C00]'}`}
      >
        {line?.text ?? ''}
      </p>
      {modalOpen && ar.offer && ar.stepUp ? (
        <AutoRenewConsentModal
          locale={locale}
          offer={ar.offer}
          method={ar.stepUp.method}
          onClose={() => setModalOpen(false)}
          onEnabled={(res) => {
            setModalOpen(false);
            say({
              tone: 'ok',
              text: res.state === 'paused' ? t('ar.onPausedNotice') : t('ar.onNotice', { date: formatIstanbulDate(res.firstChargeDate, locale) }),
            });
          }}
        />
      ) : null}
    </div>
  );
}
