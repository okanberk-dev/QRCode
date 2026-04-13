import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { Zap, Users, Trophy, ArrowRight, MessageSquare, BarChart3, QrCode } from 'lucide-react';
import Link from 'next/link';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Nasıl Çalışır? — Buaze' : 'How it Works — Buaze',
    description: locale === 'tr'
      ? 'Buaze ile dijital itibarınızı 3 basit adımda yönetmeye başlayın.'
      : 'Start managing your digital reputation in 3 simple steps with Buaze.',
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;

  const steps = [
    {
      id: '01',
      title: locale === 'tr' ? 'Akıllı QR Kodunuzu Oluşturun' : 'Create Your Smart QR Code',
      desc: locale === 'tr' 
        ? 'İşletmenize özel, estetik ve dikkat çekici QR kodları saniyeler içinde panelimizden tasarlayın.' 
        : 'Design aesthetic and remarkable QR codes specific to your business from our panel in seconds.',
      icon: <QrCode size={32} />,
      color: '#FDBF1D'
    },
    {
      id: '02',
      title: locale === 'tr' ? 'Müşteri Deneyimini Basitleştirin' : 'Simplify Customer Experience',
      desc: locale === 'tr' 
        ? 'Müşterileriniz tek bir tarama ile doğrudan sizin belirlediğiniz akıllı akışa yönlendirilsin.' 
        : 'Your customers are directed directly to the smart flow you specify with a single scan.',
      icon: <Users size={32} />,
      color: '#ea580c'
    },
    {
      id: '03',
      title: locale === 'tr' ? 'Sonuçları Otomatiğe Bağlayın' : 'Automate Your Results',
      desc: locale === 'tr' 
        ? 'Olumlu yorumları platformlara aktarın, olumsuzları ise kriz oluşmadan kendiniz çözün.' 
        : 'Direct positive reviews to platforms, resolve negative ones yourself before a crisis occurs.',
      icon: <Trophy size={32} />,
      color: '#FDBF1D'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-[#1f1e1d] font-sans pt-[64px]">
      <MarketingNavbar locale={locale} t={t} />

      {/* Hero Section */}
      <section className="pt-16 sm:pt-24 pb-16 px-5 sm:px-8 border-b border-[#e8e4de]">
        <div className="max-w-[1200px] mx-auto text-center space-y-6">
          <div className="inline-block bg-[#FDBF1D] text-[#1f1e1d] px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-widest border-2 border-[#1f1e1d] shadow-[3px_4px_0_0_#1f1e1d] mb-4">
             {locale === 'tr' ? 'SÜREÇ REHBERİ' : 'PROCESS GUIDE'}
          </div>
          <h1 className="text-[40px] sm:text-[64px] font-black leading-[1] tracking-[-0.04em]">
             {locale === 'tr' ? 'İtibar Yönetiminin' : 'The Future of'}<br/>
             <span className="text-[#ea580c]">{locale === 'tr' ? 'Geleceği' : 'Reputation Management'}</span>
          </h1>
          <p className="text-[16px] sm:text-[18px] text-[#6b6760] max-w-[600px] mx-auto leading-relaxed">
             {locale === 'tr' 
               ? 'Teknoloji ve müşteri psikolojisini birleştirdik. Karmaşık süreçleri 3 basit adıma indirdik.' 
               : 'We combined technology and customer psychology. We reduced complex processes to 3 simple steps.'}
          </p>
        </div>
      </section>

      {/* Detailed Steps */}
      <section className="py-20 sm:py-32 px-5 sm:px-8">
        <div className="max-w-[1000px] mx-auto space-y-32">
          {steps.map((step, i) => (
            <div key={i} className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12 lg:gap-24`}>
              <div className="flex-1 space-y-6">
                <div className="text-[64px] font-black text-[#FDBF1D]/20 leading-none">{step.id}</div>
                <h2 className="text-[32px] sm:text-[42px] font-black leading-tight tracking-[-0.02em]">
                   {step.title}
                </h2>
                <p className="text-[16px] text-[#6b6760] leading-relaxed">
                   {step.desc}
                </p>
                <ul className="space-y-4 pt-4">
                   {[1,2].map(j => (
                     <li key={j} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#1f1e1d] flex items-center justify-center text-white text-[12px] font-bold">✓</div>
                        <span className="text-[14px] font-bold text-[#1f1e1d]"> {locale === 'tr' ? 'Sınırsız özelleştirme imkanı' : 'Unlimited customization options'}</span>
                     </li>
                   ))}
                </ul>
              </div>
              <div className="flex-1 w-full">
                <div className="relative group">
                  <div className="absolute inset-0 bg-[#ea580c] rounded-[32px] translate-x-4 translate-y-4 group-hover:translate-x-6 group-hover:translate-y-6 transition-transform -z-10" />
                  <div className="bg-white rounded-[32px] border-[3px] border-[#1f1e1d] p-10 sm:p-16 flex items-center justify-center aspect-square shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-transform group-hover:-translate-y-1">
                     <div className="text-[#1f1e1d]" style={{ transform: 'scale(2.5)' }}>
                        {step.icon}
                     </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#1f1e1d] text-white">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <MessageSquare className="text-[#FDBF1D]" />, t: locale === 'tr' ? 'Akıllı Filtreleme' : 'Smart Filtering', d: locale === 'tr' ? 'Negatif geri bildirimleri yönetin.' : 'Manage negative feedback.' },
              { icon: <BarChart3 className="text-[#ea580c]" />, t: locale === 'tr' ? 'Detaylı Analiz' : 'Detailed Analytics', d: locale === 'tr' ? 'Eğilimleri anlık takip edin.' : 'Track trends instantly.' },
              { icon: <Zap className="text-[#FDBF1D]" />, t: locale === 'tr' ? 'Hızlı Kurulum' : 'Fast Setup', d: locale === 'tr' ? '5 dakikada yayına alı.' : 'Go live in 5 minutes.' }
            ].map((f, i) => (
              <div key={i} className="p-8 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                 <div className="mb-4">{f.icon}</div>
                 <h4 className="text-[18px] font-black mb-2">{f.t}</h4>
                 <p className="text-[14px] text-[#ada89f]">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-32 px-5 sm:px-8">
        <div className="max-w-[800px] mx-auto text-center">
          <h2 className="text-[32px] sm:text-[48px] font-black mb-8 leading-tight">
             {locale === 'tr' ? 'Kendi Başarı Hikayenizi Yazmaya Başlayın' : 'Start Writing Your Own Success Story'}
          </h2>
          <Link
            href={`${base}/auth/register`}
            className="inline-flex items-center gap-2 px-10 py-5 bg-[#FDBF1D] text-[#1f1e1d] text-[18px] font-black rounded-2xl border-[3px] border-[#1f1e1d] shadow-[8px_10px_0_0_#1f1e1d] hover:bg-[#ea580c] hover:text-white transition-all active:translate-y-2 active:shadow-none"
          >
            {locale === 'tr' ? 'Şimdi Başla' : 'Start Now'} <ArrowRight />
          </Link>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
