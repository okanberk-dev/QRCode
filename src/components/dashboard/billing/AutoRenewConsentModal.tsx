'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AlertBanner, APCheckbox, Modal } from '@/components/ui';
import type { AutoRenewOfferPublic, StepUpMethodName } from '@/lib/billing/card-types';
import { BILLING_COPY, billingText, formatIstanbulDate, formatTry, type BillingLocale } from './billing-copy';
import { BillingApiError, useSetAutoRenew, useStepUp } from './usePaymentMethod';

/**
 * "Otomatik yenilemeyi aç" (billing spec §12.3, D14). Two steps in one
 * dialog:
 *  1. step-up: the one method the server offers (password, the 6-digit
 *     authenticator code, or a fresh Google sign-in in a popup). Nothing about
 *     it is kept on the client; the server sets a 5-minute cookie.
 *  2. the instruction: plan, amount, first charge and card, the exact text
 *     (rendered verbatim), an unchecked box that names the payment
 *     obligation, and "Onayla ve otomatik yenilemeyi aç".
 * A 409 terms_changed swaps in the server's new offer and asks again; a 403
 * step_up_required (the cookie expired) goes back to step 1.
 */
export default function AutoRenewConsentModal({
  locale,
  offer: initialOffer,
  method,
  onClose,
  onEnabled,
}: {
  locale: BillingLocale;
  offer: AutoRenewOfferPublic;
  method: StepUpMethodName;
  onClose: () => void;
  onEnabled: (result: { state: 'on' | 'paused'; firstChargeDate: string }) => void;
}) {
  const t = (key: Parameters<typeof billingText>[0], vars?: Record<string, string | number>) => billingText(key, locale, vars);
  const [step, setStep] = useState<'verify' | 'consent'>('verify');
  const [offer, setOffer] = useState(initialOffer);
  const [secret, setSecret] = useState('');
  const [checked, setChecked] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<{ kind: 'warn' | 'danger'; text: string } | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const stepUp = useStepUp();
  const setAuto = useSetAutoRenew();
  const inputId = useId();
  const textId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const headingRef = useRef<HTMLParagraphElement | null>(null);

  const amount = formatTry(offer.terms.amountMinor, locale);
  const firstCharge = formatIstanbulDate(offer.terms.firstChargeDate, locale);

  useEffect(() => {
    if (step === 'verify') inputRef.current?.focus();
    else headingRef.current?.focus();
  }, [step]);

  const failVerify = (err: unknown) => {
    const code = err instanceof BillingApiError ? err.code : '';
    setVerifyError(
      t(
        code === 'rate_limited'
          ? 'stepup.rateLimited'
          : code === 'email_unverified'
            ? 'stepup.emailUnverified'
            : code === 'email_recently_changed'
              ? 'stepup.emailChanged'
              : 'stepup.error',
      ),
    );
    inputRef.current?.focus();
  };

  const submitVerify = async (proof: Parameters<typeof stepUp.mutateAsync>[0]) => {
    setVerifyError(null);
    try {
      await stepUp.mutateAsync(proof);
      setSecret('');
      setStep('consent');
    } catch (err) {
      failVerify(err);
    }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busyVerify) return;
    if (method === 'password') {
      if (secret) await submitVerify({ method: 'password', password: secret });
      else setVerifyError(t('stepup.passwordEmpty'));
    } else if (method === 'totp') {
      if (/^\d{6}$/.test(secret)) await submitVerify({ method: 'totp', code: secret });
      else setVerifyError(t('stepup.totpFormat'));
    }
    if (method !== 'google') inputRef.current?.focus();
  };

  const onGoogle = async () => {
    setVerifyError(null);
    setGoogleBusy(true);
    try {
      const { reauthenticateWithGooglePopup } = await import('@/lib/firebase-client');
      const res = await reauthenticateWithGooglePopup();
      if (res.status === 'idToken') await submitVerify({ method: 'google', idToken: res.idToken });
      else if (res.status !== 'cancelled') setVerifyError(t('stepup.error'));
    } catch {
      setVerifyError(t('stepup.error'));
    } finally {
      setGoogleBusy(false);
    }
  };

  const onConfirm = async () => {
    if (!checked || setAuto.isPending) return;
    setConsentError(null);
    try {
      const res = await setAuto.mutateAsync({ enabled: true, offer });
      onEnabled({ state: res.state === 'paused' ? 'paused' : 'on', firstChargeDate: res.firstChargeDate ?? offer.terms.firstChargeDate });
    } catch (err) {
      if (err instanceof BillingApiError) {
        if (err.code === 'terms_changed' && err.body && typeof err.body.offer === 'object' && err.body.offer) {
          setOffer(err.body.offer as AutoRenewOfferPublic);
          setChecked(false);
          setConsentError({ kind: 'warn', text: t('ar.termsChanged') });
          return;
        }
        if (err.code === 'step_up_required') {
          setChecked(false);
          setVerifyError(t('stepup.expired'));
          setStep('verify');
          return;
        }
        if (err.code === 'email_unverified' || err.code === 'email_recently_changed') {
          setConsentError({ kind: 'danger', text: t(err.code === 'email_unverified' ? 'stepup.emailUnverified' : 'stepup.emailChanged') });
          return;
        }
        if (err.code === 'charge_in_progress') {
          setConsentError({ kind: 'warn', text: t('ar.chargeInProgress') });
          return;
        }
        if (err.code === 'not_eligible') {
          const reason = typeof err.body?.reason === 'string' ? err.body.reason : '';
          const key = `ar.na.${reason}` as Parameters<typeof billingText>[0];
          setConsentError({ kind: 'danger', text: reason && key in BILLING_COPY ? t(key) : t('ar.notEligible') });
          return;
        }
      }
      setConsentError({ kind: 'danger', text: t('ar.error') });
    }
  };

  const busyVerify = stepUp.isPending || googleBusy;

  const footer =
    step === 'verify' ? (
      <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="bz-btn-ghost min-h-[44px] sm:min-h-[36px]" onClick={onClose}>
          {t('ar.cancel')}
        </button>
        {method === 'google' ? null : (
          <button
            type="submit"
            form={`${inputId}-form`}
            className="bz-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 sm:min-h-[36px]"
            aria-disabled={busyVerify || !secret}
            disabled={busyVerify}
          >
            {stepUp.isPending ? <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
            {t('ar.continue')}
          </button>
        )}
      </div>
    ) : (
      <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="bz-btn-ghost min-h-[44px] sm:min-h-[36px]" onClick={onClose}>
          {t('ar.cancel')}
        </button>
        <button
          type="button"
          className="bz-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 sm:min-h-[36px] aria-disabled:cursor-not-allowed aria-disabled:bg-[#EDEDED] aria-disabled:text-[#525252] aria-disabled:hover:bg-[#EDEDED]"
          aria-disabled={!checked || setAuto.isPending}
          onClick={() => void onConfirm()}
        >
          {setAuto.isPending ? <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          {t('ar.confirm')}
        </button>
      </div>
    );

  return (
    <Modal title={t(step === 'verify' ? 'stepup.title' : 'ar.modalTitle')} onClose={onClose} size={520} footer={footer}>
      {step === 'verify' ? (
        <form id={`${inputId}-form`} onSubmit={(e) => void onVerify(e)} className="space-y-3">
          <p className="text-[13px] leading-[1.55] text-[#525252]">{t('stepup.body')}</p>
          {method === 'google' ? (
            <>
              <p className="text-[13px] leading-[1.55] text-[#525252]">{t('stepup.googleHint')}</p>
              <button
                type="button"
                onClick={() => void onGoogle()}
                disabled={busyVerify}
                className="bz-btn-primary inline-flex min-h-[44px] w-full items-center justify-center gap-2 sm:w-auto"
              >
                {busyVerify ? <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
                {t('stepup.google')}
              </button>
            </>
          ) : (
            <div>
              <label htmlFor={inputId} className="mb-1.5 block text-[12.5px] font-medium text-[#0A0A0A]">
                {t(method === 'totp' ? 'stepup.totp' : 'stepup.password')}
              </label>
              <input
                ref={inputRef}
                id={inputId}
                className="bz-input w-full"
                type={method === 'totp' ? 'text' : 'password'}
                inputMode={method === 'totp' ? 'numeric' : undefined}
                autoComplete={method === 'totp' ? 'one-time-code' : 'current-password'}
                maxLength={method === 'totp' ? 6 : 200}
                pattern={method === 'totp' ? '[0-9]{6}' : undefined}
                enterKeyHint="go"
                value={secret}
                onChange={(e) => setSecret(method === 'totp' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value)}
                aria-invalid={verifyError ? true : undefined}
                aria-describedby={verifyError ? `${inputId}-err` : undefined}
              />
            </div>
          )}
          {verifyError ? (
            <p id={`${inputId}-err`} role="alert" className="text-[12.5px] text-[#991B1B]">
              {verifyError}
            </p>
          ) : null}
        </form>
      ) : (
        <div className="space-y-4">
          <p ref={headingRef} tabIndex={-1} className="sr-only">
            {t('ar.modalTitle')}
          </p>
          {consentError ? <AlertBanner kind={consentError.kind}>{consentError.text}</AlertBanner> : null}
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-[#737373]">{t('ar.summaryPlan')}</dt>
              <dd className="font-medium text-[#0A0A0A] [overflow-wrap:anywhere]">{offer.terms.planName}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[#737373]">{t('ar.summaryAmount')}</dt>
              <dd className="font-medium text-[#0A0A0A]">
                {amount} <span className="font-normal text-[#737373]">· {t('ar.summaryMonthly')}</span>
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[#737373]">{t('ar.summaryFirst')}</dt>
              <dd className="font-medium text-[#0A0A0A]">{firstCharge}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[#737373]">{t('ar.summaryCard')}</dt>
              <dd className="font-medium text-[#0A0A0A]">{offer.terms.last4 ? `•••• ${offer.terms.last4}` : '—'}</dd>
            </div>
          </dl>
          <div>
            <p id={textId} className="mb-1.5 text-[12px] font-medium text-[#525252]">
              {t('ar.textLabel')}
            </p>
            <div
              role="document"
              aria-labelledby={textId}
              tabIndex={0}
              className="max-h-[220px] overflow-y-auto whitespace-pre-line rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-4 text-[12.5px] leading-[1.6] text-[#525252] [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
            >
              {offer.text}
            </div>
          </div>
          <APCheckbox checked={checked} onChange={setChecked} label={t('ar.check', { amount })} />
        </div>
      )}
    </Modal>
  );
}
