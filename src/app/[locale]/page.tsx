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
    <div className="min-h-screen overflow-x-clip bg-[#FCFBF7] text-[#1f1e1d] font-sans selection:bg-[#FDBF1D]/30 selection:text-[#1f1e1d] pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MarketingNavbar locale={locale} t={t} />

      {/* ═══════════════════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════════════════ */}
      <section className="pt-10 sm:pt-16 lg:pt-20 pb-4 sm:pb-8 px-5 sm:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center mt-4 sm:mt-8">
            {/* Left: Content */}
            <div className="text-left space-y-6">
              <h1 className="text-[32px] sm:text-[42px] lg:text-[56px] font-extrabold leading-[1.1] tracking-[-0.04em] text-[#1f1e1d]">
                {t.hero_title_1} <br />
                <span className="text-[#FDBF1D]">{t.hero_title_2}</span>
              </h1>
              <p className="text-[17px] text-[#6b6760] font-medium leading-relaxed max-w-[500px]">
                {t.hero_subtitle}
              </p>

              <div className="space-y-1.5 pt-1">
                <p className="text-[15px] text-[#6b6760] font-normal">
                  {locale === 'tr' ? 'Dakikalar içinde kurulun ve başlayın' : 'Get up and running in minutes'}
                </p>
                <p className="text-[15px] text-[#6b6760] font-normal">
                  {locale === 'tr' ? 'Hazır olduğunuzda yükseltin' : 'Upgrade when you\'re ready'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5 pt-4">
                <CtaButton variant="primary" href={`${base}/auth/register`}>
                  {t.hero_cta}
                </CtaButton>
                <CtaButton variant="secondary" href={`${base}/pricing`}>
                  {locale === 'tr' ? 'Planları İncele' : 'View Plans'}
                </CtaButton>
              </div>

              <p className="text-[12px] text-[#ada89f] font-bold tracking-wide">
                {locale === 'tr' ? '14 Gün Ücretsiz Deneme • Kredi Kartı Gerekmez' : '14 Day Free Trial • No Credit Card Required'}
              </p>
            </div>

            {/* Right: Floating Quote Bubbles with dot pattern */}
              {/* Right: Floating Quote Bubbles with layout matching the image */}
              <div className="relative w-full flex flex-col gap-0 lg:block min-h-[400px] lg:h-[460px] mt-10 lg:mt-0 items-center lg:items-start px-2 lg:px-0">
                {/* Dot pattern */}
                <div
                  className="absolute inset-0 w-full h-full opacity-[0.08]"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #ada89f 1px, transparent 1px)',
                    backgroundSize: '18px 18px',
                  }}
                />

                {/* Box 1: Super easy (Top) */}
                <div 
                  className="hero-quote-wrapper _7 relative lg:absolute lg:top-2 lg:left-0 w-[95%] max-w-[260px] bg-white rounded-xl border-[2.5px] border-[#1f1e1d] p-5 shadow-[8px_10px_0_0_#1f1e1d] z-10 transform hover:-translate-y-2 transition-transform self-start -mb-6 lg:mb-0"
                >
                  <div className="f-testimonial-star-wrapper flex gap-[2px] mb-3">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="f-icon-regular w-embed">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M11.999 15.8196L7.50882 18.562L8.72951 13.4439L4.73438 10.0217L9.97847 9.60156L11.999 4.74323L14.0194 9.60156L19.2643 10.0217L15.2684 13.4439L16.4891 18.562L11.999 15.8196Z" fill="#FDBF1D"></path>
                        </svg>
                      </div>
                    ))}
                  </div>
                  <div className="paragraph-small text-[14px] text-[#1f1e1d] font-semibold leading-[1.6]">
                    {locale === 'tr'
                      ? '"Kullanımı süper kolay ve kusursuz çalışıyor"'
                      : '"Super easy to use and worked perfectly"'}
                  </div>
                  <Image
                    src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/671b9cc7ca4194d481c266fd_speech-triangle-white.png"
                    alt=""
                    width={24}
                    height={24}
                    sizes="24px"
                    className="image-20 right white absolute -bottom-[16px] left-6 w-6 z-20"
                  />
                  <Image
                    src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/671bb0c86380dac30cb9f805_Triangle-dark.png"
                    alt=""
                    width={32}
                    height={32}
                    sizes="(max-width: 1024px) 0px, 32px"
                    className="image-20 right absolute -bottom-[20px] left-5 w-[32px] z-10 hidden lg:block"
                  />
                </div>

                {/* Box 2: Really love (Middle) */}
                <div 
                  className="hero-quote-wrapper _7 relative lg:absolute lg:top-[120px] lg:right-2 w-[98%] max-w-[290px] bg-white rounded-xl border-[2.5px] border-[#1f1e1d] p-5 shadow-[8px_10px_0_0_#1f1e1d] z-30 transform hover:-translate-y-2 transition-transform self-end lg:self-auto -mb-6 lg:mb-0"
                >
                  <div className="f-testimonial-star-wrapper flex gap-[2px] mb-3">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="f-icon-regular w-embed">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M11.999 15.8196L7.50882 18.562L8.72951 13.4439L4.73438 10.0217L9.97847 9.60156L11.999 4.74323L14.0194 9.60156L19.2643 10.0217L15.2684 13.4439L16.4891 18.562L11.999 15.8196Z" fill="#FDBF1D"></path>
                        </svg>
                      </div>
                    ))}
                  </div>
                  <div className="paragraph-small text-[14px] text-[#1f1e1d] font-semibold leading-[1.6]">
                    {locale === 'tr'
                      ? '"Buaze\'yi kullanmak gerçekten çok kolay. Yorum toplamak konusunda müthiş zaman kazandırıyor"'
                      : '"Really love how easy Buaze is to use. It saves so much time collecting reviews"'}
                  </div>
                  <Image
                    src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/671b9cc7ca4194d481c266fd_speech-triangle-white.png"
                    alt=""
                    width={24}
                    height={24}
                    sizes="24px"
                    className="image-20 right white absolute -bottom-[16px] right-8 w-6 z-20"
                  />
                  <Image
                    src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/671bb0c86380dac30cb9f805_Triangle-dark.png"
                    alt=""
                    width={32}
                    height={32}
                    sizes="(max-width: 1024px) 0px, 32px"
                    className="image-20 right absolute -bottom-[20px] right-[27px] w-[32px] z-10 hidden lg:block"
                  />
                </div>

                {/* Box 3: Buaze makes (Bottom) */}
                <div 
                  className="hero-quote-wrapper _7 relative lg:absolute lg:top-[250px] lg:left-6 w-[95%] max-w-[260px] bg-white rounded-xl border-[2.5px] border-[#1f1e1d] p-5 shadow-[8px_10px_0_0_#1f1e1d] z-20 transform hover:-translate-y-2 transition-transform self-start -mt-2 lg:mt-0"
                >
                  <div className="f-testimonial-star-wrapper flex gap-[2px] mb-3">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="f-icon-regular w-embed">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M11.999 15.8196L7.50882 18.562L8.72951 13.4439L4.73438 10.0217L9.97847 9.60156L11.999 4.74323L14.0194 9.60156L19.2643 10.0217L15.2684 13.4439L16.4891 18.562L11.999 15.8196Z" fill="#FDBF1D"></path>
                        </svg>
                      </div>
                    ))}
                  </div>
                  <div className="paragraph-small text-[14px] text-[#1f1e1d] font-semibold leading-[1.6]">
                    {locale === 'tr'
                      ? '"Buaze ile yorumları takip etmek ve yanıtlamak artık çok zahmetsiz"'
                      : '"Buaze makes tracking and replying to reviews effortless."'}
                  </div>
                  <Image
                    src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/671b9cc7ca4194d481c266fd_speech-triangle-white.png"
                    alt=""
                    width={24}
                    height={24}
                    sizes="24px"
                    className="image-20 right white absolute -bottom-[16px] left-8 w-6 z-20"
                  />
                  <Image
                    src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/671bb0c86380dac30cb9f805_Triangle-dark.png"
                    alt=""
                    width={32}
                    height={32}
                    sizes="(max-width: 1024px) 0px, 32px"
                    className="image-20 right absolute -bottom-[20px] left-[27px] w-[32px] z-10 hidden lg:block"
                  />
                </div>
              </div>
            </div>

            {/* Mobile-only: Single testimonial */}
            <div className="hero-quote-wrapper _7 lg:hidden mt-10 relative max-w-sm mx-auto bg-white rounded-xl border-[2.5px] border-[#1f1e1d] p-5 shadow-[4px_6px_0_0_#1f1e1d]">
              <div className="f-testimonial-star-wrapper flex gap-[2px] mb-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="f-icon-regular w-embed">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M11.999 15.8196L7.50882 18.562L8.72951 13.4439L4.73438 10.0217L9.97847 9.60156L11.999 4.74323L14.0194 9.60156L19.2643 10.0217L15.2684 13.4439L16.4891 18.562L11.999 15.8196Z" fill="#FDBF1D"></path>
                    </svg>
                  </div>
                ))}
              </div>
              <div className="paragraph-small text-[14px] text-[#1f1e1d] font-semibold leading-[1.6]">
                {locale === 'tr'
                  ? '"Buaze\'yi kullanmak gerçekten çok kolay. Yorum toplamak konusunda müthiş zaman kazandırıyor"'
                  : '"Really love how easy Buaze is to use. It saves so much time collecting reviews"'}
              </div>
              <Image
                src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/671b9cc7ca4194d481c266fd_speech-triangle-white.png"
                alt=""
                width={24}
                height={24}
                sizes="24px"
                className="image-20 right white absolute -bottom-[15px] right-8 w-6 z-20"
              />
              <Image
                src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/671bb0c86380dac30cb9f805_Triangle-dark.png"
                alt=""
                width={32}
                height={32}
                sizes="32px"
                className="image-20 right absolute -bottom-[19px] right-[27px] w-[32px] z-10"
              />
            </div>

          {/* Mobile hero CTA repeat */}
          <div className="lg:hidden mt-6 pt-5 border-t border-[#e8e4de]/50 text-center space-y-3">
            <p className="text-[13px] font-bold text-[#6b6760]">
              {locale === 'tr' ? 'Dakikalar içinde kurulun • Hazır olduğunuzda yükseltin' : 'Get up and running in minutes • Upgrade when you\'re ready'}
            </p>
            <div className="flex flex-col gap-4">
              <CtaButton variant="primary" href={`${base}/auth/register`}>
                {locale === 'tr' ? 'Ücretsiz Dene' : 'Try for Free'}
              </CtaButton>
              <CtaButton variant="secondary" href={`${base}/pricing`}>
                {locale === 'tr' ? 'Planları İncele' : 'View Plans'}
              </CtaButton>
            </div>
            <p className="text-[11px] text-[#ada89f] font-bold">
              {locale === 'tr' ? '14 Gün Ücretsiz Deneme • Kredi Kartı Gerekmez' : '14 Day Free Trial • No Credit Card Required'}
            </p>
          </div>
        </div>
      </section>

      {/* ═══════ Logo Carousel ═══════ */}
      <section className="py-12 sm:py-16 px-5 sm:px-8">
        <div className="max-w-[1000px] mx-auto">
          <div className="flex flex-wrap justify-center gap-x-10 sm:gap-x-14 gap-y-5 items-center opacity-30 hover:opacity-50 transition-opacity duration-500">
            {['Google', 'TripAdvisor', 'Yelp', 'Foursquare', 'Zomato'].map(site => (
              <span key={site} className="text-lg sm:text-xl font-bold text-[#1f1e1d] tracking-tight cursor-default select-none">
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

      {/* ═══════ How It Works (3D Cards) ═══════ */}
      <section id="how-it-works" className="py-16 sm:py-24 px-5 sm:px-8 bg-white border-y border-[#e8e4de]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-[12px] font-black uppercase tracking-widest text-[#FDBF1D] mb-4">{locale === 'tr' ? 'BASİT VE ETKİLİ' : 'SIMPLE & EFFECTIVE'}</p>
            <h2 className="text-[32px] sm:text-[42px] font-extrabold text-[#1f1e1d] tracking-[-0.03em] leading-tight">
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
              <div key={i} className="group relative bg-[#FCFBF7] p-8 rounded-2xl border-[2.5px] border-[#1f1e1d] shadow-[4px_6px_0_0_#1f1e1d] hover:-translate-y-2 transition-transform duration-300">
                <div className="absolute -top-5 -right-5 w-14 h-14 bg-[#FDBF1D] rounded-full border-[2px] border-[#1f1e1d] shadow-[2px_3px_0_0_#1f1e1d] flex items-center justify-center text-[18px] font-black text-[#1f1e1d] z-10">
                  {item.step}
                </div>
                <div className="w-12 h-12 bg-white rounded-xl border-[2px] border-[#1f1e1d] flex items-center justify-center mb-6 text-[#1f1e1d]">
                  {item.icon}
                </div>
                <h3 className="text-[20px] font-extrabold text-[#1f1e1d] mb-4">{item.title}</h3>
                <p className="text-[14px] text-[#6b6760] leading-relaxed font-medium">
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
          <div className="bg-white border-[2.5px] border-[#1f1e1d] rounded-[24px] p-6 sm:p-10 shadow-[8px_10px_0_0_#FDBF1D] flex flex-col md:flex-row items-center gap-8 justify-between">
            <div className="space-y-4 max-w-[650px]">
              <div className="inline-flex items-center gap-2 bg-[#FDBF1D] text-[#1f1e1d] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border-2 border-[#1f1e1d]">
                <ShieldCheck size={14} />
                {t.google_compliance_badge}
              </div>
              <h2 className="text-[24px] sm:text-[32px] font-extrabold text-[#1f1e1d] leading-tight">
                {t.google_compliance_home_title}
              </h2>
              <p className="text-[14px] sm:text-[15px] text-[#6b6760] font-medium leading-relaxed">
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
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#FCFBF7]">
        <div className="max-w-[1240px] mx-auto">
          <div className="relative bg-[#1f1e1d] rounded-[32px] sm:rounded-[48px] p-8 sm:p-14 lg:p-20 border-[3px] border-[#1f1e1d] shadow-[16px_20px_0_0_#FDBF1D] overflow-hidden lg:overflow-visible">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ea580c]/10 blur-[120px] rounded-full -mr-32 -mt-32 pointer-events-none" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
              {/* Left Content Column */}
              <div className="lg:col-span-6 space-y-10">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 bg-[#FDBF1D] text-[#1f1e1d] px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.1em] border-2 border-[#1f1e1d] shadow-[3px_4px_0_0_#1f1e1d]">
                    <ShieldCheck size={16} />
                    {locale === 'tr' ? 'RAKİPSİZ KORUMA' : 'UNRIVALED PROTECTION'}
                  </div>
                  <h2 className="text-[36px] sm:text-[48px] lg:text-[56px] font-extrabold text-white leading-[1.05] tracking-[-0.04em]">
                    {locale === 'tr' ? 'Dijital İtibarınızın' : 'Your Digital Reputation\'s'}<br />
                    <span className="text-[#FDBF1D]">{locale === 'tr' ? 'Komuta Merkezi' : 'Command Center'}</span>
                  </h2>
                  <p className="text-[16px] sm:text-[18px] text-[#ada89f] font-medium leading-relaxed max-w-[500px]">
                    {locale === 'tr'
                      ? 'Buaze sadece veri toplamaz; itibarınızı proaktif bir zırh gibi korur ve her etkileşimi kalıcı bir güvene dönüştürür.'
                      : 'Buaze doesn\'t just collect data; it protects your reputation like a proactive shield and turns every interaction into lasting trust.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {[
                    { 
                      title: locale === 'tr' ? 'Anlık Deneyim Takibi' : 'Real-Time Experience Tracking', 
                      desc: locale === 'tr' ? 'Müşteri deneyimini anlık olarak yapılandırılmış veriye dönüştüren akıllı sistem.' : 'An intelligent system that converts customer experience into structured data in real-time.',
                      icon: <Zap size={20} className="text-[#FDBF1D]" />
                    },
                    { 
                      title: locale === 'tr' ? 'İtibarınızı Zirveye Taşıyın' : 'Elevate Your Reputation', 
                      desc: locale === 'tr' ? 'Google, TripAdvisor ve Yelp üzerinde organik ve güvenli bir itibar artışı sağlayın.' : 'Achieve organic and secure reputation growth on Google, TripAdvisor, and Yelp.',
                      icon: <Trophy size={20} className="text-[#ea580c]" />
                    }
                  ].map((item, i) => (
                    <div key={i} className="group flex gap-5 bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-all hover:translate-x-2">
                      <div className="flex-shrink-0 w-12 h-12 bg-white/5 rounded-xl border border-white/20 flex items-center justify-center">
                        {item.icon}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-[17px] font-extrabold text-white">{item.title}</h4>
                        <p className="text-[13px] text-[#6b6760]">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Visual Column (3D Dash) */}
              <div className="lg:col-span-6 relative flex justify-center lg:justify-end">
                {/* Floating Metric Chips */}
                <div className="absolute -top-10 lg:-top-20 -left-4 lg:-left-10 z-[40] transform hover:-translate-y-2 transition-transform cursor-default">
                  <div className="bg-white px-6 py-4 rounded-2xl border-[3px] border-[#1f1e1d] shadow-[8px_10px_0_0_#ea580c]">
                    <div className="text-[10px] font-black text-[#6b6760] uppercase mb-1">{locale === 'tr' ? 'CANLI ANALİZ' : 'LIVE ANALYTICS'}</div>
                    <div className="text-[24px] font-black text-[#1f1e1d] flex items-center gap-2">
                       <span className="w-2.5 h-2.5 bg-[#16A34A] rounded-full animate-pulse" />
                       98.5%
                    </div>
                  </div>
                </div>

                {/* Main 3D Browser Mockup */}
                <div className="relative w-full max-w-[500px] h-[360px] sm:h-[440px] bg-[#1a1a1a] rounded-[32px] border-[3px] border-[#3d3a36] shadow-[24px_32px_0_0_rgba(0,0,0,0.5)] transform lg:rotate-[-2deg] flex flex-col overflow-hidden">
                   {/* Browser Bar */}
                   <div className="bg-[#1f1e1d] border-b border-[#3d3a36] p-4 flex gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#3d3a36]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#3d3a36]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#3d3a36]" />
                   </div>
                   
                   {/* Mock Content */}
                   <div className="p-6 sm:p-8 space-y-6 flex-1 text-left">
                      <div className="space-y-3">
                         <div className="h-4 bg-white/10 w-1/3 rounded-full" />
                         <div className="flex gap-2">
                            {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="#FDBF1D" strokeWidth={0} />)}
                         </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                         <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                            <div className="text-[10px] text-[#6b6760] font-bold uppercase">{locale === 'tr' ? 'YORUMLAR' : 'REVIEWS'}</div>
                            <div className="text-[20px] font-black text-white">+142</div>
                         </div>
                         <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                            <div className="text-[10px] text-[#6b6760] font-bold uppercase">{locale === 'tr' ? 'MEMNUNİYET' : 'SATISFACTION'}</div>
                            <div className="text-[20px] font-black text-[#FDBF1D]">99%</div>
                         </div>
                      </div>

                      <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                         <div className="flex justify-between items-center mb-4">
                            <div className="h-3 bg-white/10 w-1/4 rounded-full" />
                            <div className="h-3 bg-[#FDBF1D]/20 w-10 rounded-full" />
                         </div>
                         <div className="space-y-2">
                            <div className="h-2 bg-white/5 w-full rounded-full overflow-hidden">
                               <div className="h-full w-[85%] bg-[#FDBF1D] shadow-[0_0_15px_rgba(253,191,29,0.3)]" />
                            </div>
                            <div className="h-2 bg-white/5 w-full rounded-full overflow-hidden">
                               <div className="h-full w-[65%] bg-[#ea580c] opacity-60" />
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Floating Bottom Badge */}
                   <div className="absolute bottom-6 right-6 lg:-right-10 transform translate-x-2 z-[40]">
                      <div className="bg-[#FDBF1D] text-[#1f1e1d] p-5 rounded-2xl border-[3px] border-[#1f1e1d] shadow-[6px_8px_0_0_#1f1e1d] flex flex-col items-center gap-1 group cursor-default">
                         <Zap size={24} fill="#1f1e1d" className="group-hover:scale-110 transition-transform" />
                         <span className="text-[11px] font-black uppercase tracking-widest">{locale === 'tr' ? 'AKTİF KORUMA' : 'ACTIVE PROTECTION'}</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ Pricing Section ═══════ */}
      <section id="pricing" className="py-16 sm:py-24 px-5 sm:px-8 bg-[#F7F4F0]">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-12 sm:mb-16 space-y-3">
            <h2 className="text-[32px] sm:text-[42px] font-extrabold text-[#1f1e1d] tracking-[-0.02em]">{t.pricing_title}</h2>
            <p className="text-[15px] text-[#FDBF1D] font-semibold">{t.pricing_subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Plan */}
            <div className="bg-white p-8 sm:p-10 rounded-xl border border-[#e8e4de] hover:border-[#FDBF1D]/30 transition-all flex flex-col">
              <h3 className="text-xl font-extrabold mb-1.5">{t.pricing_monthly_title}</h3>
              <p className="text-[#6b6760] text-[13px] mb-7">{t.pricing_monthly_desc}</p>
              <div className="mb-8">
                <span className="text-[48px] font-extrabold tracking-tighter">{t.pricing_monthly_price}</span>
                <span className="text-[#ada89f] font-medium ml-1 text-[14px]">{t.pricing_monthly_period}</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {[t.pricing_feature_unlimited_qr, t.pricing_feature_feedback, t.pricing_feature_panel, t.pricing_feature_mobile].map(feat => (
                  <li key={feat} className="flex items-center gap-2.5 text-[13px] sm:text-[14px] font-medium text-[#1f1e1d]">
                    <CheckCircle2 size={16} className="text-[#ada89f] flex-shrink-0" /> {feat}
                  </li>
                ))}
              </ul>
              <Link
                href={`${base}/auth/register`}
                className="block w-full text-center py-3.5 bg-white text-[#1f1e1d] font-extrabold text-[15px] rounded-lg border-[2px] border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] hover:bg-gray-50 transition-all active:translate-y-[4px] active:shadow-none"
              >
                {t.pricing_monthly_cta}
              </Link>
            </div>

            {/* Yearly Plan */}
            <div className="bg-[#1f1e1d] p-8 sm:p-10 rounded-xl border border-[#3d3a36] relative md:scale-[1.03] flex flex-col text-white shadow-[0_8px_30px_-8px_rgba(0,0,0,0.3)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FDBF1D] text-[#1f1e1d] px-5 py-1.5 rounded-full font-bold text-[11px] uppercase tracking-widest shadow-md">
                {t.pricing_yearly_badge}
              </div>
              <h3 className="text-xl font-extrabold mb-1.5">{t.pricing_yearly_title}</h3>
              <p className="text-[#6b6760] text-[13px] mb-7">{t.pricing_yearly_desc}</p>
              <div className="mb-8">
                <span className="text-[48px] font-extrabold tracking-tighter">{t.pricing_yearly_price}</span>
                <span className="text-[#6b6760] font-medium ml-1 text-[14px]">{t.pricing_yearly_period}</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {[t.pricing_feature_all, t.pricing_feature_free_months, t.pricing_feature_priority, t.pricing_feature_google].map(feat => (
                  <li key={feat} className="flex items-center gap-2.5 text-[13px] sm:text-[14px] font-medium text-[#ada89f]">
                    <CheckCircle2 size={16} className="text-[#FDBF1D] flex-shrink-0" /> {feat}
                  </li>
                ))}
              </ul>
              <Link
                href={`${base}/auth/register`}
                className="block w-full text-center py-3.5 bg-[#FDBF1D] text-[#1f1e1d] font-extrabold text-[15px] rounded-lg border-[2px] border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] hover:bg-[#EAB308] transition-all active:translate-y-[4px] active:shadow-none"
              >
                {t.pricing_yearly_cta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ Final CTA ═══════ */}
      <section className="py-16 sm:py-24 px-5 sm:px-8 text-center bg-[#1f1e1d] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative z-10 max-w-[600px] mx-auto space-y-7">
          <h2 className="text-[32px] sm:text-[42px] font-extrabold text-white leading-[1.15] tracking-[-0.02em]">
            {t.cta_title_1} <br />
            <span className="text-[#FDBF1D]">{t.cta_title_2}</span>
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <CtaButton variant="primary" href={`${base}/auth/register`}>
              {t.cta_button} <ArrowRight size={18} className="ml-2" />
            </CtaButton>
            <CtaButton variant="secondary" href={`${base}/pricing`}>
              {locale === 'tr' ? 'Planları İncele' : 'View Plans'}
            </CtaButton>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
