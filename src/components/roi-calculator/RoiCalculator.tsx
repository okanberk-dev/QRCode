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
  en: {
    sectionTag:    'ROI Calculator',
    title:         'Analyze the impact of an improved review flow',
    description:   'Enter your current data to see how a more organized feedback and review request flow could reflect on your business.',
    disclaimer:    'This calculation presents estimated scenarios. Results may vary by industry, location, competition level, and customer experience.',
    cta:           'See Plans',
    inputsSectionLabel:  'Business Information',
    resultsSectionLabel: 'Estimated Impact',
    fields: {
      monthlyCustomers: { 
        label: 'Monthly customers', 
        placeholder: 'e.g. 300',
        hint: 'Average monthly visitors/customers'
      },
      currentRating:    { label: 'Current Google rating', placeholder: 'e.g. 4.1' },
      currentReviews:   { 
        label: 'Current review count', 
        placeholder: 'e.g. 87',
        hint: 'Current number of reviews on Google'
      },
      targetRating:     { label: 'Target rating',         placeholder: 'e.g. 4.5' },
      businessType:     { label: 'Business type' },
    },
    businessTypes: {
      restaurant: 'Restaurant',
      cafe:       'Cafe',
      hotel:      'Hotel',
      clinic:     'Clinic',
      other:      'Other',
    },
    results: {
      reviewsLabel:         'Estimated Reviews Needed',
      visibilityLabel:      'Visibility Potential',
      leadLabel:            'Profile Lead Potential',
      targetMetMessage:     'Target reached! Your current rating is above your target.',
      emptyMessage:         'Fill in the fields on the left to see results.',
      reviewsBody:          (range: string) =>
        `You might need approximately ${range} new reviews to approach your target rating.`,
      leadBody:             (range: string) =>
        `Additional ${range} monthly profile leads potential`,
      visibilityBody:       'A fresher review flow and stronger rating signals can support your visibility.',
      visibilityBadges:     { low: 'Low', medium: 'Medium', strong: 'Strong' },
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

export function RoiCalculator({ locale = 'tr' }: { locale?: string }) {
  const t = COPY[locale as keyof typeof COPY] || COPY.tr;
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
      <div className="px-5 sm:px-8 pt-8 pb-6 border-b border-gray-100 md:px-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDBF1D]/15
                           border border-[#FDBF1D]/30 px-3 py-1 text-[10px] font-black
                           uppercase tracking-widest text-[#B38A00]">
            <span aria-hidden="true" className="text-[8px]">◈</span>
            {t.sectionTag}
          </span>
        </div>
        <h2
          id="roi-calc-title"
          className="text-[22px] sm:text-2xl font-black text-[#1F1E1D] tracking-tight leading-tight"
        >
          {t.title}
        </h2>
        <p className="mt-3 text-[14px] text-[#6b6760] font-medium max-w-lg leading-relaxed">
          {t.description}
        </p>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr]">

        {/* LEFT: Inputs */}
        <div className="px-5 sm:px-8 py-8 border-b border-gray-100 lg:border-b-0 lg:border-r md:px-10">
          <p className="mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            {t.inputsSectionLabel}
          </p>

          <div className="flex flex-col gap-5 sm:gap-6">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                className="block text-sm font-bold text-[#1F1E1D] mb-1.5"
              >
                {t.fields.businessType.label}
              </label>
              <select
                id="businessType"
                value={form.businessType}
                onChange={e => handleChange('businessType', e.target.value as BusinessType)}
                aria-label={t.fields.businessType.label}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3
                           text-sm text-[#1F1E1D] font-bold focus:border-[#FDBF1D] focus:outline-none
                           focus:ring-4 focus:ring-[#FDBF1D]/10 transition-all cursor-pointer appearance-none"
                style={{ 
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b6760'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 1rem center',
                  backgroundSize: '1.25rem'
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
        <div className="px-5 sm:px-8 py-8 bg-[#F7F4F0]/50 lg:px-10 flex flex-col gap-5">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
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
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 text-[18px]">✓</span>
                  </div>
                  <p className="text-[14px] font-bold text-emerald-700 leading-snug">
                    {t.results.targetMetMessage}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <p className="text-[28px] sm:text-[34px] font-black text-[#1F1E1D] tracking-tighter leading-none">
                    {formatRange(results.reviewsNeeded.min, results.reviewsNeeded.max)}
                    <span className="ml-2 text-base font-bold text-gray-400">{locale === 'tr' ? 'yorum' : 'reviews'}</span>
                  </p>
                  <p className="text-[12px] text-[#6b6760] font-medium leading-relaxed">
                    {t.results.reviewsBody(
                      formatRange(results.reviewsNeeded.min, results.reviewsNeeded.max),
                    )}
                  </p>
                </div>
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
              <p className="text-[12px] text-[#6b6760] font-medium leading-relaxed">
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
              <div className="flex flex-col gap-1">
                <p className="text-[28px] sm:text-[34px] font-black text-[#1F1E1D] tracking-tighter leading-none">
                  {formatRange(results.leadPotential.min, results.leadPotential.max)}
                  <span className="ml-2 text-base font-bold text-gray-400">
                    {locale === 'tr' ? 'etkileşim/ay' : 'leads/mo'}
                  </span>
                </p>
                <p className="text-[12px] text-[#6b6760] font-medium leading-relaxed">
                  {t.results.leadBody(
                    formatRange(results.leadPotential.min, results.leadPotential.max),
                  )}
                </p>
              </div>
            )}
          </ResultCard>
 
          {/* CTA */}
          <div className="pt-2">
            <a
              href={`/${locale}/pricing#plans`}
              className="group w-full rounded-xl bg-[#1F1E1D] px-6 py-4 text-center
                         text-[15px] font-black text-[#FDBF1D] transition-all flex items-center justify-center gap-2
                         hover:bg-[#2d2c2b] shadow-[0_4px_0_0_#000] active:translate-y-[2px] active:shadow-none"
            >
              {t.cta} <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>
 
          {/* Disclaimer */}
          <p className="text-center text-[10px] font-medium leading-relaxed text-gray-400 px-4 mt-1">
            {t.disclaimer}
          </p>
        </div>
      </div>
    </section>
  );
}
