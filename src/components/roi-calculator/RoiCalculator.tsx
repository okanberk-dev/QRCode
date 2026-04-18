// src/components/roi-calculator/RoiCalculator.tsx
'use client';

import { useMemo, useState } from 'react';
import { ResultCard } from './RoiResultCard';
import { InputField } from './InputField';
import {
  computeRoiResults,
  formatRange,
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
    inputsSectionLabel:  'İşletme Bilgileri',
    resultsSectionLabel: 'Tahmini Etki',
    fields: {
      monthlyCustomers: { 
        label: 'Aylık müşteri sayısı', 
        placeholder: 'Örn. 300',
        hint: 'Aylık ortalama ziyaretçi/müşteri sayısı'
      },
      currentRating:    { label: 'Mevcut Google puanınız', placeholder: 'Örn. 4.1' },
      currentReviews:   { 
        label: 'Mevcut yorum sayınız', 
        placeholder: 'Örn. 87',
        hint: 'Google\'daki mevcut yorum sayısı'
      },
      targetRating:     { label: 'Hedef puanınız',         placeholder: 'Örn. 4.5' },
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
  const customers = parseFloat(f.monthlyCustomers);
  const cRating   = parseFloat(f.currentRating);
  const cReviews  = parseFloat(f.currentReviews);
  const tRating   = parseFloat(f.targetRating);

  return (
    Number.isFinite(customers) && customers >= 0 &&
    Number.isFinite(cRating)   && cRating >= 1 && cRating <= 5 &&
    Number.isFinite(cReviews)  && cReviews >= 0 &&
    Number.isFinite(tRating)   && tRating >= 1 && tRating <= 5
  );
}

function parseInputs(f: RoiFormValues) {
  const monthlyCustomers = Math.max(0, parseFloat(f.monthlyCustomers) || 0);
  const cRating = parseFloat(f.currentRating) || 0;
  const cReviews = parseFloat(f.currentReviews) || 0;
  const tRating = parseFloat(f.targetRating) || 0;

  return {
    monthlyCustomers,
    currentRating:    Math.min(Math.max(cRating, RATING_MIN), RATING_MAX),
    currentReviews:   Math.max(0, cReviews),
    targetRating:     Math.min(Math.max(tRating, RATING_MIN), RATING_MAX),
    businessType:     f.businessType
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RoiCalculator() {
  const t = COPY.tr;
  const [form, setForm] = useState<RoiFormValues>(DEFAULT_FORM);

  const filled  = isFormFilled(form);
  const inputs  = useMemo(() => parseInputs(form), [form]);
  const results = useMemo(() => (filled ? computeRoiResults(inputs) : null), [filled, inputs]);

  function handleChange(field: keyof RoiFormValues, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  return (
    <section
      id="roi-calculator"
      aria-labelledby="roi-calc-title"
      className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden scroll-mt-20"
    >
      {/* Section header — full width */}
      <div className="px-6 pt-8 pb-6 border-b border-gray-100 md:px-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDBF1D]/15
                           border border-[#FDBF1D]/30 px-3 py-1 text-xs font-semibold
                           uppercase tracking-widest text-[#B38A00]">
            <span aria-hidden="true">◈</span>
            {t.sectionTag}
          </span>
        </div>
        <h2
          id="roi-calc-title"
          className="text-xl font-bold text-gray-900 md:text-2xl max-w-xl"
        >
          {t.title}
        </h2>
        <p className="mt-2 text-sm text-gray-500 max-w-lg leading-relaxed">
          {t.description}
        </p>
      </div>

      {/* Two-column body */}
      <div className="grid md:grid-cols-[5fr_7fr]">

        {/* LEFT: Inputs */}
        <div className="px-6 py-7 border-b border-gray-100 md:border-b-0 md:border-r md:px-10">
          <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-gray-400">
            {t.inputsSectionLabel}
          </p>

          <div className="flex flex-col gap-5">
            {/* monthlyCustomers */}
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

            <div className="grid grid-cols-2 gap-4">
              {/* currentRating */}
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
              {/* targetRating */}
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

            {/* currentReviews */}
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

            {/* businessType */}
            <div>
              <label
                htmlFor="businessType"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                {t.fields.businessType.label}
              </label>
              <select
                id="businessType"
                value={form.businessType}
                onChange={e => handleChange('businessType', e.target.value as BusinessType)}
                aria-label={t.fields.businessType.label}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5
                           text-sm text-gray-900 focus:border-[#FDBF1D] focus:outline-none
                           focus:ring-2 focus:ring-[#FDBF1D]/30 transition-colors cursor-pointer"
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
        <div className="px-6 py-7 bg-gray-50/70 md:px-10 flex flex-col gap-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-400">
            {t.resultsSectionLabel}
          </p>

          {/* Reviews needed */}
          <ResultCard
            label={t.results.reviewsLabel}
            icon="★"
            isEmpty={!results}
            emptyMessage={t.results.emptyMessage}
          >
            {results && (
              results.reviewsNeeded === 'TARGET_MET' ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✓</span>
                  <p className="text-sm font-medium text-emerald-700">
                    {t.results.targetMetMessage}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                    {formatRange(results.reviewsNeeded.min, results.reviewsNeeded.max)}
                    <span className="ml-1.5 text-base font-medium text-gray-400">yorum</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                    {t.results.reviewsBody(
                      formatRange(results.reviewsNeeded.min, results.reviewsNeeded.max),
                    )}
                  </p>
                </>
              )
            )}
          </ResultCard>

          {/* Visibility */}
          <ResultCard
            label={t.results.visibilityLabel}
            icon="◎"
            badge={results ? t.results.visibilityBadges[results.visibilityLevel] : undefined}
            badgeVariant={results?.visibilityLevel === 'strong' ? 'accent' : 'primary'}
            isEmpty={!results}
            emptyMessage={t.results.emptyMessage}
          >
            {results && (
              <p className="text-xs text-gray-500 leading-relaxed">
                {t.results.visibilityBody}
              </p>
            )}
          </ResultCard>

          {/* Lead potential */}
          <ResultCard
            label={t.results.leadLabel}
            icon="◆"
            isEmpty={!results}
            emptyMessage={t.results.emptyMessage}
          >
            {results && (
              <>
                <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  {formatRange(results.leadPotential.min, results.leadPotential.max)}
                  <span className="ml-1.5 text-base font-medium text-gray-400">
                    etkileşim/ay
                  </span>
                </p>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  {t.results.leadBody(
                    formatRange(results.leadPotential.min, results.leadPotential.max),
                  )}
                </p>
              </>
            )}
          </ResultCard>

          {/* CTA */}
          <a
            href="/tr/pricing#plans"
            className="mt-1 w-full rounded-xl bg-[#1F1E1D] px-5 py-3.5 text-center
                       text-sm font-bold text-[#FDBF1D] transition-all hover:bg-[#2d2c2b]
                       focus:outline-none focus:ring-2 focus:ring-[#FDBF1D]/40
                       active:scale-[0.98]"
          >
            {t.cta} →
          </a>

          {/* Disclaimer */}
          <p className="text-center text-[11px] leading-relaxed text-gray-400 px-2">
            {t.disclaimer}
          </p>
        </div>
      </div>
    </section>
  );
}
