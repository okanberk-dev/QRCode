'use client';

import { useEffect, useState } from 'react';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { paymentResultMessage, type PaymentNoticeKind } from '@/lib/billing/payment-result-copy';

/**
 * Shows the result of a card payment on /pricing. The return route sends a
 * lapsed owner here (`?plan=expired&payment=<status>`) because the dashboard
 * would bounce them to /pricing and drop the result (billing spec §8.6).
 * Reads `window.location` after mount, so the page stays statically
 * rendered; the parameter is dropped from the URL so a reload does not
 * repeat it.
 */
export default function PaymentResultNotice({ locale }: { locale: 'tr' | 'en' }) {
  const [notice, setNotice] = useState<{ kind: PaymentNoticeKind; message: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('payment');
    if (!status) return;
    setNotice(paymentResultMessage(status, locale));
    params.delete('payment');
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
  }, [locale]);

  if (!notice) return null;
  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 pt-6 sm:px-7">
      <AlertBanner kind={notice.kind === 'success' ? 'success' : 'danger'} onDismiss={() => setNotice(null)}>
        {notice.message}
      </AlertBanner>
    </div>
  );
}
