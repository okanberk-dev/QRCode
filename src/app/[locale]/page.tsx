import type { Metadata } from 'next';
import { ArrowRight, QrCode, ShieldCheck, CheckCircle2, Star, Shield, MessageSquare, BarChart3, Zap, Users } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PricingFaq from '@/components/marketing/PricingFaq';
import FeatureTabsUI from '@/components/marketing/FeatureTabsUI';
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
    <div className="min-h-screen bg-[#FCFBF7] text-[#1f1e1d] font-sans selection:bg-[#FDBF1D]/30 selection:text-[#1f1e1d] pt-[64px]">
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
              <h1 className="text-[32px] sm:text-[42px] lg:text-[48px] font-extrabold leading-[1.15] tracking-[-0.02em] text-[#1f1e1d]">
                {locale === 'tr' ? (
                  <>İşletmeler için dijital itibar yönetim yazılımı — <span className="text-[#FDBF1D]">hızlı</span> olanlar için</>
                ) : (
                  <>Review management software for teams that <span className="text-[#FDBF1D]">move fast</span></>
                )}
              </h1>

              <div className="space-y-1.5 pt-1">
                <p className="text-[15px] text-[#6b6760] font-normal">
                  {locale === 'tr' ? 'Dakikalar içinde kurulun ve başlayın' : 'Get up and running in minutes'}
                </p>
                <p className="text-[15px] text-[#6b6760] font-normal">
                  {locale === 'tr' ? 'Hazır olduğunuzda yükseltin' : 'Upgrade when you\'re ready'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5 pt-4">
                <Link
                  href={`${base}/auth/register`}
                  id="hero-cta-btn"
                  className="px-8 py-3.5 bg-[#FDBF1D] text-[#1f1e1d] text-[15px] font-extrabold rounded-lg shadow-[0_4px_0_0_#1f1e1d] border-2 border-[#1f1e1d] hover:bg-[#EAB308] active:translate-y-1 active:shadow-[0_0px_0_0_#1f1e1d] transition-all text-center"
                >
                  {t.hero_cta}
                </Link>
                <Link
                  href={`${base}/pricing`}
                  className="group flex items-center gap-1 text-[13px] font-medium text-[#6b6760] hover:text-[#1f1e1d] transition-colors py-3.5"
                >
                  <span className="underline underline-offset-4 decoration-dotted decoration-[#ada89f] group-hover:decoration-[#1f1e1d]">
                    {locale === 'tr' ? 'Fiyatları gör' : 'View pricing'}
                  </span>
                </Link>
              </div>

              <p className="text-[12px] text-[#ada89f] font-normal tracking-wide">
                {locale === 'tr' ? '14 Gün Ücretsiz Deneme • Kredi Kartı Gerekmez' : '14 Day Free Trial • No Credit Card Required'}
              </p>
            </div>

            {/* Right: Floating Quote Bubbles with dot pattern */}
              {/* Right: Floating Quote Bubbles with layout matching the image */}
              <div className="relative w-full h-[460px] hidden lg:block">
                {/* Dot pattern */}
                <div
                  className="absolute inset-0 w-full h-full opacity-[0.08]"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #ada89f 1px, transparent 1px)',
                    backgroundSize: '18px 18px',
                  }}
                />

                {/* Box 1: Top Left */}
                <div 
                  className="hero-quote-wrapper _7 absolute top-2 left-0 max-w-[260px] bg-white rounded-xl border-[2.5px] border-[#1f1e1d] p-5 shadow-[4px_6px_0_0_#1f1e1d] z-10 transform hover:-translate-y-1 transition-transform"
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
                      ? '"Buaze ile yorumları takip etmek ve yanıtlamak artık çok zahmetsiz."'
                      : '"Buaze makes tracking and replying to reviews effortless."'}
                  </div>
                  <img 
                    src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/671b9cc7ca4194d481c266fd_speech-triangle-white.png" 
                    loading="lazy" 
                    alt="" 
                    className="image-20 right white absolute -bottom-[16px] left-6 w-6 z-20"
                  />
                  <img 
                    src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/671bb0c86380dac30cb9f805_Triangle-dark.png" 
                    loading="lazy" 
                    alt="" 
                    className="image-20 right absolute -bottom-[20px] left-5 w-[32px] z-10"
                  />
                </div>

                {/* Box 2: Middle Right (Front) */}
                <div 
                  className="hero-quote-wrapper _7 absolute top-[120px] right-2 max-w-[270px] bg-white rounded-xl border-[2.5px] border-[#1f1e1d] p-5 shadow-[4px_6px_0_0_#1f1e1d] z-30 transform hover:-translate-y-1 transition-transform"
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
                  <img 
                    src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/671b9cc7ca4194d481c266fd_speech-triangle-white.png" 
                    loading="lazy" 
                    alt="" 
                    className="image-20 right white absolute -bottom-[16px] right-8 w-6 z-20"
                  />
                  <img 
                    src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/671bb0c86380dac30cb9f805_Triangle-dark.png" 
                    loading="lazy" 
                    alt="" 
                    className="image-20 right absolute -bottom-[20px] right-[27px] w-[32px] z-10"
                  />
                </div>

                {/* Box 3: Bottom Left */}
                <div 
                  className="hero-quote-wrapper _7 absolute top-[250px] left-6 max-w-[240px] bg-white rounded-xl border-[2.5px] border-[#1f1e1d] p-5 shadow-[4px_6px_0_0_#1f1e1d] z-20 transform hover:-translate-y-1 transition-transform"
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
                      : '"Super easy to use worked perfectly"'}
                  </div>
                  <img 
                    src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/671b9cc7ca4194d481c266fd_speech-triangle-white.png" 
                    loading="lazy" 
                    alt="" 
                    className="image-20 right white absolute -bottom-[16px] left-8 w-6 z-20"
                  />
                  <img 
                    src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/671bb0c86380dac30cb9f805_Triangle-dark.png" 
                    loading="lazy" 
                    alt="" 
                    className="image-20 right absolute -bottom-[20px] left-[27px] w-[32px] z-10"
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
              <img 
                src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/671b9cc7ca4194d481c266fd_speech-triangle-white.png" 
                loading="lazy" 
                alt="" 
                className="image-20 right white absolute -bottom-[15px] right-8 w-6 z-20"
              />
              <img 
                src="https://cdn.prod.website-files.com/670d34b0d540e323cbcbb352/671bb0c86380dac30cb9f805_Triangle-dark.png" 
                loading="lazy" 
                alt="" 
                className="image-20 right absolute -bottom-[19px] right-[27px] w-[32px] z-10"
              />
            </div>

          {/* Mobile hero CTA repeat */}
          <div className="lg:hidden mt-6 pt-5 border-t border-[#e8e4de]/50 text-center space-y-3">
            <p className="text-[13px] text-[#6b6760]">
              {locale === 'tr' ? 'Dakikalar içinde kurulun • Hazır olduğunuzda yükseltin' : 'Get up and running in minutes • Upgrade when you\'re ready'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={`${base}/auth/register`}
                className="w-full sm:w-auto px-7 py-3.5 bg-[#FDBF1D] hover:bg-[#EAB308] text-[#1f1e1d] text-[15px] font-semibold rounded-lg transition-all text-center"
              >
                {locale === 'tr' ? 'Hemen başlayın!' : 'Get started now!'}
              </Link>
              <Link
                href={`${base}/pricing`}
                className="text-[13px] font-medium text-[#6b6760] underline underline-offset-4 decoration-dotted"
              >
                {locale === 'tr' ? 'Fiyatları gör' : 'View pricing'}
              </Link>
            </div>
            <p className="text-[11px] text-[#ada89f]">
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

      {/* ═══════════════════════════════════════════════════════════
          FEATURE SECTIONS — Tabbed / Card-based like ReviewFlowz
      ═══════════════════════════════════════════════════════════ */}

      {/* Feature Block 1 */}
      <section id="how-it-works" className="py-16 sm:py-24 px-5 sm:px-8 bg-[#F7F4F0]">
        <div className="max-w-[1200px] mx-auto">
          {/* Feature Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 sm:mb-16">
            {[
              {
                icon: <MessageSquare size={20} />,
                title: locale === 'tr' ? 'Akıllı Yorum Toplama' : 'Smart Review Collection',
                desc: locale === 'tr' ? 'QR kod ile anında geri bildirim alın' : 'Get instant feedback via QR codes',
                active: true
              },
              {
                icon: <ShieldCheck size={20} />,
                title: locale === 'tr' ? 'Olumsuz Yorum Filtresi' : 'Negative Review Filter',
                desc: locale === 'tr' ? 'Düşük puanları özel panelinize yönlendirin' : 'Route low ratings to your private dashboard',
                active: false
              },
              {
                icon: <BarChart3 size={20} />,
                title: locale === 'tr' ? 'Analitik Panel' : 'Analytics Dashboard',
                desc: locale === 'tr' ? 'Tüm verilerinizi tek ekranda görün' : 'See all your data in one screen',
                active: false
              }
            ].map((tab, idx) => (
              <div
                key={idx}
                className={`p-5 sm:p-6 rounded-xl border cursor-default transition-all ${
                  tab.active
                    ? 'bg-[#FDBF1D]/8 border-[#FDBF1D]/25 shadow-sm'
                    : 'bg-white border-[#e8e4de] hover:border-[#FDBF1D]/30'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
                  tab.active ? 'bg-[#FDBF1D]/15 text-[#1f1e1d]' : 'bg-[#f7f4f0] text-[#6b6760]'
                }`}>
                  {tab.icon}
                </div>
                <h3 className="text-[15px] font-bold text-[#1f1e1d] mb-1">{tab.title}</h3>
                <p className="text-[13px] text-[#6b6760]">{tab.desc}</p>
              </div>
            ))}
          </div>

          {/* Feature Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-5">
              <h2 className="text-[28px] sm:text-[36px] font-extrabold leading-[1.15] tracking-[-0.01em] text-[#1f1e1d]">
                {t.feat1_title}
              </h2>
              <p className="text-[15px] sm:text-base text-[#6b6760] leading-relaxed">
                {t.feat1_desc}
              </p>
              <ul className="space-y-3 pt-2">
                {[t.feat1_li1, t.feat1_li2, t.feat1_li3].map(item => (
                  <li key={item} className="flex items-start gap-3 text-[14px] font-medium text-[#1f1e1d]">
                    <CheckCircle2 size={18} className="text-[#FDBF1D] flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-[13px] text-[#ada89f] italic">
                {locale === 'tr'
                  ? 'Tüm platformları destekliyoruz • Ek ücret yok • Gizli maliyet yok'
                  : 'We support all platforms • No add-on • No hidden cost'}
              </p>
            </div>

            {/* Visual card */}
            <div className="relative">
              <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#e8e4de] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-[#1f1e1d] flex items-center justify-center text-[#FDBF1D] font-bold text-sm">1</div>
                  <h3 className="text-lg font-bold text-[#1f1e1d]">{t.feat1_title}</h3>
                </div>
                <div className="p-5 bg-[#FCFBF7] rounded-lg border border-dashed border-[#e8e4de]">
                  <div className="flex items-center gap-1 mb-3">
                    {[1,2,3,4,5].map(i => <Star key={i} size={15} className="fill-[#FDBF1D] text-[#FDBF1D]" />)}
                  </div>
                  <p className="text-[14px] font-medium text-[#1f1e1d] leading-relaxed">
                    {locale === 'tr'
                      ? '"Hizmet gerçekten harikaydı, atmosfer mükemmel. Kesinlikle tavsiye ederim!" - Murat K.'
                      : '"The service was truly amazing, the atmosphere was perfect. Highly recommend!" - Sarah K.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Block 2 — QR Code */}
      <section className="py-16 sm:py-24 px-5 sm:px-8 bg-[#FCFBF7]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-5">
            <h2 className="text-[28px] sm:text-[36px] font-extrabold leading-[1.15] tracking-[-0.01em] text-[#1f1e1d]">
              {t.feat2_title}
            </h2>
            <p className="text-[15px] sm:text-base text-[#6b6760] leading-relaxed">
              {t.feat2_desc}
            </p>
            <div className="p-5 bg-[#FDBF1D]/6 rounded-xl border border-[#FDBF1D]/15">
              <p className="text-[14px] font-medium text-[#1f1e1d] italic mb-2">
                &ldquo;{locale === 'tr' ? 'Buaze sayesinde Google Reviews sayfamız her zamankinden çok daha harika görünüyor!' : 'Thanks to Buaze, our Google Reviews page looks better than ever!'}&rdquo;
              </p>
              <span className="text-[13px] font-bold text-[#FDBF1D]">{t.feat2_quote_author}</span>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="bg-white p-10 sm:p-14 rounded-2xl border border-[#e8e4de] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] relative group">
              <div className="absolute inset-3 border-2 border-dashed border-[#e8e4de] rounded-xl group-hover:border-[#FDBF1D]/30 transition-colors" />
              <QrCode size={160} strokeWidth={1} className="text-[#1f1e1d] relative z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Block 3 — Negative Review Protection */}
      <section className="py-16 sm:py-24 px-5 sm:px-8 bg-[#F7F4F0]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="lg:order-2 space-y-5">
            <h2 className="text-[28px] sm:text-[36px] font-extrabold leading-[1.15] tracking-[-0.01em] text-[#1f1e1d]">
              {t.feat3_title}
            </h2>
            <p className="text-[15px] sm:text-base text-[#6b6760] leading-relaxed">
              {t.feat3_desc}
            </p>
            <div className="flex items-center gap-4 py-2">
              <div className="p-3 bg-red-50 text-red-500 rounded-xl">
                <Shield size={28} />
              </div>
              <div>
                <h4 className="font-bold text-[#1f1e1d] text-[15px]">{t.feat3_badge_title}</h4>
                <p className="text-[13px] text-[#6b6760]">{t.feat3_badge_desc}</p>
              </div>
            </div>
          </div>

          <div className="lg:order-1">
            <div className="bg-[#1f1e1d] p-7 sm:p-9 rounded-xl shadow-[0_8px_30px_-8px_rgba(0,0,0,0.3)] space-y-6 text-white overflow-hidden relative">
              <div className="flex items-center gap-2">
                {[1,2,3].map(i => <Star key={i} size={22} className="fill-[#FDBF1D] text-[#FDBF1D]" />)}
                {[4,5].map(i => <Star key={i} size={22} className="text-[#3d3a36]" />)}
              </div>
              <div className="space-y-3 opacity-70">
                <div className="h-3 w-3/4 bg-[#3d3a36] rounded-full" />
                <div className="h-3 w-full bg-[#3d3a36] rounded-full" />
                <div className="h-3 w-1/2 bg-[#3d3a36] rounded-full" />
              </div>
              <div className="bg-[#2e2a25] border border-[#3d3a36] text-white p-4 rounded-xl font-bold text-center text-[13px] flex items-center justify-center gap-2">
                <ShieldCheck size={16} className="text-[#FDBF1D]" />
                {locale === 'tr' ? 'Özel Panele İletildi' : 'Sent to Private Dashboard'}
              </div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#FDBF1D]/5 blur-[50px] rounded-full pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ Trust / Why Buaze Section ═══════ */}
      <section className="py-16 sm:py-24 px-5 sm:px-8 bg-[#FCFBF7]">
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-[#1f1e1d] rounded-2xl p-8 sm:p-12 lg:p-16 relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#FDBF1D]/8 blur-[80px] rounded-full -mr-40 -mt-40" />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14 items-center">
              <div className="space-y-5">
                <h2 className="text-[28px] sm:text-[36px] font-extrabold leading-[1.15]">
                  {locale === 'tr' ? 'Neden Buaze?' : 'Why Buaze?'}
                </h2>
                <div className="space-y-4 text-[#ada89f] text-[14px] sm:text-[15px] leading-relaxed">
                  <p>
                    {locale === 'tr'
                      ? 'Buaze, modern işletmelerin en büyük varlığı olan dijital güveni inşa etmek için geliştirildi. Google Haritalar, TripAdvisor ve tüm major platformlarla entegre çalışarak, her müşteri temas noktasını bir büyüme fırsatına dönüştürüyoruz.'
                      : 'Buaze was developed to build the greatest asset of modern businesses: digital trust. Integrated with Google Maps, TripAdvisor, and all major platforms, we turn every touchpoint into a growth opportunity.'}
                  </p>
                  <p>
                    {locale === 'tr'
                      ? 'Yapay zeka analiz algoritmalarımız müşteri duyarlılığını önceden analiz ediyor ve markanızın dijital dünyada en iyi şekilde temsil edilmesini sağlıyor.'
                      : 'Our AI analysis algorithms analyze customer sentiment in advance and ensure your brand is always represented in the best possible way.'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {[
                  { label: locale === 'tr' ? 'Veri Takibi' : 'Data Tracking', val: '24/7' },
                  { label: locale === 'tr' ? 'Müşteri Artışı' : 'Growth', val: '+40%' },
                  { label: locale === 'tr' ? 'Risk Yönetimi' : 'Risk Mgmt', val: locale === 'tr' ? 'Aktif' : 'Active' },
                  { label: locale === 'tr' ? 'Entegrasyon' : 'Integration', val: 'SaaS' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 text-center hover:bg-white/8 transition-colors">
                    <p className="text-2xl sm:text-3xl font-extrabold text-[#FDBF1D] mb-0.5">{stat.val}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6760]">{stat.label}</p>
                  </div>
                ))}
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
                className="block w-full text-center py-3.5 bg-[#F7F4F0] text-[#1f1e1d] font-semibold text-[14px] rounded-lg hover:bg-[#e8e4de] transition-all"
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
                className="block w-full text-center py-3.5 bg-[#FDBF1D] text-[#1f1e1d] font-semibold text-[14px] rounded-lg hover:bg-[#EAB308] transition-all"
              >
                {t.pricing_yearly_cta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FAQ Section ═══════ */}
      <div className="bg-[#FCFBF7] border-t border-[#e8e4de]">
        <PricingFaq
          title={t.faq_title}
          subtitle={t.faq_subtitle}
          faqs={[
            { q: t.faq_q1, a: t.faq_a1 },
            { q: t.faq_q2, a: t.faq_a2 },
            { q: t.faq_q3, a: t.faq_a3 },
            { q: t.faq_q4, a: t.faq_a4 },
          ]}
        />
      </div>

      {/* ═══════ Final CTA ═══════ */}
      <section className="py-16 sm:py-24 px-5 sm:px-8 text-center bg-[#1f1e1d] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative z-10 max-w-[600px] mx-auto space-y-7">
          <h2 className="text-[32px] sm:text-[42px] font-extrabold text-white leading-[1.15] tracking-[-0.02em]">
            {t.cta_title_1} <br />
            <span className="text-[#FDBF1D]">{t.cta_title_2}</span>
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`${base}/auth/register`}
              id="footer-cta-btn"
              className="px-8 py-4 bg-[#FDBF1D] hover:bg-[#EAB308] text-[#1f1e1d] text-base font-bold rounded-lg transition-all shadow-lg shadow-[#FDBF1D]/15 active:scale-95 flex items-center gap-2"
            >
              {t.cta_button} <ArrowRight size={18} />
            </Link>
            <Link
              href={`${base}/pricing`}
              className="text-[13px] font-medium text-[#6b6760] underline underline-offset-4 decoration-dotted hover:text-white transition-colors"
            >
              {locale === 'tr' ? 'Fiyatları gör' : 'View pricing'}
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
