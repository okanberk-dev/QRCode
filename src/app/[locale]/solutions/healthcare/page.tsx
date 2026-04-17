import type { Metadata } from 'next';
import { Star, QrCode, ShieldCheck, TrendingUp, HeartPulse, ArrowRight, Zap, Users, Stethoscope, Lock } from 'lucide-react';
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
    title: `${t.sol_hea_title} — Buaze`,
    description: t.sol_hea_desc,
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/healthcare`,
      languages: {
        tr: 'https://buaze.com/tr/solutions/healthcare',
        en: 'https://buaze.com/en/solutions/healthcare',
      },
    },
    openGraph: {
      type: 'website',
      url: `https://buaze.com/${locale}/solutions/healthcare`,
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      siteName: 'Buaze',
      title: `${t.sol_hea_title} — Buaze`,
      description: t.sol_hea_desc,
    },
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function HealthcareSolutionPage({
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
    name: t.sol_hea_title,
    provider: { '@type': 'Organization', name: 'Buaze', url: 'https://buaze.com' },
    description: t.sol_hea_desc,
    serviceType: locale === 'tr' ? 'Klinik İtibar Yönetimi' : 'Clinic Reputation Management',
    areaServed: { '@type': 'Country', name: locale === 'tr' ? 'Türkiye' : 'Turkey' },
  };

  const steps = [
    {
      num: '01',
      icon: <QrCode size={24} />,
      title: locale === 'tr' ? 'Bekleme Salonuna Yerleştirin' : 'Place in the Waiting Room',
      desc: locale === 'tr'
        ? 'Resepsiyon bankosuna, bekleme salonu masalarına veya randevu kartlarına markanıza özel QR kodlarınızı ekleyin.'
        : 'Add your branded QR codes to the reception desk, waiting room tables, or appointment cards.',
    },
    {
      num: '02',
      icon: <Users size={24} />,
      title: locale === 'tr' ? 'Hasta Tedavi Sonrası Değerlendirir' : 'Patient Reviews After Treatment',
      desc: locale === 'tr'
        ? 'Tedavi veya muayene sonrasında en taze anında hastanız geri bildirimini paylaşır.'
        : 'Right after treatment or examination, your patient shares their feedback at the freshest moment.',
    },
    {
      num: '03',
      icon: <ShieldCheck size={24} />,
      title: locale === 'tr' ? 'Gizlilik Korunarak Puan Artar' : 'Ratings Increase with Privacy',
      desc: locale === 'tr'
        ? 'KVKK uyumlu yapımız sayesinde hasta gizliliği korunur, olumlu yorumlar Google\'a yönlendirilir.'
        : 'Patient privacy is protected with our GDPR-compliant structure, while positive reviews are directed to Google.',
    },
  ];

  const benefits = [
    {
      title: locale === 'tr' ? 'Hasta Güveni Artışı' : 'Increased Patient Trust',
      desc: locale === 'tr' ? 'Doğrulanmış hasta yorumları ile yeni hastaların güvenini kazanın.' : 'Win the trust of new patients with verified patient reviews.',
      icon: <HeartPulse size={20} className="text-[#FDBF1D]" />,
    },
    {
      title: locale === 'tr' ? 'KVKK / GDPR Uyumlu' : 'KVKK / GDPR Compliant',
      desc: locale === 'tr' ? 'Tüm geri bildirim süreçleri kişisel veri koruma mevzuatına uygundur.' : 'All feedback processes comply with personal data protection regulations.',
      icon: <Lock size={20} className="text-[#10b981]" />,
    },
    {
      title: locale === 'tr' ? 'Rakiplerin Üzerine Çıkın' : 'Outperform Competitors',
      desc: locale === 'tr' ? 'Bölgenizdeki kliniğe aramalarda 5 yıldızlı profilinizle öne çıkın.' : 'Stand out in local clinic searches with your 5-star profile.',
      icon: <TrendingUp size={20} className="text-[#ea580c]" />,
    },
    {
      title: locale === 'tr' ? 'Etik ve Organik Büyüme' : 'Ethical & Organic Growth',
      desc: locale === 'tr' ? 'Sahte yorum yok, manipülasyon yok. Tamamen gerçek hasta deneyimine dayalı organik büyüme.' : 'No fake reviews, no manipulation. Fully organic growth based on real patient experiences.',
      icon: <Stethoscope size={20} className="text-[#FDBF1D]" />,
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
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#10b981]/5 rounded-full blur-[150px] translate-x-1/4 translate-y-1/4" />
        <div className="max-w-[1200px] mx-auto relative">
          <div className="max-w-[720px] space-y-6">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-white border-2 border-[#1f1e1d] rounded-full shadow-[4px_4px_0_0_#1f1e1d]">
              <HeartPulse size={14} />
              <span className="text-[11px] font-black uppercase tracking-widest">
                {locale === 'tr' ? 'KLİNİK & SAĞLIK İÇİN' : 'FOR CLINICS & HEALTHCARE'}
              </span>
            </div>
            <h1 className="text-[44px] sm:text-[72px] font-black leading-[0.95] tracking-[-0.04em] text-[#1f1e1d]">
              {t.sol_hea_h1.split(' ').slice(0, -1).join(' ')}{' '}
              <span className="text-[#10b981]">{t.sol_hea_h1.split(' ').slice(-1)}</span>
            </h1>
            <p className="text-[17px] sm:text-[20px] text-[#6b6760] font-bold leading-relaxed max-w-[600px]">
              {t.sol_hea_p}
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

      {/* How It Works for Healthcare */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-white border-y border-[#e8e4de]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-[12px] font-black uppercase tracking-widest text-[#10b981] mb-4">
              {locale === 'tr' ? '3 BASİT ADIM' : '3 SIMPLE STEPS'}
            </p>
            <h2 className="text-[32px] sm:text-[42px] font-extrabold text-[#1f1e1d] tracking-[-0.03em] leading-tight">
              {locale === 'tr' ? 'Kliniğinizde Nasıl Çalışır?' : 'How Does It Work in Your Clinic?'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, i) => (
              <div key={i} className="group relative bg-[#FCFBF7] p-8 rounded-2xl border-[2.5px] border-[#1f1e1d] shadow-[4px_6px_0_0_#1f1e1d] hover:-translate-y-2 transition-transform duration-300">
                <div className="absolute -top-5 -right-5 w-14 h-14 bg-[#10b981] rounded-full border-2 border-[#1f1e1d] shadow-[2px_3px_0_0_#1f1e1d] flex items-center justify-center text-[18px] font-black text-white z-10">
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#10b981]/5 rounded-full blur-[150px]" />
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="mb-16 space-y-4 text-center">
            <p className="text-[12px] font-black text-[#10b981] uppercase tracking-widest">
              {locale === 'tr' ? 'TEMEL AVANTAJLAR' : 'KEY BENEFITS'}
            </p>
            <h2 className="text-[32px] sm:text-[48px] font-black text-white tracking-[-0.03em] leading-tight">
              {locale === 'tr' ? 'Dijital Güven İnşa Edin' : 'Build Digital Trust'}
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
      <section className="py-16 px-5 sm:px-8 bg-[#10b981] border-y-[3px] border-[#1f1e1d]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: '150+', label: locale === 'tr' ? 'AKTIF KLİNİK' : 'ACTIVE CLINICS' },
            { num: '4.6→4.9', label: locale === 'tr' ? 'ORT. PUAN ARTIŞI' : 'AVG. RATING BOOST' },
            { num: '%100', label: locale === 'tr' ? 'KVKK UYUMLU' : 'GDPR COMPLIANT' },
            { num: '%95', label: locale === 'tr' ? 'HASTA MEMNUNİYETİ' : 'PATIENT SATISFACTION' },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-[36px] sm:text-[48px] font-black text-white tracking-tighter leading-none">{stat.num}</div>
              <div className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#FCFBF7]">
        <div className="max-w-[800px] mx-auto text-center space-y-8">
          <h2 className="text-[32px] sm:text-[48px] font-black text-[#1f1e1d] tracking-[-0.03em] leading-tight">
            {locale === 'tr' ? 'Kliniğinizin Dijital İtibarını Güçlendirin' : 'Strengthen Your Clinic\'s Digital Reputation'}
          </h2>
          <p className="text-[17px] text-[#6b6760] font-medium max-w-[500px] mx-auto">
            {locale === 'tr' ? '14 gün ücretsiz. Kredi kartı gerekmez. KVKK uyumlu altyapı.' : '14 days free. No credit card required. GDPR-compliant infrastructure.'}
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
