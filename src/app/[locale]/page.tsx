import type { Metadata } from 'next';
import { ArrowRight, QrCode, ShieldCheck, CheckCircle2, Star, Shield, HelpCircle, ChevronDown } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PricingFaq from '@/components/marketing/PricingFaq';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import Link from 'next/link';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  return {
    title: locale === 'tr'
      ? 'Buaze — Restoranınızın Dijital İtibar Yönetim Platformu'
      : 'Buaze — Restaurant Digital Reputation Management Platform',
    description: t.siteDescription,
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

function DashboardMockup({ locale }: { locale: Locale }) {
  return (
    <div className="relative mx-auto max-w-2xl">
      {/* Laptop frame */}
      <div className="relative rounded-t-3xl bg-[#1f2937] border-4 border-[#374151] p-2 sm:p-4 pb-0 shadow-2xl overflow-hidden aspect-[16/10] flex flex-col">
        {/* Screen Top Bar */}
        <div className="bg-[#111827] h-4 sm:h-6 w-full rounded-t-xl sm:rounded-t-2xl flex items-center justify-center relative">
          <div className="w-1.5 h-1.5 rounded-full bg-[#4b5563] absolute left-1/2 -translate-x-1/2" />
        </div>
        
        {/* OS / Platform Frame */}
        <div className="flex-1 bg-white rounded-b-xl flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-16 sm:w-48 bg-[#111827] flex-shrink-0 flex flex-col p-2 sm:p-4 border-r border-[#1f2937]">
            <div className="hidden sm:flex items-center gap-2 mb-8">
              <div className="w-6 h-6 rounded bg-[#FDBF1D] flex items-center justify-center"><span className="text-[#111827] font-black text-xs">B</span></div>
              <span className="text-white font-bold text-sm tracking-tight">Buaze</span>
            </div>
            <div className="space-y-2">
              <div className="h-8 rounded bg-[#1f2937] w-full" />
              <div className="h-8 rounded hover:bg-[#1f2937] w-full opacity-60" />
              <div className="h-8 rounded hover:bg-[#1f2937] w-full opacity-60" />
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 bg-gray-50 flex flex-col p-3 sm:p-6 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="h-5 w-32 sm:w-48 bg-gray-200 rounded" />
              <div className="h-8 w-8 sm:w-24 bg-gray-200 rounded-full" />
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col justify-center">
                  <div className="h-3 w-16 bg-gray-100 rounded mb-2" />
                  <div className="h-6 w-12 bg-gray-200 rounded" />
                </div>
              ))}
              <div className="bg-[#111827] rounded-xl p-3 shadow-sm border border-[#1f2937] flex flex-col justify-center">
                 <div className="h-2 w-16 bg-[#374151] rounded mb-1" />
                 <div className="h-3 w-12 bg-[#FDBF1D] rounded font-black text-[#111827] text-[10px] items-center justify-center flex">4.8 ★</div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-4 relative overflow-hidden flex flex-col justify-end">
               <div className="absolute top-4 left-4 h-4 w-24 bg-gray-100 rounded" />
               <div className="h-full w-full flex items-end justify-between gap-1 mt-6">
                 {[40, 60, 30, 80, 50, 90, 70, 100, 60, 85].map((h, j) => (
                   <div key={j} className="w-full bg-[#111827]/10 rounded-t-sm" style={{ height: `${h}%` }}>
                      <div className="w-full bg-[#FDBF1D] h-1 absolute top-0" />
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </div>
      {/* Laptop Base */}
      <div className="h-3 sm:h-4 w-[110%] -ml-[5%] bg-[#4b5563] rounded-b-2xl shadow-xl relative z-10 mx-auto flex justify-center items-start">
        <div className="w-16 sm:w-24 h-1 sm:h-1.5 bg-[#374151] rounded-b-md" />
      </div>

      {/* Floating Badge */}
      <div className="absolute -top-6 -right-6 z-20 bg-white p-4 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-gray-50 flex items-center gap-3 animate-bounce">
        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
          <ShieldCheck size={20} />
        </div>
        <div>
          <p className="text-[10px] uppercase font-black text-gray-400">{locale === 'tr' ? 'Güvenlik' : 'Security'}</p>
          <p className="text-xs font-bold">{locale === 'tr' ? '%100 Korumalı' : '100% Protected'}</p>
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'Buaze',
        url: 'https://buaze.com',
        applicationCategory: 'BusinessApplication',
        description: t.siteDescription,
        offers: {
          '@type': 'Offer',
          price: '500',
          priceCurrency: 'TRY',
        },
        operatingSystem: 'Web',
      },
      {
        '@type': 'Organization',
        name: 'Buaze',
        url: 'https://buaze.com',
        logo: 'https://buaze.com/buaze-logo.png',
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+90-555-000-0000',
          contactType: 'customer service',
        }
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: t.faq_q1,
            acceptedAnswer: { '@type': 'Answer', text: t.faq_a1 }
          },
          {
            '@type': 'Question',
            name: t.faq_q3,
            acceptedAnswer: { '@type': 'Answer', text: t.faq_a3 }
          }
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans selection:bg-[#FDBF1D] selection:text-white pt-[72px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MarketingNavbar locale={locale} t={t} />

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-6 max-w-7xl mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 text-center lg:text-left z-10 relative">
            <div className="inline-flex items-center gap-2 bg-[#FDBF1D]/10 text-[#111827] px-4 py-2 rounded-full text-sm font-black border border-[#FDBF1D]/30 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#FDBF1D] animate-pulse" />
              buaze.com
            </div>
            <h1 className="text-5xl sm:text-6xl xl:text-7xl font-black leading-[1.05] tracking-tight text-[#111827]">
              {t.hero_title_1} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FDBF1D] to-[#f59e0b] drop-shadow-sm">{t.hero_title_2}</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
              {t.hero_subtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                href={`${base}/auth/register`}
                id="hero-cta-btn"
                className="w-full sm:w-auto px-10 py-5 bg-[#FDBF1D] hover:bg-[#EAB308] text-[#111827] text-lg font-black rounded-xl transition-all shadow-xl shadow-yellow-500/20 active:scale-95 text-center flex items-center justify-center gap-2"
              >
                {t.hero_cta} <ArrowRight size={20} />
              </Link>
              <div className="flex -space-x-3 items-center">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-[#111827] to-[#374151] flex items-center justify-center text-xs font-bold text-white shadow-sm z-10 relative">
                    <Star size={12} className="fill-[#FDBF1D] text-[#FDBF1D]" />
                  </div>
                ))}
                <div className="pl-6 flex items-center gap-1.5 ml-2">
                  <Star size={16} className="fill-[#FDBF1D] text-[#FDBF1D]" />
                  <span className="text-sm font-bold text-[#111827]">{t.hero_rating}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative pt-10 sm:pt-0">
            <DashboardMockup locale={locale} />
          </div>
        </div>
      </section>

      {/* Review Sites Strip */}
      <section className="bg-[#F9FAFB] py-16 px-6 border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-sm font-black text-gray-400 uppercase tracking-widest mb-10">{t.hero_platforms_title}</p>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500 items-center">
            {['Google', 'TripAdvisor', 'Yelp', 'Foursquare', 'Zomato'].map(site => (
              <div key={site} className="flex items-center gap-2 font-black text-xl md:text-2xl italic text-[#111827] transition-colors cursor-default drop-shadow-sm">
                {site}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Zig Zag */}
      <section id="how-it-works" className="py-24 px-6 space-y-32 overflow-hidden">
        {/* Feature 1 */}
        <article className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="order-2 lg:order-1 relative px-4">
             <div className="absolute inset-0 bg-[#FDBF1D]/5 blur-3xl rounded-full transform -rotate-6" />
             <div className="bg-white p-8 sm:p-10 rounded-[32px] shadow-xl border border-gray-100 relative z-10 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-[#111827] flex items-center justify-center text-[#FDBF1D] font-black shadow-inner">1</div>
                <h3 className="text-xl sm:text-2xl font-black text-[#111827]">{t.feat1_title}</h3>
              </div>
              <div className="space-y-4">
                <div className="p-6 bg-[#F9FAFB] rounded-2xl border border-dashed border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} className="fill-[#FDBF1D] text-[#FDBF1D]" />)}
                  </div>
                  <p className="text-base font-bold text-gray-700 leading-relaxed">"Hizmet gerçekten harikaydı, atmosfer mükemmel. Kesinlikle tavsiye ederim!" - Murat K.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2 space-y-6">
            <h2 className="text-4xl font-black text-[#111827] leading-tight">{t.feat1_title}</h2>
            <p className="text-lg text-gray-500 leading-relaxed font-medium">{t.feat1_desc}</p>
            <ul className="space-y-4 pt-4">
              {[t.feat1_li1, t.feat1_li2, t.feat1_li3].map(item => (
                <li key={item} className="flex items-center gap-3 font-bold text-gray-700 bg-gray-50 px-4 py-3 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-[#111827] text-[#FDBF1D] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={14} />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </article>

        {/* Feature 2 */}
        <article className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl font-black text-[#111827] leading-tight">{t.feat2_title}</h2>
            <p className="text-lg text-gray-500 leading-relaxed font-medium">{t.feat2_desc}</p>
            <div className="p-6 bg-[#FDBF1D]/10 rounded-2xl border border-[#FDBF1D]/20 shadow-sm">
              <p className="text-base font-bold text-[#111827] italic mb-3">"{locale === 'tr' ? 'Buaze sayesinde Google Reviews sayfamız her zamankinden çok daha harika görünüyor!' : 'Thanks to Buaze, our Google Reviews page looks better than ever!'}"</p>
              <span className="text-sm font-black text-[#FDBF1D] block">{t.feat2_quote_author}</span>
            </div>
          </div>
          <div className="relative flex justify-center">
            <div className="absolute inset-0 bg-[#79C5D1]/10 blur-3xl rounded-full" />
            <div className="bg-white p-8 sm:p-14 rounded-[40px] shadow-2xl border border-gray-100 flex items-center justify-center relative z-10 group">
              <div className="absolute inset-2 border-2 border-dashed border-gray-100 rounded-[32px] group-hover:border-[#111827]/20 transition-colors" />
              <QrCode size={180} strokeWidth={1} className="text-[#111827] relative z-10" />
            </div>
          </div>
        </article>

        {/* Feature 3 */}
        <article className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="lg:order-2 space-y-6">
            <h2 className="text-4xl font-black text-[#111827] leading-tight">{t.feat3_title}</h2>
            <p className="text-lg text-gray-500 leading-relaxed font-medium">{t.feat3_desc}</p>
            <div className="flex items-center gap-5 py-4">
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl shadow-inner">
                <Shield size={32} />
              </div>
              <div>
                <h4 className="font-black text-[#111827] text-lg">{t.feat3_badge_title}</h4>
                <p className="text-sm text-gray-500 font-bold">{t.feat3_badge_desc}</p>
              </div>
            </div>
          </div>
          <div className="lg:order-1 relative px-4">
            <div className="bg-[#111827] p-8 sm:p-10 rounded-[32px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] space-y-8 text-white overflow-hidden relative transform rotate-1 hover:-rotate-1 transition-transform duration-500">
              <div className="flex items-center gap-3">
                {[1, 2, 3].map(i => <Star key={i} size={28} className="fill-orange-500 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" />)}
                {[4, 5].map(i => <Star key={i} size={28} className="text-gray-700" />)}
              </div>
              <div className="space-y-4 opacity-80">
                <div className="h-4 w-3/4 bg-gray-700 rounded-full" />
                <div className="h-4 w-full bg-gray-700 rounded-full" />
                <div className="h-4 w-1/2 bg-gray-700 rounded-full" />
              </div>
              <div className="pt-4 relative z-10">
                <div className="bg-[#1f2937] border border-gray-700 text-white p-4 rounded-2xl font-black text-center text-sm flex items-center justify-center gap-2">
                  <ShieldCheck size={18} className="text-orange-500" />
                  {locale === 'tr' ? 'Özel Panele İletildi' : 'Sent to Private Dashboard'}
                </div>
              </div>
              <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 blur-[60px] rounded-full pointer-events-none" />
            </div>
          </div>
        </article>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-[#F9FAFB]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-5xl font-black text-[#111827] tracking-tight">{t.pricing_title}</h2>
            <p className="text-lg text-[#FDBF1D] font-bold italic">{t.pricing_subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 hover:border-gray-200 transition-all group flex flex-col">
              <h3 className="text-2xl font-black mb-2">{t.pricing_monthly_title}</h3>
              <p className="text-gray-500 font-bold text-sm mb-8">{t.pricing_monthly_desc}</p>
              <div className="mb-10">
                <span className="text-6xl font-black tracking-tighter">{t.pricing_monthly_price}</span>
                <span className="text-gray-400 font-bold ml-2">{t.pricing_monthly_period}</span>
              </div>
              <ul className="space-y-5 mb-12 flex-1">
                {[t.pricing_feature_unlimited_qr, t.pricing_feature_feedback, t.pricing_feature_panel, t.pricing_feature_mobile].map(feat => (
                  <li key={feat} className="flex items-center gap-3 text-sm font-bold text-gray-700">
                    <CheckCircle2 size={18} className="text-gray-400" /> {feat}
                  </li>
                ))}
              </ul>
              <Link
                href={`${base}/auth/register`}
                className="block w-full text-center py-4 bg-gray-50 text-[#111827] font-black rounded-2xl hover:bg-gray-100 transition-all"
              >
                {t.pricing_monthly_cta}
              </Link>
            </div>

            <div className="bg-[#111827] p-10 rounded-[40px] shadow-2xl border border-gray-800 relative md:scale-105 flex flex-col text-white">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FDBF1D] text-[#111827] px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-lg">
                {t.pricing_yearly_badge}
              </div>
              <h3 className="text-2xl font-black mb-2">{t.pricing_yearly_title}</h3>
              <p className="text-gray-400 font-bold text-sm mb-8">{t.pricing_yearly_desc}</p>
              <div className="mb-10">
                <span className="text-6xl font-black tracking-tighter">{t.pricing_yearly_price}</span>
                <span className="text-gray-500 font-bold ml-2">{t.pricing_yearly_period}</span>
              </div>
              <ul className="space-y-5 mb-12 flex-1">
                {[t.pricing_feature_all, t.pricing_feature_free_months, t.pricing_feature_priority, t.pricing_feature_google].map(feat => (
                  <li key={feat} className="flex items-center gap-3 text-sm font-bold text-gray-300">
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

      {/* FAQ Section */}
      <section className="py-24 px-6 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
           <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl font-black text-[#111827]">{t.faq_title}</h2>
            <p className="text-lg text-gray-500 font-medium">{t.faq_subtitle}</p>
          </div>
          <PricingFaq t={t} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 text-center space-y-10 bg-[#111827] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
        <div className="relative z-10">
          <h2 className="text-5xl font-black text-white max-w-2xl mx-auto leading-tight mb-8">
            {t.cta_title_1} <br />
            <span className="text-[#FDBF1D]">{t.cta_title_2}</span>
          </h2>
          <Link
            href={`${base}/auth/register`}
            id="footer-cta-btn"
            className="inline-flex items-center gap-3 px-12 py-5 bg-[#FDBF1D] hover:bg-[#EAB308] text-[#111827] text-xl font-black rounded-2xl transition-all shadow-xl shadow-[#FDBF1D]/20 active:scale-95"
          >
            {t.cta_button} <ArrowRight />
          </Link>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
