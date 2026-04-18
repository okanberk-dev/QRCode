// src/components/roi-calculator/RoiCalculator.tsx
'use client';

import { useMemo, useState } from 'react';
import { RoiResultCard } from './RoiResultCard';
import {
  clampNumber,
  computeRoiResults,
  formatRange,
  sanitizeNumericInput,
} from '@/lib/roi-calculator/calculations';
import { RATING_MAX, RATING_MIN } from '@/lib/roi-calculator/constants';
import type { BusinessType, RoiFormValues } from './roi-calculator.types';

// ─── i18n: if next-intl exists, replace this with useTranslations() ───────────
const COPY = {
  tr: {
    sectionTag:    'ROI Hesaplayıcı',
    title:         'Yorum akışınız güçlendiğinde potansiyel etkiyi görün',
    description:   'Mevcut verilerinizi girin, daha düzenli bir geri bildirim ve review request akışının işletmenize nasıl yansıyabileceğini tahmini olarak görün.',
    disclaimer:    'Bu hesaplama tahmini senaryolar sunar. Sonuçlar sektör, lokasyon, rekabet düzeyi ve müşteri deneyimine göre değişebilir.',
    cta:           'Planları İncele',
    fields: {
      monthlyCustomers: { label: 'Aylık müşteri sayısı',      placeholder: 'Örn. 300'  },
      currentRating:    { label: 'Mevcut Google puanınız',    placeholder: 'Örn. 4.1'  },
      currentReviews:   { label: 'Mevcut yorum sayınız',      placeholder: 'Örn. 87'   },
      targetRating:     { label: 'Hedef puanınız',            placeholder: 'Örn. 4.5'  },
      businessType:     { label: 'İşletme tipi' },
    },
    businessTypes: {
      restaurant: 'Restoran',
      cafe:       'Kafe',
      hotel:      'Otel',
      clinic:     'Klinik',
      other:      'Diğer',
    },
    results: {
      reviewsLabel:         'Tahmini Gerekli Yorum',
      visibilityLabel:      'Görünürlük Potansiyeli',
      leadLabel:            'Profil Etkileşim Potansiyeli',
      targetMetMessage:     'Hedefinize ulaştınız! Mevcut puanınız hedef puanınızın üzerinde.',
      emptyMessage:         'Sonuçları görmek için sol taraftaki alanları doldurun.',
      reviewsBody:          (range: string) =>
        `Hedef puana yaklaşmak için yaklaşık ${range} yeni yoruma ihtiyacınız olabilir.`,
      leadBody:             (range: string) =>
        `Aylık ek ${range} profil etkileşimi potansiyeli`,
      visibilityBody:       'Daha güncel yorum akışı ve daha güçlü puan sinyalleri görünürlüğünüzü destekleyebilir.',
      visibilityBadges:     { low: 'Düşük', medium: 'Orta', strong: 'Güçlü' },
    },
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BUSINESS_TYPE_OPTIONS: BusinessType[] = ['restaurant', 'cafe', 'hotel', 'clinic', 'other'];

const DEFAULT_FORM: RoiFormValues = {
  monthlyCustomers: '',
  currentRating:    '',
  currentReviews:   '',
  targetRating:     '',
  businessType:     'restaurant',
};

function isFormFilled(f: RoiFormValues): boolean {
  return (
    f.monthlyCustomers.trim() !== '' &&
    f.currentRating.trim()    !== '' &&
    f.currentReviews.trim()   !== '' &&
    f.targetRating.trim()     !== ''
  );
}

function parseInputs(f: RoiFormValues) {
  const monthlyCustomers = Math.max(0, sanitizeNumericInput(f.monthlyCustomers));
  const currentRating    = clampNumber(sanitizeNumericInput(f.currentRating), RATING_MIN, RATING_MAX);
  const currentReviews   = Math.max(0, sanitizeNumericInput(f.currentReviews));
  const targetRating     = clampNumber(sanitizeNumericInput(f.targetRating),  RATING_MIN, RATING_MAX);
  return { monthlyCustomers, currentRating, currentReviews, targetRating, businessType: f.businessType };
}

// ─── Label / Input shared styles ──────────────────────────────────────────────
const labelCls = 'block text-sm font-medium text-white/70 mb-1.5';
const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white ' +
  'placeholder:text-white/20 focus:border-[#FDBF1D]/60 focus:outline-none focus:ring-2 ' +
  'focus:ring-[#FDBF1D]/20 transition-colors';

// ─── Component ────────────────────────────────────────────────────────────────

export function RoiCalculator() {
  const t = COPY.tr; // swap with useTranslations() if next-intl is present
  const [form, setForm] = useState<RoiFormValues>(DEFAULT_FORM);

  const filled  = isFormFilled(form);
  const inputs  = useMemo(() => parseInputs(form), [form]);
  const results = useMemo(() => (filled ? computeRoiResults(inputs) : null), [filled, inputs]);

  function handleChange(field: keyof RoiFormValues, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  return (
    <section
      aria-labelledby="roi-calculator-title"
      className="w-full rounded-2xl border border-white/10 bg-[#1F1E1D] p-6 md:p-10"
    >
      {/* Header */}
      <div className="mb-8 max-w-2xl">
        <span className="mb-3 inline-block rounded-full border border-[#FDBF1D]/30 bg-[#FDBF1D]/10
                         px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#FDBF1D]">
          {t.sectionTag}
        </span>
        <h2
          id="roi-calculator-title"
          className="mb-3 text-2xl font-bold tracking-tight text-white md:text-3xl"
        >
          {t.title}
        </h2>
        <p className="text-sm leading-relaxed text-white/50">{t.description}</p>
      </div>

      {/* Two-column grid */}
      <div className="grid gap-8 lg:grid-cols-2">

        {/* ── LEFT: Inputs ── */}
        <div className="flex flex-col gap-5">

          {/* monthlyCustomers */}
          <div>
            <label htmlFor="monthlyCustomers" className={labelCls}>
              {t.fields.monthlyCustomers.label}
            </label>
            <input
              id="monthlyCustomers"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={t.fields.monthlyCustomers.placeholder}
              value={form.monthlyCustomers}
              onChange={e => handleChange('monthlyCustomers', e.target.value)}
              className={inputCls}
              aria-label={t.fields.monthlyCustomers.label}
            />
          </div>

          {/* currentRating */}
          <div>
            <label htmlFor="currentRating" className={labelCls}>
              {t.fields.currentRating.label}
            </label>
            <input
              id="currentRating"
              type="number"
              inputMode="decimal"
              min={RATING_MIN}
              max={RATING_MAX}
              step={0.1}
              placeholder={t.fields.currentRating.placeholder}
              value={form.currentRating}
              onChange={e => handleChange('currentRating', e.target.value)}
              className={inputCls}
              aria-label={t.fields.currentRating.label}
            />
          </div>

          {/* currentReviews */}
          <div>
            <label htmlFor="currentReviews" className={labelCls}>
              {t.fields.currentReviews.label}
            </label>
            <input
              id="currentReviews"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={t.fields.currentReviews.placeholder}
              value={form.currentReviews}
              onChange={e => handleChange('currentReviews', e.target.value)}
              className={inputCls}
              aria-label={t.fields.currentReviews.label}
            />
          </div>

          {/* targetRating */}
          <div>
            <label htmlFor="targetRating" className={labelCls}>
              {t.fields.targetRating.label}
            </label>
            <input
              id="targetRating"
              type="number"
              inputMode="decimal"
              min={RATING_MIN}
              max={RATING_MAX}
              step={0.1}
              placeholder={t.fields.targetRating.placeholder}
              value={form.targetRating}
              onChange={e => handleChange('targetRating', e.target.value)}
              className={inputCls}
              aria-label={t.fields.targetRating.label}
            />
          </div>

          {/* businessType */}
          <div>
            <label htmlFor="businessType" className={labelCls}>
              {t.fields.businessType.label}
            </label>
            <select
              id="businessType"
              value={form.businessType}
              onChange={e => handleChange('businessType', e.target.value as BusinessType)}
              className={inputCls}
              aria-label={t.fields.businessType.label}
            >
              {BUSINESS_TYPE_OPTIONS.map(type => (
                <option key={type} value={type}>
                  {t.businessTypes[type]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="flex flex-col gap-4">

          {/* Reviews needed */}
          <RoiResultCard
            label={t.results.reviewsLabel}
            isEmpty={!results}
            emptyMessage={t.results.emptyMessage}
          >
            {results && (
              results.reviewsNeeded === 'TARGET_MET' ? (
                <p className="text-sm text-[#FDBF1D]">{t.results.targetMetMessage}</p>
              ) : (
                <>
                  <p className="text-2xl font-bold text-[#FDBF1D]">
                    {formatRange(results.reviewsNeeded.min, results.reviewsNeeded.max)}
                  </p>
                  <p className="mt-1 text-sm text-white/60">
                    {t.results.reviewsBody(
                      formatRange(results.reviewsNeeded.min, results.reviewsNeeded.max),
                    )}
                  </p>
                </>
              )
            )}
          </RoiResultCard>

          {/* Visibility */}
          <RoiResultCard
            label={t.results.visibilityLabel}
            badge={results ? t.results.visibilityBadges[results.visibilityLevel] : undefined}
            badgeColor={results?.visibilityLevel === 'strong' ? 'accent' : 'primary'}
            isEmpty={!results}
            emptyMessage={t.results.emptyMessage}
          >
            {results && (
              <p className="text-sm text-white/70">{t.results.visibilityBody}</p>
            )}
          </RoiResultCard>

          {/* Lead potential */}
          <RoiResultCard
            label={t.results.leadLabel}
            isEmpty={!results}
            emptyMessage={t.results.emptyMessage}
          >
            {results && (
              <>
                <p className="text-2xl font-bold text-[#FDBF1D]">
                  {formatRange(results.leadPotential.min, results.leadPotential.max)}
                </p>
                <p className="mt-1 text-sm text-white/60">
                  {t.results.leadBody(
                    formatRange(results.leadPotential.min, results.leadPotential.max),
                  )}
                </p>
              </>
            )}
          </RoiResultCard>

          {/* CTA */}
          <a
            href="/tr/pricing"
            className="mt-2 w-full rounded-lg bg-[#FDBF1D] px-5 py-3 text-center text-sm
                       font-bold text-[#1F1E1D] transition-opacity hover:opacity-90
                       focus:outline-none focus:ring-2 focus:ring-[#FDBF1D]/50"
          >
            {t.cta}
          </a>

          {/* Disclaimer */}
          <p className="text-center text-xs leading-relaxed text-white/30">
            {t.disclaimer}
          </p>
        </div>
      </div>
    </section>
  );
}
