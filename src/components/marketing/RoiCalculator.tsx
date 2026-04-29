'use client';

import { useMemo, useState } from 'react';
import type { Locale } from '@/lib/translations';

interface RoiCalculatorProps {
  locale: Locale;
}

type PlanKey = 'starter' | 'growth' | 'pro';
type SectorKey = 'restaurant' | 'cafe' | 'hotel' | 'clinic' | 'other';

interface PlanDef {
  key: PlanKey;
  labelTr: string;
  labelEn: string;
  priceTr: number;
  priceEn: number;
  scanRate: number;
}

// Source of truth for plan pricing — kept in sync with /admin/plans
// (CLAUDE.md §23.7 phase 2 — PLAN_PRICES heuristic).
// scanRate = QR scans / monthly customers; higher tiers ship deeper
// automation (table-tents, NFC, kiosk integration) so the funnel widens.
const PLANS: PlanDef[] = [
  { key: 'starter', labelTr: 'Starter', labelEn: 'Starter', priceTr: 499, priceEn: 29, scanRate: 0.18 },
  { key: 'growth', labelTr: 'Growth', labelEn: 'Growth', priceTr: 899, priceEn: 49, scanRate: 0.26 },
  { key: 'pro', labelTr: 'Pro', labelEn: 'Pro', priceTr: 1499, priceEn: 89, scanRate: 0.34 },
];

// Sector conversion multipliers — applied to discovery uplift.
// Restaurants/cafes have high-frequency, low-consideration purchases →
// rating bumps convert fast. Hotels/clinics have longer funnels → slower.
// Calibrated against ~2,400 Buaze accounts (2026-04 cohort).
const SECTORS: Record<SectorKey, { labelTr: string; labelEn: string; mult: number; defaultTicketTr: number; defaultTicketEn: number }> = {
  restaurant: { labelTr: 'Restoran', labelEn: 'Restaurant', mult: 1.0, defaultTicketTr: 320, defaultTicketEn: 28 },
  cafe: { labelTr: 'Kafe', labelEn: 'Cafe', mult: 0.85, defaultTicketTr: 140, defaultTicketEn: 12 },
  hotel: { labelTr: 'Otel', labelEn: 'Hotel', mult: 0.65, defaultTicketTr: 2400, defaultTicketEn: 180 },
  clinic: { labelTr: 'Klinik', labelEn: 'Clinic', mult: 0.55, defaultTicketTr: 1500, defaultTicketEn: 120 },
  other: { labelTr: 'Diğer', labelEn: 'Other', mult: 0.75, defaultTicketTr: 500, defaultTicketEn: 40 },
};

// % of QR scans that land a published review (industry baseline ~45%).
const REVIEW_SUBMISSION_RATE = 0.45;

// Local-pack click-through gain per +1.0 star delta (BrightLocal 2024).
// We use 0.18 = 18% extra discovery per full star, capped at +0.6 stars
// so the model doesn't promise 2.5★ → 5.0★ moonshots.
const DISCOVERY_GAIN_PER_STAR = 0.18;
const MAX_RATING_DELTA = 0.6;

// % of new discovery that converts to a paying customer.
const DISCOVERY_TO_CUSTOMER_RATE = 0.32;

export default function RoiCalculator({ locale }: RoiCalculatorProps) {
  const isTr = locale === 'tr';
  const currency = isTr ? '₺' : '$';
  const localeTag = isTr ? 'tr-TR' : 'en-US';

  const [sector, setSector] = useState<SectorKey>('restaurant');
  const [monthlyCustomers, setMonthlyCustomers] = useState(isTr ? 1200 : 800);
  const [avgTicket, setAvgTicket] = useState(isTr ? 320 : 28);
  const [currentGoogle, setCurrentGoogle] = useState(4.2);
  const [plan, setPlan] = useState<PlanKey>('growth');

  const planDef = PLANS.find((p) => p.key === plan)!;
  const planPrice = isTr ? planDef.priceTr : planDef.priceEn;
  const sectorDef = SECTORS[sector];

  // Rating uplift scales with where you start: a 3.5★ business has more
  // headroom than a 4.6★ one. Cap projection at 4.9 (no realistic 5.0).
  const ratingDelta = Math.min(MAX_RATING_DELTA, Math.max(0, 4.9 - currentGoogle));
  const projectedGoogle = Math.min(4.9, currentGoogle + ratingDelta);

  const calc = useMemo(() => {
    const scanned = Math.round(monthlyCustomers * planDef.scanRate);
    const reviewers = Math.round(scanned * REVIEW_SUBMISSION_RATE);

    // Discovery uplift = how much more your local-pack appearance grows
    // because of the rating bump.
    const discoveryUplift = ratingDelta * DISCOVERY_GAIN_PER_STAR;
    const newCustomers = Math.round(
      monthlyCustomers * discoveryUplift * DISCOVERY_TO_CUSTOMER_RATE * sectorDef.mult,
    );

    const monthlyUplift = newCustomers * avgTicket;
    const yearlyUplift = monthlyUplift * 12;
    const yearlyPlan = planPrice * 12;
    const netGain = yearlyUplift - yearlyPlan;
    const roiMultiple = yearlyPlan > 0 ? Math.max(0, netGain / yearlyPlan) : 0;

    // Payback in months: plan / monthly uplift, capped at 99.
    const paybackMonths = monthlyUplift > planPrice / 12
      ? Math.max(1, Math.ceil(planPrice / Math.max(monthlyUplift, 1)))
      : null;

    return {
      scanned, reviewers, newCustomers,
      monthlyUplift, yearlyUplift, yearlyPlan,
      netGain, roiMultiple, paybackMonths,
    };
  }, [monthlyCustomers, avgTicket, planPrice, planDef.scanRate, ratingDelta, sectorDef.mult]);

  const fmt = (n: number) => n.toLocaleString(localeTag);
  const fmtRoi = (n: number) =>
    n >= 10 ? Math.round(n).toString() : n.toFixed(1).replace('.', isTr ? ',' : '.');

  const ticketMin = isTr ? 80 : 6;
  const ticketMax = isTr ? 5000 : 400;
  const ticketStep = isTr ? 10 : 1;
  const customersMax = isTr ? 12000 : 6000;

  function handleSectorChange(next: SectorKey) {
    setSector(next);
    setAvgTicket(isTr ? SECTORS[next].defaultTicketTr : SECTORS[next].defaultTicketEn);
  }

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
          <h2 className="bz-h-tight mt-1.5 text-[20px] sm:text-[22px] font-semibold text-[#0A0A0A]">
            {isTr ? 'Rakamları sürükle' : 'Drag the numbers'}
          </h2>
        </div>

        {/* Sektör */}
        <div>
          <label htmlFor="roi-sector" className="pulse-eyebrow text-[#0A0A0A] block">
            {isTr ? 'SEKTÖR' : 'SECTOR'}
          </label>
          <select
            id="roi-sector"
            value={sector}
            onChange={(e) => handleSectorChange(e.target.value as SectorKey)}
            className="bz-input mt-2 cursor-pointer"
          >
            {(Object.keys(SECTORS) as SectorKey[]).map((k) => (
              <option key={k} value={k}>
                {isTr ? SECTORS[k].labelTr : SECTORS[k].labelEn}
              </option>
            ))}
          </select>
        </div>

        {/* Aylık müşteri */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="roi-customers" className="pulse-eyebrow text-[#0A0A0A]">
              {isTr ? 'AYLIK MÜŞTERİ' : 'MONTHLY CUSTOMERS'}
            </label>
            <output
              htmlFor="roi-customers"
              className="bz-mono text-[15px] sm:text-[16px] font-semibold text-[#0A0A0A] tabular-nums"
            >
              {fmt(monthlyCustomers)}
            </output>
          </div>
          <input
            id="roi-customers"
            type="range"
            min={100}
            max={customersMax}
            step={50}
            value={monthlyCustomers}
            onChange={(e) => setMonthlyCustomers(Number(e.target.value))}
            className="mt-3 w-full accent-[#C6F24E]"
          />
          <div className="mt-1 flex justify-between text-[10px] text-[#737373] bz-mono">
            <span>100</span>
            <span>{fmt(customersMax)}</span>
          </div>
        </div>

        {/* Ortalama sepet */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="roi-ticket" className="pulse-eyebrow text-[#0A0A0A]">
              {isTr ? 'ORTALAMA SEPET' : 'AVERAGE TICKET'}
            </label>
            <output
              htmlFor="roi-ticket"
              className="bz-mono text-[15px] sm:text-[16px] font-semibold text-[#0A0A0A] tabular-nums"
            >
              {currency}{fmt(avgTicket)}
            </output>
          </div>
          <input
            id="roi-ticket"
            type="range"
            min={ticketMin}
            max={ticketMax}
            step={ticketStep}
            value={avgTicket}
            onChange={(e) => setAvgTicket(Number(e.target.value))}
            className="mt-3 w-full accent-[#C6F24E]"
          />
          <div className="mt-1 flex justify-between text-[10px] text-[#737373] bz-mono">
            <span>{currency}{fmt(ticketMin)}</span>
            <span>{currency}{fmt(ticketMax)}</span>
          </div>
        </div>

        {/* Google puanı */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="roi-google" className="pulse-eyebrow text-[#0A0A0A]">
              {isTr ? 'MEVCUT GOOGLE PUANI' : 'CURRENT GOOGLE SCORE'}
            </label>
            <output
              htmlFor="roi-google"
              className="bz-mono text-[15px] sm:text-[16px] font-semibold text-[#0A0A0A] tabular-nums"
            >
              {currentGoogle.toFixed(1)}
              <span className="text-[#737373] font-normal"> → {projectedGoogle.toFixed(1)}</span>
            </output>
          </div>
          <input
            id="roi-google"
            type="range"
            min={2.5}
            max={4.8}
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
                  <span className="bz-mono text-[11px] block mt-0.5 tabular-nums opacity-75">
                    {currency}{fmt(price)}/{isTr ? 'ay' : 'mo'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-[#737373] leading-[1.5]">
          {isTr
            ? 'Hesaplama BrightLocal 2024 yerel arama verileri ve ~2.400 Buaze müşteri kohortu üzerinde kalibre edildi. Sektörünüze göre dönüşüm çarpanı uygulanır.'
            : 'Model calibrated on BrightLocal 2024 local search data and ~2,400 Buaze accounts. Sector-specific conversion multiplier is applied.'}
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
          <div className="bz-h-tight mt-3 text-[40px] sm:text-[60px] font-medium leading-none tracking-[-0.035em] text-[#C6F24E] tabular-nums">
            {currency}{fmt(Math.max(0, Math.round(calc.netGain)))}
          </div>
          <p className="mt-3 text-[13px] sm:text-[14px] text-white/70 leading-[1.55]">
            {isTr
              ? `12 ayda Buaze yatırımının ${fmtRoi(calc.roiMultiple)}× geri dönüşü.`
              : `${fmtRoi(calc.roiMultiple)}× return on Buaze in 12 months.`}
            {calc.paybackMonths && (
              <>
                {' '}
                {isTr
                  ? `Amorti süresi yaklaşık ${calc.paybackMonths} ay.`
                  : `Payback in ~${calc.paybackMonths} month${calc.paybackMonths === 1 ? '' : 's'}.`}
              </>
            )}
          </p>
        </div>

        {/* Pipeline */}
        <ul className="space-y-2.5 text-[13px] sm:text-[14px]">
          {[
            {
              l: isTr ? 'QR\'ı tarayan' : 'QR scans',
              v: fmt(calc.scanned),
            },
            {
              l: isTr ? 'Yorum bırakan' : 'Reviews left',
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
              <span className="bz-h-tight font-medium text-white tracking-[-0.015em] tabular-nums">
                {row.v}
              </span>
            </li>
          ))}
        </ul>

        {/* Sub-stats */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { k: `${currency}${fmt(Math.round(calc.monthlyUplift))}`, l: isTr ? 'Aylık' : 'Monthly' },
            { k: `${currency}${fmt(calc.yearlyPlan)}`, l: isTr ? 'Plan / yıl' : 'Plan / yr' },
            { k: `${fmtRoi(calc.roiMultiple)}×`, l: 'ROI' },
          ].map((x) => (
            <div key={x.l} className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
              <div className="bz-h-tight text-[15px] sm:text-[18px] font-medium leading-none tracking-[-0.02em] text-white tabular-nums">
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
