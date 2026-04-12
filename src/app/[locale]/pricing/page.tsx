import type { Metadata } from 'next';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import Link from 'next/link';
import PricingFaq from '@/components/marketing/PricingFaq';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Fiyatlandırma — Buaze' : 'Pricing — Buaze',
    description: locale === 'tr'
      ? 'Buaze itibar yönetim platformunun şeffaf fiyatlandırması. 14 gün ücretsiz deneyin, kredi kartı gerekmez.'
      : 'Transparent pricing for Buaze reputation management platform. Try free for 14 days, no credit card required.',
    alternates: {
      canonical: `https://buaze.com/${locale}/pricing`,
      languages: {
        'tr': 'https://buaze.com/tr/pricing',
        'en': 'https://buaze.com/en/pricing',
      },
    },
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;

  const faqs = [
    { q: t.faq_q1, a: t.faq_a1 },
    { q: t.faq_q2, a: t.faq_a2 },
    { q: t.faq_q3, a: t.faq_a3 },
    { q: t.faq_q4, a: t.faq_a4 },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };

  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MarketingNavbar locale={locale} t={t} />

      <section className="pt-48 pb-24 px-6 bg-[#F9FAFB]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h1 className="text-5xl sm:text-7xl font-black tracking-tight">{t.pricing_title}</h1>
            <p className="text-xl text-gray-500 font-bold max-w-2xl mx-auto leading-relaxed">
              {t.pricing_subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Monthly */}
            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 hover:border-[#79C5D1] transition-all group">
              <h2 className="text-2xl font-black mb-2">{t.pricing_monthly_title}</h2>
              <p className="text-gray-500 font-bold text-sm mb-8">{t.pricing_monthly_desc}</p>
              <div className="mb-10">
                <span className="text-6xl font-black">{t.pricing_monthly_price}</span>
                <span className="text-gray-400 font-bold tracking-tighter ml-2">{t.pricing_monthly_period}</span>
              </div>
              <ul className="space-y-5 mb-12">
                {[t.pricing_feature_unlimited_qr, t.pricing_feature_feedback, t.pricing_feature_panel, t.pricing_feature_mobile].map(feat => (
                  <li key={feat} className="flex items-center gap-3 text-sm font-bold text-gray-600">
                    <CheckCircle2 size={18} className="text-[#79C5D1]" /> {feat}
                  </li>
                ))}
              </ul>
              <Link
                href={`${base}/auth/register`}
                className="block w-full text-center py-4 bg-[#111827] text-white font-black rounded-2xl hover:bg-black transition-all transform group-hover:scale-[1.02]"
              >
                {t.pricing_monthly_cta}
              </Link>
            </div>

            {/* Yearly */}
            <div className="bg-white p-10 rounded-[40px] shadow-2xl border-4 border-[#FDBF1D] relative scale-105">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FDBF1D] text-[#111827] px-6 py-2 rounded-full font-black text-xs uppercase italic tracking-widest shadow-lg whitespace-nowrap">
                {t.pricing_yearly_badge}
              </div>
              <h2 className="text-2xl font-black mb-2">{t.pricing_yearly_title}</h2>
              <p className="text-gray-500 font-bold text-sm mb-8">{t.pricing_yearly_desc}</p>
              <div className="mb-10">
                <span className="text-6xl font-black">{t.pricing_yearly_price}</span>
                <span className="text-gray-400 font-bold tracking-tighter ml-2">{t.pricing_yearly_period}</span>
              </div>
              <ul className="space-y-5 mb-12">
                {[t.pricing_feature_all, t.pricing_feature_free_months, t.pricing_feature_priority, t.pricing_feature_google].map(feat => (
                  <li key={feat} className="flex items-center gap-3 text-sm font-bold text-gray-600">
                    <CheckCircle2 size={18} className="text-[#FDBF1D]" /> {feat}
                  </li>
                ))}
              </ul>
              <Link
                href={`${base}/auth/register`}
                className="block w-full text-center py-4 bg-[#FDBF1D] text-[#111827] font-black rounded-2xl hover:bg-[#EAB308] transition-all"
              >
                {t.pricing_yearly_cta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <PricingFaq faqs={faqs} title={t.faq_title} subtitle={t.faq_subtitle} />

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
