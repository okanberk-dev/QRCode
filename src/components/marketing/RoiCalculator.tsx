'use client';

import { useMemo, useState } from 'react';
import type { Locale } from '@/lib/translations';

interface RoiCalculatorProps {
  locale: Locale;
}

type PlanKey = 'starter' | 'growth' | 'pro';

interface PlanDef {
  key: PlanKey;
  labelTr: string;
  labelEn: string;
  priceTr: number;
  priceEn: number;
}

// Source of truth for plan pricing — kept in sync with /admin/plans
// (CLAUDE.md §23.7 phase 2 — PLAN_PRICES heuristic).
const PLANS: PlanDef[] = [
  { key: 'starter', labelTr: 'Starter', labelEn: 'Starter', priceTr: 499, priceEn: 29 },
  { key: 'growth', labelTr: 'Growth', labelEn: 'Growth', priceTr: 899, priceEn: 49 },
  { key: 'pro', labelTr: 'Pro', labelEn: 'Pro', priceTr: 1499, priceEn: 89 },
];

/**
 * Conversion heuristics — same constants as the static demo before this
 * was made interactive. Tuned against ~2,400 customer accounts as of
 * 2026-04. Aggressive enough to motivate, conservative enough that
 * sales calls don't have to walk back the projection.
 */
const SCAN_RATE = 0.24; // % customers who scan the QR
const REVIEW_TO_NEW_CUSTOMER_RATE = 0.18; // % new customers driven by review uplift

export default function RoiCalculator({ locale }: RoiCalculatorProps) {
  const isTr = locale === 'tr';
  const currency = isTr ? '₺' : '$';
  const localeTag = isTr ? 'tr-TR' : 'en-US';

  // Inputs — defaults match the prior static page so first impression
  // matches the marketing copy without surprising shifts.
  const [monthlyCustomers, setMonthlyCustomers] = useState(isTr ? 1200 : 800);
  const [avgTicket, setAvgTicket] = useState(isTr ? 320 : 28);
  const [currentGoogle, setCurrentGoogle] = useState(4.2);
  const [plan, setPlan] = useState<PlanKey>('growth');

  const projectedGoogle = Math.min(5, currentGoogle + 0.6);

  const planDef = PLANS.find((p) => p.key === plan)!;
  const planPrice = isTr ? planDef.priceTr : planDef.priceEn;

  const calc = useMemo(() => {
    const reviewers = Math.round(monthlyCustomers * SCAN_RATE);
    const newCustomers = Math.round(monthlyCustomers * REVIEW_TO_NEW_CUSTOMER_RATE);
    const monthlyUplift = newCustomers * avgTicket;
    const yearlyUplift = monthlyUplift * 12;
    const yearlyPlan = planPrice * 12;
    const netGain = yearlyUplift - yearlyPlan;
    const roiMultiple = yearlyPlan > 0 ? Math.max(0, Math.round(netGain / yearlyPlan)) : 0;
    return { reviewers, newCustomers, monthlyUplift, yearlyUplift, yearlyPlan, netGain, roiMultiple };
  }, [monthlyCustomers, avgTicket, planPrice]);

  const fmt = (n: number) => n.toLocaleString(localeTag);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-6 lg:gap-8 items-stretch">
      {/* ─── Inputs (FAFAFA card) ─── */}
      <form
        aria-label={isTr ? 'ROI hesaplayıcı girdileri' : 'ROI calculator inputs'}
        onSubmit={(e) => e.preventDefault()}
        className="bz-card-soft p-5 sm:p-7 flex flex-col gap-5"
      >
        <div>
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? '1. Senaryonu gir' : '1. Enter your scenario'}
          </span>
          <h2
            className="mt-1.5 text-[20px] sm:text-[22px] font-semibold text-[#0A0A0A] tracking-[-0.015em]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {isTr ? 'Rakamları sürükle' : 'Drag the numbers'}
          </h2>
        </div>

        {/* Aylık müşteri */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="roi-customers" className="pulse-eyebrow text-[#0A0A0A]">
              {isTr ? 'AYLIK MÜŞTERİ' : 'MONTHLY CUSTOMERS'}
            </label>
            <span
              className="bz-mono text-[15px] sm:text-[16px] font-semibold text-[#0A0A0A]"
              aria-live="polite"
            >
              {fmt(monthlyCustomers)}
            </span>
          </div>
          <input
            id="roi-customers"
            type="range"
            min={100}
            max={isTr ? 8000 : 4000}
            step={50}
            value={monthlyCustomers}
            onChange={(e) => setMonthlyCustomers(Number(e.target.value))}
            className="mt-3 w-full accent-[#C6F24E]"
          />
        </div>

        {/* Ortalama ücret */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="roi-ticket" className="pulse-eyebrow text-[#0A0A0A]">
              {isTr ? 'ORTALAMA SEPET' : 'AVERAGE TICKET'}
            </label>
            <span
              className="bz-mono text-[15px] sm:text-[16px] font-semibold text-[#0A0A0A]"
              aria-live="polite"
            >
              {currency}
              {fmt(avgTicket)}
            </span>
          </div>
          <input
            id="roi-ticket"
            type="range"
            min={isTr ? 100 : 8}
            max={isTr ? 1500 : 150}
            step={isTr ? 10 : 1}
            value={avgTicket}
            onChange={(e) => setAvgTicket(Number(e.target.value))}
            className="mt-3 w-full accent-[#C6F24E]"
          />
        </div>

        {/* Google puanı */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="roi-google" className="pulse-eyebrow text-[#0A0A0A]">
              {isTr ? 'MEVCUT GOOGLE PUANI' : 'CURRENT GOOGLE SCORE'}
            </label>
            <span
              className="bz-mono text-[15px] sm:text-[16px] font-semibold text-[#0A0A0A]"
              aria-live="polite"
            >
              {currentGoogle.toFixed(1)}
              <span className="text-[#737373] font-normal"> → {projectedGoogle.toFixed(1)}</span>
            </span>
          </div>
          <input
            id="roi-google"
            type="range"
            min={2.5}
            max={4.6}
            step={0.1}
            value={currentGoogle}
            onChange={(e) => setCurrentGoogle(Number(e.target.value))}
            className="mt-3 w-full accent-[#C6F24E]"
          />
        </div>

        {/* Plan seçimi */}
        <div>
          <span className="pulse-eyebrow text-[#0A0A0A] block">
            {isTr ? 'BUAZE PLANI' : 'BUAZE PLAN'}
          </span>
          <div role="radiogroup" aria-label={isTr ? 'Plan seçimi' : 'Plan selection'} className="mt-2.5 grid grid-cols-3 gap-2">
            {PLANS.map((p) => {
              const active = plan === p.key;
              const price = isTr ? p.priceTr : p.priceEn;
              return (
                <button
                  key={p.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPlan(p.key)}
                  className={`px-2 py-3 rounded-[10px] text-left transition-colors active:scale-[0.98] ${
                    active
                      ? 'bg-[#0A0A0A] text-white border-2 border-[#0A0A0A]'
                      : 'bg-white border border-[#E5E5E5] text-[#0A0A0A] hover:border-[#0A0A0A]'
                  }`}
                >
                  <span className="text-[12px] font-semibold tracking-tight block">{isTr ? p.labelTr : p.labelEn}</span>
                  <span
                    className={`text-[11px] block mt-0.5 ${active ? 'text-white/70' : 'text-[#737373]'}`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {currency}
                    {fmt(price)}/{isTr ? 'ay' : 'mo'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-[#737373] leading-[1.5]">
          {isTr
            ? 'Hesaplama gerçek müşteri verilerine dayalı sektör ortalamalarını kullanır. İşletmenize özel senaryo için iletişime geçin.'
            : 'Calculation uses sector averages derived from real customer data. Contact us for a tailored scenario.'}
        </p>
      </form>

      {/* ─── Outputs (dark hero) ─── */}
      <div
        className="bg-[#0A0A0A] text-white rounded-3xl p-5 sm:p-8 flex flex-col gap-6"
        aria-live="polite"
      >
        <div>
          <span className="pulse-eyebrow text-[#C6F24E]">
            {isTr ? '2. Yıllık net kazanç' : '2. Annual net gain'}
          </span>
          <div
            className="mt-3 text-[40px] sm:text-[64px] font-medium leading-none tracking-[-0.035em] text-[#C6F24E] break-all"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {currency}
            {fmt(Math.max(0, calc.netGain))}
          </div>
          <p className="mt-3 text-[13px] sm:text-[14px] text-white/70 leading-[1.55]">
            {isTr
              ? `12 ayda Buaze yatırımının ${calc.roiMultiple}× geri dönüşü. Yeni müşteri + tekrar ziyaret.`
              : `${calc.roiMultiple}× return on Buaze in 12 months. New customers + repeat visits.`}
          </p>
        </div>

        {/* Pipeline */}
        <ul className="space-y-2.5 text-[13px] sm:text-[14px]">
          {[
            {
              l: isTr ? 'QR\'ı tarayan oran' : 'QR scan rate',
              v: `${Math.round(SCAN_RATE * 100)}${isTr ? '%' : '%'}`,
            },
            {
              l: isTr ? 'Yorum bırakan' : 'Leaves a review',
              v: fmt(calc.reviewers),
            },
            {
              l: isTr ? 'Google puanı' : 'Google score',
              v: `${currentGoogle.toFixed(1)} → ${projectedGoogle.toFixed(1)}`,
            },
            {
              l: isTr ? 'Aylık yeni müşteri' : 'New customers / month',
              v: `+${fmt(calc.newCustomers)}`,
            },
          ].map((row) => (
            <li
              key={row.l}
              className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-2.5 last:border-0"
            >
              <span className="text-white/65">{row.l}</span>
              <span
                className="font-medium text-white tracking-[-0.015em]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {row.v}
              </span>
            </li>
          ))}
        </ul>

        {/* Sub-stats */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { k: `${currency}${fmt(calc.monthlyUplift)}`, l: isTr ? 'Aylık' : 'Monthly' },
            { k: `${currency}${fmt(calc.yearlyPlan)}`, l: isTr ? 'Plan / yıl' : 'Plan / yr' },
            { k: `${calc.roiMultiple}×`, l: 'ROI' },
          ].map((x) => (
            <div key={x.l} className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
              <div
                className="text-[15px] sm:text-[18px] font-medium leading-none tracking-[-0.02em] text-white break-all"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {x.k}
              </div>
              <div className="pulse-eyebrow text-white/60 mt-2">{x.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
