// src/components/roi-calculator/RoiCalculator.tsx
'use client';

import { useMemo, useState } from 'react';
import { InputField } from './InputField';
import {
  computeRoiResults,
  formatCurrencyRange,
  formatRange,
} from '@/lib/roi-calculator/calculations';
import {
  DEFAULT_AVG_CUSTOMER_VALUE,
  PLAN_COST_MONTHLY,
  RATING_MAX,
  RATING_MIN,
} from '@/lib/roi-calculator/constants';
import type { BusinessType, RoiFormValues } from './roi-calculator.types';

type LocaleKey = 'tr' | 'en';

// ─── i18n copy ────────────────────────────────────────────────────────────────
const COPY = {
  tr: {
    sectionTag:    'BUAZE ROI HESAPLAYICI',
    title:         'Buaze kendini kaç günde amorti eder?',
    description:   'İşletmenizin mevcut verilerini girin; Buaze\'nin size kazandıracağı aylık ek müşteri, tahmini ek ciro ve amorti süresini anında görün.',
    disclaimer:    'Hesaplamalar sektör benchmarks + Buaze müşteri verilerine göre kalibre edilmiştir. Sonuçlar işletmenize özel koşullara göre değişebilir.',
    cta:           '14 GÜN ÜCRETSİZ DENE',
    inputsSectionLabel:  'İŞLETME BİLGİLERİ',
    resultsSectionLabel: 'BUAZE İLE POTANSİYEL KAZANIM',
    planInfo: (price: string) => `₺${price}/ay — Buaze Başlangıç planı baz alınmıştır.`,
    fields: {
      monthlyCustomers: {
        label: 'Aylık müşteri sayınız',
        placeholder: 'Örn. 300',
        hint: 'Ortalama aylık ziyaretçi/müşteri',
      },
      currentRating: { label: 'Mevcut Google puanı', placeholder: 'Örn. 4.1' },
      currentReviews: {
        label: 'Mevcut yorum sayınız',
        placeholder: 'Örn. 87',
        hint: 'Google\'daki yorum sayısı',
      },
      targetRating:   { label: 'Hedef Google puanı', placeholder: 'Örn. 4.7' },
      avgCustomerValue: {
        label: 'Ortalama müşteri geliri',
        placeholder: 'Örn. 250',
        hint: '₺ bazında ortalama satış tutarı',
      },
      businessType:     { label: 'İşletme tipi' },
    },
    businessTypes: {
      restaurant: 'Restoran',
      cafe:       'Kafe',
      hotel:      'Otel',
      clinic:     'Klinik / Sağlık',
      other:      'Diğer',
    },
    results: {
      reviewsLabel:     'GEREKLİ YORUM',
      reviewsUnit:      'yorum',
      leadLabel:        'AYLIK EK MÜŞTERİ',
      leadUnit:         'müşteri/ay',
      revenueLabel:     'TAHMİNİ EK CİRO',
      revenueUnit:      '/ ay',
      paybackLabel:     'AMORTİ SÜRESİ',
      paybackUnit:      'gün',
      visibilityLabel:  'GÖRÜNÜRLÜK ETKİSİ',
      targetMetMessage: 'Hedef puana ulaştınız — Buaze sıralamanızı korumanıza yardımcı olur.',
      emptyMessage:     'Sol taraftaki bilgileri doldurun.',
      reviewsBody:      (range: string) =>
        `Hedef puana ulaşmak için yaklaşık ${range} yeni yoruma ihtiyacınız var.`,
      leadBody: (range: string) =>
        `Buaze'nin QR + yönlendirme akışı sayesinde aylık ${range} yeni müşteri potansiyeli.`,
      revenueBody: (range: string) =>
        `Tahmini aylık ek ciro: ${range}.`,
      paybackBody: (days: string) =>
        `Buaze yatırımınız yaklaşık ${days} gün içinde kendini amorti eder.`,
      visibilityBadges: { low: 'DÜŞÜK', medium: 'ORTA', strong: 'GÜÇLÜ' },
      visibilityBody: {
        low:    'Mevcut arama görünürlüğünüz sınırlı. Yorum akışını düzenli hale getirmek hızlı etki yaratır.',
        medium: 'Sağlam bir taban var. Buaze düzenli yorum akışıyla bu tabanı büyütür.',
        strong: 'Büyümeye hazırsınız. Yorum sirkülasyonunu Buaze ile stabilize edin.',
      },
    },
  },
  en: {
    sectionTag:    'BUAZE ROI CALCULATOR',
    title:         'How fast does Buaze pay for itself?',
    description:   'Enter your current business data and see the additional monthly customers, estimated extra revenue, and payback period Buaze can deliver.',
    disclaimer:    'Calculations are calibrated using industry benchmarks and Buaze customer data. Actual results may vary by your specific conditions.',
    cta:           'START 14-DAY FREE TRIAL',
    inputsSectionLabel:  'BUSINESS DATA',
    resultsSectionLabel: 'POTENTIAL GAIN WITH BUAZE',
    planInfo: (price: string) => `$${price}/mo — Based on Buaze Starter plan.`,
    fields: {
      monthlyCustomers: {
        label: 'Monthly customers',
        placeholder: 'e.g. 300',
        hint: 'Average monthly visitors/customers',
      },
      currentRating:    { label: 'Current Google rating', placeholder: 'e.g. 4.1' },
      currentReviews: {
        label: 'Current review count',
        placeholder: 'e.g. 87',
        hint: 'Reviews currently on Google',
      },
      targetRating:     { label: 'Target Google rating', placeholder: 'e.g. 4.7' },
      avgCustomerValue: {
        label: 'Average customer spend',
        placeholder: 'e.g. 15',
        hint: 'Average sale value (USD)',
      },
      businessType:     { label: 'Business type' },
    },
    businessTypes: {
      restaurant: 'Restaurant',
      cafe:       'Cafe',
      hotel:      'Hotel',
      clinic:     'Clinic / Health',
      other:      'Other',
    },
    results: {
      reviewsLabel:     'REVIEWS NEEDED',
      reviewsUnit:      'reviews',
      leadLabel:        'NEW CUSTOMERS / MO',
      leadUnit:         'customers/mo',
      revenueLabel:     'EXTRA MONTHLY REVENUE',
      revenueUnit:      '/ mo',
      paybackLabel:     'PAYBACK PERIOD',
      paybackUnit:      'days',
      visibilityLabel:  'VISIBILITY IMPACT',
      targetMetMessage: 'Target reached — Buaze helps you hold your ranking.',
      emptyMessage:     'Fill in the fields on the left.',
      reviewsBody: (range: string) =>
        `You need about ${range} new reviews to reach your target rating.`,
      leadBody: (range: string) =>
        `Buaze\'s QR + redirection flow can deliver ~${range} new customers monthly.`,
      revenueBody: (range: string) =>
        `Estimated extra monthly revenue: ${range}.`,
      paybackBody: (days: string) =>
        `Your Buaze investment pays for itself in about ${days} days.`,
      visibilityBadges: { low: 'LOW', medium: 'MEDIUM', strong: 'STRONG' },
      visibilityBody: {
        low:    'Your current search visibility is limited. A steady review flow creates fast impact.',
        medium: 'Solid foundation. Buaze amplifies it with a predictable review pipeline.',
        strong: 'You\'re ready to scale. Stabilize your review flow with Buaze.',
      },
    },
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BUSINESS_TYPE_OPTIONS: BusinessType[] = ['restaurant', 'cafe', 'hotel', 'clinic', 'other'];

function buildDefaultForm(locale: LocaleKey): RoiFormValues {
  return {
    monthlyCustomers: '',
    currentRating:    '',
    currentReviews:   '',
    targetRating:     '',
    avgCustomerValue: String(DEFAULT_AVG_CUSTOMER_VALUE[locale].restaurant),
    businessType:     'restaurant',
  };
}

function isFormFilled(f: RoiFormValues): boolean {
  const customers = parseFloat(f.monthlyCustomers);
  const cRating   = parseFloat(f.currentRating);
  const cReviews  = parseFloat(f.currentReviews);
  const tRating   = parseFloat(f.targetRating);
  const avgValue  = parseFloat(f.avgCustomerValue);

  return (
    Number.isFinite(customers) && customers > 0 &&
    Number.isFinite(cRating)   && cRating >= 1 && cRating <= 5 &&
    Number.isFinite(cReviews)  && cReviews >= 0 &&
    Number.isFinite(tRating)   && tRating >= 1 && tRating <= 5 &&
    Number.isFinite(avgValue)  && avgValue > 0
  );
}

function parseInputs(f: RoiFormValues) {
  const monthlyCustomers = Math.max(0, parseFloat(f.monthlyCustomers) || 0);
  const cRating = parseFloat(f.currentRating) || 0;
  const cReviews = parseFloat(f.currentReviews) || 0;
  const tRating = parseFloat(f.targetRating) || 0;
  const avgValue = Math.max(0, parseFloat(f.avgCustomerValue) || 0);

  return {
    monthlyCustomers,
    currentRating:    Math.min(Math.max(cRating, RATING_MIN), RATING_MAX),
    currentReviews:   Math.max(0, cReviews),
    targetRating:     Math.min(Math.max(tRating, RATING_MIN), RATING_MAX),
    avgCustomerValue: avgValue,
    businessType:     f.businessType,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RoiCalculator({ locale = 'tr' }: { locale?: string }) {
  const activeLocale: LocaleKey = locale === 'en' ? 'en' : 'tr';
  const t = COPY[activeLocale];
  const planPrice = PLAN_COST_MONTHLY[activeLocale].toLocaleString(activeLocale === 'tr' ? 'tr-TR' : 'en-US');

  const [form, setForm] = useState<RoiFormValues>(() => buildDefaultForm(activeLocale));

  const filled  = isFormFilled(form);
  const inputs  = useMemo(() => parseInputs(form), [form]);
  const results = useMemo(
    () => (filled ? computeRoiResults(inputs, activeLocale) : null),
    [filled, inputs, activeLocale],
  );

  function handleChange(field: keyof RoiFormValues, value: string) {
    setForm(prev => {
      if (field === 'businessType') {
        return {
          ...prev,
          businessType: value as BusinessType,
          avgCustomerValue: String(
            DEFAULT_AVG_CUSTOMER_VALUE[activeLocale][value as BusinessType],
          ),
        };
      }
      return { ...prev, [field]: value };
    });
  }

  return (
    <section
      id="roi-calculator"
      aria-labelledby="roi-calc-title"
      className="w-full bg-white rounded-[24px] sm:rounded-[32px] border-[2.5px] sm:border-[3px] border-[#1f1e1d] shadow-[6px_8px_0_0_#1f1e1d] sm:shadow-[10px_12px_0_0_#1f1e1d] overflow-hidden scroll-mt-20"
    >
      {/* Section header */}
      <div className="px-5 sm:px-10 pt-8 sm:pt-10 pb-6 sm:pb-8 border-b-[2.5px] border-[#1f1e1d] bg-[#FDBF1D]/10">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1f1e1d] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#FDBF1D]">
            <span aria-hidden="true" className="text-[8px]">◈</span>
            {t.sectionTag}
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#6b6760]">
            {t.planInfo(planPrice)}
          </span>
        </div>
        <h2
          id="roi-calc-title"
          className="text-[22px] sm:text-[30px] font-black text-[#1F1E1D] tracking-tight leading-tight"
        >
          {t.title}
        </h2>
        <p className="mt-3 text-[13px] sm:text-[14px] text-[#6b6760] font-bold max-w-xl leading-relaxed">
          {t.description}
        </p>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr]">

        {/* LEFT: Inputs */}
        <div className="px-5 sm:px-10 py-8 border-b-[2.5px] border-[#1f1e1d] lg:border-b-0 lg:border-r-[2.5px]">
          <p className="mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#1f1e1d]">
            {t.inputsSectionLabel}
          </p>

          <div className="flex flex-col gap-5">
            <InputField
              id="monthlyCustomers"
              type="number"
              step="1"
              label={t.fields.monthlyCustomers.label}
              hint={t.fields.monthlyCustomers.hint}
              placeholder={t.fields.monthlyCustomers.placeholder}
              value={form.monthlyCustomers}
              onChange={v => handleChange('monthlyCustomers', v)}
              min="0"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InputField
                id="currentRating"
                type="number"
                step="0.1"
                label={t.fields.currentRating.label}
                hint="1.0 – 5.0"
                placeholder={t.fields.currentRating.placeholder}
                value={form.currentRating}
                onChange={v => handleChange('currentRating', v)}
                min="1"
                max="5"
              />
              <InputField
                id="targetRating"
                type="number"
                step="0.1"
                label={t.fields.targetRating.label}
                hint="1.0 – 5.0"
                placeholder={t.fields.targetRating.placeholder}
                value={form.targetRating}
                onChange={v => handleChange('targetRating', v)}
                min="1"
                max="5"
              />
            </div>

            <InputField
              id="currentReviews"
              type="number"
              step="1"
              label={t.fields.currentReviews.label}
              hint={t.fields.currentReviews.hint}
              placeholder={t.fields.currentReviews.placeholder}
              value={form.currentReviews}
              onChange={v => handleChange('currentReviews', v)}
              min="0"
            />

            <InputField
              id="avgCustomerValue"
              type="number"
              step="1"
              label={t.fields.avgCustomerValue.label}
              hint={t.fields.avgCustomerValue.hint}
              placeholder={t.fields.avgCustomerValue.placeholder}
              value={form.avgCustomerValue}
              onChange={v => handleChange('avgCustomerValue', v)}
              min="0"
            />

            <div>
              <label
                htmlFor="businessType"
                className="block text-sm font-bold text-[#1F1E1D] mb-1.5"
              >
                {t.fields.businessType.label}
              </label>
              <select
                id="businessType"
                value={form.businessType}
                onChange={e => handleChange('businessType', e.target.value as BusinessType)}
                aria-label={t.fields.businessType.label}
                className="w-full rounded-xl border-[2px] border-[#1f1e1d] bg-white px-4 py-3
                           text-sm text-[#1F1E1D] font-bold focus:outline-none
                           focus:ring-4 focus:ring-[#FDBF1D]/30 transition-all cursor-pointer appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%231f1e1d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 1rem center',
                  backgroundSize: '1.1rem',
                }}
              >
                {BUSINESS_TYPE_OPTIONS.map(type => (
                  <option key={type} value={type}>
                    {t.businessTypes[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* RIGHT: Results */}
        <div className="px-5 sm:px-10 py-8 bg-[#F7F4F0] flex flex-col gap-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1f1e1d] mb-1">
            {t.resultsSectionLabel}
          </p>

          {/* Extra Revenue — HERO metric */}
          <SolidCard
            accent="#10b981"
            label={t.results.revenueLabel}
            icon={activeLocale === 'tr' ? '₺' : '$'}
            isEmpty={!results}
            emptyMessage={t.results.emptyMessage}
          >
            {results && results.revenuePotential.max > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-[26px] sm:text-[34px] font-black text-[#10b981] tracking-tighter leading-none">
                  {formatCurrencyRange(results.revenuePotential.min, results.revenuePotential.max, activeLocale)}
                  <span className="ml-2 text-[12px] sm:text-[14px] font-black text-[#6b6760] uppercase tracking-widest">
                    {t.results.revenueUnit}
                  </span>
                </p>
                <p className="text-[12px] text-[#6b6760] font-medium leading-relaxed">
                  {t.results.revenueBody(
                    formatCurrencyRange(results.revenuePotential.min, results.revenuePotential.max, activeLocale),
                  )}
                </p>
              </div>
            )}
          </SolidCard>

          {/* Payback days */}
          <SolidCard
            accent="#ea580c"
            label={t.results.paybackLabel}
            icon="⏱"
            isEmpty={!results}
            emptyMessage={t.results.emptyMessage}
          >
            {results && (
              <div className="flex flex-col gap-1">
                <p className="text-[26px] sm:text-[34px] font-black text-[#ea580c] tracking-tighter leading-none">
                  {results.paybackDays.min === results.paybackDays.max
                    ? results.paybackDays.min.toString()
                    : formatRange(results.paybackDays.min, results.paybackDays.max)}
                  <span className="ml-2 text-[12px] sm:text-[14px] font-black text-[#6b6760] uppercase tracking-widest">
                    {t.results.paybackUnit}
                  </span>
                </p>
                <p className="text-[12px] text-[#6b6760] font-medium leading-relaxed">
                  {t.results.paybackBody(
                    results.paybackDays.min === results.paybackDays.max
                      ? results.paybackDays.min.toString()
                      : formatRange(results.paybackDays.min, results.paybackDays.max),
                  )}
                </p>
              </div>
            )}
          </SolidCard>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* New leads */}
            <SolidCard
              accent="#FDBF1D"
              label={t.results.leadLabel}
              icon="◆"
              isEmpty={!results}
              emptyMessage={t.results.emptyMessage}
              compact
            >
              {results && (
                <div className="flex flex-col gap-1">
                  <p className="text-[22px] sm:text-[28px] font-black text-[#1f1e1d] tracking-tighter leading-none">
                    {formatRange(results.leadPotential.min, results.leadPotential.max)}
                  </p>
                  <p className="text-[10px] font-black text-[#6b6760] uppercase tracking-widest">
                    {t.results.leadUnit}
                  </p>
                </div>
              )}
            </SolidCard>

            {/* Reviews needed */}
            <SolidCard
              accent="#1f1e1d"
              label={t.results.reviewsLabel}
              icon="★"
              isEmpty={!results}
              emptyMessage={t.results.emptyMessage}
              compact
            >
              {results && (
                results.reviewsNeeded === 'TARGET_MET' ? (
                  <p className="text-[13px] font-bold text-emerald-700 leading-snug">
                    {t.results.targetMetMessage}
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    <p className="text-[22px] sm:text-[28px] font-black text-[#1f1e1d] tracking-tighter leading-none">
                      {formatRange(results.reviewsNeeded.min, results.reviewsNeeded.max)}
                    </p>
                    <p className="text-[10px] font-black text-[#6b6760] uppercase tracking-widest">
                      {t.results.reviewsUnit}
                    </p>
                  </div>
                )
              )}
            </SolidCard>
          </div>

          {/* Visibility */}
          <SolidCard
            accent="#6366f1"
            label={t.results.visibilityLabel}
            icon="◎"
            badge={results ? t.results.visibilityBadges[results.visibilityLevel] : undefined}
            isEmpty={!results}
            emptyMessage={t.results.emptyMessage}
          >
            {results && (
              <p className="text-[12px] text-[#6b6760] font-medium leading-relaxed">
                {t.results.visibilityBody[results.visibilityLevel]}
              </p>
            )}
          </SolidCard>

          {/* CTA */}
          <div className="pt-2">
            <a
              href={`/${activeLocale}/auth/register`}
              className="group block w-full rounded-xl bg-[#1F1E1D] border-[2.5px] border-[#1f1e1d] px-6 py-4 text-center
                         text-[13px] sm:text-[14px] font-black text-[#FDBF1D] uppercase tracking-[0.15em]
                         shadow-[0_5px_0_0_#000] active:translate-y-[5px] active:shadow-none transition-all"
            >
              {t.cta} <span className="inline-block ml-1 transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>

          <p className="text-center text-[10px] font-medium leading-relaxed text-[#ada89f] px-2">
            {t.disclaimer}
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Internal solid card component (matches pricing 3D system) ─────────────────

interface SolidCardProps {
  accent:       string;
  label:        string;
  icon:         string;
  children:     React.ReactNode;
  badge?:       string;
  isEmpty?:     boolean;
  emptyMessage?: string;
  compact?:     boolean;
}

function SolidCard({
  accent, label, icon, children, badge, isEmpty, emptyMessage, compact,
}: SolidCardProps) {
  return (
    <div
      className={`rounded-2xl border-[2px] border-[#1f1e1d] bg-white ${compact ? 'p-4' : 'p-5 sm:p-6'} shadow-[0_4px_0_0_#1f1e1d]`}
      role="region"
      aria-label={label}
      aria-live="polite"
      aria-atomic="true"
      style={{ borderLeftWidth: 5, borderLeftColor: accent }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-black text-white"
            aria-hidden="true"
            style={{ backgroundColor: accent }}
          >
            {icon}
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#1f1e1d]">
            {label}
          </span>
        </div>
        {badge && (
          <span
            className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border-[1.5px]"
            style={{ borderColor: accent, color: accent, backgroundColor: `${accent}15` }}
          >
            {badge}
          </span>
        )}
      </div>

      <div className={`${compact ? 'min-h-[2.5rem]' : 'min-h-[3.5rem]'} flex flex-col justify-center`}>
        {isEmpty ? (
          <p className="text-[12px] text-[#ada89f] font-medium italic leading-relaxed">
            {emptyMessage}
          </p>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
