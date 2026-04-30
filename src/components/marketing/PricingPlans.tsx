'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check } from 'lucide-react';

interface Props {
  locale: 'tr' | 'en';
  monthlyCta: string;
  yearlyCta: string;
  monthlyPeriod: string;
}

type Billing = 'monthly' | 'yearly';

/**
 * 1:1 with .design/site/site-marketing.jsx:PricingPage — monthly/yearly pill
 * toggle, 3 plans (Starter / Growth / Scale — English in both locales), dynamic
 * price calculation (yearly = monthly × 0.80, 20% off).
 */
export default function PricingPlans({ locale, monthlyCta, yearlyCta, monthlyPeriod }: Props) {
  const isTr = locale === 'tr';
  const base = `/${locale}`;
  const [billing, setBilling] = useState<Billing>('monthly');

  const plans = [
    {
      id: 'starter' as const,
      name: 'Starter',
      desc: isTr ? 'Küçük işletmeler için ideal başlangıç.' : 'Ideal start for small businesses.',
      monthly: 0,
      yearly: 0,
      featured: false,
      cta: monthlyCta,
      features: isTr
        ? ['Sınırsız QR kod', 'Yorum yönetimi', 'Akıllı filtreleme', 'E-posta desteği']
        : ['Unlimited QR codes', 'Review management', 'Smart filtering', 'Email support'],
    },
    {
      id: 'growth' as const,
      name: 'Growth',
      desc: isTr
        ? 'Hızlı büyüyen ve çok şubeli işletmeler için.'
        : 'For fast-growing and multi-location businesses.',
      monthly: 890,
      yearly: 712,
      featured: true,
      cta: monthlyCta,
      features: isTr
        ? ['Starter\'daki her şey', 'Buaze Pulse AI dahil', 'Çoklu lokasyon (3\'e kadar)', 'Gelişmiş analitik', 'Öncelikli destek']
        : ['Everything in Starter', 'Buaze Pulse AI included', 'Multi-location (up to 3)', 'Advanced analytics', 'Priority support'],
    },
    {
      id: 'scale' as const,
      name: 'Scale',
      desc: isTr ? 'Kurumsal ihtiyaçlar ve sınırsız kapasite.' : 'Enterprise needs with unlimited capacity.',
      monthly: 2490,
      yearly: 1992,
      featured: false,
      cta: yearlyCta,
      features: isTr
        ? ['Growth\'daki her şey', 'Sınırsız şube', 'API & Webhook erişimi', '7/24 öncelikli destek', 'Özel SLA']
        : ['Everything in Growth', 'Unlimited locations', 'API & Webhook access', '24/7 priority support', 'Dedicated SLA'],
    },
  ];

  const formatPrice = (value: number) => {
    if (value === 0) return isTr ? '₺0' : '$0';
    if (isTr) return `₺${value.toLocaleString('tr-TR')}`;
    const usd = Math.round(value / 30);
    return `$${usd}`;
  };

  return (
    <div>
      {/* Monthly/Yearly pill toggle */}
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

      {/* 3 plan cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
        {plans.map((p) => {
          const price = billing === 'monthly' ? p.monthly : p.yearly;
          const isDark = p.featured;

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
                <h2
                  className={`text-[22px] font-medium tracking-[-0.02em] ${isDark ? 'text-white' : 'text-[#0A0A0A]'}`}
                >
                  {p.name}
                </h2>
                <p className={`mt-2 text-[13px] leading-snug ${isDark ? 'text-white/70' : 'text-[#525252]'}`}>
                  {p.desc}
                </p>
              </div>

              <div className={`mb-8 border-b pb-8 ${isDark ? 'border-white/10' : 'border-[#EDEDED]'}`}>
                <div className="flex items-baseline gap-1">
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
                {billing === 'yearly' && p.monthly > 0 && (
                  <div className={`mt-2 flex items-center gap-2 text-[12px] ${isDark ? 'text-white/60' : 'text-[#525252]'}`}>
                    <span className={isDark ? 'text-white/40 line-through' : 'text-[#A3A3A3] line-through'}>
                      {formatPrice(p.monthly)}
                      {monthlyPeriod}
                    </span>
                    <span>·</span>
                    <span>
                      {isTr
                        ? `₺${(p.yearly * 12).toLocaleString('tr-TR')}/yıl`
                        : `$${Math.round((p.yearly * 12) / 30)}/year`}
                    </span>
                  </div>
                )}
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {p.features.map((feat) => (
                  <li
                    key={feat}
                    className={`flex items-start gap-3 text-[14px] font-medium ${isDark ? 'text-white' : 'text-[#0A0A0A]'}`}
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

              <Link
                href={`${base}/auth/register`}
                className={`block min-h-[48px] w-full rounded-full py-3.5 text-center text-[14px] font-medium transition-colors ${
                  isDark
                    ? 'bg-[#C6F24E] text-[#0A0A0A] hover:bg-[#A8D62E]'
                    : p.id === 'scale'
                      ? 'bg-[#0A0A0A] text-white hover:bg-[#1A1A1A]'
                      : 'border border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white'
                }`}
              >
                {p.cta}
              </Link>
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
