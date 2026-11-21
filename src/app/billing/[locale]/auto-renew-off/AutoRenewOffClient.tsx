'use client';

import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import { billingText, formatIstanbulDate, type BillingCopyKey } from '@/components/dashboard/billing/billing-copy';

export type OffLinkState = 'ready' | 'already' | 'invalid';

type Result = { tone: 'ok' | 'error'; text: string } | null;

/** Body of /billing/{locale}/auto-renew-off: one button, one POST, one result line. */
export default function AutoRenewOffClient({
  locale,
  token,
  initialState,
  planName,
}: {
  locale: 'tr' | 'en';
  token: string;
  initialState: OffLinkState;
  planName: string | null;
}) {
  const t = (key: BillingCopyKey, vars?: Record<string, string | number>) => billingText(key, locale, vars);
  const [state, setState] = useState<OffLinkState | 'done'>(initialState);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const statusRef = useRef<HTMLParagraphElement | null>(null);
  const accountUrl = `/${locale}/dashboard/account?section=billing`;

  const turnOff = async () => {
    if (busy || !token) return;
    setBusy(true);
    let next: Result;
    try {
      const res = await fetch('/api/billing/auto-renew/off-link', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: token }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; alreadyOff?: boolean; accessUntil?: string | null; chargeInProgress?: boolean };
      if (res.ok) {
        const date = body.accessUntil ? formatIstanbulDate(body.accessUntil, locale) : '';
        next = {
          tone: 'ok',
          text: body.chargeInProgress ? t('ar.inFlightRefund') : body.alreadyOff ? t('off.already') : date ? t('off.doneUntil', { date }) : t('off.done'),
        };
        setState('done');
      } else {
        next = {
          tone: 'error',
          text: body.error === 'link_superseded' ? t('off.superseded') : body.error === 'invalid_link' ? t('off.invalid') : body.error === 'rate_limited' ? t('stepup.rateLimited') : t('off.error'),
        };
      }
    } catch {
      next = { tone: 'error', text: t('off.error') };
    }
    setBusy(false);
    setResult(next);
    window.setTimeout(() => statusRef.current?.focus(), 50);
  };

  return (
    <main className="min-h-dvh bg-[#FAFAFA] text-[#0A0A0A]">
      <header className="h-14 border-b border-[#EDEDED] bg-white">
        <div className="mx-auto flex h-full w-full max-w-[640px] items-center gap-2 px-4 sm:px-7">
          <BuazeLogo size={28} />
          <span className="text-[17px] font-semibold tracking-[-0.02em] [font-family:var(--font-heading)]">buaze</span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[640px] px-4 py-10 sm:px-7">
        <div className="bz-card p-5 sm:p-6">
          <p className="pulse-eyebrow text-[#737373]">{t('off.eyebrow')}</p>
          <h1 className="mt-2 text-[24px] font-medium leading-[1.2] tracking-[-0.02em] [font-family:var(--font-heading)]">{t('off.title')}</h1>

          {state === 'invalid' ? (
            <p className="mt-4 text-[14px] leading-[1.6] text-[#404040]">{t('off.invalid')}</p>
          ) : state === 'already' ? (
            <p className="mt-4 text-[14px] leading-[1.6] text-[#404040]">{t('off.already')}</p>
          ) : state === 'ready' ? (
            <>
              {planName ? (
                <p className="mt-3 text-[14px] font-medium text-[#0A0A0A]">{planName}</p>
              ) : null}
              <p className="mt-2 text-[14px] leading-[1.6] text-[#404040]">{t('off.body')}</p>
              <button
                type="button"
                onClick={() => void turnOff()}
                disabled={busy}
                aria-busy={busy}
                className="bz-btn-primary mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 sm:w-auto"
              >
                {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
                {t('off.button')}
              </button>
            </>
          ) : null}

          <p
            ref={statusRef}
            tabIndex={-1}
            role="status"
            aria-live="polite"
            className={`mt-4 min-h-[18px] text-[13px] leading-[1.5] focus:outline-none ${result?.tone === 'error' ? 'text-[#991B1B]' : 'text-[#4D5C00]'}`}
          >
            {result?.text ?? ''}
          </p>

          <a
            href={accountUrl}
            className="mt-2 inline-flex min-h-[44px] items-center text-[13px] text-[#525252] underline decoration-[#C6F24E] underline-offset-4 hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] sm:min-h-0"
          >
            {t('off.account')}
          </a>
        </div>
      </div>
    </main>
  );
}
