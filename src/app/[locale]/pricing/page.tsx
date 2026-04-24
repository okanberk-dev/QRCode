import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PricingFaq from '@/components/marketing/PricingFaq';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { RoiCalculator } from '@/components/roi-calculator/RoiCalculator';

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
      url: `https://buaze.com/${locale}/pricing`,
    },
    alternates: {
      canonical: `https://buaze.com/${locale}/pricing`,
      languages: { tr: 'https://buaze.com/tr/pricing', en: 'https://buaze.com/en/pricing', 'x-default': 'https://buaze.com/en/pricing' },
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
  const base = `/${locale}`;
  const isTr = locale === 'tr';

  const faqs = [
    { q: t.faq_q1, a: t.faq_a1 },
    { q: t.faq_q2, a: t.faq_a2 },
    { q: t.faq_q3, a: t.faq_a3 },
    { q: t.faq_q4, a: t.faq_a4 },
    { q: t.faq_q5, a: t.faq_a5 },
    { q: t.faq_q6, a: t.faq_a6 },
  ];

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
        '@type': 'Product',
        name: 'Buaze Reputation Management',
        description: t.pricing_subtitle,
        offers: {
          '@type': 'Offer',
          price: isTr ? '500' : '10',
          priceCurrency: isTr ? 'TRY' : 'USD',
          availability: 'https://schema.org/InStock',
        },
      },
    ],
  };

  const testimonials = [
    {
      text: isTr
        ? 'Fiyat-performans açısından piyasanın en iyi çözümü. İlk ayda kendini amorti etti.'
        : 'Best value for money on the market. It paid for itself in the first month.',
      author: isTr ? 'Mert A.' : 'James K.',
      role: isTr ? 'İşletme sahibi · İstanbul' : 'Owner · London',
    },
    {
      text: isTr
        ? '14 günlük deneme bizi ikna etmeye yetti. Hemen yıllık plana geçtik.'
        : 'The 14-day trial convinced us immediately. We switched to the annual plan right away.',
      author: isTr ? 'Selin B.' : 'Emma W.',
      role: isTr ? 'Pazarlama · Ankara' : 'Marketing · New York',
    },
  ];

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
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] pt-[64px] selection:bg-[#C6F24E]/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-6 sm:px-10 pt-16 sm:pt-24 pb-14 sm:pb-20">
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
          <h1 className="mt-5 text-[40px] sm:text-[64px] lg:text-[72px] font-medium leading-[0.98] tracking-[-0.035em] text-[#0A0A0A]">
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

      {/* ─── Pricing Cards ─── */}
      <section className="px-6 sm:px-10 pb-20 sm:pb-28">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Starter */}
            <div className="bg-white p-8 lg:p-10 rounded-3xl border border-[#EDEDED] flex flex-col">
              <div className="mb-6">
                <h2 className="text-[22px] font-medium text-[#0A0A0A] tracking-[-0.02em] mb-2">
                  {isTr ? 'Başlangıç' : 'Starter'}
                </h2>
                <p className="text-[13px] text-[#525252] leading-snug">
                  {isTr ? 'Küçük işletmeler için ideal başlangıç.' : 'Ideal start for small businesses.'}
                </p>
              </div>
              <div className="mb-8 pb-8 border-b border-[#EDEDED]">
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-[40px] sm:text-[52px] font-medium leading-none text-[#0A0A0A] tracking-[-0.03em]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {isTr ? '₺500' : '$10'}
                  </span>
                  <span className="pulse-eyebrow text-[#737373]">{t.pricing_monthly_period}</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  t.pricing_feature_unlimited_qr,
                  t.pricing_feature_feedback,
                  isTr ? 'Akıllı filtreleme' : 'Smart filtering',
                  isTr ? 'E-posta desteği' : 'Email support',
                ].map((feat) => (
                  <li key={feat} className="flex items-start gap-3 text-[14px] text-[#0A0A0A] font-medium">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#EAF9B8] flex items-center justify-center shrink-0">
                      <Check size={12} className="text-[#0A0A0A]" strokeWidth={2.5} />
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>
              <Link
                href={`${base}/auth/register`}
                className="block w-full text-center py-3.5 border border-[#0A0A0A] text-[#0A0A0A] font-medium text-[14px] rounded-full hover:bg-[#0A0A0A] hover:text-white transition-colors"
              >
                {t.pricing_monthly_cta}
              </Link>
            </div>

            {/* Growth — featured */}
            <div className="bg-[#0A0A0A] p-8 lg:p-10 rounded-3xl relative md:scale-[1.03] flex flex-col text-white z-10 shadow-[0_20px_60px_rgba(10,10,10,0.15)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="pulse-eyebrow bg-[#C6F24E] text-[#0A0A0A] px-4 py-1.5 rounded-full whitespace-nowrap">
                  {isTr ? 'EN POPÜLER' : 'MOST POPULAR'}
                </span>
              </div>
              <div className="mb-6 pt-2">
                <h2 className="text-[22px] font-medium text-white tracking-[-0.02em] mb-2">
                  {isTr ? 'Büyüme' : 'Growth'}
                </h2>
                <p className="text-[13px] text-white/70 leading-snug">
                  {isTr ? 'Hızlı büyüyen ve çok şubeli işletmeler için.' : 'For fast-growing and multi-location businesses.'}
                </p>
              </div>
              <div className="mb-8 pb-8 border-b border-white/10">
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-[40px] sm:text-[52px] font-medium leading-none text-[#C6F24E] tracking-[-0.03em]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {isTr ? '₺1.200' : '$20'}
                  </span>
                  <span className="pulse-eyebrow text-white/60">{t.pricing_monthly_period}</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  isTr ? "Starter'daki her şey" : 'Everything in Starter',
                  isTr ? "Çoklu lokasyon (3'e kadar)" : 'Multi-location (up to 3)',
                  isTr ? 'Öncelikli destek' : 'Priority support',
                  isTr ? 'Gelişmiş analitik' : 'Advanced analytics',
                ].map((feat) => (
                  <li key={feat} className="flex items-start gap-3 text-[14px] text-white font-medium">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#C6F24E] flex items-center justify-center shrink-0">
                      <Check size={12} className="text-[#0A0A0A]" strokeWidth={2.5} />
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>
              <Link
                href={`${base}/auth/register`}
                className="block w-full text-center py-3.5 bg-[#C6F24E] text-[#0A0A0A] font-medium text-[14px] rounded-full hover:bg-[#A8D62E] transition-colors"
              >
                {t.pricing_monthly_cta}
              </Link>
            </div>

            {/* Annual Pro */}
            <div className="bg-white p-8 lg:p-10 rounded-3xl border border-[#EDEDED] flex flex-col">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-[22px] font-medium text-[#0A0A0A] tracking-[-0.02em]">
                    {isTr ? 'Yıllık Pro' : 'Annual Pro'}
                  </h2>
                  <span className="pulse-eyebrow bg-[#EAF9B8] text-[#0A0A0A] px-2 py-0.5 rounded-full">
                    {isTr ? '%17 TASARRUF' : '17% OFF'}
                  </span>
                </div>
                <p className="text-[13px] text-[#525252] leading-snug">
                  {isTr ? 'En iyi değer, tam kapasite yönetim.' : 'Best value, full capacity management.'}
                </p>
              </div>
              <div className="mb-8 pb-8 border-b border-[#EDEDED]">
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-[40px] sm:text-[52px] font-medium leading-none text-[#0A0A0A] tracking-[-0.03em]"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {isTr ? '₺416' : '$7.99'}
                    </span>
                    <span className="pulse-eyebrow text-[#737373]">{t.pricing_monthly_period}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[12px]">
                    <span className="text-[#A3A3A3] line-through">{isTr ? '₺500/ay' : '$10/mo'}</span>
                    <span className="text-[#525252]">·</span>
                    <span className="text-[#525252]">{isTr ? '₺5.000/yıl' : '$96/year'}</span>
                  </div>
                </div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  isTr ? 'Büyüme planındaki her şey' : 'Everything in Growth',
                  isTr ? 'Sınırsız şube' : 'Unlimited locations',
                  isTr ? '7/24 öncelikli destek' : '24/7 priority support',
                  isTr ? 'API erişimi' : 'API access',
                ].map((feat) => (
                  <li key={feat} className="flex items-start gap-3 text-[14px] text-[#0A0A0A] font-medium">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#EAF9B8] flex items-center justify-center shrink-0">
                      <Check size={12} className="text-[#0A0A0A]" strokeWidth={2.5} />
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>
              <Link
                href={`${base}/auth/register`}
                className="block w-full text-center py-3.5 bg-[#0A0A0A] text-white font-medium text-[14px] rounded-full hover:bg-[#1A1A1A] transition-colors"
              >
                {t.pricing_yearly_cta}
              </Link>
            </div>
          </div>

          <p className="pulse-eyebrow text-center text-[#737373] mt-10">
            {isTr ? 'GÜVENLİ ÖDEME · İSTEDİĞİNDE İPTAL · TAAHHÜTSÜZ' : 'SECURE PAYMENT · CANCEL ANYTIME · NO COMMITMENT'}
          </p>
        </div>
      </section>

      {/* ─── ROI Calculator ─── */}
      <section id="roi-calculator" className="bg-[#FAFAFA] border-y border-[#EDEDED] py-20 sm:py-28 px-6 sm:px-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 max-w-[720px] mx-auto">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Yatırım getirisi' : 'Return on investment'}
            </span>
            <h2 className="mt-4 text-[32px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em] text-[#0A0A0A]">
              {isTr ? 'Rakamlarla görün. Buaze size ne kazandırır?' : 'See the numbers. What Buaze delivers.'}
            </h2>
            <p className="mt-5 text-[16px] text-[#525252] leading-[1.6]">
              {isTr
                ? 'Kendi işletme verilerinizi girin; aylık ek müşteri, tahmini ek ciro ve amortisman süresini sektör benchmark\'ları üzerinden şeffafça görün.'
                : 'Enter your own business data and see your monthly new customers, estimated extra revenue and payback period against industry benchmarks.'}
            </p>
          </div>
          <RoiCalculator locale={locale} />
        </div>
      </section>

      {/* ─── Platform Integrations ─── */}
      <section className="px-6 sm:px-10 py-14 sm:py-16 border-b border-[#EDEDED]">
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
      <section className="px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[960px] mx-auto">
          <div className="text-center mb-12">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Detaylı karşılaştırma' : 'Deep comparison'}
            </span>
            <h2 className="mt-4 text-[32px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em] text-[#0A0A0A]">
              {isTr ? 'Plan özelliklerini yan yana görün.' : 'See plan features side by side.'}
            </h2>
          </div>

          <div className="rounded-3xl border border-[#EDEDED] bg-white overflow-hidden">
            <div className="overflow-x-auto">
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

      {/* ─── Testimonials ─── */}
      <section className="bg-[#FAFAFA] border-y border-[#EDEDED] px-6 sm:px-10 py-20 sm:py-24">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((ts, i) => (
            <div key={i} className="bg-white p-8 rounded-3xl border border-[#EDEDED]">
              <div className="flex gap-0.5 mb-5 text-[#C6F24E]">
                {[0, 1, 2, 3, 4].map((s) => (
                  <span key={s} className="text-[18px]">★</span>
                ))}
              </div>
              <p className="text-[17px] text-[#0A0A0A] leading-[1.55] mb-6">"{ts.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0A0A0A] text-[#C6F24E] rounded-full flex items-center justify-center text-[14px] font-semibold">
                  {ts.author.charAt(0)}
                </div>
                <div>
                  <div className="text-[14px] font-medium text-[#0A0A0A]">{ts.author}</div>
                  <div className="text-[12px] text-[#737373]">{ts.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <PricingFaq faqs={faqs} title={t.faq_title} subtitle={t.faq_subtitle} />

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
