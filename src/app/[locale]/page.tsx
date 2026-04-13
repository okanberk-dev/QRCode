import type { Metadata } from 'next';
import { ArrowRight, QrCode, ShieldCheck, CheckCircle2, Star, Shield, MessageSquare, BarChart3, Zap, Users, Trophy } from 'lucide-react';
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

      {/* ════════════════════════════════════════════�      {/* ═══════════════════════════════════════════════════════════
          HERO SECTION (3D REDESIGN)
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative pt-10 sm:pt-16 lg:pt-24 pb-12 sm:pb-20 px-5 sm:px-8 overflow-hidden mesh-gradient">
        {/* Decorative background blur elements */}
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-yellow-400/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-[1240px] mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Content */}
            <div className="text-left space-y-8 animate-slide-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 text-[11px] font-bold uppercase tracking-wider">
                <Zap size={14} className="fill-yellow-500" />
                {locale === 'tr' ? 'YENİ NESİL İTİBAR YÖNETİMİ' : 'NEXT-GEN REPUTATION MANAGEMENT'}
              </div>
              
              <h1 className="text-[34px] sm:text-[46px] lg:text-[64px] font-[900] leading-[1.05] tracking-[-0.04em] text-[#111827]">
                {locale === 'tr' ? (
                  <>İşletmeniz İçin <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#111827] to-[#4b5563]">Kusursuz Dijital</span> <br /><span className="text-[#FDBF1D] inline-block hover:scale-105 transition-transform duration-300">İtibar Yönetimi</span></>
                ) : (
                  <>Flawless <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#111827] to-[#4b5563]">Digital Identity</span> <br />For Your <span className="text-[#FDBF1D] inline-block hover:scale-105 transition-transform duration-300">Modern Business</span></>
                )}
              </h1>

              <p className="text-[17px] text-[#4b5563] leading-relaxed max-w-xl font-medium">
                {locale === 'tr' 
                  ? 'Dakikalar içinde kurulum yapın, Google puanınızı otomatik yükseltin ve müşterilerinizin güvenini kazanın.' 
                  : 'Set up in minutes, automatically boost your Google ratings, and win your customers\' trust effortlessly.'}
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                <Link
                  href={`${base}/auth/register`}
                  className="w-full sm:w-auto px-10 py-4.5 bg-[#111827] text-white text-[16px] font-bold rounded-2xl shadow-xl shadow-gray-200/50 hover:bg-[#1f2937] hover:-translate-y-1 transition-all text-center flex items-center justify-center gap-2 group"
                >
                  {t.hero_cta}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href={`${base}/pricing`}
                  className="group flex items-center gap-2 text-[14px] font-bold text-[#4b5563] hover:text-[#111827] transition-colors py-4 px-6 rounded-2xl hover:bg-white/50 backdrop-blur-sm"
                >
                  {locale === 'tr' ? 'Fiyatları inceleyin' : 'Explore pricing'}
                </Link>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] ring-4 ring-gray-200/5 overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" />
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-[#111827] text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-gray-200/5">
                    +2K
                  </div>
                </div>
                <div className="text-[12px] text-[#6b7280] font-medium">
                  {locale === 'tr' ? '14 Gün Deneme • Kredi Kartı Gerekmez' : '14 Day Trial • No credit card required'}
                </div>
              </div>
            </div>

            {/* Right: 3D Aesthetic Mockup */}
            <div className="relative perspective-1000 lg:h-[600px] flex items-center justify-center pt-10 lg:pt-0">
              {/* Central 3D Asset */}
              <div className="relative z-20 animate-float preserve-3d">
                <div className="relative">
                  <img 
                    src="/Users/okanberkmanavoglu/.gemini/antigravity/brain/3af23ad1-697d-45c1-a52a-f42928fb2b79/3d_iphone_qr_mockup_1776091132156.png" 
                    alt="3D QR Mockup"
                    className="w-full max-w-[340px] drop-shadow-[0_32px_64px_rgba(0,0,0,0.15)] rounded-[3rem]"
                  />
                  {/* Glowing background star */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-400/20 rounded-full blur-3xl animate-pulse" />
                </div>
              </div>

              {/* Floating Glass Cards */}
              <div className="absolute top-[10%] -left-4 lg:-left-12 z-30 animate-float [animation-delay:-2s]">
                <div className="glass-card p-5 rounded-2xl max-w-[240px] shadow-2xl rotate-[-3deg] hover:rotate-0 transition-transform duration-500 cursor-pointer group">
                  <div className="flex gap-1 mb-3">
                    {[1,2,3,4,5].map(i => <Star key={i} size={14} className="fill-[#FDBF1D] text-[#FDBF1D]" />)}
                  </div>
                  <p className="text-[14px] font-bold text-[#111827] leading-tight group-hover:text-blue-600 transition-colors">
                    {locale === 'tr' ? '"Kullanımı süper kolay ve kusursuz çalışıyor."' : '"Super easy to use and works flawlessly."'}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 border border-white" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Ahmet Y. · İşletme Sahibi</span>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-[20%] -right-4 lg:-right-8 z-30 animate-float [animation-delay:-4s]">
                <div className="glass-card p-6 rounded-2xl max-w-[260px] shadow-2xl rotate-[2deg] hover:rotate-0 transition-transform duration-500 cursor-pointer group">
                  <div className="flex gap-1 mb-3">
                    {[1,2,3,4,5].map(i => <Star key={i} size={14} className="fill-[#FDBF1D] text-[#FDBF1D]" />)}
                  </div>
                  <p className="text-[14px] font-bold text-[#111827] leading-tight">
                    {locale === 'tr' ? '"Haritalar puanımız 3 haftada 4.2\'den 4.8\'e çıktı!"' : '"Our Maps rating went from 4.2 up to 4.8 in 3 weeks!"'}
                  </p>
                  <div className="mt-4 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full w-[80%] bg-green-500 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Success Badge */}
              <div className="absolute top-[60%] left-[-20px] lg:left-[-60px] z-40 animate-float [animation-delay:-1s]">
                <div className="bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-white">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <div className="text-[14px] font-[900] text-[#111827]">+1240</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Yeni Yorum</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
nk>
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

      {/* ═══════ Trust / Why Buaze Section (3D Redesign) ═══════ */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#FCFBF7]">
        <div className="max-w-[1240px] mx-auto">
          <div className="relative bg-[#1f1e1d] rounded-[32px] sm:rounded-[48px] p-8 sm:p-14 lg:p-20 border-[3px] border-[#1f1e1d] shadow-[16px_20px_0_0_#FDBF1D] overflow-visible">
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
                      title: locale === 'tr' ? 'Proaktif Kriz Önleme' : 'Proactive Crisis Prevention', 
                      desc: locale === 'tr' ? 'Düşük puanlı yorumları daha internete düşmeden yakalayan akıllı kalkan.' : 'An intelligent shield that catches low-rated reviews before they hit the web.',
                      icon: <Zap size={20} className="text-[#FDBF1D]" />
                    },
                    { 
                      title: locale === 'tr' ? 'Puanınızı Domine Edin' : 'Dominate Your Score', 
                      desc: locale === 'tr' ? 'Google, TripAdvisor ve Yelp üzerinde organik ve hızlı puan artışı sağlayın.' : 'Achieve organic and rapid score increases on Google, TripAdvisor, and Yelp.',
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
