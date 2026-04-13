import type { Metadata } from 'next';
import { ArrowRight, QrCode, ShieldCheck, CheckCircle2, Star, Shield, MessageSquare, BarChart3, Zap, Users } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PricingFaq from '@/components/marketing/PricingFaq';
import FeatureTabsUI from '@/components/marketing/FeatureTabsUI';
import CtaBanner from '@/components/marketing/CtaBanner';
import CustomerTestimonials from '@/components/marketing/CustomerTestimonials';
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
      ? 'Buaze | Restoranınız İçin Gelişmiş Dijital İtibar Yönetimi'
      : 'Buaze | Advanced Digital Reputation Management for Restaurants',
    description: locale === 'tr'
      ? 'Buaze ile restoranınızın dijital itibarını otomatik yönetin. Google Haritalar puanınızı yükseltin, olumsuz yorumları anında filtreleyin.'
      : 'Automate your restaurant digital reputation with Buaze. Increase your Google Maps ratings and filter out negative reviews instantly.',
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
              <h1 className="text-[32px] sm:text-[42px] lg:text-[56px] font-extrabold leading-[1.1] tracking-[-0.04em] text-[#1f1e1d]">
                {locale === 'tr' ? (
                  <>İşletmeniz İçin Kusursuz Dijital İtibar Yönetimi <br /><span className="text-[#FDBF1D]">Yeni Müşteriler Kazanmanın</span> En Hızlı Yolu</>
                ) : (
                  <>Flawless Digital Reputation Management <br />The Fastest Way to <span className="text-[#FDBF1D]">Win New Customers</span></>
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
                className="w-full sm:w-auto px-7 py-3.5 bg-[#FDBF1D] text-[#1f1e1d] font-extrabold text-[15px] rounded-lg border-[2px] border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] hover:bg-[#EAB308] transition-all active:translate-y-[4px] active:shadow-none text-center"
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
                title: locale === 'tr' ? 'İtibarınızı Otomatiğe Alın' : 'Automate Your Reputation',
                desc: locale === 'tr' ? 'Olumlu yorumları platformlara aktarın, olumsuzları ise sistem içindeki akıllı form ile kriz büyümeden çözün.' : 'Direct positive reviews to platforms, while resolving negative ones internally via our smart form before a crisis emerges.',
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

      {/* ═══════ CTA Banner ═══════ */}
      <section className="px-5 sm:px-8">
        <CtaBanner locale={locale} />
      </section>

      {/* ═══════ Customer Testimonials ═══════ */}
      <CustomerTestimonials locale={locale} />

      {/* ═══════ Trust / Why Buaze Section ═══════ */}
      <section className="py-16 sm:py-24 px-5 sm:px-8 bg-[#FCFBF7]">
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-[#1f1e1d] rounded-2xl p-8 sm:p-12 lg:p-16 relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#FDBF1D]/8 blur-[80px] rounded-full -mr-40 -mt-40" />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14 items-center">
              <div className="space-y-6">
                <h2 className="text-[32px] sm:text-[42px] lg:text-[48px] font-extrabold leading-[1.1] tracking-[-0.03em]">
                  {locale === 'tr' ? 'Neden Buaze Farklı?' : 'Why is Buaze Different?'}
                </h2>
                <div className="space-y-5 text-[#ada89f] text-[15px] sm:text-[16px] leading-relaxed">
                  <p className="font-medium">
                    {locale === 'tr'
                      ? 'Buaze, sadece bir yorum toplama aracı değildir. İşletmenizin dijital dünyadaki kalkanı ve büyüme motorudur.'
                      : 'Buaze is not just a review collection tool. It is your business\'s digital shield and growth engine.'}
                  </p>
                  <ul className="space-y-4">
                    {[
                      { t: locale === 'tr' ? 'Akıllı Filtreleme Algoritması' : 'Smart Filtering Algorithm', d: locale === 'tr' ? 'Olumsuz geri bildirimleri kamuoyuna yansımadan yakalayın.' : 'Catch negative feedback before it hits the public.' },
                      { t: locale === 'tr' ? 'Tam Platform Entegrasyonu' : 'Full Platform Integration', d: locale === 'tr' ? 'Google, TripAdvisor ve Yelp ile kesintisiz veri akışı.' : 'Seamless data flow with Google, TripAdvisor, and Yelp.' },
                      { t: locale === 'tr' ? 'Gerçek Zamanlı Analitik' : 'Real-time Analytics', d: locale === 'tr' ? 'Müşteri memnuniyetini anlık grafiklerle takip edin.' : 'Track customer satisfaction with instant charts.' }
                    ].map((li, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <div className="w-5 h-5 rounded-full bg-[#FDBF1D] flex-shrink-0 mt-1 flex items-center justify-center">
                           <CheckCircle2 size={14} className="text-[#1f1e1d]" strokeWidth={3} />
                        </div>
                        <div>
                           <span className="block font-bold text-white text-[16px]">{li.t}</span>
                           <span className="text-[13px] opacity-80">{li.d}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="relative">
                 <div className="bg-[#1a1a1a] rounded-3xl border-[2.5px] border-[#3d3a36] p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-[#FDBF1D]/10 p-5 rounded-2xl border border-[#FDBF1D]/20">
                          <div className="text-[28px] font-black text-[#FDBF1D]">+400%</div>
                          <div className="text-[10px] font-bold text-[#6b6760] uppercase tracking-wider">{locale === 'tr' ? 'Yorum Artışı' : 'Review Boost'}</div>
                       </div>
                       <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                          <div className="text-[28px] font-black text-white">4.9/5</div>
                          <div className="text-[10px] font-bold text-[#6b6760] uppercase tracking-wider">{locale === 'tr' ? 'AVG Puan' : 'AVG Rating'}</div>
                       </div>
                       <div className="col-span-2 bg-white/5 p-5 rounded-2xl border border-white/10">
                          <div className="flex justify-between items-end mb-2">
                             <div className="text-[12px] font-bold text-white">{locale === 'tr' ? 'Müşteri Güveni' : 'Customer Trust'}</div>
                             <div className="text-[12px] font-bold text-[#FDBF1D]">98%</div>
                          </div>
                          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                             <div className="h-full w-[98%] bg-[#FDBF1D]" />
                          </div>
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`${base}/auth/register`}
              id="footer-cta-btn"
              className="px-8 py-4 bg-[#FDBF1D] text-[#1f1e1d] text-base font-extrabold rounded-lg border-[2px] border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] hover:bg-[#EAB308] transition-all active:translate-y-[4px] active:shadow-none flex items-center gap-2"
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
