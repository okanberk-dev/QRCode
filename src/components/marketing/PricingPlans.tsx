'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check } from 'lucide-react';
import type { PublicPlan } from '@/lib/subscription-plans';

interface Props {
  locale: 'tr' | 'en';
  plans: PublicPlan[];
}

type Billing = 'monthly' | 'yearly';

const COPY = {
  tr: {
    heading: 'Plan seçenekleri',
    billingLabel: 'Ödeme dönemi',
    monthly: 'Aylık',
    yearly: 'Yıllık',
    perMonth: '/ay',
    free: 'Ücretsiz',
    recommended: 'ÖNERİLEN',
    trial: '14 gün ücretsiz deneyin',
    subscribe: 'Kartla öde',
    yearlyContact: 'Yıllık ödeme için bize yazın',
    contactFallback: 'Bize yazın',
    flatBadge: (n: number) => `%${n} indirim`,
    upToBadge: (n: number) => `En fazla %${n} indirim`,
    listPrice: 'Liste fiyatı',
    yearlyTotal: (v: string) => `Yıllık toplam ${v}`,
    yearlySaving: (n: number) => `aylık ödemeye göre %${n} daha az`,
  },
  en: {
    heading: 'Plan options',
    billingLabel: 'Billing period',
    monthly: 'Monthly',
    yearly: 'Yearly',
    perMonth: '/mo',
    free: 'Free',
    recommended: 'RECOMMENDED',
    trial: 'Start 14-day free trial',
    subscribe: 'Pay by card',
    yearlyContact: 'Contact us for yearly billing',
    contactFallback: 'Contact us',
    flatBadge: (n: number) => `${n}% off`,
    upToBadge: (n: number) => `Up to ${n}% off`,
    listPrice: 'List price',
    yearlyTotal: (v: string) => `${v} billed per year`,
    yearlySaving: (n: number) => `${n}% less than paying monthly`,
  },
} as const;

/** Monthly price the customer pays today (admin discount applied). */
function effectiveMonthly(p: PublicPlan): number {
  return p.discount.active && p.discount.discountedMonthly < p.priceMonthly
    ? p.discount.discountedMonthly
    : p.priceMonthly;
}

/**
 * Yearly saving in percent versus paying the effective monthly price for 12
 * months, computed from the plan data (the admin may set a custom yearly
 * price, so a hard-coded "20%" could be wrong). 0 = no saving.
 */
function yearlySavingPct(p: PublicPlan): number {
  const monthly = effectiveMonthly(p);
  if (monthly <= 0 || p.priceYearlyTotal <= 0) return 0;
  const pct = Math.round((1 - p.priceYearlyTotal / (monthly * 12)) * 100);
  return pct > 0 && pct < 100 ? pct : 0;
}

/** True when the admin-configured button points at sign-up (the free trial). */
function isTrialHref(href: string): boolean {
  return !href || /(^|\/)auth\/register(?:[/?#]|$)/.test(href);
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}

/**
 * Pricing cards — plans, prices, descriptions and bullets come from the
 * SubscriptionPlan table (admin /admin/plans). Prices are USD in both
 * languages (CLAUDE.md §15.2). Each card keeps the two paths apart:
 *   • primary  → free trial (sign-up, no card)
 *   • secondary → card checkout via PayNKolay (TRY) for the selected period, or — on the yearly
 *     tab, where there is no self-serve checkout — a contact link.
 */
function formatTry(value: number, locale: 'tr' | 'en'): string {
  return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

export default function PricingPlans({ locale, plans }: Props) {
  const copy = COPY[locale];
  const base = `/${locale}`;
  const [billing, setBilling] = useState<Billing>('monthly');

  const savings = plans.map(yearlySavingPct).filter((n) => n > 0);
  const maxSaving = savings.length > 0 ? Math.max(...savings) : 0;
  const uniformSaving = savings.length > 0 && savings.every((n) => n === savings[0]);
  const toggleBadge =
    maxSaving > 0 ? (uniformSaving ? copy.flatBadge(maxSaving) : copy.upToBadge(maxSaving)) : null;

  const gridCols =
    plans.length >= 4
      ? 'sm:grid-cols-2 xl:grid-cols-4'
      : plans.length === 3
        ? 'md:grid-cols-2 lg:grid-cols-3'
        : plans.length === 2
          ? 'mx-auto max-w-[880px] md:grid-cols-2'
          : 'mx-auto max-w-[460px]';

  const segment = (active: boolean) =>
    `inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
      active ? 'bg-[#0A0A0A] text-white' : 'text-[#525252] hover:text-[#0A0A0A]'
    }`;

  return (
    <div>
      <h2 className="sr-only">{copy.heading}</h2>

      <div className="mb-10 flex justify-center">
        <div
          role="group"
          aria-label={copy.billingLabel}
          className="inline-flex items-center gap-1 rounded-full border border-[#EDEDED] bg-[#FAFAFA] p-1"
        >
          <button
            type="button"
            aria-pressed={billing === 'monthly'}
            onClick={() => setBilling('monthly')}
            className={segment(billing === 'monthly')}
          >
            {copy.monthly}
          </button>
          <button
            type="button"
            aria-pressed={billing === 'yearly'}
            onClick={() => setBilling('yearly')}
            className={segment(billing === 'yearly')}
          >
            {copy.yearly}
            {toggleBadge ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                  billing === 'yearly' ? 'bg-[#C6F24E] text-[#0A0A0A]' : 'bg-[#EAF9B8] text-[#0A0A0A]'
                }`}
              >
                {toggleBadge}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-5 lg:gap-6 ${gridCols}`}>
        {plans.map((p) => {
          const monthly = effectiveMonthly(p);
          const hasMonthlyDiscount = monthly < p.priceMonthly;
          const saving = yearlySavingPct(p);
          const price = billing === 'monthly' ? monthly : p.priceYearly;
          const dark = p.isFeatured;

          const trialPrimary = isTrialHref(p.buttonHref);
          const primaryHref = trialPrimary
            ? `${base}/auth/register`
            : p.buttonHref.startsWith('http')
              ? p.buttonHref
              : `${base}${p.buttonHref.startsWith('/') ? '' : '/'}${p.buttonHref}`;
          const primaryLabel = trialPrimary ? copy.trial : p.buttonText || copy.contactFallback;
          // Card payment (PayNKolay, TRY) for the selected period, when set up.
          const checkoutTry =
            p.paymentProvider === 'paynkolay' && p.checkout
              ? billing === 'yearly'
                ? p.checkout.yearlyTry
                : p.checkout.monthlyTry
              : null;
          const checkoutReady = checkoutTry != null && checkoutTry > 0;

          const muted = dark ? 'text-white/70' : 'text-[#525252]';

          return (
            <article
              key={p.id}
              aria-labelledby={`plan-${p.id}`}
              className={`relative flex flex-col rounded-[20px] p-6 sm:p-8 ${
                dark
                  ? 'mt-2 bg-[#0A0A0A] pt-9 text-white sm:pt-10 md:mt-0 md:pt-8'
                  : 'border border-[#EDEDED] bg-white text-[#0A0A0A]'
              }`}
            >
              {dark ? (
                <span className="pulse-eyebrow absolute -top-3 left-6 rounded-full bg-[#C6F24E] px-3 py-1.5 text-[#0A0A0A] sm:left-8">
                  {copy.recommended}
                </span>
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <h3 id={`plan-${p.id}`} className={`text-[24px] leading-[1.15] ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>
                  {p.name}
                </h3>
                {billing === 'monthly' && hasMonthlyDiscount && p.discount.label ? (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                      dark ? 'bg-[#C6F24E] text-[#0A0A0A]' : 'bg-[#EAF9B8] text-[#0A0A0A]'
                    }`}
                  >
                    {p.discount.label}
                  </span>
                ) : null}
              </div>
              {/* Two-line slot from md up so prices line up across cards. */}
              {p.description ? (
                <p className={`mt-2 text-[15px] leading-[1.55] md:min-h-[3.1em] ${muted}`}>{p.description}</p>
              ) : null}

              <div className={`mt-6 border-b pb-6 ${dark ? 'border-white/10' : 'border-[#EDEDED]'}`}>
                <p className="flex items-baseline gap-1.5">
                  <span
                    className={`bz-h-tight text-[44px] leading-none tabular-nums sm:text-[52px] ${
                      dark ? 'text-[#C6F24E]' : 'text-[#0A0A0A]'
                    }`}
                  >
                    {price === 0 ? copy.free : formatUsd(price)}
                  </span>
                  {price > 0 ? <span className={`text-[15px] ${muted}`}>{copy.perMonth}</span> : null}
                </p>
                {billing === 'monthly' && hasMonthlyDiscount ? (
                  <p className={`mt-2 text-[13px] ${muted}`}>
                    {copy.listPrice}:{' '}
                    <span className="line-through">
                      {formatUsd(p.priceMonthly)}
                      {copy.perMonth}
                    </span>
                  </p>
                ) : null}
                {billing === 'yearly' && p.priceYearlyTotal > 0 ? (
                  <p className={`mt-2 text-[13px] leading-[1.5] ${muted}`}>
                    {copy.yearlyTotal(formatUsd(p.priceYearlyTotal))}
                    {saving > 0 ? ` · ${copy.yearlySaving(saving)}` : ''}
                  </p>
                ) : null}
              </div>

              {p.features.length > 0 ? (
                <ul className="mt-6 flex-1 space-y-3">
                  {p.features.map((feat, i) => (
                    <li key={`${p.id}-${i}`} className="flex items-start gap-3 text-[15px] leading-[1.5]">
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          dark ? 'bg-[#C6F24E]' : 'bg-[#EAF9B8]'
                        }`}
                      >
                        <Check size={12} className="text-[#0A0A0A]" strokeWidth={2.5} />
                      </span>
                      <span className={dark ? 'text-white' : 'text-[#0A0A0A]'}>{feat}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex-1" />
              )}

              <div className="mt-8 space-y-3">
                <Link
                  href={primaryHref}
                  rel={trialPrimary ? 'nofollow' : undefined}
                  className={`flex min-h-[48px] w-full items-center justify-center rounded-full px-6 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
                    dark
                      ? 'bg-[#C6F24E] text-[#0A0A0A] hover:bg-[#A8D62E] focus-visible:ring-offset-[#0A0A0A]'
                      : 'bg-[#0A0A0A] text-white hover:bg-[#1A1A1A]'
                  }`}
                >
                  {primaryLabel}
                </Link>
                {checkoutReady ? (
                  <a
                    href={`/api/billing/paynkolay/checkout?planId=${encodeURIComponent(p.id)}&cycle=${billing}&locale=${locale}`}
                    rel="nofollow"
                    className={`flex min-h-[44px] w-full items-center justify-center rounded-full text-[14px] font-medium underline decoration-2 underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] ${
                      dark
                        ? 'text-white decoration-[#C6F24E] hover:text-[#C6F24E]'
                        : 'text-[#0A0A0A] decoration-[#C6F24E] hover:decoration-[#0A0A0A]'
                    }`}
                  >
                    {copy.subscribe} · {formatTry(checkoutTry as number, locale)}
                  </a>
                ) : null}
                {billing === 'yearly' && price > 0 ? (
                  <Link
                    href={`${base}/contact`}
                    className={`flex min-h-[44px] w-full items-center justify-center rounded-full text-[14px] font-medium underline decoration-2 underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] ${
                      dark
                        ? 'text-white decoration-[#C6F24E] hover:text-[#C6F24E]'
                        : 'text-[#0A0A0A] decoration-[#C6F24E] hover:decoration-[#0A0A0A]'
                    }`}
                  >
                    {copy.yearlyContact}
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
