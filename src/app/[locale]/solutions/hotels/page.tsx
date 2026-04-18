import type { Metadata } from 'next';

export const dynamic = 'force-static';
import { Star, QrCode, ShieldCheck, TrendingUp, Building2, ArrowRight, Zap, Users, BedDouble, Globe } from 'lucide-react';
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
    title: `${t.sol_hot_title} — Buaze`,
    description: t.sol_hot_desc,
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/hotels`,
      languages: {
        tr: 'https://buaze.com/tr/solutions/hotels',
        en: 'https://buaze.com/en/solutions/hotels',
      },
    },
    openGraph: {
      type: 'website',
      url: `https://buaze.com/${locale}/solutions/hotels`,
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      siteName: 'Buaze',
      title: `${t.sol_hot_title} — Buaze`,
      description: t.sol_hot_desc,
    },
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function HotelSolutionPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: t.sol_hot_title,
    provider: { '@type': 'Organization', name: 'Buaze', url: 'https://buaze.com' },
    description: t.sol_hot_desc,
    serviceType: locale === 'tr' ? 'Otel İtibar Yönetimi' : 'Hotel Reputation Management',
    areaServed: { '@type': 'Country', name: locale === 'tr' ? 'Türkiye' : 'Turkey' },
  };

  const steps = [
    {
      num: '01',
      icon: <QrCode size={24} />,
      title: locale === 'tr' ? 'Resepsiyon ve Odalara Yerleştirin' : 'Place at Reception & Rooms',
      desc: locale === 'tr'
        ? 'Check-in masasına, oda içi bilgi kartlarına veya restoran menülerine QR kodlarınızı entegre edin.'
        : 'Integrate your QR codes on check-in desks, in-room info cards, or restaurant menus.',
    },
    {
      num: '02',
      icon: <Users size={24} />,
      title: locale === 'tr' ? 'Misafir Anında Geri Bildirim Verir' : 'Guests Give Instant Feedback',
      desc: locale === 'tr'
        ? 'Konaklamanın en taze anında — check-out sırasında veya odada — misafirleriniz kolayca puanlama yapar.'
        : 'At the freshest moment of their stay — during check-out or in-room — guests rate you effortlessly.',
    },
    {
      num: '03',
      icon: <ShieldCheck size={24} />,
      title: locale === 'tr' ? 'Şikayetler Anında Çözülür' : 'Complaints Resolved Instantly',
      desc: locale === 'tr'
        ? 'Olumsuz bir deneyim varsa yönetim anında haberdar olur. Misafir otelden ayrılmadan sorun çözülür.'
        : 'If there\'s a negative experience, management is notified instantly. Issues are resolved before the guest leaves.',
    },
  ];

  const benefits = [
    {
      title: locale === 'tr' ? 'TripAdvisor & Google Entegrasyonu' : 'TripAdvisor & Google Integration',
      desc: locale === 'tr' ? 'Olumlu yorumlar otomatik olarak en önemli turizm platformlarına yönlendirilir.' : 'Positive reviews are automatically directed to the most important tourism platforms.',
      icon: <Globe size={20} className="text-[#FDBF1D]" />,
    },
    {
      title: locale === 'tr' ? 'Geri Bildirim Yönetimi' : 'Feedback Management',
      desc: locale === 'tr' ? 'Olumsuz yorumlar halka açık platformlara ulaşmadan size iletilir.' : 'Negative reviews are sent to you before reaching public platforms.',
      icon: <ShieldCheck size={20} className="text-[#10b981]" />,
    },
    {
      title: locale === 'tr' ? 'Doluluk Oranı Artışı' : 'Occupancy Rate Increase',
      desc: locale === 'tr' ? 'Yüksek Google puanı = arama sonuçlarında üst sıra = daha fazla rezervasyon.' : 'Higher Google rating = top search results = more bookings.',
      icon: <TrendingUp size={20} className="text-[#ea580c]" />,
    },
    {
      title: locale === 'tr' ? 'Çoklu Şube Merkezi Yönetim' : 'Multi-Location Central Management',
      desc: locale === 'tr' ? 'Tüm şubelerinizin itibarını tek bir panel üzerinden takip edin ve yönetin.' : 'Track and manage the reputation of all your branches from a single dashboard.',
      icon: <Building2 size={20} className="text-[#FDBF1D]" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-[#1f1e1d] font-sans pt-[64px] selection:bg-[#FDBF1D]/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* Hero */}
      <section className="pt-20 sm:pt-32 pb-16 px-5 sm:px-8 bg-[#F7F4F0] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-[#FDBF1D]/8 rounded-full blur-[150px] -translate-x-1/3 -translate-y-1/3" />
        <div className="max-w-[1200px] mx-auto relative">
          <div className="max-w-[720px] space-y-6">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-white border-2 border-[#1f1e1d] rounded-full shadow-[4px_4px_0_0_#1f1e1d]">
              <BedDouble size={14} />
              <span className="text-[11px] font-black uppercase tracking-widest">
                {locale === 'tr' ? 'OTEL & KONAKLAMA İÇİN' : 'FOR HOTELS & HOSPITALITY'}
              </span>
            </div>
            <h1 className="text-[44px] sm:text-[72px] font-black leading-[0.95] tracking-[-0.04em] text-[#1f1e1d]">
              {t.sol_hot_h1.split(' ').slice(0, -1).join(' ')}{' '}
              <span className="text-[#ea580c]">{t.sol_hot_h1.split(' ').slice(-1)}</span>
            </h1>
            <p className="text-[17px] sm:text-[20px] text-[#6b6760] font-bold leading-relaxed max-w-[600px]">
              {t.sol_hot_p}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href={`${base}/auth/register`}
                className="px-8 py-4 bg-[#FDBF1D] text-[#1f1e1d] text-[15px] font-extrabold rounded-lg border-2 border-[#1f1e1d] shadow-[0_4px_0_0_#1f1e1d] hover:bg-[#EAB308] active:translate-y-1 active:shadow-none transition-all text-center flex items-center justify-center gap-2"
              >
                {locale === 'tr' ? '14 Gün Ücretsiz Deneyin' : 'Start 14-Day Free Trial'} <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works for Hotels */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-white border-y border-[#e8e4de]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-[12px] font-black uppercase tracking-widest text-[#FDBF1D] mb-4">
              {locale === 'tr' ? '3 BASİT ADIM' : '3 SIMPLE STEPS'}
            </p>
            <h2 className="text-[32px] sm:text-[42px] font-extrabold text-[#1f1e1d] tracking-[-0.03em] leading-tight">
              {locale === 'tr' ? 'Otelinizde Nasıl Çalışır?' : 'How Does It Work in Your Hotel?'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, i) => (
              <div key={i} className="group relative bg-[#FCFBF7] p-8 rounded-2xl border-[2.5px] border-[#1f1e1d] shadow-[4px_6px_0_0_#1f1e1d] hover:-translate-y-2 transition-transform duration-300">
                <div className="absolute -top-5 -right-5 w-14 h-14 bg-[#FDBF1D] rounded-full border-2 border-[#1f1e1d] shadow-[2px_3px_0_0_#1f1e1d] flex items-center justify-center text-[18px] font-black text-[#1f1e1d] z-10">
                  {step.num}
                </div>
                <div className="w-12 h-12 bg-white rounded-xl border-2 border-[#1f1e1d] flex items-center justify-center mb-6 text-[#1f1e1d]">
                  {step.icon}
                </div>
                <h3 className="text-[20px] font-extrabold text-[#1f1e1d] mb-4">{step.title}</h3>
                <p className="text-[14px] text-[#6b6760] leading-relaxed font-medium">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#1f1e1d] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#ea580c]/5 rounded-full blur-[150px]" />
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="mb-16 space-y-4 text-center">
            <p className="text-[12px] font-black text-[#FDBF1D] uppercase tracking-widest">
              {locale === 'tr' ? 'TEMEL AVANTAJLAR' : 'KEY BENEFITS'}
            </p>
            <h2 className="text-[32px] sm:text-[48px] font-black text-white tracking-[-0.03em] leading-tight">
              {locale === 'tr' ? 'Otelinizi Dijitalde Güçlendirin' : 'Empower Your Hotel Digitally'}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {benefits.map((b, i) => (
              <div key={i} className="group flex gap-5 bg-white/5 border border-white/10 p-6 sm:p-8 rounded-2xl hover:bg-white/10 transition-all hover:-translate-y-1">
                <div className="flex-shrink-0 w-12 h-12 bg-white/5 rounded-xl border border-white/20 flex items-center justify-center">
                  {b.icon}
                </div>
                <div className="space-y-1">
                  <h4 className="text-[17px] font-extrabold text-white">{b.title}</h4>
                  <p className="text-[13px] text-[#ada89f]">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stat Bar */}
      <section className="py-16 px-5 sm:px-8 bg-[#FDBF1D] border-y-[3px] border-[#1f1e1d]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: '200+', label: locale === 'tr' ? 'AKTIF OTEL' : 'ACTIVE HOTELS' },
            { num: '4.5→4.8', label: locale === 'tr' ? 'İTİBAR ARTIŞI' : 'REPUTATION GROWTH' },
            { num: '%88', label: locale === 'tr' ? 'ŞİKAYET ÇÖZÜM ORANI' : 'COMPLAINT RESOLUTION' },
            { num: '24/7', label: locale === 'tr' ? 'DESTEK' : 'SUPPORT' },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-[36px] sm:text-[48px] font-black text-[#1f1e1d] tracking-tighter leading-none">{stat.num}</div>
              <div className="text-[10px] font-black text-[#1f1e1d]/60 uppercase tracking-widest mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#FCFBF7]">
        <div className="max-w-[800px] mx-auto text-center space-y-8">
          <h2 className="text-[32px] sm:text-[48px] font-black text-[#1f1e1d] tracking-[-0.03em] leading-tight">
            {locale === 'tr' ? 'Misafir Memnuniyetini Zirveye Taşıyın' : 'Take Guest Satisfaction to the Peak'}
          </h2>
          <p className="text-[17px] text-[#6b6760] font-medium max-w-[500px] mx-auto">
            {locale === 'tr' ? '14 gün ücretsiz. Kredi kartı gerekmez. 5 dakikada kurulum.' : '14 days free. No credit card required. 5-minute setup.'}
          </p>
          <Link
            href={`${base}/auth/register`}
            className="inline-flex items-center gap-2 px-10 py-5 bg-[#1f1e1d] text-white text-[16px] font-extrabold rounded-2xl border-[3px] border-[#1f1e1d] shadow-[0_6px_0_0_#000] hover:bg-[#111] active:translate-y-[6px] active:shadow-none transition-all"
          >
            {locale === 'tr' ? 'Ücretsiz Denemeye Başla' : 'Start Your Free Trial'} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
