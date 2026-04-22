import type { Metadata } from 'next';
import { CheckCircle2, Star } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PricingFaq from '@/components/marketing/PricingFaq';
import Link from 'next/link';
import { cookies } from 'next/headers';

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
  return {
    title: {
      absolute: locale === 'tr' ? 'Fiyatlandırma | Buaze' : 'Pricing | Buaze',
    },
    description: locale === 'tr'
      ? 'Aylık ve yıllık planları karşılaştırın, işletmeniz için en uygun itibar yönetimi çözümünü seçin.'
      : 'Compare monthly and annual plans, choose the best reputation management solution for your business.',
    openGraph: {
      title: locale === 'tr' ? 'Fiyatlandırma | Buaze' : 'Pricing | Buaze',
      description: locale === 'tr' ? 'Aylık ve yıllık planları karşılaştır...' : 'Compare monthly and annual plans...',
    },
    alternates: {
      canonical: `https://buaze.com/${locale}/pricing`,
      languages: { 'tr': 'https://buaze.com/tr/pricing', 'en': 'https://buaze.com/en/pricing' },
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

  const faqs = [
    { q: t.faq_q1, a: t.faq_a1 },
    { q: t.faq_q2, a: t.faq_a2 },
    { q: t.faq_q3, a: t.faq_a3 },
    { q: t.faq_q4, a: t.faq_a4 },
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
          price: locale === 'tr' ? '500' : '10',
          priceCurrency: locale === 'tr' ? 'TRY' : 'USD',
          availability: 'https://schema.org/InStock',
        }
      }
    ]
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
      author: locale === 'tr' ? 'Selin B. — Ankara' : 'Emma W. — New York'
    }
  ];

  return (
    <div className="min-h-screen bg-[#F5F4F1] text-[#0F2348] font-sans pt-[64px] selection:bg-[#FF9A14]/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Header ─── */}
      <section className="pt-20 sm:pt-32 pb-10 sm:pb-14 px-5 sm:px-8 bg-[#F5F4F1] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#FF9A14]/10 rounded-full blur-[120px] -translate-y-1/2 -translate-x-1/2" />
        <div className="max-w-[1200px] mx-auto text-center space-y-6 relative">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-white border-2 border-[#0F2348] rounded-full shadow-[3px_3px_0_0_#0F2348] sm:shadow-[4px_4px_0_0_#0F2348]">
             <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest">{locale === 'tr' ? 'ŞEFFAF FİYATLANDIRMA' : 'TRANSPARENT PRICING'}</span>
          </div>
          <h1 className="text-[34px] sm:text-[72px] font-black leading-[1.1] sm:leading-[0.95] tracking-tight sm:tracking-[-0.04em] text-[#0F2348] max-w-[800px] mx-auto">
            {t.pricing_title}
          </h1>
          <p className="text-[16px] sm:text-[20px] text-[#243554] font-bold leading-relaxed max-w-[560px] mx-auto">
            {t.pricing_subtitle}
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 pt-4">
             {['14 GÜN ÜCRETSİZ', 'İSTEDİĞİNDE İPTAL', 'KREDİ KARTI GEREKMEZ'].map(text => (
               <div key={text} className="flex items-center gap-2 bg-white/50 border-2 border-[#C9D0DB] px-3 sm:px-4 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black text-[#6B7B93] uppercase tracking-widest">
                  <CheckCircle2 size={12} className="text-[#10b981]" /> {text}
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing Cards (Enriched 3D) ─── */}
      <section className="py-16 sm:py-32 px-5 sm:px-8 relative">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 text-left">

            {/* Starter Plan */}
            <div className="bg-white p-8 sm:p-12 rounded-[32px] sm:rounded-[40px] border-[2.5px] sm:border-[3px] border-[#0F2348] shadow-[6px_8px_0_0_#0F2348] sm:shadow-[8px_10px_0_0_#0F2348] flex flex-col group transition-transform hover:-translate-y-2">
              <div className="mb-6 sm:mb-8">
                <h2 className="text-[20px] sm:text-[22px] font-black text-[#0F2348] uppercase tracking-tighter mb-2">{locale === 'tr' ? 'Başlangıç' : 'Starter'}</h2>
                <p className="text-[13px] sm:text-[14px] text-[#243554] font-bold leading-snug">{locale === 'tr' ? 'Küçük işletmeler için ideal başlangıç.' : 'Ideal start for small businesses.'}</p>
              </div>
              <div className="mb-8 sm:mb-10 pb-8 sm:pb-10 border-b-2 border-[#F5F4F1]">
                <div className="flex items-end gap-1">
                  <span className="text-[48px] sm:text-[64px] font-black tracking-tighter leading-none text-[#0F2348]">
                    {locale === 'tr' ? '₺500' : '$10'}
                  </span>
                  <span className="text-[#6B7B93] font-black text-[14px] sm:text-[16px] mb-2 uppercase tracking-widest">{t.pricing_monthly_period}</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 sm:mb-10 flex-1">
                {[t.pricing_feature_unlimited_qr, t.pricing_feature_feedback, locale === 'tr' ? 'Akıllı Filtreleme' : 'Smart Filtering', 'E-posta Desteği'].map(feat => (
                  <li key={feat} className="flex items-start gap-3 text-[14px] sm:text-[15px] text-[#0F2348] font-bold">
                    <CheckCircle2 size={18} className="text-[#6B7B93] flex-shrink-0 mt-0.5" strokeWidth={3} /> {feat}
                  </li>
                ))}
              </ul>
              <Link
                href={`${base}/auth/register`}
                className="block w-full text-center py-4 sm:py-5 bg-white border-[2.5px] sm:border-[3px] border-[#0F2348] text-[#0F2348] font-black text-[15px] uppercase tracking-widest rounded-2xl shadow-[0_5px_0_0_#0F2348] sm:shadow-[0_6px_0_0_#0F2348] active:translate-y-[5px] sm:active:translate-y-[6px] active:shadow-none transition-all"
              >
                {t.pricing_monthly_cta}
              </Link>
            </div>

            {/* Growth Plan (Featured) */}
            <div className="bg-[#0F2348] p-8 sm:p-12 rounded-[32px] sm:rounded-[40px] border-[3px] sm:border-[3.5px] border-[#0F2348] shadow-[10px_12px_0_0_#FF9A14] sm:shadow-[12px_14px_0_0_#FF9A14] relative md:scale-[1.05] flex flex-col text-white z-10 mt-4 md:mt-0">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                <span className="bg-[#FF9A14] text-[#0F2348] px-5 sm:px-6 py-1.5 sm:py-2 rounded-full font-black text-[10px] sm:text-[11px] uppercase tracking-[0.2em] whitespace-nowrap border-2 border-[#0F2348] shadow-[3px_3px_0_0_#FF9A14] sm:shadow-[4px_4px_0_0_#FF9A14]">
                   {locale === 'tr' ? 'EN POPÜLER' : 'MOST POPULAR'}
                </span>
              </div>
              <div className="mb-6 sm:mb-8 pt-4">
                <h2 className="text-[20px] sm:text-[22px] font-black text-white uppercase tracking-tighter mb-2">{locale === 'tr' ? 'Büyüme' : 'Growth'}</h2>
                <p className="text-[13px] sm:text-[14px] text-[#6B7B93] font-bold leading-snug">{locale === 'tr' ? 'Hızlı büyüyen ve çok şubeli işletmeler için.' : 'For fast-growing and multi-location businesses.'}</p>
              </div>
              <div className="mb-8 sm:mb-10 pb-8 sm:pb-10 border-b-2 border-white/10">
                <div className="flex items-end gap-1">
                  <span className="text-[48px] sm:text-[64px] font-black tracking-tighter leading-none text-[#FF9A14]">
                    {locale === 'tr' ? '₺1.200' : '$20'}
                  </span>
                  <span className="text-[#243554] font-black text-[14px] sm:text-[16px] mb-2 uppercase tracking-widest">{t.pricing_monthly_period}</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 sm:mb-10 flex-1">
                {[locale === 'tr' ? "Starter'daki Her Şey" : "Everything in Starter", locale === 'tr' ? "Çoklu Lokasyon (3'e kadar)" : "Multi-Location (up to 3)", locale === 'tr' ? 'Öncelikli Destek' : 'Priority Support', locale === 'tr' ? 'Gelişmiş Analitik' : 'Advanced Analytics'].map(feat => (
                  <li key={feat} className="flex items-start gap-3 text-[14px] sm:text-[15px] text-[#F5F4F1] font-bold">
                    <CheckCircle2 size={18} className="text-[#FF9A14] flex-shrink-0 mt-0.5" strokeWidth={3} /> {feat}
                  </li>
                ))}
              </ul>
              <Link
                href={`${base}/auth/register`}
                className="block w-full text-center py-4 sm:py-5 bg-[#FF9A14] border-[2.5px] sm:border-[3px] border-[#0F2348] text-[#0F2348] font-black text-[15px] uppercase tracking-widest rounded-2xl shadow-[0_5px_0_0_#FF9A14] sm:shadow-[0_6px_0_0_#FF9A14] active:translate-y-[5px] sm:active:translate-y-[6px] active:shadow-none transition-all"
              >
                {t.pricing_monthly_cta}
              </Link>
            </div>

            {/* Annual Pro Plan */}
            <div className="bg-[#F5F4F1] p-8 sm:p-12 rounded-[32px] sm:rounded-[40px] border-[2.5px] sm:border-[3px] border-[#0F2348] shadow-[6px_8px_0_0_#0F2348] sm:shadow-[8px_10px_0_0_#0F2348] flex flex-col group transition-transform hover:-translate-y-2 mt-4 md:mt-0">
              <div className="mb-6 sm:mb-8">
                <h2 className="text-[20px] sm:text-[22px] font-black text-[#0F2348] uppercase tracking-tighter mb-2">{locale === 'tr' ? 'Yıllık Pro' : 'Annual Pro'}</h2>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-[#10b981]/10 text-[#10b981] text-[9px] font-black px-2 py-0.5 rounded-full border border-[#10b981]/20 uppercase">
                    {locale === 'tr' ? '%17 TASARRUF' : '17% SAVINGS'}
                  </span>
                </div>
                <p className="text-[13px] sm:text-[14px] text-[#243554] font-bold leading-snug">{locale === 'tr' ? 'En iyi değer, tam kapasite yönetim.' : 'Best value, full capacity management.'}</p>
              </div>
              <div className="mb-8 sm:mb-10 pb-8 sm:pb-10 border-b-2 border-[#F5F4F1]">
                <div className="flex flex-col">
                   <div className="flex items-end gap-1">
                     <span className="text-[48px] sm:text-[64px] font-black tracking-tighter leading-none text-[#0F2348]">
                        {locale === 'tr' ? '₺416' : '$7.99'}
                     </span>
                     <span className="text-[#6B7B93] font-black text-[14px] sm:text-[16px] mb-2 uppercase tracking-widest">{t.pricing_monthly_period}</span>
                   </div>
                   <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] sm:text-[11px] text-[#6B7B93] line-through font-bold">
                        {locale === 'tr' ? '₺500/ay' : '$10/mo'}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-[#FF9A14] font-black">
                        {locale === 'tr' ? '₺5.000 / yıl' : '$96 / year'}
                      </p>
                      <span className="text-[9px] sm:text-[10px] text-[#10b981] font-bold">({locale === 'tr' ? '2 ay ücretsiz' : '2 months free'})</span>
                   </div>
                </div>
              </div>
              <ul className="space-y-4 mb-8 sm:mb-10 flex-1">
                {[locale === 'tr' ? 'Büyüme Planındaki Her Şey' : 'Everything in Growth', locale === 'tr' ? 'Sınırsız Şube' : 'Unlimited Locations', locale === 'tr' ? '7/24 Öncelikli Destek' : '24/7 Priority Support', 'API Erişimi'].map(feat => (
                  <li key={feat} className="flex items-start gap-3 text-[14px] sm:text-[15px] text-[#0F2348] font-bold">
                    <CheckCircle2 size={18} className="text-[#10b981] flex-shrink-0 mt-0.5" strokeWidth={3} /> {feat}
                  </li>
                ))}
              </ul>
              <Link
                href={`${base}/auth/register`}
                className="block w-full text-center py-4 sm:py-5 bg-[#0F2348] text-white border-[2.5px] sm:border-[3px] border-[#0F2348] font-black text-[15px] uppercase tracking-widest rounded-2xl shadow-[0_5px_0_0_#000] sm:shadow-[0_6px_0_0_#000] active:translate-y-[5px] sm:active:translate-y-[6px] active:shadow-none transition-all"
              >
                {t.pricing_yearly_cta}
              </Link>
            </div>

          </div>

          <p className="text-center text-[11px] sm:text-[13px] font-black text-[#6B7B93] mt-8 sm:mt-12 uppercase tracking-widest leading-relaxed">
            {locale === 'tr'
              ? '🔒 Güvenli Ödeme Altyapısı • İstediğinde İptal • Taahhütsüz Kullanım'
              : '🔒 Secure Infrastructure • Cancel Anytime • No Commitment'}
          </p>
        </div>
      </section>

      {/* ─── ROI Calculator ─── */}
      <section id="roi-calculator" className="py-20 sm:py-32 px-5 sm:px-8 bg-[#F5F4F1] border-t-[3px] sm:border-t-[4px] border-[#0F2348]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12 sm:mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-white border-2 border-[#0F2348] rounded-full shadow-[3px_3px_0_0_#0F2348]">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest">
                {locale === 'tr' ? 'YATIRIM GETİRİSİ' : 'RETURN ON INVESTMENT'}
              </span>
            </div>
            <h2 className="text-[30px] sm:text-[52px] font-black text-[#0F2348] tracking-tight leading-[1.1]">
              {locale === 'tr' ? 'Rakamlarla Görün: Buaze Size Ne Kazandırır?' : 'See It in Numbers: What Buaze Delivers'}
            </h2>
            <p className="text-[15px] sm:text-[18px] text-[#243554] font-bold max-w-[640px] mx-auto leading-relaxed">
              {locale === 'tr'
                ? 'Kendi işletme verilerinizi girin; aylık ek müşteri, tahmini ek ciro ve ne kadar sürede amorti edeceğinizi sektör benchmarks üzerinden şeffafça görün.'
                : 'Enter your own business data and see your monthly new customers, estimated extra revenue and payback period calculated transparently against industry benchmarks.'}
            </p>
          </div>
          <RoiCalculator locale={locale} />
        </div>
      </section>

      {/* ─── Trusted By (3D Logos) ─── */}
      <section className="py-16 sm:py-24 px-5 sm:px-8 bg-white border-y-[3px] sm:border-y-[4px] border-[#0F2348]">
        <div className="max-w-[1200px] mx-auto text-center">
          <p className="text-[10px] sm:text-[12px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[#6B7B93] mb-8 sm:mb-12">
            {locale === 'tr' ? 'GLOBAL PLATFORMLARLA ENTEGRE' : 'INTEGRATED WITH GLOBAL PLATFORMS'}
          </p>
          <div className="flex flex-wrap justify-center gap-x-12 sm:gap-x-16 lg:gap-x-24 gap-y-8 sm:gap-y-12 items-center opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
            {['Google', 'TripAdvisor', 'Yelp', 'Trustpilot', 'Zomato'].map(site => (
              <span key={site} className="text-[20px] sm:text-4xl font-black text-[#0F2348] tracking-tighter cursor-default select-none uppercase">
                {site}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Comparison Table (3D Styled) ─── */}
      <section className="py-20 sm:py-40 px-5 sm:px-8 bg-[#F5F4F1]">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-12 sm:mb-24 space-y-4">
            <h2 className="text-[30px] sm:text-[60px] font-black text-[#0F2348] tracking-tight leading-none">
              {locale === 'tr' ? 'Detaylı Karşılaştırma' : 'Deep Comparison'}
            </h2>
            <p className="text-[16px] sm:text-[20px] text-[#243554] font-bold">
              {locale === 'tr' ? 'Doğru yatırımı yaptığınızdan emin olun.' : 'Make sure you make the right investment.'}
            </p>
          </div>

          <div className="rounded-[32px] sm:rounded-[40px] border-[3px] sm:border-[4px] border-[#0F2348] shadow-[8px_10px_0_0_#FF9A14] sm:shadow-[15px_20px_0_0_#FF9A14] bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-0">
                <thead>
                  <tr className="bg-[#0F2348] text-white">
                    <th className="p-5 sm:p-8 text-[11px] sm:text-[12px] font-black uppercase tracking-[0.2em]">{locale === 'tr' ? 'Özellik' : 'Feature'}</th>
                    <th className="p-5 sm:p-8 text-[11px] sm:text-[12px] font-black text-center uppercase tracking-[0.2em] border-l-2 border-white/10">{locale === 'tr' ? 'Aylık' : 'Monthly'}</th>
                    <th className="p-5 sm:p-8 text-[11px] sm:text-[12px] font-black text-center uppercase tracking-[0.2em] border-l-2 border-white/10 text-[#FF9A14]">{locale === 'tr' ? 'Yıllık' : 'Yearly'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-[#F5F4F1]">
                  {[
                    { name: locale === 'tr' ? 'Dinamik QR Kod Teknolojisi' : 'Dynamic QR Technology', m: true, y: true },
                    { name: locale === 'tr' ? 'Geri Bildirim Yönetimi' : 'Feedback Management', m: true, y: true },
                    { name: locale === 'tr' ? 'Panel Üzerinden Yanıtlama' : 'Dashboard Responses', m: true, y: true },
                    { name: locale === 'tr' ? 'İtibar Yayınlama' : 'Reputation Distribution', m: true, y: true },
                    { name: locale === 'tr' ? '7/24 Öncelikli Destek' : '24/7 Priority Support', m: false, y: true },
                    { name: locale === 'tr' ? 'Kişiselleştirilmiş Tasarımlar' : 'White-label Designs', m: false, y: true },
                    { name: locale === 'tr' ? 'Çoklu Şube Yönetimi' : 'Multi-Location Mgmt', m: false, y: true },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-[#F5F4F1] transition-colors group">
                      <td className="p-5 sm:p-8 text-[13px] sm:text-[15px] font-black text-[#0F2348] uppercase tracking-tighter">{row.name}</td>
                      <td className="p-5 sm:p-8 text-center border-l-2 border-[#F5F4F1]">
                        <div className="flex justify-center">
                          {row.m ? <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#10b981] flex items-center justify-center text-white border-2 border-[#0F2348] shadow-[2px_2px_0_0_#0F2348] sm:shadow-[3px_3px_0_0_#0F2348]"><CheckCircle2 size={14} className="sm:size-[16px]" strokeWidth={3} /></div> : <span className="text-[#6B7B93] font-black">—</span>}
                        </div>
                      </td>
                      <td className="p-5 sm:p-8 text-center border-l-2 border-[#F5F4F1]">
                        <div className="flex justify-center">
                          {row.y ? <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#FF9A14] flex items-center justify-center text-[#0F2348] border-2 border-[#0F2348] shadow-[2px_2px_0_0_#0F2348] sm:shadow-[3px_3px_0_0_#0F2348]"><CheckCircle2 size={14} className="sm:size-[16px]" strokeWidth={3} /></div> : <span className="text-[#6B7B93] font-black">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials (3D Cards) ─── */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-white border-t-[3px] sm:border-t-[4px] border-[#0F2348]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-[#F5F4F1] p-8 sm:p-14 rounded-[24px] sm:rounded-[32px] border-[2.5px] sm:border-[3px] border-[#0F2348] shadow-[8px_10px_0_0_#0F2348] sm:shadow-[10px_12px_0_0_#0F2348] space-y-6 relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-10">
                 <Star size={60} className="sm:size-80 fill-[#0F2348]" />
              </div>
              <div className="flex gap-1 mb-4 sm:mb-6">
                {[1,2,3,4,5].map(s => <Star key={s} size={18} className="sm:size-[20px] fill-[#FF9A14] text-[#0F2348]" strokeWidth={2.5} />)}
              </div>
              <p className="text-[16px] sm:text-[19px] text-[#0F2348] leading-relaxed font-bold italic mb-6">“{t.text}”</p>
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FF9A14] border-2 border-[#0F2348] rounded-full shadow-[2px_2px_0_0_#0F2348] flex items-center justify-center font-black text-[#0F2348] text-[14px]">
                    {t.author.charAt(0)}
                 </div>
                 <span className="text-[11px] sm:text-[12px] font-black text-[#6B7B93] uppercase tracking-widest leading-none pt-1">{t.author}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <div className="bg-[#F5F4F1] border-y-[4px] border-[#0F2348]">
        <PricingFaq faqs={faqs} title={t.faq_title} subtitle={t.faq_subtitle} />
      </div>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
