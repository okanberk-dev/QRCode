'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Clock, Loader2, MailCheck, ShieldCheck, Sparkles, Star } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import { AlertBanner, Field } from '@/components/ui';
import { getRecaptchaToken } from '@/lib/recaptcha-client';

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
//
// `ticketLabel*` — sektör başına gerçek terminoloji. Otel "gece başı
// ücret", klinik "hizmet başı ücret", restoran/kafe "ortalama sepet".
// Slider'ın hem eyebrow'u hem min/max chip'i bu label'a uyar.
const SECTORS: Record<
  SectorKey,
  {
    labelTr: string;
    labelEn: string;
    mult: number;
    defaultTicketTr: number;
    defaultTicketEn: number;
    ticketLabelTr: string;
    ticketLabelEn: string;
  }
> = {
  restaurant: {
    labelTr: 'Restoran',
    labelEn: 'Restaurant',
    mult: 1.0,
    defaultTicketTr: 320,
    defaultTicketEn: 28,
    ticketLabelTr: 'ORTALAMA SEPET',
    ticketLabelEn: 'AVERAGE TICKET',
  },
  cafe: {
    labelTr: 'Kafe',
    labelEn: 'Cafe',
    mult: 0.85,
    defaultTicketTr: 140,
    defaultTicketEn: 12,
    ticketLabelTr: 'ORTALAMA SEPET',
    ticketLabelEn: 'AVERAGE TICKET',
  },
  hotel: {
    labelTr: 'Otel',
    labelEn: 'Hotel',
    mult: 0.65,
    defaultTicketTr: 2400,
    defaultTicketEn: 180,
    ticketLabelTr: 'GECE BAŞI ÜCRET',
    ticketLabelEn: 'RATE PER NIGHT',
  },
  clinic: {
    labelTr: 'Klinik',
    labelEn: 'Clinic',
    mult: 0.55,
    defaultTicketTr: 1500,
    defaultTicketEn: 120,
    ticketLabelTr: 'HİZMET BAŞI ÜCRET',
    ticketLabelEn: 'AVG. SERVICE FEE',
  },
  other: {
    labelTr: 'Diğer',
    labelEn: 'Other',
    mult: 0.75,
    defaultTicketTr: 500,
    defaultTicketEn: 40,
    ticketLabelTr: 'ORTALAMA HESAP',
    ticketLabelEn: 'AVERAGE BILL',
  },
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

// Buaze'nin signature faydası: düşük puan filtrelemesi.
// Yüksek puan platforma yönlendirilirken düşük puan dahili form'a düşer →
// Google'a sızma oranı tipik ~%15. Yani ~%85 filtrelenir.
const LOW_RATING_FILTER_RATE = 0.85;

// Yeni Google puanı projeksiyonu için dilüsyon modeli sabitleri:
// - Buaze QR akışında çekilen yüksek-puanlı yorumların ortalama yıldızı
// - Filtreden kaçan ~%15 düşük yorumun ortalama yıldızı
// - Mevcut Google yorum havuzu tahmini: aylık müşterinin %4'ü 12 ay
//   içinde yorum bırakmış varsayımı (BrightLocal benchmark)
const HIGH_REVIEW_AVG_STARS = 4.7;
const LEAKED_LOW_AVG_STARS = 2.0;
const ASSUMED_EXISTING_REVIEW_RATE = 0.04;
const MIN_EXISTING_REVIEWS = 20;

// AI Co-Pilot taslak (CLAUDE.md §15) yanıt başına ortalama kazanım.
// Manuel yanıt 5-7 dk, AI taslak + edit 1-2 dk → ~4 dk tasarruf / yanıt.
const AI_REPLY_TIME_SAVED_MIN = 4;

// Yüksek puan akışında platform dağılımı default ağırlıkları. Kullanıcı
// seçili olmayan platformları sıfırlar; geri kalanlar runtime'da normalize
// edilir. Resmi marka hex'leri (CLAUDE.md §11 dokunulmaz tablosu + ek
// platformların kendi brand guideline'ları).
type PlatformKey =
  | 'google'
  | 'yemeksepeti'
  | 'getir'
  | 'trendyol'
  | 'tripadvisor'
  | 'foursquare'
  | 'yandex'
  | 'yelp'
  | 'booking'
  | 'airbnb';
const PLATFORM_META: Record<
  PlatformKey,
  { labelTr: string; labelEn: string; weight: number; color: string }
> = {
  google: { labelTr: 'Google', labelEn: 'Google', weight: 0.30, color: '#4285F4' },
  yemeksepeti: { labelTr: 'Yemeksepeti', labelEn: 'Yemeksepeti', weight: 0.18, color: '#FA0050' },
  getir: { labelTr: 'Getir', labelEn: 'Getir', weight: 0.12, color: '#5D3EBC' },
  trendyol: { labelTr: 'Trendyol GO', labelEn: 'Trendyol GO', weight: 0.08, color: '#F27A1A' },
  tripadvisor: { labelTr: 'Tripadvisor', labelEn: 'Tripadvisor', weight: 0.08, color: '#00AF87' },
  yelp: { labelTr: 'Yelp', labelEn: 'Yelp', weight: 0.07, color: '#FF1A1A' },
  foursquare: { labelTr: 'Foursquare', labelEn: 'Foursquare', weight: 0.05, color: '#F94877' },
  booking: { labelTr: 'Booking', labelEn: 'Booking', weight: 0.05, color: '#003580' },
  yandex: { labelTr: 'Yandex', labelEn: 'Yandex', weight: 0.04, color: '#FC3F1D' },
  airbnb: { labelTr: 'Airbnb', labelEn: 'Airbnb', weight: 0.03, color: '#FF5A5F' },
};
const ALL_PLATFORMS = Object.keys(PLATFORM_META) as PlatformKey[];

// Default açık platformlar — TR pazarındaki çekirdek 4. Ek 6 (tripadvisor /
// yelp / foursquare / booking / yandex / airbnb) chip group'ta görünür ama
// varsayılan olarak kapalıdır; işletmesi o platformlarda olan operatör
// ilgili chip'i tek tıkla açar.
const DEFAULT_PLATFORMS: PlatformKey[] = ['google', 'yemeksepeti', 'getir', 'trendyol'];

export default function RoiCalculator({ locale }: RoiCalculatorProps) {
  const isTr = locale === 'tr';
  const currency = isTr ? '₺' : '$';
  const localeTag = isTr ? 'tr-TR' : 'en-US';

  const [sector, setSector] = useState<SectorKey>('restaurant');
  const [monthlyCustomers, setMonthlyCustomers] = useState(isTr ? 1200 : 800);
  const [avgTicket, setAvgTicket] = useState(isTr ? 320 : 28);
  const [currentGoogle, setCurrentGoogle] = useState(4.2);
  const [lowRatingsPerMonth, setLowRatingsPerMonth] = useState(12);
  const [platforms, setPlatforms] = useState<PlatformKey[]>([...DEFAULT_PLATFORMS]);
  const [plan, setPlan] = useState<PlanKey>('growth');

  function togglePlatform(key: PlatformKey) {
    setPlatforms((prev) => {
      // En az 1 platform seçili kalmalı — son platformun kapanmasını engelle.
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((p) => p !== key);
      }
      return [...prev, key];
    });
  }

  // ─── Lead form (Detaylı PDF + 1-1 demo iste) ───────────────────────────
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadConsent, setLeadConsent] = useState(false);
  const [leadErrors, setLeadErrors] = useState<{
    name?: string;
    email?: string;
    consent?: string;
  }>({});
  const [leadStatus, setLeadStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  );
  const [leadServerError, setLeadServerError] = useState<string | null>(null);
  // Honeypot field — bot'lar otomatik doldurur, gerçek kullanıcı görmez.
  // Server-side spam-guard `body.website_url` non-empty ise sessiz reject.
  const [honeypotValue, setHoneypotValue] = useState('');
  // Form mount timestamp — submission velocity check için. Bot tipik
  // <3 saniye içinde submit eder; gerçek kullanıcı slider sürükleyip okur.
  const formStartedAtRef = useRef<number>(Date.now());

  function validateLead() {
    const errors: typeof leadErrors = {};
    const name = leadName.trim();
    if (name.length < 2) {
      errors.name = isTr ? 'İşletme adı en az 2 karakter olmalı.' : 'At least 2 characters.';
    }
    const email = leadEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = isTr ? 'Geçerli bir e-posta gir.' : 'Enter a valid email address.';
    }
    if (!leadConsent) {
      errors.consent = isTr
        ? 'İletişim için onay gerekli.'
        : 'Consent is required.';
    }
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
      const projection = {
        sector,
        monthlyCustomers,
        avgTicket,
        currentGoogle,
        lowRatingsPerMonth,
        platforms,
        plan,
        // Hesaplanmış değerler — sales mail + form-confirmation context'i için
        calc: {
          scanned: calc.scanned,
          reviewers: calc.reviewers,
          filteredLowReviews: calc.filteredLowReviews,
          projectedGoogle: calc.projectedGoogle,
          newCustomers: calc.newCustomers,
          monthlyUplift: Math.round(calc.monthlyUplift),
          yearlyUplift: Math.round(calc.yearlyUplift),
          netGain: Math.round(calc.netGain),
          roiMultiple: Number(calc.roiMultiple.toFixed(2)),
          paybackMonths: calc.paybackMonths,
          aiHoursSaved: Number(calc.aiHoursSaved.toFixed(1)),
          platformBreakdown: calc.platformBreakdown.map((p) => ({
            key: p.key,
            share: Number(p.share.toFixed(3)),
            reviews: p.reviews,
          })),
        },
      };
      const res = await fetch('/api/roi/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: leadEmail.trim(),
          restaurantName: leadName.trim(),
          phone: leadPhone.trim() || undefined,
          avgTicket,
          recaptchaToken,
          projection,
          locale,
          // Spam guard inputs (server-side checkSpamGuard).
          website_url: honeypotValue,
          formStartedAt: formStartedAtRef.current,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const code = data?.error;
        const msg =
          code === 'rate_limited'
            ? isTr
              ? 'Çok hızlı denedin. Birkaç dakika sonra yeniden gönder.'
              : 'Too many tries. Please retry in a few minutes.'
            : code === 'invalid_email'
              ? isTr
                ? 'E-posta adresi geçersiz.'
                : 'Invalid email address.'
              : isTr
                ? 'Gönderim başarısız. Tekrar dene.'
                : 'Submit failed. Please retry.';
        setLeadServerError(msg);
        setLeadStatus('error');
        return;
      }
      setLeadStatus('sent');
    } catch {
      setLeadServerError(
        isTr ? 'Bağlantı hatası. Tekrar dene.' : 'Connection error. Please retry.',
      );
      setLeadStatus('error');
    }
  }

  const planDef = PLANS.find((p) => p.key === plan)!;
  const planPrice = isTr ? planDef.priceTr : planDef.priceEn;
  const sectorDef = SECTORS[sector];

  const calc = useMemo(() => {
    const scanned = Math.round(monthlyCustomers * planDef.scanRate);
    const reviewers = Math.round(scanned * REVIEW_SUBMISSION_RATE);

    // 1) Buaze filtrelemesi — düşük yorumların ne kadarı Google'a sızmaz.
    const filteredLowReviews = Math.round(lowRatingsPerMonth * LOW_RATING_FILTER_RATE);
    const leakedLowReviewsPerMonth = lowRatingsPerMonth - filteredLowReviews;

    // 2) Yeni Google puanı — dilüsyon modeli (12 ay sonunda yeni ortalama):
    //    mevcut yorum havuzu × mevcut puan + Buaze'den gelen yeni yüksek
    //    yorumlar × 4.7★ + filtreden kaçan düşük yorumlar × 2.0★, hepsi
    //    toplanır ve toplam yorum sayısına bölünür. Aylık müşteri, plan
    //    (scanRate) ve sektör değiştikçe `reviewers` değişir → projeksiyon
    //    da gerçekten hareket eder.
    const existingReviews = Math.max(
      MIN_EXISTING_REVIEWS,
      Math.round(monthlyCustomers * 12 * ASSUMED_EXISTING_REVIEW_RATE),
    );
    const newHighReviewsTotal = reviewers * 12;
    const newLeakedLowTotal = leakedLowReviewsPerMonth * 12;
    const totalReviews12mo = existingReviews + newHighReviewsTotal + newLeakedLowTotal;
    const totalPoints12mo =
      existingReviews * currentGoogle +
      newHighReviewsTotal * HIGH_REVIEW_AVG_STARS +
      newLeakedLowTotal * LEAKED_LOW_AVG_STARS;
    const rawProjectedGoogle =
      totalReviews12mo > 0 ? totalPoints12mo / totalReviews12mo : currentGoogle;
    // Cap üst: 4.9 (gerçekçi ceiling). Cap alt: mevcut puan (Buaze hiç
    // bir senaryoda mevcut ortalamayı düşürmez — filtreleme sayesinde).
    const projectedGoogle = Math.max(
      currentGoogle,
      Math.min(4.9, rawProjectedGoogle),
    );
    const ratingLift = Math.min(MAX_RATING_DELTA, projectedGoogle - currentGoogle);

    // 3) Discovery uplift — rating bump'ın local-pack CTR'ye yansıması.
    const discoveryUplift = ratingLift * DISCOVERY_GAIN_PER_STAR;
    const newCustomers = Math.round(
      monthlyCustomers * discoveryUplift * DISCOVERY_TO_CUSTOMER_RATE * sectorDef.mult,
    );

    const monthlyUplift = newCustomers * avgTicket;
    const yearlyUplift = monthlyUplift * 12;
    const yearlyPlan = planPrice * 12;
    const netGain = yearlyUplift - yearlyPlan;
    const roiMultiple = yearlyPlan > 0 ? Math.max(0, netGain / yearlyPlan) : 0;

    // Payback: aylık uplift planın aylık maliyetini geçtiği andan itibaren
    // kaç ayda kümülatif kazanç planı amorti eder.
    const monthlyPlan = planPrice;
    const paybackMonths =
      monthlyUplift > 0 && monthlyUplift > monthlyPlan * 0.1
        ? Math.max(1, Math.ceil(monthlyPlan / Math.max(monthlyUplift, 1)))
        : null;

    // 4) AI Co-Pilot zaman tasarrufu — ay başına saat (yanıtlanan yorum × 4 dk).
    const aiHoursSaved = (reviewers * AI_REPLY_TIME_SAVED_MIN) / 60;

    // 5) Platform breakdown — yüksek puan akışı seçili platformlara dağılır.
    //    Default ağırlıklar normalize edilir (seçili olmayan = 0).
    const totalWeight = platforms.reduce((sum, key) => sum + PLATFORM_META[key].weight, 0);
    const platformBreakdown: Array<{ key: PlatformKey; share: number; reviews: number }> =
      platforms.map((key) => {
        const share = totalWeight > 0 ? PLATFORM_META[key].weight / totalWeight : 0;
        return { key, share, reviews: Math.round(reviewers * share) };
      });

    return {
      scanned,
      reviewers,
      filteredLowReviews,
      ratingLift,
      projectedGoogle,
      newCustomers,
      monthlyUplift,
      yearlyUplift,
      yearlyPlan,
      netGain,
      roiMultiple,
      paybackMonths,
      aiHoursSaved,
      platformBreakdown,
    };
  }, [
    monthlyCustomers,
    avgTicket,
    planPrice,
    planDef.scanRate,
    currentGoogle,
    lowRatingsPerMonth,
    platforms,
    sectorDef.mult,
  ]);

  // Backward compat — JSX'te `projectedGoogle` ve `ratingDelta` referansları
  // eski formülde top-level idi; artık calc içinden çekilir.
  const projectedGoogle = calc.projectedGoogle;

  const fmt = (n: number) => n.toLocaleString(localeTag);
  const fmtRoi = (n: number) =>
    n >= 10 ? Math.round(n).toString() : n.toFixed(1).replace('.', isTr ? ',' : '.');

  const ticketMin = isTr ? 80 : 6;
  const ticketMax = isTr ? 5000 : 400;
  const ticketStep = isTr ? 10 : 1;
  const customersMax = isTr ? 12000 : 6000;

  // Slider lime fill yüzdesi — globals.css `.roi-slider` track gradient'ine
  // CSS var olarak iletilir. Mobilde özellikle önemli: thumb'ın hangi
  // pozisyonda olduğu görsel kontrast olarak da net görünür.
  const sliderFill = (value: number, min: number, max: number) =>
    `${Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))}%`;

  function handleSectorChange(next: SectorKey) {
    setSector(next);
    setAvgTicket(isTr ? SECTORS[next].defaultTicketTr : SECTORS[next].defaultTicketEn);
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* ─── Mobile sticky result bar ──────────────────────────────────────
          Mobilde slider sürükledikçe sayfanın üstünde küçük bir özet kartı
          sticky kalır → kullanıcı sürekli "sonuç var mı" diye scroll etmek
          zorunda kalmaz. Desktop'ta gizli (sağdaki output paneli zaten
          görünür durumda). Top offset = MarketingNavbar yüksekliği (64px). */}
      <div
        className="lg:hidden sticky top-[64px] z-30 -mx-5 px-5 pt-2 pb-3 bg-white/95 backdrop-blur-md border-b border-[#EDEDED]"
        aria-live="polite"
      >
        <a
          href="#roi-result"
          className="flex items-center justify-between gap-3 rounded-full bg-[#0A0A0A] text-white px-4 py-2.5 shadow-[0_8px_24px_-12px_rgba(10,10,10,0.45)] active:scale-[0.98] transition-transform"
        >
          <div className="min-w-0 flex-1">
            <div className="pulse-eyebrow text-[#C6F24E] text-[9px]">
              {isTr ? 'YILLIK NET KAZANÇ' : 'ANNUAL NET GAIN'}
            </div>
            <div className="bz-h-tight text-[18px] sm:text-[20px] font-semibold tracking-[-0.025em] text-[#C6F24E] tabular-nums truncate">
              {currency}
              {fmt(Math.max(0, Math.round(calc.netGain)))}
              <span className="ml-2 text-[12px] font-normal text-white/65">
                {fmtRoi(calc.roiMultiple)}× ROI
              </span>
            </div>
          </div>
          <span
            aria-hidden
            className="shrink-0 inline-flex items-center gap-1 text-[11px] text-white/70 whitespace-nowrap"
          >
            {isTr ? 'Detayı gör' : 'See details'} ↓
          </span>
        </a>
      </div>

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
            className="roi-slider mt-3 w-full"
            style={{ ['--roi-fill' as string]: sliderFill(monthlyCustomers, 100, customersMax) }}
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
              {isTr ? sectorDef.ticketLabelTr : sectorDef.ticketLabelEn}
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
            className="roi-slider mt-3 w-full"
            style={{ ['--roi-fill' as string]: sliderFill(avgTicket, ticketMin, ticketMax) }}
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
            className="roi-slider mt-3 w-full"
            style={{ ['--roi-fill' as string]: sliderFill(currentGoogle, 2.5, 4.8) }}
          />
        </div>

        {/* Aylık düşük yorum (Buaze filtreleme inputu) */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="roi-lowratings" className="pulse-eyebrow text-[#0A0A0A]">
              {isTr ? 'AYLIK 1-3★ YORUM' : 'LOW REVIEWS / MO'}
            </label>
            <output
              htmlFor="roi-lowratings"
              className="bz-mono text-[15px] sm:text-[16px] font-semibold text-[#0A0A0A] tabular-nums"
            >
              {fmt(lowRatingsPerMonth)}
              <span className="text-[#A8D62E] font-normal">
                {' '}
                → {fmt(calc.filteredLowReviews)} {isTr ? 'filtre' : 'filtered'}
              </span>
            </output>
          </div>
          <input
            id="roi-lowratings"
            type="range"
            min={0}
            max={60}
            step={1}
            value={lowRatingsPerMonth}
            onChange={(e) => setLowRatingsPerMonth(Number(e.target.value))}
            className="roi-slider mt-3 w-full"
            style={{ ['--roi-fill' as string]: sliderFill(lowRatingsPerMonth, 0, 60) }}
          />
          <p className="mt-1.5 text-[11px] text-[#737373] leading-[1.5]">
            {isTr
              ? 'Buaze, düşük puanları dahili form\'a düşürür → Google\'a sızma %15\'e iner.'
              : 'Buaze routes low ratings to an internal form → only ~15% leak to Google.'}
          </p>
        </div>

        {/* Aktif platformlar (yüksek puan dağılımı) */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="pulse-eyebrow text-[#0A0A0A]">
              {isTr ? 'AKTİF PLATFORMLARIN' : 'ACTIVE PLATFORMS'}
            </span>
            <span className="bz-mono text-[11px] text-[#737373] tabular-nums">
              {platforms.length}/{ALL_PLATFORMS.length}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#737373] leading-[1.5]">
            {isTr
              ? 'İşletmen hangilerinde varsa açık tut. Yüksek puan akışı yalnız seçili platformlara dağılır.'
              : 'Keep on the ones your business is on. The high-rating flow distributes only to active platforms.'}
          </p>
          <div
            role="group"
            aria-label={isTr ? 'Yönlendirilen platformlar' : 'Active redirect platforms'}
            className="mt-2.5 flex flex-wrap gap-1.5"
          >
            {ALL_PLATFORMS.map((key) => {
              const meta = PLATFORM_META[key];
              const active = platforms.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  role="checkbox"
                  aria-checked={active}
                  onClick={() => togglePlatform(key)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
                    active
                      ? 'bg-[#0A0A0A] text-white border border-[#0A0A0A]'
                      : 'bg-white text-[#525252] border border-[#E5E5E5] hover:border-[#0A0A0A]'
                  }`}
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  {isTr ? meta.labelTr : meta.labelEn}
                </button>
              );
            })}
          </div>
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
                  className={`min-h-[58px] px-2 py-3 rounded-[10px] text-left transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-1 ${
                    active
                      ? 'bg-[#0A0A0A] text-white border border-[#0A0A0A] outline outline-2 outline-[#0A0A0A] -outline-offset-1'
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
            ? 'Üç temel sürücü: düşük yorum filtreleme (%85), çoklu platform yönlendirme ve AI Co-Pilot zaman tasarrufu. BrightLocal 2024 + ~2.400 Buaze hesabı kohortu üzerinde kalibre.'
            : 'Three drivers: low-review filtering (85%), multi-platform routing, and AI Co-Pilot time savings. Calibrated on BrightLocal 2024 + ~2,400 Buaze accounts.'}
        </p>
      </form>

      {/* ─── Outputs (dark hero) ─── */}
      <div
        id="roi-result"
        className="bg-[#0A0A0A] text-white rounded-3xl p-5 sm:p-8 flex flex-col gap-5 sm:gap-6"
        aria-live="polite"
      >
        <div>
          <span className="pulse-eyebrow text-[#C6F24E]">
            {isTr ? '2. Yıllık net kazanç' : '2. Annual net gain'}
          </span>
          <div className="bz-h-tight mt-3 text-[32px] sm:text-[52px] lg:text-[60px] font-medium leading-none tracking-[-0.035em] text-[#C6F24E] tabular-nums break-all">
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

        {/* Buaze metrik şeridi — 4 KPI (signature faydaların görünür özeti) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            {
              icon: <Sparkles size={14} strokeWidth={2.2} className="text-white/70" />,
              v: `+${fmt(calc.reviewers)}`,
              l: isTr ? 'Ek yorum / ay' : 'New reviews / mo',
            },
            {
              icon: <ShieldCheck size={14} strokeWidth={2.2} className="text-[#C6F24E]" />,
              v: `${fmt(calc.filteredLowReviews)}`,
              l: isTr ? 'Filtrelenen kötü' : 'Low filtered',
              accent: true,
            },
            {
              icon: <Star size={14} strokeWidth={2.2} className="text-white/70" />,
              v: calc.projectedGoogle.toFixed(1),
              l: isTr ? 'Yeni Google ★' : 'New Google ★',
            },
            {
              icon: <Clock size={14} strokeWidth={2.2} className="text-white/70" />,
              v: `${calc.aiHoursSaved.toFixed(1)}${isTr ? 'sa' : 'h'}`,
              l: isTr ? 'AI tasarruf / ay' : 'AI saved / mo',
            },
          ].map((kpi) => (
            <div
              key={kpi.l}
              className={`rounded-2xl border p-3 ${
                kpi.accent
                  ? 'bg-[#C6F24E]/10 border-[#C6F24E]/30'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-center gap-1.5">{kpi.icon}</div>
              <div
                className={`bz-h-tight mt-1.5 text-[16px] sm:text-[20px] font-medium leading-none tracking-[-0.02em] tabular-nums ${
                  kpi.accent ? 'text-[#C6F24E]' : 'text-white'
                }`}
              >
                {kpi.v}
              </div>
              <div className="pulse-eyebrow mt-1.5 text-white/55">{kpi.l}</div>
            </div>
          ))}
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

        {/* Platform breakdown — yüksek puan akışı seçili platformlara dağılır */}
        {calc.platformBreakdown.length > 0 && calc.reviewers > 0 && (
          <div>
            <span className="pulse-eyebrow text-white/55 block">
              {isTr ? 'PLATFORMA YÖNLENDİRME' : 'PLATFORM ROUTING'}
            </span>
            <ul className="mt-3 space-y-2">
              {calc.platformBreakdown.map(({ key, share, reviews }) => {
                const meta = PLATFORM_META[key];
                return (
                  <li key={key} className="flex items-center gap-3">
                    <span className="w-24 sm:w-28 shrink-0 text-[12px] text-white/80 truncate">
                      {isTr ? meta.labelTr : meta.labelEn}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(2, Math.round(share * 100))}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </div>
                    <span className="bz-mono text-[11px] text-white/70 tabular-nums w-14 text-right">
                      +{fmt(reviews)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Sub-stats — mobilde 3-col tabular-nums dar ekranda taşar.
            375px ekranda 2x2 grid (3. card single full row) sığar; sm+
            tek satıra çıkar. Text-[14px] → [15px] minimum okunabilir. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
          {[
            { k: `${currency}${fmt(Math.round(calc.monthlyUplift))}`, l: isTr ? 'Aylık' : 'Monthly' },
            { k: `${currency}${fmt(calc.yearlyPlan)}`, l: isTr ? 'Plan / yıl' : 'Plan / yr' },
            { k: `${fmtRoi(calc.roiMultiple)}×`, l: 'ROI', className: 'col-span-2 sm:col-span-1' },
          ].map((x) => (
            <div
              key={x.l}
              className={`bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 ${x.className ?? ''}`}
            >
              <div className="bz-h-tight text-[14px] sm:text-[18px] font-medium leading-none tracking-[-0.02em] text-white tabular-nums break-all">
                {x.k}
              </div>
              <div className="pulse-eyebrow text-white/60 mt-2">{x.l}</div>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* ─── Mikro-CTA — düşük friction adım (kayıt yok, kredi kartı yok) ─── */}
      <div className="rounded-2xl border border-[#EDEDED] bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-3 flex-1">
          <span
            aria-hidden
            className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF9B8] text-[#0A0A0A]"
          >
            <Sparkles size={18} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <div className="bz-h-tight text-[14px] sm:text-[15px] font-semibold text-[#0A0A0A]">
              {isTr
                ? 'Önce küçük adımla dene — kayıt yok'
                : 'Try a small step first — no signup'}
            </div>
            <p className="mt-0.5 text-[12px] sm:text-[12.5px] text-[#737373] leading-[1.5]">
              {isTr
                ? 'Tek tıkla restoranına özel ücretsiz QR oluştur. Kredi kartı sormuyoruz, e-posta istemiyoruz.'
                : 'Generate a free QR for your business in one click. No credit card, no email needed.'}
            </p>
          </div>
        </div>
        <Link
          href={`/${locale}/solutions/qr-generator`}
          className="group inline-flex w-full sm:w-auto min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-[#0A0A0A] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 shrink-0"
        >
          {isTr ? 'Ücretsiz QR oluştur' : 'Generate free QR'}
          <ArrowRight
            size={14}
            strokeWidth={2.2}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      {/* ─── Lead form — Detaylı PDF + 1-1 demo iste (opsiyonel) ─── */}
      <div className="bz-card p-5 sm:p-7">
        {leadStatus === 'sent' ? (
          <div className="text-center py-2">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#C6F24E]">
              <MailCheck size={26} strokeWidth={2} className="text-[#0A0A0A]" />
            </div>
            <h3 className="bz-h-tight text-[20px] sm:text-[22px] font-medium tracking-[-0.03em] text-[#0A0A0A]">
              {isTr ? 'PDF yolda · ekibimiz seninle iletişime geçecek' : 'PDF on the way · our team will reach out'}
            </h3>
            <p className="mx-auto mt-2 max-w-[440px] text-[13px] sm:text-[14px] leading-[1.6] text-[#525252]">
              {isTr
                ? 'Detaylı 12 aylık projeksiyon ve 1-1 kurulum daveti birkaç dakika içinde mailbox\'a düşecek. Spam / promosyon klasörünü de kontrol et.'
                : 'A detailed 12-month projection and a 1-1 setup invite will land in your inbox shortly. Check Promotions / Spam too.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleLeadSubmit} className="grid gap-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <span className="pulse-eyebrow text-[#737373]">
                  {isTr ? '3. Detaylı raporu iste' : '3. Get the detailed report'}
                </span>
                <h3 className="bz-h-tight mt-1.5 text-[20px] sm:text-[22px] font-semibold text-[#0A0A0A]">
                  {isTr
                    ? 'Detaylı PDF + 1-1 kurulum daveti'
                    : 'Detailed PDF + 1-1 setup invite'}
                </h3>
                <p className="mt-1.5 text-[13px] text-[#525252] leading-[1.55] max-w-[440px]">
                  {isTr
                    ? 'İşletmene özel 12 aylık projeksiyon, plan amortismanı ve canlı demo daveti — kredi kartı sormuyoruz.'
                    : 'A tailored 12-month projection, plan payback and a live demo invite — no credit card required.'}
                </p>
              </div>
              <AlertBanner kind="lime" className="sm:max-w-[280px]">
                {isTr
                  ? '5 dk içinde mailbox\'a düşer · 2 sa içinde ekibimiz aradığında.'
                  : 'Inbox in 5 min · our team calls within 2 hours.'}
              </AlertBanner>
            </div>

            {leadServerError && <AlertBanner kind="danger">{leadServerError}</AlertBanner>}

            {/* Honeypot — bot'lar otomatik doldurur. display:none + tabindex
                + aria-hidden + autocomplete=off görsel/erişilebilirlik
                kanallarından gizlendi; gerçek kullanıcı asla dokunmaz. */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
              <label htmlFor="roi-website-url">Web sitesi (boş bırak)</label>
              <input
                id="roi-website-url"
                name="website_url"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypotValue}
                onChange={(e) => setHoneypotValue(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label={isTr ? 'İşletme adı' : 'Business name'}
                required
                error={leadErrors.name}
              >
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  className="bz-input"
                  placeholder={isTr ? 'Örn. Karaköy Lokantası' : 'e.g. Karaköy Lokantası'}
                  autoComplete="organization"
                  enterKeyHint="next"
                  maxLength={120}
                />
              </Field>
              <Field
                label={isTr ? 'E-posta' : 'Email'}
                required
                error={leadErrors.email}
              >
                <input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  className="bz-input"
                  placeholder={isTr ? 'sen@isletmen.com' : 'you@yourbiz.com'}
                  autoComplete="email"
                  inputMode="email"
                  enterKeyHint="next"
                  spellCheck={false}
                  maxLength={200}
                />
              </Field>
              <Field
                label={isTr ? 'Telefon (opsiyonel)' : 'Phone (optional)'}
                hint={isTr ? 'Hızlı geri arama için.' : 'For a quick callback.'}
              >
                <input
                  type="tel"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  className="bz-input"
                  placeholder={isTr ? '+90 5xx xxx xx xx' : '+1 555 ...'}
                  autoComplete="tel"
                  inputMode="tel"
                  enterKeyHint="send"
                  maxLength={40}
                />
              </Field>
              <div className="flex items-start gap-2.5 sm:pt-7">
                <input
                  id="roi-consent"
                  type="checkbox"
                  checked={leadConsent}
                  onChange={(e) => setLeadConsent(e.target.checked)}
                  className="mt-0.5 h-[18px] w-[18px] sm:h-4 sm:w-4 rounded border-[#D4D4D4] accent-[#C6F24E] shrink-0 cursor-pointer"
                  aria-invalid={!!leadErrors.consent}
                  aria-describedby={leadErrors.consent ? 'roi-consent-error' : undefined}
                />
                <label
                  htmlFor="roi-consent"
                  className="text-[12.5px] leading-[1.55] text-[#525252] cursor-pointer"
                >
                  {isTr ? (
                    <>
                      Buaze ekibinin benimle iletişime geçmesini ve raporu e-posta ile
                      göndermesini onaylıyorum. Detaylar{' '}
                      <Link
                        href={`/${locale}/privacy`}
                        className="font-semibold text-[#0A0A0A] underline underline-offset-2 hover:text-[#A8D62E]"
                      >
                        gizlilik politikası
                      </Link>
                      .
                    </>
                  ) : (
                    <>
                      I consent to be contacted by Buaze and to receive the report by
                      email. See{' '}
                      <Link
                        href={`/${locale}/privacy`}
                        className="font-semibold text-[#0A0A0A] underline underline-offset-2 hover:text-[#A8D62E]"
                      >
                        privacy policy
                      </Link>
                      .
                    </>
                  )}
                  {leadErrors.consent && (
                    <span
                      id="roi-consent-error"
                      role="alert"
                      className="block mt-1 text-[11.5px] text-[#DC2626]"
                    >
                      {leadErrors.consent}
                    </span>
                  )}
                </label>
              </div>
            </div>

            {/* Risk-free badge sırası — submit butonuna yakın güven sinyali */}
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[#525252]">
              {(isTr
                ? ['30 gün ücretsiz', 'Kredi kartı yok', 'İstediğin an iptal']
                : ['30-day free trial', 'No credit card', 'Cancel anytime']
              ).map((label) => (
                <li key={label} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-[#EAF9B8] text-[#0A0A0A]"
                  >
                    <Check size={10} strokeWidth={3} />
                  </span>
                  <span className="font-medium">{label}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <p className="text-[11px] text-[#737373] leading-[1.5] sm:max-w-[440px]">
                {isTr
                  ? 'Bilgilerin yalnız Buaze ekibiyle paylaşılır; üçüncü taraflara satılmaz. Diler dilemez aboneliği kapatabilirsin.'
                  : 'Your info stays with Buaze, never sold. Unsubscribe anytime.'}
              </p>
              <button
                type="submit"
                disabled={leadStatus === 'sending'}
                className="group inline-flex w-full sm:w-auto min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_18px_40px_-22px_rgba(10,10,10,0.55)] transition-all hover:-translate-y-px hover:bg-[#1A1A1A] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {leadStatus === 'sending' ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    {isTr ? 'Detaylı raporu iste' : 'Request detailed report'}
                    <ArrowRight
                      size={16}
                      strokeWidth={2.2}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
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
