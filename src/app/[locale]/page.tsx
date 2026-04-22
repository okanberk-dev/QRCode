import type { Metadata } from 'next';
import { ArrowRight, QrCode, ShieldCheck, CheckCircle2, Star, Shield, MessageSquare, BarChart3, Zap, Users, Trophy } from 'lucide-react';
import Image from 'next/image';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PricingFaq from '@/components/marketing/PricingFaq';
import Link from 'next/link';
import FeatureTabsUI from '@/components/marketing/FeatureTabsUI';
import CtaBanner from '@/components/marketing/CtaBanner';
import CustomerTestimonials from '@/components/marketing/CustomerTestimonials';
import CaseStudies from '@/components/marketing/CaseStudies';
import ProductShowcase from '@/components/marketing/ProductShowcase';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { CtaButton } from '@/components/ui/CtaButton';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

const VALID_LOCALES = ['tr', 'en'] as const;

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  const title = locale === 'tr'
    ? 'Buaze | Dijital İtibar ve Geri Bildirim Yönetimi'
    : 'Buaze | Digital Reputation and Feedback Management';
  const description = locale === 'tr'
    ? 'Buaze ile işletmenizin dijital itibarını profesyonelleştirin. Geri bildirim operasyonlarınızı tek bir merkezden yöneterek güven inşa edin.'
    : 'Professionalize your business\'s digital reputation with Buaze. Build trust by managing your feedback operations from a single hub.';

  return {
    metadataBase: new URL('https://buaze.com'),
    title,
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        tr: '/tr',
        en: '/en',
      },
    },
    openGraph: {
      type: 'website',
      url: `https://buaze.com/${locale}`,
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      siteName: 'Buaze',
      title,
      description: t.siteDescription || description,
      images: [
        {
          url: '/assets/3d-hero.png',
          width: 1200,
          height: 630,
          alt: 'Buaze platform dashboard preview',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/assets/3d-hero.png'],
    },
  };
}


export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) {
    notFound();
  }

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
          price: locale === 'tr' ? '500' : '10',
          priceCurrency: locale === 'tr' ? 'TRY' : 'USD',
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
      },
      {
        '@type': 'Service',
        name: locale === 'tr' ? 'Dijital İtibar Yönetimi Hizmeti' : 'Digital Reputation Management Service',
        provider: {
          '@type': 'Organization',
          name: 'Buaze'
        },
        description: locale === 'tr' ? 'İşletmeler için geri bildirim operasyonlarını profesyonelleştirme ve dijital itibar yönetimi platformu.' : 'Platform for professionalizing feedback operations and digital reputation management for businesses.',
      }
    ]
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-[#F8F6F1] text-[#1A2332] font-sans selection:bg-[#F4B400]/30 selection:text-[#1A2332] pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MarketingNavbar locale={locale} t={t} />

      {/* ═══════════════════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════════════════ */}
      <section className="pt-8 sm:pt-16 lg:pt-20 pb-8 sm:pb-12 px-5 sm:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center mt-4 sm:mt-8">
            {/* Left: Content */}
            <div className="text-left space-y-5 sm:space-y-6">
              <h1 className="text-[30px] sm:text-[42px] lg:text-[56px] font-extrabold leading-[1.1] tracking-[-0.04em] text-[#1A2332] text-balance">
                {t.hero_title_1} <br />
                <span className="text-[#F4B400]">{t.hero_title_2}</span>
              </h1>
              <p className="text-[16px] sm:text-[17px] text-[#2A3444] font-medium leading-relaxed max-w-[500px] text-pretty">
                {t.hero_subtitle}
              </p>

              <div className="space-y-1.5 pt-1">
                <p className="text-[14px] sm:text-[15px] text-[#2A3444] font-normal flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#16A34A] flex-shrink-0" />
                  {locale === 'tr' ? 'Dakikalar içinde kurulun ve başlayın' : 'Get up and running in minutes'}
                </p>
                <p className="text-[14px] sm:text-[15px] text-[#2A3444] font-normal flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#16A34A] flex-shrink-0" />
                  {locale === 'tr' ? 'Hazır olduğunuzda yükseltin' : 'Upgrade when you\'re ready'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-5 pt-3 sm:pt-4">
                <CtaButton variant="primary" href={`${base}/auth/register`} className="w-full sm:w-auto">
                  {t.hero_cta}
                </CtaButton>
                <CtaButton variant="secondary" href={`${base}/pricing`} className="w-full sm:w-auto">
                  {locale === 'tr' ? 'Planları İncele' : 'View Plans'}
                </CtaButton>
              </div>

              <p className="text-[11px] sm:text-[12px] text-[#6B7280] font-bold tracking-wide">
                {locale === 'tr' ? '14 Gün Ücretsiz Deneme • Kredi Kartı Gerekmez' : '14 Day Free Trial • No Credit Card Required'}
              </p>
            </div>

            {/* Right: Visual Column */}
            <div className="relative w-full mt-6 lg:mt-0">

              {/* ─── MOBILE-ONLY visual (hidden on lg+) ─── */}
              <div className="lg:hidden relative mx-auto max-w-[420px] px-2">
                {/* Dot pattern bg */}
                <div
                  className="absolute inset-0 opacity-[0.1] pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #6B7280 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                  }}
                />

                {/* Neobrutalist "review card" mockup — styled visual */}
                <div className="relative bg-white rounded-2xl border border-[#1A2332] shadow-md p-5 space-y-4">
                  {/* Browser dots */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#E8ECF2]">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F4B400]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F4B400]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                      buaze.com
                    </div>
                  </div>

                  {/* Stars + rating */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} size={20} fill="#F4B400" strokeWidth={0} />
                      ))}
                    </div>
                    <div className="text-[13px] font-black text-[#1A2332]">4.9 / 5.0</div>
                  </div>

                  {/* Metric chips */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#F8F6F1] border border-[#1A2332] rounded-lg p-3 shadow-md">
                      <div className="text-[9px] font-black uppercase tracking-wider text-[#2A3444] mb-1">
                        {locale === 'tr' ? 'YORUMLAR' : 'REVIEWS'}
                      </div>
                      <div className="text-[20px] font-black text-[#1A2332] flex items-center gap-1">
                        +142
                        <span className="text-[11px] text-[#16A34A]">↑</span>
                      </div>
                    </div>
                    <div className="bg-[#F4B400] border border-[#1A2332] rounded-lg p-3 shadow-md">
                      <div className="text-[9px] font-black uppercase tracking-wider text-[#1A2332] mb-1">
                        {locale === 'tr' ? 'MEMNUNİYET' : 'SATISFACTION'}
                      </div>
                      <div className="text-[20px] font-black text-[#1A2332]">99%</div>
                    </div>
                  </div>

                  {/* Progress bar block */}
                  <div className="bg-[#F8F6F1] border border-[#1A2332] rounded-lg p-3 shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-[#2A3444]">
                        {locale === 'tr' ? 'BU HAFTA' : 'THIS WEEK'}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-black text-[#16A34A]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                        {locale === 'tr' ? 'CANLI' : 'LIVE'}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-1.5 bg-[#E8ECF2] rounded-full overflow-hidden">
                        <div className="h-full w-[88%] bg-[#F4B400] rounded-full" />
                      </div>
                      <div className="h-1.5 bg-[#E8ECF2] rounded-full overflow-hidden">
                        <div className="h-full w-[64%] bg-[#F4B400] rounded-full" />
                      </div>
                      <div className="h-1.5 bg-[#E8ECF2] rounded-full overflow-hidden">
                        <div className="h-full w-[42%] bg-[#1A2332] rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating QR chip */}
                <div className="absolute -top-4 -right-1 bg-[#1A2332] text-white p-3 rounded-xl border border-[#1A2332] shadow-md rotate-[6deg] z-10">
                  <QrCode size={28} className="text-[#F4B400]" />
                </div>

                {/* Floating testimonial bubble (single) */}
                <div className="relative bg-white rounded-xl border border-[#1A2332] p-4 shadow-md mt-5 mx-auto max-w-[320px]">
                  <div className="flex gap-[2px] mb-2">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M11.999 15.8196L7.50882 18.562L8.72951 13.4439L4.73438 10.0217L9.97847 9.60156L11.999 4.74323L14.0194 9.60156L19.2643 10.0217L15.2684 13.4439L16.4891 18.562L11.999 15.8196Z" fill="#F4B400"></path>
                      </svg>
                    ))}
                  </div>
                  <div className="text-[13px] text-[#1A2332] font-semibold leading-[1.5]">
                    {locale === 'tr'
                      ? '"Buaze\'yi kullanmak gerçekten çok kolay. Müthiş zaman kazandırıyor."'
                      : '"Really love how easy Buaze is to use. It saves so much time."'}
                  </div>
                </div>
              </div>

              {/* ─── DESKTOP-ONLY: absolute-positioned testimonials (unchanged) ─── */}
              <div className="hidden lg:block relative w-full h-[460px]">
                {/* Dot pattern */}
                <div
                  className="absolute inset-0 w-full h-full opacity-[0.08]"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #6B7280 1px, transparent 1px)',
                    backgroundSize: '18px 18px',
                  }}
                />

                {/* Box 1: Super easy (Top) */}
                <div className="absolute top-2 left-0 w-[260px] bg-white rounded-xl border border-[#1A2332] p-5 shadow-md z-10 transform hover:-translate-y-2 transition-transform">
                  <div className="flex gap-[2px] mb-3">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M11.999 15.8196L7.50882 18.562L8.72951 13.4439L4.73438 10.0217L9.97847 9.60156L11.999 4.74323L14.0194 9.60156L19.2643 10.0217L15.2684 13.4439L16.4891 18.562L11.999 15.8196Z" fill="#F4B400"></path>
                      </svg>
                    ))}
                  </div>
                  <div className="text-[14px] text-[#1A2332] font-semibold leading-[1.6]">
                    {locale === 'tr'
                      ? '"Kullanımı süper kolay ve kusursuz çalışıyor"'
                      : '"Super easy to use and worked perfectly"'}
                  </div>
                </div>

                {/* Box 2: Really love (Middle) */}
                <div className="absolute top-[120px] right-2 w-[290px] bg-white rounded-xl border border-[#1A2332] p-5 shadow-md z-30 transform hover:-translate-y-2 transition-transform">
                  <div className="flex gap-[2px] mb-3">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M11.999 15.8196L7.50882 18.562L8.72951 13.4439L4.73438 10.0217L9.97847 9.60156L11.999 4.74323L14.0194 9.60156L19.2643 10.0217L15.2684 13.4439L16.4891 18.562L11.999 15.8196Z" fill="#F4B400"></path>
                      </svg>
                    ))}
                  </div>
                  <div className="text-[14px] text-[#1A2332] font-semibold leading-[1.6]">
                    {locale === 'tr'
                      ? '"Buaze\'yi kullanmak gerçekten çok kolay. Yorum toplamak konusunda müthiş zaman kazandırıyor"'
                      : '"Really love how easy Buaze is to use. It saves so much time collecting reviews"'}
                  </div>
                </div>

                {/* Box 3: Buaze makes (Bottom) */}
                <div className="absolute top-[250px] left-6 w-[260px] bg-white rounded-xl border border-[#1A2332] p-5 shadow-md z-20 transform hover:-translate-y-2 transition-transform">
                  <div className="flex gap-[2px] mb-3">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M11.999 15.8196L7.50882 18.562L8.72951 13.4439L4.73438 10.0217L9.97847 9.60156L11.999 4.74323L14.0194 9.60156L19.2643 10.0217L15.2684 13.4439L16.4891 18.562L11.999 15.8196Z" fill="#F4B400"></path>
                      </svg>
                    ))}
                  </div>
                  <div className="text-[14px] text-[#1A2332] font-semibold leading-[1.6]">
                    {locale === 'tr'
                      ? '"Buaze ile yorumları takip etmek ve yanıtlamak artık çok zahmetsiz"'
                      : '"Buaze makes tracking and replying to reviews effortless."'}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ═══════ Logo Carousel ═══════ */}
      <section className="py-12 sm:py-16 px-5 sm:px-8">
        <div className="max-w-[1000px] mx-auto">
          <div className="flex flex-wrap justify-center gap-x-10 sm:gap-x-14 gap-y-5 items-center opacity-30 hover:opacity-50 transition-opacity duration-500">
            {['Google', 'TripAdvisor', 'Yelp', 'Foursquare', 'Zomato'].map(site => (
              <span key={site} className="text-lg sm:text-xl font-bold text-[#1A2332] tracking-tight cursor-default select-none">
                {site}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ Feature Tabs Layout ═══════ */}
      <section className="pb-16 sm:pb-24 px-5 sm:px-8">
        <FeatureTabsUI locale={locale} />
      </section>

      {/* ═══════ Desktop-only Product Showcase (hidden on mobile) ═══════ */}
      <ProductShowcase locale={locale} />

      {/* ═══════ Free QR Generator CTA — links to dedicated solution page ═══════ */}
      <section
        id="qr-generator"
        aria-labelledby="qr-generator-cta-title"
        className="py-16 sm:py-24 px-5 sm:px-8"
      >
        <div className="max-w-[1040px] mx-auto">
          <div className="relative bg-white border border-[#1A2332] rounded-[24px] sm:rounded-[32px] shadow-md p-6 sm:p-10 lg:p-14 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 items-center">
              <div className="md:col-span-2 space-y-4 text-left">
                <div className="inline-flex items-center gap-2 bg-[#F4B400] text-[#1A2332] px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.12em] border border-[#1A2332] shadow-md">
                  <QrCode size={14} />
                  {locale === 'tr' ? 'ÜCRETSİZ ARAÇ' : 'FREE TOOL'}
                </div>
                <h2
                  id="qr-generator-cta-title"
                  className="text-[26px] sm:text-[36px] lg:text-[42px] font-extrabold text-[#1A2332] leading-[1.1] tracking-[-0.02em] text-balance"
                >
                  {locale === 'tr'
                    ? 'Kendi QR Kodunuzu Saniyeler İçinde Oluşturun'
                    : 'Build Your Own QR Code in Seconds'}
                </h2>
                <p className="text-[15px] sm:text-[16px] text-[#2A3444] font-medium leading-relaxed max-w-[560px]">
                  {locale === 'tr'
                    ? 'Menü, rezervasyon veya web sitenizin bağlantısını girin — biz de size özel, yüksek çözünürlüklü bir QR kodu üretelim.'
                    : 'Paste your menu, reservation page, or website URL — and we\'ll generate a high-resolution QR code tailored to it.'}
                </p>
                <div className="pt-2">
                  <Link
                    href={`${base}/solutions/qr-generator`}
                    className="inline-flex items-center gap-2 bg-[#1A2332] text-white font-extrabold text-[14px] sm:text-[15px] px-6 sm:px-7 py-3.5 sm:py-4 rounded-xl border border-[#1A2332] shadow-md hover:-translate-y-0.5 hover:shadow-md active:translate-x-[5px] active:translate-y-[6px] active:shadow-none transition-all"
                  >
                    {locale === 'tr' ? 'QR Kod Oluştur' : 'Generate a QR Code'}
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>

              {/* Decorative QR glyph — pure CSS, no runtime */}
              <div className="hidden md:flex justify-center">
                <div
                  aria-hidden
                  className="relative w-[180px] h-[180px] bg-[#F8F6F1] border border-[#1A2332] rounded-2xl shadow-md rotate-[4deg] flex items-center justify-center"
                >
                  <QrCode size={112} className="text-[#1A2332]" strokeWidth={1.5} />
                  <span className="absolute -top-2 -right-2 bg-[#F4B400] text-[#1A2332] text-[10px] font-black uppercase tracking-widest border border-[#1A2332] rounded-full px-2.5 py-1 shadow-md">
                    {locale === 'tr' ? 'YENİ' : 'NEW'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ How It Works (3D Cards) ═══════ */}
      <section id="how-it-works" className="py-16 sm:py-24 px-5 sm:px-8 bg-white border-y border-[#E8ECF2]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-[12px] font-black uppercase tracking-widest text-[#F4B400] mb-4">{locale === 'tr' ? 'BASİT VE ETKİLİ' : 'SIMPLE & EFFECTIVE'}</p>
            <h2 className="text-[32px] sm:text-[42px] font-extrabold text-[#1A2332] tracking-[-0.03em] leading-tight">
              {locale === 'tr' ? 'Süreç Nasıl İlerler?' : 'How It Works'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: '01',
                title: locale === 'tr' ? 'QR Kodunuzu Hazırlayın' : 'Prepare Your QR Code',
                desc: locale === 'tr' ? 'Panelimizden size özel şık QR kod tasarımları oluşturun, basın ve işletmenizin en stratejik noktalarına yerleştirin.' : 'Create custom, sleek QR code designs from our dashboard, print them, and place them at strategic spots in your business.',
                icon: <Zap size={24} />
              },
              {
                step: '02',
                title: locale === 'tr' ? 'Müşteriye Kolaylık Sağlayın' : 'Make It Easy for Customers',
                desc: locale === 'tr' ? 'Müşterileriniz bir uygulama indirmeden saniyeler içinde QR kodu tarasın ve doğrudan puanlama sayfasına ulaşsın.' : 'Your customers scan the QR code in seconds without downloading an app and go straight to the rating page.',
                icon: <Users size={24} />
              },
              {
                step: '03',
                title: locale === 'tr' ? 'Operasyonlarınızı Yönetin' : 'Manage Your Operations',
                desc: locale === 'tr' ? 'Geri bildirimleri anlık takip edin, operasyonel akışlarla deneyimi iyileştirin ve krizleri büyümeden profesyonelce yönetin.' : 'Monitor feedback in real-time, improve experience via operational flows, and manage crises professionally before they escalate.',
                icon: <Trophy size={24} />
              }
            ].map((item, i) => (
              <div key={i} className="group relative bg-[#F8F6F1] p-8 rounded-2xl border border-[#1A2332] shadow-md hover:-translate-y-2 transition-transform duration-300">
                <div className="absolute -top-5 -right-5 w-14 h-14 bg-[#F4B400] rounded-full border border-[#1A2332] shadow-md flex items-center justify-center text-[18px] font-black text-[#1A2332] z-10">
                  {item.step}
                </div>
                <div className="w-12 h-12 bg-white rounded-xl border border-[#1A2332] flex items-center justify-center mb-6 text-[#1A2332]">
                  {item.icon}
                </div>
                <h3 className="text-[20px] font-extrabold text-[#1A2332] mb-4">{item.title}</h3>
                <p className="text-[14px] text-[#2A3444] leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ Google Compliance Trust Section ═══════ */}
      <section className="py-12 sm:py-16 px-5 sm:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-white border border-[#1A2332] rounded-[24px] p-6 sm:p-10 shadow-md flex flex-col md:flex-row items-center gap-8 justify-between">
            <div className="space-y-4 max-w-[650px]">
              <div className="inline-flex items-center gap-2 bg-[#F4B400] text-[#1A2332] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border-2 border-[#1A2332]">
                <ShieldCheck size={14} />
                {t.google_compliance_badge}
              </div>
              <h2 className="text-[24px] sm:text-[32px] font-extrabold text-[#1A2332] leading-tight">
                {t.google_compliance_home_title}
              </h2>
              <p className="text-[14px] sm:text-[15px] text-[#2A3444] font-medium leading-relaxed">
                {t.google_compliance_home_desc}
              </p>
            </div>
            <div>
              <CtaButton variant="secondary" href={`${base}/google-compliance`}>
                {locale === 'tr' ? 'Detayları Gör' : 'View Details'}
                <ArrowRight size={16} className="ml-2" />
              </CtaButton>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ CTA Banner ═══════ */}
      <section className="px-5 sm:px-8">
        <CtaBanner locale={locale} />
      </section>

      <CaseStudies locale={locale} t={t} />

      <CustomerTestimonials locale={locale} />

      {/* ═══════ Trust / Why Buaze Section (3D Redesign) ═══════ */}
      <section
        aria-labelledby="command-center-title"
        className="py-16 sm:py-24 lg:py-32 px-4 sm:px-8 bg-[#F8F6F1]"
      >
        <div className="max-w-[1240px] mx-auto">
          <div className="relative bg-[#1A2332] rounded-[24px] sm:rounded-[32px] lg:rounded-[48px] p-6 sm:p-10 lg:p-20 border sm:border border-[#1A2332] shadow-md sm:shadow-md lg:shadow-md overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F4B400]/10 blur-[120px] rounded-full -mr-32 -mt-32 pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-20 items-center">
              {/* Left Content Column */}
              <div className="lg:col-span-6 space-y-8 sm:space-y-10">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 bg-[#F4B400] text-[#1A2332] px-3.5 py-1.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-[0.1em] border-2 border-[#1A2332] shadow-md">
                    <ShieldCheck size={14} />
                    {locale === 'tr' ? 'RAKİPSİZ KORUMA' : 'UNRIVALED PROTECTION'}
                  </div>
                  <h2
                    id="command-center-title"
                    className="text-[28px] sm:text-[40px] lg:text-[56px] font-extrabold text-white leading-[1.05] tracking-[-0.03em] text-balance"
                  >
                    {locale === 'tr' ? 'Dijital İtibarınızın' : 'Your Digital Reputation\'s'}
                    <br />
                    <span className="bg-gradient-to-r from-[#F4B400] to-[#FFD666] bg-clip-text text-transparent">
                      {locale === 'tr' ? 'Komuta Merkezi' : 'Command Center'}
                    </span>
                  </h2>
                  <p className="text-[15px] sm:text-[17px] lg:text-[18px] text-white/90 font-medium leading-relaxed max-w-[520px] text-pretty">
                    {locale === 'tr'
                      ? 'Buaze sadece veri toplamaz; itibarınızı proaktif bir zırh gibi korur ve her etkileşimi kalıcı bir güvene dönüştürür.'
                      : 'Buaze doesn\'t just collect data; it protects your reputation like a proactive shield and turns every interaction into lasting trust.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:gap-5">
                  {[
                    {
                      title: locale === 'tr' ? 'Anlık Deneyim Takibi' : 'Real-Time Experience Tracking',
                      desc: locale === 'tr' ? 'Müşteri deneyimini anlık olarak yapılandırılmış veriye dönüştüren akıllı sistem.' : 'An intelligent system that converts customer experience into structured data in real-time.',
                      icon: <Zap size={20} className="text-[#F4B400]" />,
                    },
                    {
                      title: locale === 'tr' ? 'İtibarınızı Zirveye Taşıyın' : 'Elevate Your Reputation',
                      desc: locale === 'tr' ? 'Google, TripAdvisor ve Yelp üzerinde organik ve güvenli bir itibar artışı sağlayın.' : 'Achieve organic and secure reputation growth on Google, TripAdvisor, and Yelp.',
                      icon: <Trophy size={20} className="text-[#F4B400]" />,
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="group flex gap-4 sm:gap-5 bg-white/[0.08] border border-white/15 p-5 sm:p-6 rounded-2xl hover:bg-white/[0.12] hover:border-[#F4B400]/40 transition-all hover:translate-x-2"
                    >
                      <div className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 bg-[#F4B400]/15 rounded-xl border border-[#F4B400]/30 flex items-center justify-center group-hover:bg-[#F4B400]/25 transition-colors">
                        {item.icon}
                      </div>
                      <div className="space-y-1.5 min-w-0">
                        <h3 className="text-[16px] sm:text-[18px] font-extrabold text-white leading-tight">
                          {item.title}
                        </h3>
                        <p className="text-[13px] sm:text-[14px] text-white/85 font-medium leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Visual Column (3D Dash) */}
              <div className="lg:col-span-6 relative flex justify-center lg:justify-end mt-4 lg:mt-0">
                {/* Floating Metric Chips — constrained to parent on mobile via left-0 instead of -left-X */}
                <div className="absolute -top-6 sm:-top-8 lg:-top-16 left-0 sm:left-2 lg:-left-6 z-20 transform hover:-translate-y-1 transition-transform cursor-default">
                  <div className="bg-white px-4 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl border border-[#1A2332] shadow-md sm:shadow-md">
                    <div className="text-[9px] sm:text-[10px] font-black text-[#2A3444] uppercase mb-0.5 sm:mb-1 tracking-wider">
                      {locale === 'tr' ? 'CANLI ANALİZ' : 'LIVE ANALYTICS'}
                    </div>
                    <div className="text-[18px] sm:text-[22px] lg:text-[24px] font-black text-[#1A2332] flex items-center gap-1.5 sm:gap-2">
                      <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#16A34A] rounded-full animate-pulse" />
                      98.5%
                    </div>
                  </div>
                </div>

                {/* Mockup wrapper — allows the floating badge to escape the clipped inner */}
                <div className="relative w-full max-w-[500px] transform lg:rotate-[-2deg]">
                {/* Main 3D Browser Mockup — admin panel visual language */}
                <div className="relative w-full h-[380px] sm:h-[440px] lg:h-[460px] bg-[#0E1525] rounded-[24px] sm:rounded-[32px] border border-white/10 shadow-2xl shadow-[#F4B400]/10 flex flex-col overflow-hidden">
                   {/* Browser Bar */}
                   <div className="bg-[#1A2332] border-b border-white/10 px-4 py-3 flex items-center gap-3 flex-shrink-0">
                      <div className="flex gap-1.5">
                         <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
                         <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
                         <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
                      </div>
                      <div className="flex-1 bg-white/10 border border-white/15 rounded-md px-3 py-1 text-[9px] sm:text-[10px] text-white/75 font-mono truncate">
                        buaze.com/admin/dashboard
                      </div>
                   </div>

                   {/* Mock Dashboard Content */}
                   <div className="p-3 sm:p-4 space-y-3 flex-1 overflow-hidden text-left">
                      {/* Stat Cards */}
                      <div className="grid grid-cols-2 gap-2">
                         <div className="bg-white/6 p-2.5 sm:p-3 rounded-xl border border-white/10 space-y-1">
                            <div className="text-[8px] sm:text-[9px] text-white/60 font-bold uppercase tracking-wider">{locale === 'tr' ? 'TOPLAM YORUM' : 'TOTAL REVIEWS'}</div>
                            <div className="text-[17px] sm:text-[20px] font-black text-white flex items-baseline gap-1">
                              142
                              <span className="text-[9px] font-bold text-[#4ade80]">↑ 23%</span>
                            </div>
                         </div>
                         <div className="bg-white/6 p-2.5 sm:p-3 rounded-xl border border-white/10 space-y-1">
                            <div className="text-[8px] sm:text-[9px] text-white/60 font-bold uppercase tracking-wider">{locale === 'tr' ? 'ORT. PUAN' : 'AVG. SCORE'}</div>
                            <div className="text-[17px] sm:text-[20px] font-black text-[#F4B400] flex items-baseline gap-1">
                              4.8
                              <span className="text-[9px] font-bold text-white/60">/ 5.0</span>
                            </div>
                         </div>
                         <div className="bg-white/6 p-2.5 sm:p-3 rounded-xl border border-white/10 space-y-1">
                            <div className="text-[8px] sm:text-[9px] text-white/60 font-bold uppercase tracking-wider">{locale === 'tr' ? 'QR TARAMA' : 'QR SCANS'}</div>
                            <div className="text-[17px] sm:text-[20px] font-black text-white flex items-baseline gap-1">
                              891
                              <span className="text-[9px] font-bold text-[#4ade80]">↑ 41%</span>
                            </div>
                         </div>
                         <div className="bg-white/6 p-2.5 sm:p-3 rounded-xl border border-white/10 space-y-1">
                            <div className="text-[8px] sm:text-[9px] text-white/60 font-bold uppercase tracking-wider">{locale === 'tr' ? 'OLUMLU YÖN.' : 'POS. REDIRECT'}</div>
                            <div className="text-[17px] sm:text-[20px] font-black text-[#4ade80] flex items-baseline gap-1">
                              %82
                              <span className="text-[9px] font-bold text-white/60">{locale === 'tr' ? 'oran' : 'rate'}</span>
                            </div>
                         </div>
                      </div>

                      {/* Platform Distribution */}
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-2">
                         <div className="text-[8px] sm:text-[9px] text-white/70 font-black uppercase tracking-wider mb-1">{locale === 'tr' ? 'PLATFORM DAĞILIMI' : 'PLATFORM BREAKDOWN'}</div>
                         {[
                           { label: 'Google', pct: 72, color: '#4285F4' },
                           { label: 'Yemeksepeti', pct: 18, color: '#FA0050' },
                           { label: 'Getir', pct: 10, color: '#5D3EBC' },
                         ].map(p => (
                           <div key={p.label} className="flex items-center gap-2">
                             <span className="text-[7px] sm:text-[8px] font-bold text-white/70 w-16 sm:w-20 shrink-0">{p.label}</span>
                             <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                               <div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: p.color }} />
                             </div>
                             <span className="text-[7px] sm:text-[8px] font-bold text-white/60 w-6 text-right">{p.pct}%</span>
                           </div>
                         ))}
                      </div>

                      {/* Mini Review Row */}
                      <div className="bg-white/5 px-3 py-2.5 rounded-xl border border-white/10 flex items-center gap-3">
                         <div className="flex gap-0.5 flex-shrink-0">
                            {[1,2,3,4,5].map(i => <Star key={i} size={9} fill="#F4B400" strokeWidth={0} />)}
                         </div>
                         <span className="text-[9px] sm:text-[10px] text-white/80 font-medium truncate">
                           {locale === 'tr' ? '"Harika bir deneyim, kesinlikle tavsiye ederim."' : '"Great experience, highly recommend!"'}
                         </span>
                         <span className="text-[8px] text-white/60 font-medium flex-shrink-0">2dk</span>
                      </div>
                   </div>
                </div>

                {/* Floating Bottom Badge — positioned relative to wrapper, escapes clip */}
                <div className="absolute -bottom-3 right-3 sm:-bottom-4 sm:right-4 lg:-bottom-5 lg:-right-5 z-20">
                   <div className="bg-[#F4B400] text-[#1A2332] px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl border border-[#1A2332] shadow-lg flex items-center gap-2 group cursor-default">
                      <Zap size={16} fill="#1A2332" className="sm:w-[18px] sm:h-[18px] group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.1em] whitespace-nowrap">{locale === 'tr' ? 'AKTİF KORUMA' : 'ACTIVE PROTECTION'}</span>
                   </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ Pricing Section ═══════ */}
      <section id="pricing" className="py-16 sm:py-24 px-5 sm:px-8 bg-[#F8F6F1]">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-12 sm:mb-16 space-y-3">
            <h2 className="text-[28px] sm:text-[42px] font-extrabold text-[#1A2332] tracking-[-0.02em] text-balance">{t.pricing_title}</h2>
            <p className="text-[14px] sm:text-[15px] text-[#F4B400] font-semibold">{t.pricing_subtitle}</p>
          </div>

          {/* Single, responsive grid — renders plans exactly once on all sizes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 md:pt-4">
            {/* Monthly Plan */}
            <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl border border-[#1A2332] shadow-md hover:-translate-y-1 transition-transform flex flex-col">
              <h3 className="text-[20px] font-extrabold mb-1.5 text-[#1A2332]">{t.pricing_monthly_title}</h3>
              <p className="text-[#2A3444] text-[13px] mb-6">{t.pricing_monthly_desc}</p>
              <div className="mb-6 sm:mb-8">
                <span className="text-[40px] sm:text-[48px] font-extrabold tracking-tighter text-[#1A2332]">{t.pricing_monthly_price}</span>
                <span className="text-[#6B7280] font-medium ml-1 text-[14px]">{t.pricing_monthly_period}</span>
              </div>
              <ul className="space-y-3 sm:space-y-4 mb-8 sm:mb-10 flex-1">
                {[t.pricing_feature_unlimited_qr, t.pricing_feature_feedback, t.pricing_feature_panel, t.pricing_feature_mobile].map(feat => (
                  <li key={feat} className="flex items-start gap-2.5 text-[13px] sm:text-[14px] font-medium text-[#1A2332]">
                    <CheckCircle2 size={16} className="text-[#6B7280] flex-shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`${base}/auth/register`}
                className="block w-full text-center py-3.5 bg-white text-[#1A2332] font-extrabold text-[14px] sm:text-[15px] rounded-lg border border-[#1A2332] shadow-sm hover:bg-[#F8F6F1] transition-all active:translate-y-[4px] active:shadow-none"
              >
                {t.pricing_monthly_cta}
              </Link>
            </div>

            {/* Yearly Plan */}
            <div className="bg-[#1A2332] p-6 sm:p-8 md:p-10 pt-10 sm:pt-10 md:pt-10 rounded-2xl border border-[#1A2332] relative flex flex-col text-white shadow-md hover:-translate-y-1 transition-transform">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#F4B400] text-[#1A2332] px-4 py-1.5 rounded-full font-black text-[10px] sm:text-[11px] uppercase tracking-widest border border-[#1A2332] whitespace-nowrap">
                {t.pricing_yearly_badge}
              </div>
              <h3 className="text-[20px] font-extrabold mb-1.5">{t.pricing_yearly_title}</h3>
              <p className="text-white/70 text-[13px] mb-6">{t.pricing_yearly_desc}</p>
              <div className="mb-6 sm:mb-8">
                <span className="text-[40px] sm:text-[48px] font-extrabold tracking-tighter">{t.pricing_yearly_price}</span>
                <span className="text-white/60 font-medium ml-1 text-[14px]">{t.pricing_yearly_period}</span>
              </div>
              <ul className="space-y-3 sm:space-y-4 mb-8 sm:mb-10 flex-1">
                {[t.pricing_feature_all, t.pricing_feature_free_months, t.pricing_feature_priority, t.pricing_feature_google].map(feat => (
                  <li key={feat} className="flex items-start gap-2.5 text-[13px] sm:text-[14px] font-medium text-white/80">
                    <CheckCircle2 size={16} className="text-[#F4B400] flex-shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`${base}/auth/register`}
                className="block w-full text-center py-3.5 bg-[#F4B400] text-[#1A2332] font-extrabold text-[14px] sm:text-[15px] rounded-lg border border-[#1A2332] shadow-sm hover:bg-[#F4B400] transition-all active:translate-y-[4px] active:shadow-none"
              >
                {t.pricing_yearly_cta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ Final CTA ═══════ */}
      <section className="py-20 sm:py-28 lg:py-32 px-5 sm:px-8 text-center bg-[#1A2332] relative overflow-hidden">
        {/* Subtle dotted pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* Gold glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#F4B400]/8 blur-[140px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-[760px] mx-auto space-y-7 sm:space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#F4B400]/10 border border-[#F4B400]/25 rounded-full px-4 py-1.5">
            <Zap size={14} className="text-[#F4B400]" fill="#F4B400" />
            <span className="text-[10px] sm:text-[11px] font-black text-[#F4B400] uppercase tracking-[0.15em]">
              {locale === 'tr' ? '14 GÜN ÜCRETSİZ' : '14-DAY FREE TRIAL'}
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-[30px] sm:text-[44px] lg:text-[56px] font-extrabold text-white leading-[1.08] tracking-[-0.025em] text-balance px-2">
            {t.cta_title_1}{' '}
            <span className="bg-gradient-to-r from-[#F4B400] to-[#FFD666] bg-clip-text text-transparent">
              {t.cta_title_2}
            </span>
          </h2>

          {/* Supporting description */}
          <p className="text-[15px] sm:text-[17px] lg:text-[18px] text-white/80 font-medium max-w-[560px] mx-auto leading-relaxed text-pretty">
            {locale === 'tr'
              ? 'Kredi kartı gerekmez. 5 dakikada kurulum, anında kullanım. 500+ işletmenin tercihi.'
              : 'No credit card required. 5-minute setup, instant access. Trusted by 500+ businesses.'}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 pt-2">
            <CtaButton variant="primary" href={`${base}/auth/register`} className="w-full sm:w-auto">
              {t.cta_button} <ArrowRight size={18} className="ml-2" />
            </CtaButton>
            <CtaButton variant="secondary" href={`${base}/pricing`} className="w-full sm:w-auto">
              {locale === 'tr' ? 'Planları İncele' : 'View Plans'}
            </CtaButton>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 pt-4 text-[12px] sm:text-[13px] text-white/70 font-semibold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-[#4ade80]" />
              {locale === 'tr' ? '500+ aktif işletme' : '500+ active businesses'}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-[#4ade80]" />
              {locale === 'tr' ? '%92 itibar artışı' : '92% reputation growth'}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-[#4ade80]" />
              {locale === 'tr' ? '5dk kurulum' : '5-min setup'}
            </span>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
