import type { Metadata } from 'next';
import { Target, Eye, ShieldCheck, Heart, Users, Zap, TrendingUp, MessageSquare, ArrowRight } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import Link from 'next/link';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const title = isTr ? 'Hakkımızda | Buaze — Dijital İtibar Yönetimi Platformu' : 'About Us | Buaze — Digital Reputation Management Platform';
  const description = isTr
    ? 'Buaze, restoranlar, oteller, klinikler ve daha fazlası için QR tabanlı müşteri geri bildirimi ve itibar yönetimi sunan Türkiye\'nin öncü SaaS platformudur. Misyonumuzu, vizyonumuzu ve değerlerimizi keşfedin.'
    : 'Buaze is Turkey\'s leading SaaS platform offering QR-based customer feedback and reputation management for restaurants, hotels, clinics, and more. Discover our mission, vision, and values.';
  return {
    title: { absolute: title },
    description,
    keywords: isTr
      ? ['buaze hakkında', 'dijital itibar yönetimi şirketi', 'restoran itibar platformu', 'müşteri geri bildirim sistemi', 'QR yorum yönetimi', 'Türkiye SaaS itibar', 'google yorum artırma platform']
      : ['about buaze', 'digital reputation management company', 'restaurant reputation platform', 'customer feedback system Turkey', 'QR review management', 'reputation SaaS Turkey'],
    openGraph: {
      title,
      description,
      url: `https://buaze.com/${locale}/about`,
      images: [{ url: 'https://buaze.com/og-image.png', width: 1200, height: 630, alt: 'Buaze — Dijital İtibar Yönetimi' }],
    },
    alternates: {
      canonical: `https://buaze.com/${locale}/about`,
      languages: { 'tr': 'https://buaze.com/tr/about', 'en': 'https://buaze.com/en/about', 'x-default': 'https://buaze.com/en/about' },
    },
  };
}


export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: isTr ? 'Hakkımızda | Buaze' : 'About Us | Buaze',
    url: `https://buaze.com/${locale}/about`,
    description: isTr
      ? 'Buaze, işletmelerin dijital itibarını yöneten ve büyüten Türkiye\'nin öncü SaaS platformudur.'
      : 'Buaze is Turkey\'s leading SaaS platform for managing and growing digital reputation for businesses.',
    publisher: {
      '@type': 'Organization',
      name: 'Buaze',
      url: 'https://buaze.com',
      logo: 'https://buaze.com/favicon.svg',
      sameAs: ['https://twitter.com/buaze', 'https://www.linkedin.com/company/buaze'],
    },
  };

  const values = [
    { icon: <ShieldCheck size={22} />, title: t.about_val1_title, desc: t.about_val1_desc },
    { icon: <Zap size={22} />, title: t.about_val2_title, desc: t.about_val2_desc },
    { icon: <Heart size={22} />, title: t.about_val3_title, desc: t.about_val3_desc },
    { icon: <Users size={22} />, title: t.about_val4_title, desc: t.about_val4_desc },
  ];

  const numbers = [
    { num: '500+', label: isTr ? 'Aktif İşletme' : 'Active Businesses' },
    { num: '%92', label: isTr ? 'İtibar Artışı' : 'Reputation Growth' },
    { num: '4.8', label: isTr ? 'Ort. Google Skoru' : 'Avg. Google Score' },
    { num: '<5dk', label: isTr ? 'Kurulum Süresi' : 'Setup Time' },
  ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] font-sans pt-[64px] selection:bg-[#C6F24E]/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Page Header ─── */}
      <section className="pt-20 sm:pt-32 pb-12 sm:pb-14 px-5 sm:px-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C6F24E]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-[1200px] mx-auto relative">
          <div className="max-w-[720px] space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#0A0A0A] rounded-full shadow-md">
               <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
               <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest">{isTr ? 'BİZ KİMİZ?' : 'WHO ARE WE?'}</span>
            </div>
            <h1 className="text-[34px] sm:text-[72px] font-extrabold leading-[1] sm:leading-[0.95] tracking-tight text-[#0A0A0A]">
              {t.about_hero_title_1}{' '}
              <span className="text-[#C6F24E] block sm:inline">{t.about_hero_title_2}</span>
            </h1>
            <p className="text-[16px] sm:text-[20px] text-[#1A1A1A] font-bold leading-relaxed max-w-[600px]">
              {t.about_hero_subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Numbers / Social Proof ─── */}
      <section className="py-10 sm:py-14 px-5 sm:px-8 bg-[#C6F24E] border-y-[3px] sm:border-y-[4px] border-[#0A0A0A]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {numbers.map((item, i) => (
            <div key={i} className="space-y-1.5">
              <div className="text-[32px] sm:text-[52px] font-black text-[#0A0A0A] tracking-tighter leading-none">{item.num}</div>
              <div className="text-[10px] sm:text-[11px] font-black text-[#0A0A0A]/70 uppercase tracking-[0.15em]">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Mission & Vision (3D Cards) ─── */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#FFFFFF] border-t border-[#EDEDED]">
        <div className="max-w-[1200px] mx-auto text-center mb-16 sm:mb-20">
           <p className="text-[12px] font-black uppercase tracking-widest text-[#C6F24E] mb-4">{isTr ? 'GELECEĞİ ŞEKİLLENDİRİYORUZ' : 'SHAPING THE FUTURE'}</p>
           <h2 className="text-[34px] sm:text-[56px] font-extrabold text-[#0A0A0A] tracking-tight leading-[1.1] sm:leading-none">
              {isTr ? 'Amacımız ve Vizyonumuz' : 'Our Purpose & Vision'}
           </h2>
        </div>
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
          {/* Mission */}
          <div className="bg-white p-8 sm:p-14 rounded-[32px] sm:rounded-[40px] border sm:border border-[#0A0A0A] shadow-md sm:shadow-md space-y-6 flex flex-col items-start transition-transform hover:-translate-y-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#C6F24E] border sm:border border-[#0A0A0A] text-[#0A0A0A] rounded-2xl flex items-center justify-center shadow-md">
              <Target size={28} className="sm:size-8" strokeWidth={2} />
            </div>
            <h2 className="text-[26px] sm:text-[34px] font-extrabold text-[#0A0A0A] tracking-tight leading-tight">{t.about_mission_title}</h2>
            <p className="text-[15px] sm:text-[17px] text-[#1A1A1A] leading-relaxed font-medium">{t.about_mission_desc}</p>
          </div>

          {/* Vision */}
          <div className="bg-[#0A0A0A] p-8 sm:p-14 rounded-[32px] sm:rounded-[40px] border sm:border border-[#0A0A0A] shadow-md sm:shadow-md space-y-6 flex flex-col items-start transition-transform hover:-translate-y-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#C6F24E] text-[#0A0A0A] rounded-2xl flex items-center justify-center shadow-md">
               <Eye size={28} className="sm:size-8" strokeWidth={2} />
            </div>
            <h2 className="text-[26px] sm:text-[34px] font-extrabold text-white tracking-tight leading-tight">{t.about_vision_title}</h2>
            <p className="text-[15px] sm:text-[17px] text-white/85 leading-relaxed font-medium">{t.about_vision_desc}</p>
          </div>
        </div>
      </section>

      {/* ─── Values (Enriched 3D Grid) ─── */}
      <section className="py-20 sm:py-40 px-5 sm:px-8 bg-[#0A0A0A] overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#C6F24E]/5 rounded-full blur-[150px] -z-0" />

        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="mb-12 sm:mb-24 space-y-4 text-center sm:text-left">
            <p className="text-[11px] sm:text-[13px] font-black text-[#C6F24E] uppercase tracking-widest">{isTr ? 'TEMEL DEĞERLERİMİZ' : 'OUR CORE VALUES'}</p>
            <h2 className="text-[34px] sm:text-[56px] font-extrabold text-white tracking-tight leading-[1.1] sm:leading-none">{t.about_values_title}</h2>
            <p className="text-[15px] sm:text-[16px] font-medium text-white/75 max-w-[500px] mx-auto sm:mx-0">{t.about_values_subtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {values.map((value, i) => (
              <div key={i} className="bg-white/5 border sm:border border-[#3d3a36] rounded-[24px] sm:rounded-[32px] p-7 sm:p-10 hover:bg-white/10 hover:border-[#C6F24E]/50 transition-all group space-y-5 sm:space-y-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#C6F24E] text-[#0A0A0A] rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md sm:shadow-md">
                  {value.icon}
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="text-[18px] sm:text-[20px] font-extrabold text-white uppercase tracking-tighter leading-tight">{value.title}</h3>
                  <p className="text-[13px] sm:text-[14px] text-white/75 leading-relaxed font-medium">{value.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Story / Why We Built This ─── */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#FFFFFF] border-t border-[#EDEDED]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          {/* Left: text */}
          <div className="space-y-6">
            <p className="text-[11px] sm:text-[12px] font-black uppercase tracking-[0.2em] text-[#C6F24E]">
              {isTr ? 'NEDEN BULDUK?' : 'WHY WE BUILT THIS'}
            </p>
            <h2 className="text-[28px] sm:text-[42px] font-extrabold text-[#0A0A0A] tracking-tight leading-tight">
              {isTr
                ? 'Bir restoranın kaybettiği itibar bizi harekete geçirdi'
                : 'A restaurant\'s lost reputation set us in motion'}
            </h2>
            <div className="space-y-4 text-[15px] sm:text-[16px] text-[#1A1A1A] leading-relaxed font-medium">
              <p>
                {isTr
                  ? 'İşletme sahipleriyle konuşurken fark ettik: müşteri memnuniyetsizliği çoğu zaman işletmeye değil, doğrudan Google\'a gidiyordu. Bir yıldızlık yorum, aylar içinde kasıp kavurabiliyordu. Buna bir çözüm olmalıydı.'
                  : 'Talking with business owners, we noticed a pattern: customer dissatisfaction was going straight to Google instead of to the business. A one-star review could do months of damage. There had to be a better way.'}
              </p>
              <p>
                {isTr
                  ? 'QR tabanlı akıllı yönlendirme fikri burada doğdu. Memnun müşteriler Google\'a, memnun olmayanlar doğrudan işletme paneline yönlendirilsin. Basit, etkili, adil.'
                  : 'That\'s where the idea of QR-based smart routing was born. Happy customers go to Google; unhappy ones go straight to the business dashboard. Simple, effective, fair.'}
              </p>
              <p>
                {isTr
                  ? 'Bugün 500\'den fazla işletme Buaze ile itibarını yönetiyor. Her yeni müşteri, platformumuzu daha iyi hale getirmemize katkıda bulunuyor.'
                  : 'Today, over 500 businesses manage their reputation with Buaze. Every new customer helps make our platform better.'}
              </p>
            </div>
          </div>

          {/* Right: feature highlights */}
          <div className="space-y-4">
            {[
              {
                icon: <MessageSquare size={20} className="text-[#C6F24E]" />,
                title: isTr ? 'Akıllı Yönlendirme' : 'Smart Routing',
                desc: isTr ? 'Yüksek puanlar Google\'a, düşük puanlar panele.' : 'High ratings go to Google, low ones go to your dashboard.',
              },
              {
                icon: <TrendingUp size={20} className="text-[#C6F24E]" />,
                title: isTr ? 'Organik İtibar Artışı' : 'Organic Reputation Growth',
                desc: isTr ? 'Yorum hacmi artar, Google sıralamanız yükselir.' : 'Review volume grows, your Google ranking climbs.',
              },
              {
                icon: <ShieldCheck size={20} className="text-[#C6F24E]" />,
                title: isTr ? 'Kriz Öncesi Müdahale' : 'Pre-Crisis Intervention',
                desc: isTr ? 'Sorun büyümeden fark edin ve çözün.' : 'Spot and resolve problems before they escalate.',
              },
              {
                icon: <Zap size={20} className="text-[#C6F24E]" />,
                title: isTr ? '5 Dakikada Kurulum' : '5-Minute Setup',
                desc: isTr ? 'QR kodunuzu yazdırın, masaya koyun, başlayın.' : 'Print your QR code, place it, and you\'re live.',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 bg-white border border-[#EDEDED] rounded-2xl p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
                <div className="flex-shrink-0 w-10 h-10 bg-[#C6F24E]/10 rounded-xl border border-[#C6F24E]/20 flex items-center justify-center">
                  {item.icon}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h3 className="text-[15px] font-extrabold text-[#0A0A0A]">{item.title}</h3>
                  <p className="text-[13px] text-[#1A1A1A] font-medium leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#FFFFFF]">
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-[#0A0A0A] rounded-[32px] sm:rounded-[50px] p-8 sm:p-20 shadow-md flex flex-col md:flex-row items-center justify-between gap-8 sm:gap-12 text-center md:text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#C6F24E]/8 rounded-full blur-[80px] translate-x-1/2 -translate-y-1/2" />
            <div className="space-y-4 sm:space-y-5 relative">
              <h3 className="text-[28px] sm:text-[44px] font-extrabold text-white tracking-tight leading-[1.1]">
                {isTr ? 'Hemen başlayın, ilk 14 gün bizden.' : 'Start today, first 14 days on us.'}
              </h3>
              <p className="text-[16px] sm:text-[18px] text-white/80 font-medium">
                {isTr ? 'Kredi kartı gerekmez, 5 dakikada kurulum.' : 'No credit card required, 5-minute setup.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0 relative w-full sm:w-auto">
              <Link
                href={`${base}/auth/register`}
                className="flex items-center justify-center gap-2 px-8 py-5 bg-[#C6F24E] text-[#0A0A0A] text-[16px] sm:text-[17px] font-black rounded-[20px] border border-[#C6F24E] shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all uppercase tracking-wide"
              >
                {isTr ? 'Ücretsiz Dene' : 'Start Free Trial'}
                <ArrowRight size={18} />
              </Link>
              <Link
                href={`${base}/how-it-works`}
                className="flex items-center justify-center gap-2 px-8 py-5 bg-white/10 text-white text-[16px] sm:text-[17px] font-bold rounded-[20px] border border-white/20 hover:bg-white/15 transition-all"
              >
                {isTr ? 'Nasıl Çalışır?' : 'How It Works'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
