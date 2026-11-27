'use client';

import { useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Loader2, MailCheck } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { AlertBanner, Field } from '@/components/ui';
import { getRecaptchaToken } from '@/lib/recaptcha-client';
import RecaptchaNotice from '@/components/RecaptchaNotice';
import {
  ROI_DEFAULTS,
  ROI_LIMITS,
  ROI_SECTORS,
  ROI_SECTOR_LABELS,
  computeRoi,
  formatHours,
  formatUsd,
  normalizeRoiInputs,
  type RoiSector,
} from '@/lib/roi/roi-model';

/** A plan as the calculator needs it — passed from the server (getActivePlans). */
export interface RoiPlanOption {
  id: string;
  name: string;
  /** Monthly price in USD the customer pays today (discount applied). */
  priceMonthly: number;
}

interface RoiCalculatorProps {
  locale: Locale;
  plans: RoiPlanOption[];
}

const COPY = {
  tr: {
    formEyebrow: '1. Rakamlarınız',
    formTitle: 'İşletmenizin bilgileri',
    customers: 'Aylık müşteri sayısı',
    hourly: 'Bir çalışma saatinin maliyeti (USD)',
    hourlyHint: 'Yanıtları yazan kişinin saatlik maliyeti.',
    plan: 'Buaze planı',
    planHint: 'Aylık fiyatlar, USD.',
    planNone: 'Plan seçmeden hesapla',
    customCost: 'Aylık Buaze maliyeti (USD)',
    customCostPlaceholder: 'Tutarı yazın',
    customCostHint: 'Güncel fiyatlar fiyatlandırma sayfasındadır.',
    pricingLink: 'Fiyatlandırma',
    assumptions: 'Varsayımlar',
    assumptionsNote:
      'Bu oranlar yalnızca başlangıç değeridir; Buaze verisi ya da araştırma sonucu değildir. Kendi deneyiminize göre değiştirin.',
    ratingRate: 'QR kodu okutup puan veren müşteri oranı',
    replyShare: 'Yanıt yazdığınız geri bildirim oranı',
    minutesManual: 'Bir yanıtı elle yazma süresi',
    minutesDraft: 'Pulse AI taslağıyla yanıt süresi',
    minuteUnit: 'dk',
    minuteUnitLong: 'dakika',
    perMonth: '/ ay',
    resultEyebrow: '2. Tahmini sonuç',
    resultTitle: 'Tahmini zaman tasarrufu',
    hoursPerMonth: (h: string) => `${h} saat / ay`,
    timeValue: 'Bu sürenin tahmini değeri',
    planCost: 'Plan maliyeti',
    monthlyDiff: 'Tahmini aylık fark',
    yearlyDiff: '12 ayda tahmini fark',
    noPlan: 'Farkı görmek için bir plan seçin ya da aylık maliyeti yazın.',
    kpiRatings: 'Tahmini puan / ay',
    kpiReplies: 'Yanıt / ay',
    kpiManual: 'Elle yanıt süresi',
    kpiDraft: 'Taslakla yanıt süresi',
    hoursShort: (h: string) => `${h} sa`,
    coverage: 'Bugün harcadığınız sürede yanıt verebileceğiniz puan oranı',
    disclaimer:
      'Sonuçlar girdiğiniz değerlere dayanan tahminlerdir; garanti değildir. Hesap, daha fazla yorumun ya da geri kazanılan müşterilerin gelire etkisini içermez.',
    sticky: 'Tahmini tasarruf',
    stickyDiff: 'Fark',
    stickyLink: 'Sonuç',
    liveSummary: (h: string, diff: string | null) =>
      `Tahmini zaman tasarrufu ayda ${h} saat.${diff ? ` Tahmini aylık fark ${diff}.` : ''}`,
    leadEyebrow: '3. Raporu alın',
    leadTitle: 'Tahmini raporu e-postayla alın',
    leadBody:
      'Bu hesabın özeti ve PDF’i birkaç dakika içinde e-postanıza gelir. İsterseniz ekibimiz kurulum için sizinle iletişime geçer.',
    name: 'İşletme adı',
    namePlaceholder: 'İşletmenizin adı',
    sector: 'İşletme türü',
    email: 'E-posta',
    emailPlaceholder: 'ad@isletmeniz.com',
    phone: 'Telefon (isteğe bağlı)',
    consentA: 'Raporun e-postayla gönderilmesini ve Buaze ekibinin benimle iletişime geçmesini onaylıyorum. Ayrıntılar için ',
    consentLink: 'gizlilik politikasına',
    consentB: ' bakın.',
    privacyHref: '/tr/gizlilik',
    facts: ['14 gün ücretsiz deneme', 'Kredi kartı gerekmez', 'İstediğiniz zaman iptal'],
    privacyNote:
      'Bilgilerinizi satmayız. Raporu e-posta sağlayıcımız Resend ile gönderiyoruz; özeti hazırlamak için işletme adı, türü ve girdiğiniz değerler yapay zekâ sağlayıcımıza (Anthropic, yedek olarak OpenAI) gönderilir, e-posta adresiniz gönderilmez.',
    submit: 'Raporu gönder',
    sentTitle: 'Raporunuz yolda',
    sentBody: 'Tahmini raporunuz ve PDF’i birkaç dakika içinde e-postanıza gelir. Görmezseniz spam ve promosyonlar klasörüne bakın.',
    errName: 'İşletme adı en az 2 karakter olmalı.',
    errEmail: 'Geçerli bir e-posta adresi yazın.',
    errConsent: 'Devam etmek için onay kutusunu işaretleyin.',
    errRate: 'Çok sık denediniz. Birkaç dakika sonra tekrar deneyin.',
    errInvalidEmail: 'E-posta adresi geçersiz.',
    errGeneric: 'Gönderilemedi. Lütfen tekrar deneyin.',
    errNetwork: 'Bağlantı hatası. Lütfen tekrar deneyin.',
    honeypot: 'Web sitesi (boş bırakın)',
  },
  en: {
    formEyebrow: '1. Your numbers',
    formTitle: 'About your business',
    customers: 'Customers per month',
    hourly: 'Cost of one working hour (USD)',
    hourlyHint: 'Hourly cost of the person who writes the replies.',
    plan: 'Buaze plan',
    planHint: 'Monthly prices in USD.',
    planNone: 'Calculate without a plan',
    customCost: 'Monthly Buaze cost (USD)',
    customCostPlaceholder: 'Enter an amount',
    customCostHint: 'Current prices are on the pricing page.',
    pricingLink: 'Pricing',
    assumptions: 'Assumptions',
    assumptionsNote:
      'These rates are only starting values, not Buaze data or research results. Change them to match your own experience.',
    ratingRate: 'Share of customers who scan the QR code and rate',
    replyShare: 'Share of feedback you reply to',
    minutesManual: 'Time to write a reply by hand',
    minutesDraft: 'Time to reply with a Pulse AI draft',
    minuteUnit: 'min',
    minuteUnitLong: 'minutes',
    perMonth: '/ mo',
    resultEyebrow: '2. Estimated result',
    resultTitle: 'Estimated time saved',
    hoursPerMonth: (h: string) => `${h} hours / month`,
    timeValue: 'Estimated value of that time',
    planCost: 'Plan cost',
    monthlyDiff: 'Estimated monthly difference',
    yearlyDiff: 'Estimated difference over 12 months',
    noPlan: 'Pick a plan or enter a monthly cost to see the difference.',
    kpiRatings: 'Estimated ratings / mo',
    kpiReplies: 'Replies / mo',
    kpiManual: 'Writing by hand',
    kpiDraft: 'With drafts',
    hoursShort: (h: string) => `${h} h`,
    coverage: 'Share of ratings you could answer in the time you spend today',
    disclaimer:
      'Results are estimates based on the values you enter, not a guarantee. The calculation leaves out any revenue effect of more reviews or customers you win back.',
    sticky: 'Estimated time saved',
    stickyDiff: 'Difference',
    stickyLink: 'Result',
    liveSummary: (h: string, diff: string | null) =>
      `Estimated time saved: ${h} hours a month.${diff ? ` Estimated monthly difference: ${diff}.` : ''}`,
    leadEyebrow: '3. Get the report',
    leadTitle: 'Get the estimate by e-mail',
    leadBody:
      'A summary of this calculation and a PDF reach your inbox within a few minutes. If you like, our team will contact you to help with setup.',
    name: 'Business name',
    namePlaceholder: 'Your business name',
    sector: 'Type of business',
    email: 'E-mail',
    emailPlaceholder: 'you@yourbusiness.com',
    phone: 'Phone (optional)',
    consentA: 'I agree to receive the report by e-mail and to be contacted by the Buaze team. See the ',
    consentLink: 'privacy policy',
    consentB: ' for details.',
    privacyHref: '/en/privacy',
    facts: ['14-day free trial', 'No credit card required', 'Cancel anytime'],
    privacyNote:
      'We do not sell your details. The report is sent through our e-mail provider, Resend. To write the summary, your business name, type and the values you entered are sent to our AI provider (Anthropic, with OpenAI as a backup); your e-mail address is not.',
    submit: 'Send the report',
    sentTitle: 'Your report is on its way',
    sentBody: 'Your estimate and its PDF reach your inbox within a few minutes. If you cannot see it, check your spam and promotions folders.',
    errName: 'Business name must be at least 2 characters.',
    errEmail: 'Enter a valid e-mail address.',
    errConsent: 'Tick the consent box to continue.',
    errRate: 'Too many attempts. Please try again in a few minutes.',
    errInvalidEmail: 'Invalid e-mail address.',
    errGeneric: 'Could not send. Please try again.',
    errNetwork: 'Connection error. Please try again.',
    honeypot: 'Website (leave empty)',
  },
} as const;

function sliderFill(value: number, min: number, max: number): string {
  return `${Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))}%`;
}

function RangeField({
  id,
  label,
  hint,
  value,
  display,
  min,
  max,
  step,
  minLabel,
  maxLabel,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  minLabel: string;
  maxLabel: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[15px] font-medium leading-[1.4] text-[#0A0A0A]">
          {label}
        </label>
        <output htmlFor={id} className="shrink-0 font-mono text-[15px] font-semibold tabular-nums text-[#0A0A0A]">
          {display}
        </output>
      </div>
      {hint ? <p className="mt-1 text-[13px] leading-[1.5] text-[#737373]">{hint}</p> : null}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display}
        onChange={(e) => onChange(Number(e.target.value))}
        className="roi-slider mt-3 w-full"
        style={{ ['--roi-fill' as string]: sliderFill(value, min, max) }}
      />
      <div className="mt-1.5 flex justify-between font-mono text-[11px] text-[#737373]">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

/**
 * ROI calculator (/roi). Every number comes from the visitor's own inputs
 * (src/lib/roi/roi-model.ts): it estimates the time Pulse AI drafts save on
 * replies and compares its value with the real monthly plan price from the
 * DB. No rating projections, revenue multipliers or cohort statistics.
 */
export default function RoiCalculator({ locale, plans }: RoiCalculatorProps) {
  const lang: 'tr' | 'en' = locale === 'en' ? 'en' : 'tr';
  const copy = COPY[lang];
  const uid = useId();
  const defaults = ROI_DEFAULTS[lang];
  const L = ROI_LIMITS;
  const numLocale = lang === 'tr' ? 'tr-TR' : 'en-US';
  const fmt = (n: number) => n.toLocaleString(numLocale);

  const [monthlyCustomers, setMonthlyCustomers] = useState<number>(defaults.monthlyCustomers);
  const [ratingRatePct, setRatingRatePct] = useState<number>(defaults.ratingRatePct);
  const [replySharePct, setReplySharePct] = useState<number>(defaults.replySharePct);
  const [minutesManual, setMinutesManual] = useState<number>(defaults.minutesManual);
  const [minutesWithDraft, setMinutesWithDraft] = useState<number>(defaults.minutesWithDraft);
  const [hourlyCostUsd, setHourlyCostUsd] = useState<number>(defaults.hourlyCostUsd);
  const [planId, setPlanId] = useState<string>(() => plans[0]?.id ?? '');
  const [customCost, setCustomCost] = useState<string>('');

  const selectedPlan = plans.find((p) => p.id === planId) ?? null;
  const planMonthlyUsd = plans.length > 0
    ? selectedPlan
      ? selectedPlan.priceMonthly
      : null
    : customCost.trim() === ''
      ? null
      : Number(customCost.replace(',', '.'));

  const inputs = useMemo(
    () =>
      normalizeRoiInputs(
        { monthlyCustomers, ratingRatePct, replySharePct, minutesManual, minutesWithDraft, hourlyCostUsd, planMonthlyUsd },
        lang,
      ),
    [monthlyCustomers, ratingRatePct, replySharePct, minutesManual, minutesWithDraft, hourlyCostUsd, planMonthlyUsd, lang],
  );
  const result = useMemo(() => computeRoi(inputs), [inputs]);

  const hoursSaved = formatHours(result.hoursSaved, lang);
  const monthlyDiff =
    result.monthlyDifferenceUsd === null ? null : formatUsd(result.monthlyDifferenceUsd, { signed: true });
  const yearlyDiff =
    result.yearlyDifferenceUsd === null ? null : formatUsd(result.yearlyDifferenceUsd, { signed: true });

  function setManual(value: number) {
    setMinutesManual(value);
    if (minutesWithDraft > value) setMinutesWithDraft(value);
  }
  function setDraft(value: number) {
    setMinutesWithDraft(Math.min(value, minutesManual));
  }

  // ─── Lead form ────────────────────────────────────────────────────────
  const [leadName, setLeadName] = useState('');
  const [leadSector, setLeadSector] = useState<RoiSector>('restaurant');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadConsent, setLeadConsent] = useState(false);
  const [leadErrors, setLeadErrors] = useState<{ name?: string; email?: string; consent?: string }>({});
  const [leadStatus, setLeadStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [leadServerError, setLeadServerError] = useState<string | null>(null);
  // Honeypot: bots fill it, people never see it (server drops such posts).
  const [honeypotValue, setHoneypotValue] = useState('');
  // Submission velocity check on the server (bots submit within seconds).
  const formStartedAtRef = useRef<number>(Date.now());

  function validateLead() {
    const errors: typeof leadErrors = {};
    if (leadName.trim().length < 2) errors.name = copy.errName;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail.trim())) errors.email = copy.errEmail;
    if (!leadConsent) errors.consent = copy.errConsent;
    setLeadErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLeadServerError(null);
    if (!validateLead()) return;
    setLeadStatus('sending');
    try {
      const recaptchaToken = await getRecaptchaToken('roi_save').catch(() => null);
      const res = await fetch('/api/roi/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: leadEmail.trim(),
          restaurantName: leadName.trim(),
          phone: leadPhone.trim() || undefined,
          recaptchaToken,
          locale: lang,
          projection: {
            version: 2,
            sector: leadSector,
            planId: selectedPlan?.id ?? null,
            planName: selectedPlan?.name ?? null,
            inputs,
            result,
          },
          website_url: honeypotValue,
          formStartedAt: formStartedAtRef.current,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const code = data?.error;
        setLeadServerError(
          code === 'rate_limited' ? copy.errRate : code === 'invalid_email' ? copy.errInvalidEmail : copy.errGeneric,
        );
        setLeadStatus('error');
        return;
      }
      setLeadStatus('sent');
    } catch {
      setLeadServerError(copy.errNetwork);
      setLeadStatus('error');
    }
  }

  const minuteDisplay = (n: number) => `${n} ${copy.minuteUnit}`;
  const pct = (n: number) => (lang === 'tr' ? `%${n}` : `${n}%`);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* Mobile summary bar — sticks while the visitor moves the sliders. */}
      <div className="sticky top-0 z-30 -mx-5 border-b border-[#EDEDED] bg-white/95 px-5 py-2.5 backdrop-blur-md lg:hidden">
        <a
          href="#roi-result"
          className="flex min-h-[48px] items-center justify-between gap-3 rounded-full bg-[#5D3EBC] px-4 py-2 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6CF0] focus-visible:ring-offset-2"
        >
          <span className="min-w-0">
            <span className="block text-[11px] text-white/85">{copy.sticky}</span>
            <span className="block truncate text-[16px] font-semibold tabular-nums text-white">
              {copy.hoursPerMonth(hoursSaved)}
              {monthlyDiff ? (
                <span className="ml-2 text-[12px] font-normal text-white/85">
                  {copy.stickyDiff} {monthlyDiff} {copy.perMonth}
                </span>
              ) : null}
            </span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-[12px] text-white/85">
            {copy.stickyLink} ↓
          </span>
        </a>
      </div>

      <p className="sr-only" aria-live="polite">
        {copy.liveSummary(hoursSaved, monthlyDiff)}
      </p>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_1fr] lg:gap-8">
        <form
          aria-labelledby={`${uid}-form-title`}
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-7 rounded-[20px] border border-[#EDEDED] bg-[#FAFAFA] p-5 sm:p-8"
        >
          <div>
            <p className="pulse-eyebrow text-[#737373]">{copy.formEyebrow}</p>
            <h2 id={`${uid}-form-title`} className="mt-2 text-[24px] leading-[1.2] text-[#0A0A0A] sm:text-[28px]">
              {copy.formTitle}
            </h2>
          </div>

          <RangeField
            id={`${uid}-customers`}
            label={copy.customers}
            value={monthlyCustomers}
            display={fmt(monthlyCustomers)}
            min={L.monthlyCustomers.min}
            max={L.monthlyCustomers.max}
            step={L.monthlyCustomers.step}
            minLabel={fmt(L.monthlyCustomers.min)}
            maxLabel={fmt(L.monthlyCustomers.max)}
            onChange={setMonthlyCustomers}
          />

          <RangeField
            id={`${uid}-hourly`}
            label={copy.hourly}
            hint={copy.hourlyHint}
            value={hourlyCostUsd}
            display={formatUsd(hourlyCostUsd)}
            min={L.hourlyCostUsd.min}
            max={L.hourlyCostUsd.max}
            step={L.hourlyCostUsd.step}
            minLabel={formatUsd(L.hourlyCostUsd.min)}
            maxLabel={formatUsd(L.hourlyCostUsd.max)}
            onChange={setHourlyCostUsd}
          />

          {plans.length > 0 ? (
            <fieldset>
              <legend className="text-[15px] font-medium text-[#0A0A0A]">{copy.plan}</legend>
              <p className="mt-1 text-[13px] text-[#737373]">{copy.planHint}</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {plans.map((plan) => {
                  const active = plan.id === planId;
                  return (
                    <label
                      key={plan.id}
                      className={`flex min-h-[52px] cursor-pointer items-center justify-between gap-3 rounded-[12px] border px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#8C6CF0] has-[:focus-visible]:ring-offset-2 ${
                        active ? 'border-[#5D3EBC] bg-[#5D3EBC] text-white' : 'border-[var(--rt-line)] bg-white text-[var(--rt-ink-900)] hover:border-[#5D3EBC]'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${uid}-plan`}
                        value={plan.id}
                        checked={active}
                        onChange={() => setPlanId(plan.id)}
                        className="sr-only"
                      />
                      <span className="text-[15px] font-medium">{plan.name}</span>
                      <span className={`font-mono text-[13px] tabular-nums ${active ? 'text-white/85' : 'text-[#525252]'}`}>
                        {formatUsd(plan.priceMonthly)} {copy.perMonth}
                      </span>
                    </label>
                  );
                })}
                <label
                  className={`flex min-h-[52px] cursor-pointer items-center rounded-[12px] border px-4 py-3 text-[15px] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#8C6CF0] has-[:focus-visible]:ring-offset-2 ${
                    planId === '' ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white' : 'border-[#D4D4D4] bg-white text-[#525252] hover:border-[#0A0A0A]'
                  }`}
                >
                  <input
                    type="radio"
                    name={`${uid}-plan`}
                    value=""
                    checked={planId === ''}
                    onChange={() => setPlanId('')}
                    className="sr-only"
                  />
                  {copy.planNone}
                </label>
              </div>
            </fieldset>
          ) : (
            <div>
              <label htmlFor={`${uid}-cost`} className="text-[15px] font-medium text-[#0A0A0A]">
                {copy.customCost}
              </label>
              <input
                id={`${uid}-cost`}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={customCost}
                onChange={(e) => setCustomCost(e.target.value.replace(/[^0-9.,]/g, '').slice(0, 9))}
                placeholder={copy.customCostPlaceholder}
                className="bz-input mt-2"
              />
              <p className="mt-1.5 text-[13px] text-[#737373]">
                {copy.customCostHint}{' '}
                <Link href={`/${lang}/pricing`} className="font-medium text-[#0A0A0A] underline underline-offset-2">
                  {copy.pricingLink}
                </Link>
              </p>
            </div>
          )}

          <fieldset className="rounded-[16px] border border-[#E5E5E5] bg-white p-4 sm:p-5">
            <legend className="px-1 text-[15px] font-semibold text-[#0A0A0A]">{copy.assumptions}</legend>
            <p className="text-[13px] leading-[1.55] text-[#525252]">{copy.assumptionsNote}</p>
            <div className="mt-5 flex flex-col gap-6">
              <RangeField
                id={`${uid}-rating`}
                label={copy.ratingRate}
                value={ratingRatePct}
                display={pct(ratingRatePct)}
                min={L.ratingRatePct.min}
                max={L.ratingRatePct.max}
                step={L.ratingRatePct.step}
                minLabel={pct(L.ratingRatePct.min)}
                maxLabel={pct(L.ratingRatePct.max)}
                onChange={setRatingRatePct}
              />
              <RangeField
                id={`${uid}-reply`}
                label={copy.replyShare}
                value={replySharePct}
                display={pct(replySharePct)}
                min={L.replySharePct.min}
                max={L.replySharePct.max}
                step={L.replySharePct.step}
                minLabel={pct(L.replySharePct.min)}
                maxLabel={pct(L.replySharePct.max)}
                onChange={setReplySharePct}
              />
              <RangeField
                id={`${uid}-manual`}
                label={copy.minutesManual}
                value={minutesManual}
                display={minuteDisplay(minutesManual)}
                min={L.minutesManual.min}
                max={L.minutesManual.max}
                step={L.minutesManual.step}
                minLabel={minuteDisplay(L.minutesManual.min)}
                maxLabel={minuteDisplay(L.minutesManual.max)}
                onChange={setManual}
              />
              <RangeField
                id={`${uid}-draft`}
                label={copy.minutesDraft}
                value={minutesWithDraft}
                display={minuteDisplay(minutesWithDraft)}
                min={L.minutesWithDraft.min}
                max={L.minutesWithDraft.max}
                step={L.minutesWithDraft.step}
                minLabel={minuteDisplay(L.minutesWithDraft.min)}
                maxLabel={minuteDisplay(L.minutesWithDraft.max)}
                onChange={setDraft}
              />
            </div>
          </fieldset>
        </form>

        <div
          id="roi-result"
          className="scroll-mt-24 rounded-[20px] bg-[#0A0A0A] p-5 text-white sm:p-8 lg:sticky lg:top-28"
        >
          <p className="pulse-eyebrow text-white">{copy.resultEyebrow}</p>
          <h2 className="mt-2 text-[20px] leading-[1.25] text-white sm:text-[22px]">{copy.resultTitle}</h2>
          <p className="bz-h-tight mt-3 text-[40px] leading-none tabular-nums text-white sm:text-[56px]">
            {copy.hoursPerMonth(hoursSaved)}
          </p>

          <dl className="mt-7 divide-y divide-white/10 border-y border-white/10 text-[15px]">
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-white/75">{copy.timeValue}</dt>
              <dd className="font-semibold tabular-nums">
                {formatUsd(result.timeValueUsd)} {copy.perMonth}
              </dd>
            </div>
            {result.planMonthlyUsd !== null ? (
              <>
                <div className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-white/75">{copy.planCost}</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatUsd(result.planMonthlyUsd)} {copy.perMonth}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-white/75">{copy.monthlyDiff}</dt>
                  <dd
                    className={`font-semibold tabular-nums ${
                      (result.monthlyDifferenceUsd ?? 0) >= 0 ? 'text-[#C8F7D2]' : 'text-white'
                    }`}
                  >
                    {monthlyDiff}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-white/75">{copy.yearlyDiff}</dt>
                  <dd className="font-semibold tabular-nums">{yearlyDiff}</dd>
                </div>
              </>
            ) : (
              <div className="py-3 text-white/75">{copy.noPlan}</div>
            )}
          </dl>

          <dl className="mt-6 grid grid-cols-2 gap-2.5">
            {[
              { label: copy.kpiRatings, value: fmt(result.ratingsPerMonth) },
              { label: copy.kpiReplies, value: fmt(result.repliesPerMonth) },
              { label: copy.kpiManual, value: copy.hoursShort(formatHours(result.hoursManual, lang)) },
              { label: copy.kpiDraft, value: copy.hoursShort(formatHours(result.hoursWithDrafts, lang)) },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-[14px] border border-white/10 bg-white/5 p-3.5">
                <dt className="text-[12px] leading-[1.35] text-white/70">{kpi.label}</dt>
                <dd className="bz-h-tight mt-1.5 text-[20px] tabular-nums text-white">{kpi.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 rounded-[14px] border border-[#DCD3F6]/30 bg-[#8C6CF0]/10 p-4">
            <p className="text-[13px] leading-[1.5] text-white/80">{copy.coverage}</p>
            <p className="bz-h-tight mt-1.5 text-[22px] tabular-nums text-white">
              {pct(result.coverageNowPct)} → {pct(result.coverageSameTimePct)}
            </p>
          </div>

          <p className="mt-5 text-[13px] leading-[1.55] text-white/70">{copy.disclaimer}</p>
        </div>
      </div>

      <div className="rounded-[20px] border border-[#EDEDED] bg-white p-5 sm:p-8">
        {leadStatus === 'sent' ? (
          <div className="py-2 text-center" role="status">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#5D3EBC]">
              <MailCheck size={26} strokeWidth={2} className="text-white" aria-hidden="true" />
            </div>
            <h2 className="text-[24px] leading-[1.2] text-[#0A0A0A]">{copy.sentTitle}</h2>
            <p className="mx-auto mt-3 max-w-[480px] text-[15px] leading-[1.6] text-[#525252]">{copy.sentBody}</p>
          </div>
        ) : (
          <form onSubmit={handleLeadSubmit} noValidate className="grid gap-6" aria-labelledby={`${uid}-lead-title`}>
            <div>
              <p className="pulse-eyebrow text-[#737373]">{copy.leadEyebrow}</p>
              <h2 id={`${uid}-lead-title`} className="mt-2 text-[24px] leading-[1.2] text-[#0A0A0A] sm:text-[28px]">
                {copy.leadTitle}
              </h2>
              <p className="mt-2 max-w-[640px] text-[15px] leading-[1.6] text-[#525252]">{copy.leadBody}</p>
            </div>

            {leadServerError ? <AlertBanner kind="danger">{leadServerError}</AlertBanner> : null}

            <div
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}
            >
              <label htmlFor={`${uid}-website`}>{copy.honeypot}</label>
              <input
                id={`${uid}-website`}
                name="website_url"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypotValue}
                onChange={(e) => setHoneypotValue(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={copy.name} required error={leadErrors.name}>
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  className="bz-input"
                  placeholder={copy.namePlaceholder}
                  autoComplete="organization"
                  enterKeyHint="next"
                  maxLength={120}
                />
              </Field>
              <Field label={copy.sector}>
                <select
                  value={leadSector}
                  onChange={(e) => setLeadSector(e.target.value as RoiSector)}
                  className="bz-input cursor-pointer"
                >
                  {ROI_SECTORS.map((key) => (
                    <option key={key} value={key}>
                      {ROI_SECTOR_LABELS[lang][key]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={copy.email} required error={leadErrors.email}>
                <input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  className="bz-input"
                  placeholder={copy.emailPlaceholder}
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  maxLength={200}
                />
              </Field>
              <Field label={copy.phone}>
                <input
                  type="tel"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  className="bz-input"
                  autoComplete="tel"
                  inputMode="tel"
                  enterKeyHint="send"
                  maxLength={40}
                />
              </Field>
            </div>

            <div className="flex items-start gap-3">
              <input
                id={`${uid}-consent`}
                type="checkbox"
                checked={leadConsent}
                onChange={(e) => setLeadConsent(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-[#D4D4D4] accent-[#0A0A0A]"
                aria-invalid={!!leadErrors.consent}
                aria-describedby={leadErrors.consent ? `${uid}-consent-error` : undefined}
              />
              <label htmlFor={`${uid}-consent`} className="cursor-pointer text-[14px] leading-[1.55] text-[#525252]">
                {copy.consentA}
                <Link
                  href={copy.privacyHref}
                  className="font-medium text-[#0A0A0A] underline underline-offset-2 hover:decoration-[#4C2FA3]"
                >
                  {copy.consentLink}
                </Link>
                {copy.consentB}
                {leadErrors.consent ? (
                  <span id={`${uid}-consent-error`} role="alert" className="mt-1 block text-[13px] text-[#B91C1C]">
                    {leadErrors.consent}
                  </span>
                ) : null}
              </label>
            </div>

            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-[#525252]">
              {copy.facts.map((fact) => (
                <li key={fact} className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EFEAFB] text-[#0A0A0A]"
                  >
                    <Check size={12} strokeWidth={2.75} />
                  </span>
                  {fact}
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2 sm:max-w-[460px]">
                <p className="text-[13px] leading-[1.55] text-[#737373]">{copy.privacyNote}</p>
                <RecaptchaNotice locale={lang} />
              </div>
              <button
                type="submit"
                disabled={leadStatus === 'sending'}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-7 text-[15px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6CF0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {leadStatus === 'sending' ? (
                  <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                ) : (
                  <>
                    {copy.submit}
                    <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
