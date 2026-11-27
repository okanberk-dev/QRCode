'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Loader2, Lock, ShieldCheck } from 'lucide-react';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import { AlertBanner, APCheckbox } from '@/components/ui';
import CardVisual from '@/components/dashboard/billing/CardVisual';
import { billingText, formatIstanbulDate, formatTry, type BillingCopyKey } from '@/components/dashboard/billing/billing-copy';
import type { ReviewModel } from '@/lib/billing/checkout-review';
import { SUPPORT_EMAIL } from '@/lib/company-constants';

/**
 * The review page body (billing spec §12.4). A native form, no fetch and no
 * secret: hidden inputs carry the plan, cycle, intent, the amount shown (for
 * stale-page detection) and the hash of the card-save consent text shown. The
 * POST recomputes and checks all of it before anything is written.
 */
export default function CheckoutReviewClient({
  model,
  focusSave,
  loginUrl,
}: {
  model: ReviewModel;
  focusSave: boolean;
  /** Sign-in page that comes back to this review page (the sign-in score gate, §3.3). */
  loginUrl: string;
}) {
  const { locale } = model;
  const t = (key: BillingCopyKey, vars?: Record<string, string | number>) => billingText(key, locale, vars);
  const router = useRouter();
  const [pendingCycle, startCycle] = useTransition();
  const [saveCard, setSaveCard] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [needSave, setNeedSave] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const saveRef = useRef<HTMLDivElement | null>(null);
  const dashboardUrl = `/${locale}/dashboard/account?section=billing`;

  // Coming back through the back/forward cache: the form is usable again (a new payment is created).
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setSubmitting(false);
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  useEffect(() => {
    if (focusSave && saveRef.current) saveRef.current.scrollIntoView({ block: 'center' });
  }, [focusSave]);

  const amount = model.amountMinor !== null ? formatTry(model.amountMinor, locale) : '';
  const title =
    model.intent === 'renew' ? t('review.renewTitle') : model.intent === 'replace_card' ? t('review.replaceTitle') : t('review.title');
  const canSave = model.cardStorage && model.saveAllowed;
  const replaceBlocked = model.intent === 'replace_card' && !canSave;
  // The sign-in score gate would refuse the payment: say so BEFORE the pay button, not after it.
  const verifyBlocked = model.verification !== null;

  // "Sign in again": end this session, then sign in and come straight back here (a fresh, assessed sign-in).
  const signInAgain = async () => {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      /* the login page still works; the old session simply stays */
    }
    window.location.assign(loginUrl);
  };

  const setCycle = (cycle: 'monthly' | 'yearly') => {
    if (cycle === model.cycle || !model.plan) return;
    const qs = new URLSearchParams({ planId: model.plan.id, cycle });
    startCycle(() => router.replace(`/billing/${locale}/checkout?${qs.toString()}`, { scroll: false }));
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (submitting || replaceBlocked || verifyBlocked) {
      e.preventDefault();
      return;
    }
    if (model.intent === 'replace_card' && !saveCard) {
      e.preventDefault();
      setNeedSave(true);
      saveRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    setSubmitting(true);
  };

  const header = (
    <header className="sticky top-0 z-20 h-14 border-b border-[#EDEDED] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-full w-full max-w-[1040px] items-center justify-between gap-3 px-4 sm:px-7">
        <a href={dashboardUrl} className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D3EBC]">
          <BuazeLogo size={28} />
          <span className="text-[17px] font-semibold tracking-[-0.02em] [font-family:var(--font-heading)]">buaze</span>
        </a>
        <span className="hidden items-center gap-1.5 text-[13px] text-[#737373] sm:inline-flex">
          <Lock size={12} aria-hidden="true" />
          {t('review.eyebrow')}
        </span>
        <a
          href={dashboardUrl}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-1 text-[13px] text-[#525252] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D3EBC] sm:min-h-0"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          {t('review.cancel')}
        </a>
      </div>
    </header>
  );

  if (model.blocked || !model.plan || model.amountMinor === null || !model.period) {
    const message =
      model.blocked === 'impersonating'
        ? t('review.impersonating')
        : model.blocked === 'owner_only'
          ? t('review.ownerOnly')
          : model.blocked === 'no_plan'
            ? t('review.noPlan')
            : model.blocked === 'expired'
              ? t('review.expired')
              : t('review.err.unavailable');
    const expired = model.blocked === 'expired';
    return (
      <main className="min-h-dvh bg-[#F6F6F6] text-[#111110]">
        {header}
        <div className="mx-auto w-full max-w-[560px] px-4 py-16 sm:px-7">
          <div className="bz-card p-6 text-center">
            <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F5F5]">
              <Lock size={20} className="text-[#737373]" />
            </span>
            <p className="mt-4 text-[15px] leading-[1.55] text-[#404040]" role="status">
              {message}
            </p>
            {/* An ended plan: the panel would redirect to the plan list anyway, so go there directly. */}
            <a href={expired ? `/${locale}/pricing` : dashboardUrl} className="bz-btn-primary bg-[#5D3EBC] hover:bg-[#4C2FA3] mt-6 inline-flex min-h-[44px] items-center">
              {expired ? t('review.seePlans') : t('review.backToPanel')}
            </a>
          </div>
        </div>
      </main>
    );
  }

  const plan = model.plan;
  const businesses =
    plan.maxBusinesses && plan.maxBusinesses > 0
      ? plan.maxBusinesses === 1
        ? t('review.businessOne')
        : t('review.businesses', { count: plan.maxBusinesses })
      : null;
  const meta = [businesses, ...plan.features].filter(Boolean).join(' · ');
  const periodLine = t('review.period', {
    from: formatIstanbulDate(model.period.from, locale),
    to: formatIstanbulDate(model.period.to, locale),
  });
  const payLabel = t('review.pay', { amount });
  const payDisabled = submitting || replaceBlocked || verifyBlocked;

  const payButton = (id: string, onDark: boolean) => (
    <button
      id={id}
      type="submit"
      aria-disabled={payDisabled || undefined}
      className={`${onDark ? 'bz-btn-lime bg-white text-[#5D3EBC] hover:bg-[#EFEAFB] focus-visible:ring-white focus-visible:ring-offset-[#3B1F8F]' : 'bz-btn-primary bg-[#5D3EBC] hover:bg-[#4C2FA3] focus-visible:ring-[#5D3EBC] focus-visible:ring-offset-white'} flex min-h-[48px] w-full items-center justify-center gap-2 text-[15px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-60`}
    >
      {submitting ? (
        <>
          <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          {t('review.redirecting')}
        </>
      ) : (
        payLabel
      )}
    </button>
  );

  const legal = (onDark: boolean) => (
    <p className={`text-[11.5px] leading-[1.6] ${onDark ? 'text-white/80' : 'text-[#737373]'}`}>
      {(['mesafeli-hizmet-sozlesmesi', 'iade-iptal-politikasi'] as const).map((slug, i) => (
        <span key={slug}>
          {i > 0 ? ' · ' : ''}
          <a
            href={`/${locale}/${slug}`}
            target="_blank"
            rel="noopener"
            className={`underline underline-offset-2 ${onDark ? 'hover:text-white' : 'hover:text-[#0A0A0A]'}`}
          >
            {t(i === 0 ? 'review.distance' : 'review.refund')}
          </a>
        </span>
      ))}
    </p>
  );

  const saveLabel =
    model.intent === 'new' ? t('review.saveCard') : model.intent === 'replace_card' ? t('review.saveCard') : t('review.saveNewCard');

  return (
    <main className="min-h-dvh bg-[#F6F6F6] text-[#111110]">
      {header}
      <div className="mx-auto w-full max-w-[1040px] px-4 py-8 sm:px-7 lg:py-12">
        {model.error ? (
          <div className="mb-6" role="alert">
            <AlertBanner kind="danger">{t(`review.err.${model.error}` as BillingCopyKey, { email: SUPPORT_EMAIL })}</AlertBanner>
          </div>
        ) : null}
        {model.verification ? (
          <div className="mb-6" role="status">
            <AlertBanner kind="warn">
              <span className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span>
                  {t(
                    model.verification === 'no_score'
                      ? 'review.verify.noScore'
                      : model.verification === 'low_score'
                        ? 'review.verify.lowScore'
                        : 'review.verify.stale',
                    { email: SUPPORT_EMAIL },
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => void signInAgain()}
                  disabled={signingOut}
                  className="bz-btn-primary bg-[#5D3EBC] hover:bg-[#4C2FA3] inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 self-start sm:min-h-[36px] sm:self-auto"
                >
                  {signingOut ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
                  {t('review.verify.button')}
                </button>
              </span>
            </AlertBanner>
          </div>
        ) : null}

        <form method="post" action="/api/billing/paynkolay/checkout" onSubmit={onSubmit} noValidate>
          <input type="hidden" name="planId" value={plan.id} />
          <input type="hidden" name="cycle" value={model.cycle} />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="intent" value={model.intent} />
          <input type="hidden" name="expectedAmountMinor" value={String(model.amountMinor)} />
          {model.consent ? <input type="hidden" name="cardSaveTextHash" value={model.consent.textHash} /> : null}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* ── Order ── */}
            <section aria-labelledby="review-title" className={`bz-card p-5 sm:p-6 ${pendingCycle ? 'opacity-60' : ''} transition-opacity`}>
              <p className="text-[13px] font-medium text-[#737373]">{title}</p>
              <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 id="review-title" className="text-[26px] font-medium leading-[1.15] tracking-[-0.02em] [font-family:var(--font-heading)]">
                    {plan.name}
                  </h1>
                  {meta ? <p className="mt-1.5 text-[13px] leading-[1.5] text-[#525252]">{meta}</p> : null}
                </div>
                {model.intent === 'new' && model.amounts.monthly !== null && model.amounts.yearly !== null ? (
                  <div role="group" aria-label={t('review.cycle')} className="inline-flex shrink-0 rounded-full bg-[#F6F6F6] p-1">
                    {(['monthly', 'yearly'] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={model.cycle === c}
                        disabled={pendingCycle}
                        onClick={() => setCycle(c)}
                        className={`min-h-[40px] rounded-full px-4 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D3EBC] sm:min-h-[34px] ${
                          model.cycle === c ? 'bg-[#5D3EBC] text-white' : 'text-[#525252] hover:text-[#0A0A0A]'
                        }`}
                      >
                        {t(c === 'monthly' ? 'review.monthly' : 'review.yearly')}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#F6F6F6] px-3 py-1.5 text-[12.5px] text-[#404040] ring-1 ring-[#EBEBEB]">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#5D3EBC]" />
                {periodLine}
              </p>

              {model.intent !== 'new' && model.pastDue ? (
                <div className="mt-4">
                  <AlertBanner kind="warn">{t('review.pastDue')}</AlertBanner>
                </div>
              ) : null}
              {model.manualReview ? (
                <div className="mt-4">
                  <AlertBanner kind="warn">
                    {t('notice.manualReview', { grace: formatIstanbulDate(model.renewsAt, locale) })}
                  </AlertBanner>
                </div>
              ) : null}

              <div className="mt-6 border-t border-[#EDEDED] pt-6">
                {model.intent === 'replace_card' ? (
                  <p className="mb-4 text-[13.5px] leading-[1.6] text-[#404040]">
                    {t('review.replaceBody', {
                      amount,
                      renewsAt: formatIstanbulDate(model.renewsAt, locale),
                      newEnd: formatIstanbulDate(model.period.to, locale),
                    })}
                  </p>
                ) : null}

                {model.intent === 'renew' && model.savedCard ? (
                  <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <CardVisual card={model.savedCard} locale={locale} size="sm" />
                    <p className="text-[13px] leading-[1.6] text-[#525252]">
                      {model.hostedCardSelect ? t('review.savedCardSelect') : t('review.enterCard')}
                    </p>
                  </div>
                ) : model.intent === 'renew' || !model.cardStorage ? (
                  <p className="mb-4 flex items-start gap-2 text-[13px] leading-[1.6] text-[#525252]">
                    <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#5D3EBC]" aria-hidden="true" />
                    {t('review.enterCard')}
                  </p>
                ) : null}

                {model.cardStorage ? (
                  <div ref={saveRef} id="save-card" className={`rounded-xl p-4 ring-1 transition-colors ${needSave ? 'bg-[#FFFBEB] ring-[#FDE68A]' : 'bg-[#FAFAFA] ring-[#EDEDED]'}`}>
                    {/* The consent text stored with the payment (textRendered, hashed) is the visible hint of the box:
                        the owner consents to exactly what they see (§13.2). */}
                    <APCheckbox
                      name="saveCard"
                      value="on"
                      checked={canSave && saveCard}
                      disabled={!canSave}
                      onChange={(next) => {
                        setSaveCard(next);
                        if (next) setNeedSave(false);
                      }}
                      label={<span className="text-[14px] font-medium leading-[1.45] text-[#0A0A0A]">{saveLabel}</span>}
                      sublabel={
                        canSave && model.consent ? (
                          <span className="block text-[12.5px] leading-[1.55] text-[#525252]">
                            {model.intent === 'renew' && model.savedCard ? (
                              <span className="mb-1.5 block">{t('review.saveNewHint')}</span>
                            ) : null}
                            <span className="block whitespace-pre-line">{model.consent.text}</span>
                          </span>
                        ) : undefined
                      }
                    />
                    {!canSave ? (
                      // Outside the disabled checkbox (which is dimmed): the one line saying why stays readable.
                      <p className="mt-2 pl-8 text-[12.5px] leading-[1.55] text-[#525252]">{t('review.saveLater')}</p>
                    ) : null}
                    {needSave ? (
                      <p className="mt-2 text-[12.5px] font-medium text-[#92400E]" role="alert">
                        {t('review.replaceRequired')}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>

            {/* ── Amount + pay (desktop) ── */}
            <aside className="hidden lg:block" aria-label={t('review.dueToday')}>
              <div className="sticky top-[88px] rounded-[24px] bg-[#3B1F8F] p-6 text-white">
                <p className="text-[13px] font-medium text-white/80">{t('review.dueToday')}</p>
                <p className="mt-2 text-[32px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-white">{amount}</p>
                <p className="mt-2 text-[12px] text-white/80">
                  {t(model.cycle === 'yearly' ? 'review.yearly' : 'review.monthly')} · {t('review.vatIncluded')}
                </p>
                <p className="mt-5 text-[12px] leading-[1.55] text-white/90">{t('review.obligation', { amount })}</p>
                <div className="mt-3">{payButton('pay-desktop', true)}</div>
                <p className="mt-4 flex items-center gap-1.5 text-[12px] text-white/80">
                  <Lock size={12} aria-hidden="true" />
                  {t('review.trust')}
                </p>
                <div className="mt-4 border-t border-white/10 pt-4">{legal(true)}</div>
              </div>
              <ul className="mt-4 space-y-2 px-1 text-[12px] text-[#737373]">
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-[#5D3EBC]" aria-hidden="true" />
                  {t('pm.meta')}
                </li>
              </ul>
            </aside>
          </div>

          {/* The contract links stay in the page flow ABOVE the spacer, so the fixed bar never covers them; the
              spacer is taller than the bar (amount, two-line obligation, button, trust line, safe area). */}
          <div className="mt-6 lg:hidden">{legal(false)}</div>
          <div aria-hidden="true" className="h-[calc(13rem+env(safe-area-inset-bottom))] lg:hidden" />
          {/* ── Amount + pay (phones and tablets): a sticky bar ── */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#EDEDED] bg-white/95 px-4 pt-3 shadow-[0_-8px_24px_rgba(10,10,10,0.06)] backdrop-blur pb-safe lg:hidden">
            <div className="mx-auto w-full max-w-[640px] pb-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] text-[#737373]">{t('review.dueToday')}</span>
                <span className="text-[20px] font-semibold tabular-nums tracking-[-0.01em]">{amount}</span>
              </div>
              <p className="mt-1 text-[11px] leading-[1.45] text-[#737373]">{t('review.obligation', { amount })}</p>
              <div className="mt-2">{payButton('pay-mobile', false)}</div>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#737373]">
                <Lock size={11} aria-hidden="true" />
                {t('review.trust')}
              </p>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
