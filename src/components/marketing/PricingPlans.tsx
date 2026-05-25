'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check } from 'lucide-react';
import type { PublicPlan } from '@/lib/subscription-plans';

interface Props {
  locale: 'tr' | 'en';
  monthlyCta: string;
  yearlyCta: string;
  monthlyPeriod: string;
  plans: PublicPlan[];
}

type Billing = 'monthly' | 'yearly';

/**
 * Pricing card grid — DB-driven plans (admin/plans). Monthly/yearly pill
 * toggle keeps a built-in 20% annual off; admin-defined per-plan discount
 * applies on top of monthly (yearly already includes the toggle's 20%).
 */
export default function PricingPlans({
  locale,
  monthlyCta,
  yearlyCta,
  monthlyPeriod,
  plans,
}: Props) {
  const isTr = locale === 'tr';
  const base = `/${locale}`;
  const [billing, setBilling] = useState<Billing>('monthly');

  // §38.225 Stage 145 — USD-only fiyatlandırma. Buaze tüm pazarlarda USD.
  // Locale (tr/en) sadece label/CTA dilini değiştirir, fiyat format'ı sabit.
  const formatPrice = (value: number) => {
    if (value === 0) return isTr ? 'Ücretsiz' : 'Free';
    return `$${value.toLocaleString('en-US')}`;
  };

  if (plans.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-10 text-center">
        <p className="text-[15px] font-medium text-[#525252]">
          {isTr
            ? 'Henüz aktif paket bulunmuyor. Yöneticinizle iletişime geçin.'
            : 'No active plans yet. Please contact your administrator.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-10 flex justify-center">
        <div
          role="tablist"
          aria-label={isTr ? 'Faturalandırma dönemi' : 'Billing period'}
          className="inline-flex items-center gap-1 rounded-full border border-[#EDEDED] bg-[#FAFAFA] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={billing === 'monthly'}
            onClick={() => setBilling('monthly')}
            className={`min-h-[40px] rounded-full px-5 py-2 text-[13px] font-semibold transition-all ${
              billing === 'monthly'
                ? 'bg-[#0A0A0A] text-white shadow-sm'
                : 'text-[#525252] hover:text-[#0A0A0A]'
            }`}
          >
            {isTr ? 'Aylık' : 'Monthly'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={billing === 'yearly'}
            onClick={() => setBilling('yearly')}
            className={`min-h-[40px] inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-semibold transition-all ${
              billing === 'yearly'
                ? 'bg-[#0A0A0A] text-white shadow-sm'
                : 'text-[#525252] hover:text-[#0A0A0A]'
            }`}
          >
            {isTr ? 'Yıllık' : 'Yearly'}
            <span
              className={`pulse-eyebrow rounded-full px-2 py-0.5 ${
                billing === 'yearly' ? 'bg-[#C6F24E] text-[#0A0A0A]' : 'bg-[#EAF9B8] text-[#0A0A0A]'
              }`}
            >
              {isTr ? '%20 İNDİRİM' : '20% OFF'}
            </span>
          </button>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 gap-6 lg:gap-8 ${
          plans.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
        }`}
      >
        {plans.map((p) => {
          const hasDiscount = p.discount.active && p.discount.discountedMonthly < p.priceMonthly;
          const monthlyShown = hasDiscount ? p.discount.discountedMonthly : p.priceMonthly;
          const price = billing === 'monthly' ? monthlyShown : p.priceYearly;
          const isDark = p.isFeatured;

          return (
            <article
              key={p.id}
              className={`flex flex-col rounded-3xl p-8 lg:p-10 ${
                isDark
                  ? 'relative z-10 bg-[#0A0A0A] text-white shadow-[0_20px_60px_rgba(10,10,10,0.15)] md:scale-[1.03]'
                  : 'border border-[#EDEDED] bg-white'
              }`}
            >
              {isDark && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="pulse-eyebrow whitespace-nowrap rounded-full bg-[#C6F24E] px-4 py-1.5 text-[#0A0A0A]">
                    {isTr ? 'EN POPÜLER' : 'MOST POPULAR'}
                  </span>
                </div>
              )}

              <div className={`${isDark ? 'pt-2' : ''} mb-6`}>
                <div className="flex items-start justify-between gap-3">
                  <h2
                    className={`text-[22px] font-medium tracking-[-0.02em] ${
                      isDark ? 'text-white' : 'text-[#0A0A0A]'
                    }`}
                  >
                    {p.name}
                  </h2>
                  {hasDiscount && p.discount.label && (
                    <span
                      className={`pulse-eyebrow shrink-0 rounded-full px-2.5 py-1 ${
                        isDark
                          ? 'bg-[#C6F24E] text-[#0A0A0A]'
                          : 'bg-[#EAF9B8] text-[#0A0A0A]'
                      }`}
                    >
                      {p.discount.label}
                    </span>
                  )}
                </div>
                <p className={`mt-2 text-[13px] leading-snug ${isDark ? 'text-white/70' : 'text-[#525252]'}`}>
                  {p.description}
                </p>
              </div>

              <div className={`mb-8 border-b pb-8 ${isDark ? 'border-white/10' : 'border-[#EDEDED]'}`}>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-[40px] sm:text-[52px] font-medium leading-none tracking-[-0.03em] ${
                      isDark ? 'text-[#C6F24E]' : 'text-[#0A0A0A]'
                    }`}
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {formatPrice(price)}
                  </span>
                  <span className={`pulse-eyebrow ${isDark ? 'text-white/60' : 'text-[#737373]'}`}>
                    {price === 0 ? (isTr ? 'ÜCRETSİZ' : 'FREE') : monthlyPeriod}
                  </span>
                </div>
                {((billing === 'monthly' && hasDiscount) ||
                  (billing === 'yearly' && p.priceMonthly > 0)) && (
                  <div
                    className={`mt-2 flex flex-wrap items-center gap-2 text-[12px] ${
                      isDark ? 'text-white/60' : 'text-[#525252]'
                    }`}
                  >
                    <span className={isDark ? 'text-white/40 line-through' : 'text-[#A3A3A3] line-through'}>
                      {formatPrice(p.priceMonthly)}
                      {monthlyPeriod}
                    </span>
                    <span>·</span>
                    {/* CLAUDE.md §15.2 rounding disiplini: yıllık toplam tutar her
                        zaman `priceYearlyTotal` (kanonik DB değeri veya formula
                        sonucu), `priceYearly × 12` DEĞİL — rounding error'ı
                        marketing × 12 ≠ admin'in yazdığı tutar bug'ına yol açar.
                        §38.225: USD-only. */}
                    <span>
                      {billing === 'yearly'
                        ? isTr
                          ? `$${p.priceYearlyTotal.toLocaleString('en-US')}/yıl`
                          : `$${p.priceYearlyTotal.toLocaleString('en-US')}/year`
                        : isTr
                          ? `${formatPrice(p.priceMonthly - p.discount.discountedMonthly)} tasarruf`
                          : `Save ${formatPrice(p.priceMonthly - p.discount.discountedMonthly)}`}
                    </span>
                  </div>
                )}
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {p.features.map((feat) => (
                  <li
                    key={feat}
                    className={`flex items-start gap-3 text-[14px] font-medium ${
                      isDark ? 'text-white' : 'text-[#0A0A0A]'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        isDark ? 'bg-[#C6F24E]' : 'bg-[#EAF9B8]'
                      }`}
                    >
                      <Check size={12} className="text-[#0A0A0A]" strokeWidth={2.5} />
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>

              {/* §44 Stage 148 (§38.228) — Dodo checkout wiring.
                  Eğer plan'in admin tarafından `paymentProvider='dodo_payments'`
                  + `dodoProductId` set ise CTA Dodo static checkout link'ine
                  gider (/api/checkout?productId=X — SDK Dodo hosted checkout
                  sayfasına 302 redirect yapar). Aksi halde mevcut fallback
                  (`buttonHref`, genelde register/contact). Dodo product ID
                  yoksa checkout butonu görünmez (plan listede kalır ama "Yakında"
                  hissi vermez — buttonHref hep dolu, register/contact fallback). */}
              {p.paymentProvider === 'dodo_payments' && p.dodoProductId ? (
                <a
                  href={`/api/checkout?productId=${encodeURIComponent(p.dodoProductId)}`}
                  className={`block min-h-[48px] w-full rounded-full py-3.5 text-center text-[14px] font-medium transition-colors ${
                    isDark
                      ? 'bg-[#C6F24E] text-[#0A0A0A] hover:bg-[#A8D62E]'
                      : 'border border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white'
                  }`}
                >
                  {p.buttonText || (billing === 'monthly' ? monthlyCta : yearlyCta)}
                </a>
              ) : (
                <Link
                  href={p.buttonHref.startsWith('http') ? p.buttonHref : `${base}${p.buttonHref}`}
                  className={`block min-h-[48px] w-full rounded-full py-3.5 text-center text-[14px] font-medium transition-colors ${
                    isDark
                      ? 'bg-[#C6F24E] text-[#0A0A0A] hover:bg-[#A8D62E]'
                      : 'border border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white'
                  }`}
                >
                  {p.buttonText || (billing === 'monthly' ? monthlyCta : yearlyCta)}
                </Link>
              )}
            </article>
          );
        })}
      </div>

      <p className="pulse-eyebrow mt-10 text-center text-[#737373]">
        {isTr
          ? 'GÜVENLİ ÖDEME · İSTEDİĞİNDE İPTAL · TAAHHÜTSÜZ'
          : 'SECURE PAYMENT · CANCEL ANYTIME · NO COMMITMENT'}
      </p>
    </div>
  );
}
