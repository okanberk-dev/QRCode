import type { Metadata } from 'next';
import { CheckCircle2, ArrowRight, Star } from 'lucide-react';
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
      languages: { 'tr': 'https://buaze.com/tr/pricing', 'en': 'https://buaze.com/en/pricing' },
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

  const testimonials = [
    {
      text: locale === 'tr'
        ? '"Fiyat-performans açısından piyasanın en iyi çözümü. İlk ayda kendini amorti etti."'
        : '"Best value for money on the market. It paid for itself in the first month."',
      author: locale === 'tr' ? 'Mert A. — İstanbul' : 'James K. — London'
    },
    {
      text: locale === 'tr'
        ? '"14 günlük deneme bizi ikna etmeye yetti. Hemen yıllık plana geçtik."'
        : '"The 14-day trial convinced us immediately. We switched to the annual plan right away."',
      author: locale === 'tr' ? 'Selin B. — Ankara' : 'Maria L. — Berlin'
    },
  ];

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-[#1f1e1d] font-sans pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* Header */}
      <section className="pt-16 sm:pt-20 pb-14 px-5 sm:px-8 bg-[#F7F4F0]">
        <div className="max-w-[1200px] mx-auto text-center max-w-[640px] mx-auto">
          <p className="text-[13px] font-semibold text-[#FDBF1D] uppercase tracking-widest mb-4">
            {locale === 'tr' ? 'Fiyatlandırma' : 'Pricing'}
          </p>
          <h1 className="text-[36px] sm:text-[48px] font-extrabold leading-[1.1] tracking-[-0.02em] text-[#1f1e1d] mb-4">
            {t.pricing_title}
          </h1>
          <p className="text-[15px] text-[#6b6760] leading-relaxed max-w-[480px] mx-auto">
            {t.pricing_subtitle}
          </p>
          <p className="text-[12px] text-[#ada89f] mt-5">
            {locale === 'tr' ? '14 Gün Ücretsiz Deneme • Kredi Kartı Gerekmez • İstediğinizde İptal Edin' : '14 Day Free Trial • No Credit Card Required • Cancel Anytime'}
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-14 sm:py-20 px-5 sm:px-8">
        <div className="max-w-[900px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">

            {/* Monthly Plan */}
            <div className="bg-white p-8 sm:p-10 rounded-xl border border-[#e8e4de] hover:border-[#FDBF1D]/40 transition-all flex flex-col group">
              <div className="mb-6">
                <h2 className="text-[19px] font-extrabold mb-1">{t.pricing_monthly_title}</h2>
                <p className="text-[13px] text-[#6b6760]">{t.pricing_monthly_desc}</p>
              </div>
              <div className="mb-8 pb-8 border-b border-[#e8e4de]">
                <div className="flex items-end gap-1">
                  <span className="text-[46px] sm:text-[52px] font-extrabold tracking-tighter leading-none">{t.pricing_monthly_price}</span>
                  <span className="text-[#ada89f] font-medium text-[14px] mb-2">{t.pricing_monthly_period}</span>
                </div>
              </div>
              <ul className="space-y-3.5 mb-9 flex-1">
                {[t.pricing_feature_unlimited_qr, t.pricing_feature_feedback, t.pricing_feature_panel, t.pricing_feature_mobile].map(feat => (
                  <li key={feat} className="flex items-start gap-2.5 text-[13px] sm:text-[14px] text-[#1f1e1d]">
                    <CheckCircle2 size={16} className="text-[#ada89f] flex-shrink-0 mt-0.5" strokeWidth={2} /> {feat}
                  </li>
                ))}
              </ul>
              <Link
                href={`${base}/auth/register`}
                className="block w-full text-center py-3.5 bg-[#F7F4F0] hover:bg-[#e8e4de] text-[#1f1e1d] font-semibold text-[14px] rounded-lg transition-all active:scale-[0.98]"
              >
                {t.pricing_monthly_cta}
              </Link>
            </div>

            {/* Yearly Plan — Featured */}
            <div className="bg-[#1f1e1d] p-8 sm:p-10 rounded-xl border border-[#3d3a36] relative md:scale-[1.02] flex flex-col text-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)]">
              {/* Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-[#FDBF1D] text-[#1f1e1d] px-5 py-1.5 rounded-full font-bold text-[11px] uppercase tracking-widest whitespace-nowrap shadow-md">
                  {t.pricing_yearly_badge}
                </span>
              </div>
              <div className="mb-6 pt-2">
                <h2 className="text-[19px] font-extrabold mb-1">{t.pricing_yearly_title}</h2>
                <p className="text-[13px] text-[#6b6760]">{t.pricing_yearly_desc}</p>
              </div>
              <div className="mb-8 pb-8 border-b border-[#3d3a36]">
                <div className="flex items-end gap-1">
                  <span className="text-[46px] sm:text-[52px] font-extrabold tracking-tighter leading-none">{t.pricing_yearly_price}</span>
                  <span className="text-[#6b6760] font-medium text-[14px] mb-2">{t.pricing_yearly_period}</span>
                </div>
              </div>
              <ul className="space-y-3.5 mb-9 flex-1">
                {[t.pricing_feature_all, t.pricing_feature_free_months, t.pricing_feature_priority, t.pricing_feature_google].map(feat => (
                  <li key={feat} className="flex items-start gap-2.5 text-[13px] sm:text-[14px] text-[#ada89f]">
                    <CheckCircle2 size={16} className="text-[#FDBF1D] flex-shrink-0 mt-0.5" strokeWidth={2} /> {feat}
                  </li>
                ))}
              </ul>
              <Link
                href={`${base}/auth/register`}
                className="block w-full text-center py-3.5 bg-[#FDBF1D] hover:bg-[#EAB308] text-[#1f1e1d] font-semibold text-[14px] rounded-lg transition-all active:scale-[0.97] shadow-sm"
              >
                {t.pricing_yearly_cta}
              </Link>
            </div>

          </div>

          {/* Trust line */}
          <p className="text-center text-[12px] text-[#ada89f] mt-7">
            {locale === 'tr'
              ? '🔒 Güvenli ödeme • İstediğinizde iptal edin • 14 gün ücretsiz deneme'
              : '🔒 Secure payment • Cancel anytime • 14-day free trial'}
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 sm:py-16 px-5 sm:px-8 bg-[#F7F4F0]">
        <div className="max-w-[900px] mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white p-6 sm:p-8 rounded-xl border border-[#e8e4de]">
              <div className="flex gap-0.5 mb-4">
                {[1,2,3,4,5].map(s => <Star key={s} size={14} className="fill-[#FDBF1D] text-[#FDBF1D]" />)}
              </div>
              <p className="text-[14px] text-[#1f1e1d] leading-relaxed mb-4">{t.text}</p>
              <span className="text-[12px] font-semibold text-[#ada89f]">{t.author}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <div className="bg-[#FCFBF7] border-t border-[#e8e4de]">
        <PricingFaq faqs={faqs} title={t.faq_title} subtitle={t.faq_subtitle} />
      </div>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
