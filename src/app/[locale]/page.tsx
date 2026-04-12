import type { Metadata } from 'next';
import { ArrowRight, QrCode, ShieldCheck, CheckCircle2, Star, Shield } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
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
    '@type': 'SoftwareApplication',
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
  };

  return (
    <div className="min-h-screen bg-white text-[#111827] font-sans selection:bg-[#FDBF1D] selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MarketingNavbar locale={locale} t={t} />

      {/* Hero Section */}
      <section className="pt-48 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-[#FDBF1D]/10 text-[#111827] px-4 py-2 rounded-full text-sm font-black border border-[#FDBF1D]/30">
              <span className="w-2 h-2 rounded-full bg-[#FDBF1D] animate-pulse" />
              buaze.com
            </div>
            <h1 className="text-5xl sm:text-7xl font-black leading-[1.05] tracking-tight text-[#111827]">
              {t.hero_title_1} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FDBF1D] to-[#f59e0b]">{t.hero_title_2}</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
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
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-xs font-bold text-gray-500">
                    +
                  </div>
                ))}
                <div className="pl-6 flex items-center gap-1">
                  <Star size={14} className="fill-[#FDBF1D] text-[#FDBF1D]" />
                  <span className="text-xs font-bold">{t.hero_rating}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="bg-white rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden relative group p-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-[#FDBF1D] flex items-center justify-center">
                    <span className="text-[#111827] font-black text-sm">B</span>
                  </div>
                  <span className="font-black text-sm">Buaze Dashboard</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: locale === 'tr' ? 'Toplam Yorum' : 'Total Reviews', val: '1,284', color: 'bg-yellow-50 text-yellow-700' },
                    { label: locale === 'tr' ? 'Ort. Puan' : 'Avg. Rating', val: '4.8 ★', color: 'bg-green-50 text-green-700' },
                    { label: locale === 'tr' ? 'Google\'a Yönlendirme' : 'Google Redirects', val: '847', color: 'bg-blue-50 text-blue-700' },
                  ].map(stat => (
                    <div key={stat.label} className={`${stat.color} rounded-xl p-3`}>
                      <div className="text-lg font-black">{stat.val}</div>
                      <div className="text-xs font-bold opacity-70">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[5, 4, 5, 3, 5].map((r, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} size={10} className={s <= r ? 'fill-[#FDBF1D] text-[#FDBF1D]' : 'text-gray-200 fill-gray-200'} />
                        ))}
                      </div>
                      <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#FDBF1D] rounded-full" style={{ width: `${r * 20}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-gray-50 flex items-center gap-3 animate-bounce">
              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-black text-gray-400">{locale === 'tr' ? 'Güvenlik' : 'Security'}</p>
                <p className="text-xs font-bold">{locale === 'tr' ? '%100 Korumalı' : '100% Protected'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Review Sites Strip */}
      <section className="bg-[#F9FAFB] py-16 px-6 border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-sm font-black text-gray-400 uppercase tracking-widest mb-10">{t.hero_platforms_title}</p>
          <div className="flex flex-wrap justify-center gap-12 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            {['Google', 'Facebook', 'Trustpilot', 'Yelp', 'TripAdvisor', 'Zomato'].map(site => (
              <div key={site} className="flex items-center gap-2 font-black text-xl italic text-gray-400 hover:text-[#111827] transition-colors cursor-default">
                {site}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Zig Zag */}
      <section id="how-it-works" className="py-24 px-6 space-y-32">
        {/* Feature 1 */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="order-2 lg:order-1 relative">
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">1</div>
                <h3 className="text-2xl font-black text-[#111827]">{t.feat1_title}</h3>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} className="fill-[#FDBF1D] text-[#FDBF1D]" />)}
                  </div>
                  <p className="text-sm font-bold text-gray-600">"Hizmet gerçekten harikaydı!" - Murat K.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2 space-y-6">
            <h2 className="text-4xl font-black text-[#111827]">{t.feat1_title}</h2>
            <p className="text-lg text-gray-500 leading-relaxed font-medium">{t.feat1_desc}</p>
            <ul className="space-y-4 pt-4">
              {[t.feat1_li1, t.feat1_li2, t.feat1_li3].map(item => (
                <li key={item} className="flex items-center gap-3 font-bold text-gray-700">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <CheckCircle2 size={14} />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl font-black text-[#111827]">{t.feat2_title}</h2>
            <p className="text-lg text-gray-500 leading-relaxed font-medium">{t.feat2_desc}</p>
            <div className="p-6 bg-yellow-50 rounded-2xl border border-yellow-100">
              <p className="text-sm font-bold text-yellow-800 italic">{t.feat2_quote}</p>
              <span className="text-xs font-black text-yellow-600 mt-2 block">{t.feat2_quote_author}</span>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square bg-[#FDBF1D]/10 rounded-full absolute -top-10 -right-10 w-64 h-64 -z-10 animate-pulse" />
            <div className="bg-white p-12 rounded-[40px] shadow-2xl border border-gray-100 flex items-center justify-center">
              <QrCode size={160} className="text-[#111827]" />
            </div>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="lg:order-2 space-y-6">
            <h2 className="text-4xl font-black text-[#111827]">{t.feat3_title}</h2>
            <p className="text-lg text-gray-500 leading-relaxed font-medium">{t.feat3_desc}</p>
            <div className="flex items-center gap-4 py-4">
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl">
                <Shield size={32} />
              </div>
              <div>
                <h4 className="font-black text-[#111827]">{t.feat3_badge_title}</h4>
                <p className="text-sm text-gray-500 font-bold">{t.feat3_badge_desc}</p>
              </div>
            </div>
          </div>
          <div className="lg:order-1 relative">
            <div className="bg-[#111827] p-8 rounded-3xl shadow-2xl space-y-6 text-white overflow-hidden relative">
              <div className="flex items-center gap-3">
                {[1, 2, 3].map(i => <Star key={i} size={24} className="fill-red-500 text-red-500" />)}
                {[4, 5].map(i => <Star key={i} size={24} className="text-gray-600" />)}
              </div>
              <div className="space-y-3 opacity-80">
                <div className="h-4 w-3/4 bg-gray-700 rounded-full" />
                <div className="h-4 w-full bg-gray-700 rounded-full" />
                <div className="h-4 w-1/2 bg-gray-700 rounded-full" />
              </div>
              <div className="pt-4">
                <div className="bg-white text-[#111827] p-4 rounded-xl font-black text-center text-sm">
                  {locale === 'tr' ? 'Yöneticiye Gönder' : 'Send to Manager'}
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 blur-[60px]" />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-[#F9FAFB]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-5xl font-black text-[#111827]">{t.pricing_title}</h2>
            <p className="text-lg text-gray-500 font-bold italic underline decoration-[#FDBF1D] decoration-4 underline-offset-8">{t.pricing_subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 hover:border-[#79C5D1] transition-all group">
              <h3 className="text-2xl font-black mb-2">{t.pricing_monthly_title}</h3>
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

            <div className="bg-white p-10 rounded-[40px] shadow-2xl border-4 border-[#FDBF1D] relative scale-105">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FDBF1D] text-[#111827] px-6 py-2 rounded-full font-black text-xs uppercase italic tracking-widest shadow-lg whitespace-nowrap">
                {t.pricing_yearly_badge}
              </div>
              <h3 className="text-2xl font-black mb-2">{t.pricing_yearly_title}</h3>
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

      {/* Final CTA */}
      <section className="py-24 px-6 text-center space-y-10">
        <h2 className="text-5xl font-black text-[#111827] max-w-2xl mx-auto leading-tight">
          {t.cta_title_1} <br />
          <span className="text-[#FDBF1D]">{t.cta_title_2}</span>
        </h2>
        <Link
          href={`${base}/auth/register`}
          id="footer-cta-btn"
          className="inline-flex items-center gap-3 px-12 py-6 bg-[#111827] hover:bg-black text-white text-xl font-black rounded-2xl transition-all shadow-xl"
        >
          {t.cta_button} <ArrowRight />
        </Link>
        <div className="flex justify-center gap-6 pt-6 translate-y-4 grayscale opacity-40 select-none">
          <div className="font-extrabold italic text-2xl">{t.cta_badge1}</div>
          <div className="font-extrabold italic text-2xl">{t.cta_badge2}</div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
