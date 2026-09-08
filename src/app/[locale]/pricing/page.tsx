import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { jsonLdString } from '@/lib/seo/json-ld';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PricingFaq from '@/components/marketing/PricingFaq';
import PricingPlans from '@/components/marketing/PricingPlans';
import { getActivePlans } from '@/lib/subscription-plans';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const title = isTr ? 'Fiyatlandırma | Buaze — İtibar Yönetimi Planları' : 'Pricing | Buaze — Reputation Management Plans';
  const description = isTr
    ? 'Aylık ve yıllık planları karşılaştırın, işletmeniz için en uygun QR tabanlı itibar yönetimi çözümünü seçin. 14 gün ücretsiz deneme, kredi kartı gerekmez.'
    : 'Compare monthly and annual plans and choose the best QR-based reputation management solution. 14-day free trial, no credit card required.';
  return {
    title: { absolute: title },
    description,
    keywords: isTr
      ? ['buaze fiyatlandırma', 'itibar yönetimi plan fiyatı', 'QR yorum sistemi ücret', 'google yorum artırma platform fiyatı', 'restoran itibar yazılım']
      : ['buaze pricing', 'reputation management plan cost', 'QR review system pricing', 'restaurant reputation software price'],
    openGraph: {
      title,
      description,
      url: `https://www.buaze.com/${locale}/pricing`,
      images: [{ url: isTr ? '/images/open-graph-tr.png' : '/images/open-graph-en.png', width: 1200, height: 630, alt: title }],
    },
    alternates: {
      canonical: `https://www.buaze.com/${locale}/pricing`,
      languages: { tr: 'https://www.buaze.com/tr/pricing', en: 'https://www.buaze.com/en/pricing', 'x-default': 'https://www.buaze.com/en/pricing' },
    },
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  // DB-driven plans — admin/plans manages content. Empty list falls back
  // to a friendly empty-state inside PricingPlans.
  const plans = await getActivePlans(locale).catch(() => []);

  const faqs = [
    { q: t.faq_q1, a: t.faq_a1 },
    { q: t.faq_q2, a: t.faq_a2 },
    { q: t.faq_q3, a: t.faq_a3 },
    { q: t.faq_q4, a: t.faq_a4 },
    { q: t.faq_q5, a: t.faq_a5 },
    { q: t.faq_q6, a: t.faq_a6 },
  ];

  const priceCurrency = isTr ? 'TRY' : 'USD';
  // DB-driven JSON-LD offers — prices reflect the same priceMonthly used in the
  // visible cards (post-discount when applicable, pre-yearly toggle).
  const planOffers = plans.map((p) => {
    const monthly = p.discount.active ? p.discount.discountedMonthly : p.priceMonthly;
    return {
      '@type': 'Offer',
      name: p.name,
      price: String(monthly),
      priceCurrency,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: String(monthly),
        priceCurrency,
        billingDuration: 'P1M',
        unitCode: 'MON',
      },
      availability: 'https://schema.org/InStock',
      url: `https://www.buaze.com/${locale}/pricing`,
    };
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Buaze',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, iOS, Android',
        description: t.pricing_subtitle,
        url: `https://www.buaze.com/${locale}/pricing`,
        // No aggregateRating — must be backed by verifiable on-page reviews.
        offers: planOffers,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: isTr ? 'Anasayfa' : 'Home',
            item: `https://www.buaze.com/${locale}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: isTr ? 'Fiyatlandırma' : 'Pricing',
            item: `https://www.buaze.com/${locale}/pricing`,
          },
        ],
      },
    ],
  };


  const trustTicks = isTr
    ? ['14 gün ücretsiz', 'İstediğinde iptal', 'Kredi kartı gerekmez']
    : ['14 days free', 'Cancel anytime', 'No card required'];

  const comparisonRows: { name: string; m: boolean; y: boolean }[] = [
    { name: isTr ? 'Dinamik QR kod teknolojisi' : 'Dynamic QR technology', m: true, y: true },
    { name: isTr ? 'Geri bildirim yönetimi' : 'Feedback management', m: true, y: true },
    { name: isTr ? 'Panel üzerinden yanıtlama' : 'Dashboard responses', m: true, y: true },
    { name: isTr ? 'İtibar yayınlama' : 'Reputation distribution', m: true, y: true },
    { name: isTr ? '7/24 öncelikli destek' : '24/7 priority support', m: false, y: true },
    { name: isTr ? 'Kişiselleştirilmiş tasarım' : 'White-label design', m: false, y: true },
    { name: isTr ? 'Çoklu şube yönetimi' : 'Multi-location management', m: false, y: true },
  ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] lg:pt-[64px] selection:bg-[#C6F24E]/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-5 sm:px-10 pt-[60px] sm:pt-24 pb-14 sm:pb-20">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.5]"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="pricingGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDEDED" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pricingGrid)" />
        </svg>
        <div className="relative max-w-[900px] mx-auto text-center">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'Fiyatlar' : 'Pricing'}
          </span>
          <h1 className="mt-5 text-[38px] sm:text-[64px] md:text-[52px] lg:text-[72px] font-medium leading-[0.95] sm:leading-[0.98] tracking-[-0.035em] text-[#0A0A0A]">
            {isTr ? (
              <>
                Basit. Şeffaf.
                <br />
                Gizli ücret yok.
              </>
            ) : (
              <>
                Simple. Transparent.
                <br />
                No hidden fees.
              </>
            )}
          </h1>
          <p className="mt-6 text-[17px] sm:text-[18px] text-[#525252] leading-[1.55] max-w-[560px] mx-auto">
            {isTr
              ? 'Her plan 14 gün ücretsiz. Kredi kartı istenmez. İstediğin zaman yükselt, düşür ya da iptal et.'
              : 'Every plan is free for 14 days. No credit card required. Upgrade, downgrade or cancel anytime.'}
          </p>
          <ul className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {trustTicks.map((tick) => (
              <li key={tick} className="flex items-center gap-2 text-[14px] text-[#525252]">
                <span className="w-4 h-4 rounded-full bg-[#C6F24E] flex items-center justify-center text-[#0A0A0A] text-[10px] font-bold">
                  ✓
                </span>
                {tick}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── Pricing Cards (client component with monthly/yearly toggle) ─── */}
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-28">
        <div className="max-w-[1200px] mx-auto">
          <PricingPlans
            locale={locale}
            monthlyCta={t.pricing_monthly_cta}
            yearlyCta={t.pricing_yearly_cta}
            monthlyPeriod={t.pricing_monthly_period}
            plans={plans}
          />
        </div>
      </section>

      {/* ─── Platform Integrations ─── */}
      <section className="px-5 sm:px-10 py-12 sm:py-16 border-b border-[#EDEDED]">
        <div className="max-w-[1200px] mx-auto text-center">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'Global platformlarla entegre' : 'Integrated with global platforms'}
          </span>
          <div className="mt-8 flex flex-wrap justify-center items-center gap-x-10 sm:gap-x-16 gap-y-5">
            {['Google', 'TripAdvisor', 'Yelp', 'Trustpilot', 'Zomato'].map((site) => (
              <span
                key={site}
                className="text-[18px] sm:text-[22px] font-semibold tracking-[0.06em] text-[#A3A3A3]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {site}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Comparison Table ─── */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[960px] mx-auto">
          <div className="text-center mb-12">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Detaylı karşılaştırma' : 'Deep comparison'}
            </span>
            <h2 className="mt-4 text-[26px] sm:text-[40px] lg:text-[48px] font-medium leading-[1.05] sm:leading-[1.02] tracking-[-0.035em] text-[#0A0A0A]">
              {isTr ? 'Plan özelliklerini yan yana görün.' : 'See plan features side by side.'}
            </h2>
          </div>

          <div className="rounded-3xl border border-[#EDEDED] bg-white overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-[#EDEDED]">
                    <th className="p-5 pulse-eyebrow text-[#737373]">{isTr ? 'Özellik' : 'Feature'}</th>
                    <th className="p-5 pulse-eyebrow text-[#737373] text-center">{isTr ? 'Aylık' : 'Monthly'}</th>
                    <th className="p-5 pulse-eyebrow text-[#0A0A0A] text-center">{isTr ? 'Yıllık' : 'Yearly'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDED]">
                  {comparisonRows.map((row, i) => (
                    <tr key={i}>
                      <td className="p-5 text-[14px] font-medium text-[#0A0A0A]">{row.name}</td>
                      <td className="p-5 text-center">
                        {row.m ? (
                          <span className="inline-flex w-7 h-7 rounded-full bg-[#EAF9B8] items-center justify-center">
                            <Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} />
                          </span>
                        ) : (
                          <span className="text-[#A3A3A3]">—</span>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        {row.y ? (
                          <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center">
                            <Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} />
                          </span>
                        ) : (
                          <span className="text-[#A3A3A3]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials section removed — the two quotes were attributed to invented
          people ("Mert A. · İstanbul", "Selin B. · Ankara" / "James K. · London",
          "Emma W. · New York") and paired with an ROI claim ("paid for itself in the
          first month"). Named, unverifiable testimonials are FTC + Reklam Kurulu
          deceptive-advertising risk (CLAUDE.md §35.8 / §35.10). Restore only with
          real, consented customers. */}

      {/* ─── FAQ ─── */}
      <PricingFaq faqs={faqs} title={t.faq_title} subtitle={t.faq_subtitle} />

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
