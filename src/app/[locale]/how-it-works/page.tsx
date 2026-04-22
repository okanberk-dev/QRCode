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

export const dynamic = 'force-dynamic';

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
      title: locale === 'tr' ? 'Profesyonel QR Kodunuzu Oluşturun' : 'Create Your Professional QR Code',
      desc: locale === 'tr' 
        ? 'İşletmenize özel, estetik ve dikkat çekici QR kodları saniyeler içinde panelimizden tasarlayın.' 
        : 'Design aesthetic and remarkable QR codes specific to your business from our panel in seconds.',
      icon: <QrCode size={32} />,
      color: '#F4B400'
    },
    {
      id: '02',
      title: locale === 'tr' ? 'Müşteri Deneyimini Basitleştirin' : 'Simplify Customer Experience',
      desc: locale === 'tr' 
        ? 'Müşterileriniz tek bir tarama ile doğrudan sizin belirlediğiniz akıllı akışa yönlendirilsin.' 
        : 'Your customers are directed directly to the smart flow you specify with a single scan.',
      icon: <Users size={32} />,
      color: '#F4B400'
    },
    {
      id: '03',
      title: locale === 'tr' ? 'Operasyonları Yönetin' : 'Manage Operations',
      desc: locale === 'tr' 
        ? 'Geri bildirim akışını anlık takip edin ve krizleri operasyonel olarak profesyonelce yönetin.' 
        : 'Monitor feedback flow in real-time and manage crises operationally and professionally.',
      icon: <Trophy size={32} />,
      color: '#F4B400'
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8F6F1] text-[#1A2332] font-sans pt-[64px] selection:bg-[#F4B400]/30">
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Hero Section (3D Enriched) ─── */}
      <section className="pt-20 sm:pt-32 pb-12 sm:pb-20 px-5 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F4B400]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-[1200px] mx-auto text-center space-y-8 relative">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-white border-2 border-[#1A2332] rounded-full shadow-md sm:shadow-md">
             <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em]">{locale === 'tr' ? 'SİSTEM NASIL ÇALIŞIR?' : 'HOW THE SYSTEM WORKS'}</span>
          </div>
          <h1 className="text-[34px] sm:text-[84px] font-black leading-[1.1] sm:leading-[0.9] tracking-tight sm:tracking-[-0.05em] text-[#1A2332]">
             {locale === 'tr' ? 'İtibar Yönetiminin' : 'The Future of'}<br/>
             <span className="text-[#F4B400]">{locale === 'tr' ? 'Dijital Geleceği' : 'Digital Reputation'}</span>
          </h1>
          <p className="text-[16px] sm:text-[22px] text-[#2A3444] max-w-[640px] mx-auto leading-relaxed font-bold">
             {locale === 'tr' 
               ? 'Karmaşık algoritmaları ve müşteri psikolojisini birleştirdik. İşletmenizi büyütmek için gereken her şeyi 3 basit adıma indirdik.' 
               : 'We combined complex algorithms with customer psychology. We reduced everything you need to grow your business into 3 simple steps.'}
          </p>
        </div>
      </section>

      {/* ─── Detailed Steps (Tactile 3D) ─── */}
      <section className="py-16 sm:py-40 px-5 sm:px-8 bg-white border-y-[3px] sm:border-y-[4px] border-[#1A2332]">
        <div className="max-w-[1100px] mx-auto space-y-24 sm:space-y-48">
          {steps.map((step, i) => (
            <div key={i} className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12 sm:gap-16 lg:gap-24 relative`}>
              {/* Step indicator line */}
              {i < steps.length - 1 && (
                <div className="absolute left-1/2 bottom-[-160px] hidden lg:block w-[4px] h-[120px] bg-[#F8F6F1] -translate-x-1/2" />
              )}
              
              <div className="w-full lg:flex-1 space-y-6 sm:space-y-8 text-center lg:text-left">
                <div className="text-[60px] sm:text-[120px] font-black text-[#F4B400]/15 leading-none absolute -top-8 left-0 lg:-top-10 lg:-left-10 pointer-events-none select-none w-full lg:w-auto">
                   {step.id}
                </div>
                <div className="relative z-10 space-y-4 sm:space-y-6">
                  <h2 className="text-[28px] sm:text-[52px] font-black leading-[1.1] tracking-tight sm:tracking-[-0.03em] text-[#1A2332]">
                     {step.title}
                  </h2>
                  <p className="text-[15px] sm:text-[19px] text-[#2A3444] leading-relaxed font-bold">
                     {step.desc}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-[400px] mx-auto lg:mx-0">
                     {[
                       locale === 'tr' ? 'Anlık Bildirimler' : 'Instant Alerts',
                       locale === 'tr' ? 'Tam Özelleştirme' : 'Full Customization',
                       locale === 'tr' ? 'Mobil Yönetim' : 'Mobile Admin',
                       locale === 'tr' ? 'Google Entegrasyonu' : 'Google Integration'
                     ].map((item, idx) => (
                       <div key={idx} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-[#1A2332] flex items-center justify-center text-white border-2 border-[#1A2332] shadow-md">
                             <Zap size={12} strokeWidth={2} className="text-[#F4B400]" />
                          </div>
                          <span className="text-[12px] sm:text-[13px] font-black text-[#1A2332] uppercase tracking-widest">{item}</span>
                       </div>
                     ))}
                  </div>
                </div>
              </div>

              <div className="w-full lg:flex-1 relative">
                <div className="relative group max-w-[320px] sm:max-w-none mx-auto">
                  <div className="absolute inset-0 bg-[#F4B400] rounded-[32px] sm:rounded-[48px] translate-x-4 translate-y-4 sm:translate-x-6 sm:translate-y-6 group-hover:translate-x-6 group-hover:translate-y-6 sm:group-hover:translate-x-8 sm:group-hover:translate-y-8 transition-transform -z-10 border-[2.5px] sm:border-[3px] border-[#1A2332]" />
                  <div className="bg-[#1A2332] rounded-[32px] sm:rounded-[48px] border-[3px] sm:border-[4px] border-[#1A2332] p-10 sm:p-20 flex items-center justify-center aspect-square shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] sm:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] transition-all group-hover:-translate-y-2 overflow-hidden">
                     <div className="text-[#F4B400] drop-shadow-[0_10px_10px_rgba(244, 180, 0,0.3)] scale-[2] sm:scale-[3.5]">
                        {step.icon}
                     </div>
                     <div className="absolute inset-0 bg-gradient-to-tr from-[#F4B400]/10 to-transparent pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features Grid (Premium 3D) ─── */}
      <section className="py-20 sm:py-40 px-5 sm:px-8 bg-[#1A2332] text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(244, 180, 0,0.15),transparent)] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            {[
              { icon: <MessageSquare className="text-[#F4B400] w-8 h-8 sm:w-9 sm:h-9" strokeWidth={2} />, t: locale === 'tr' ? 'Geri Bildirim Yönetimi' : 'Feedback Management', d: locale === 'tr' ? 'Müşteri deneyimini anlık olarak yapılandırılmış veriye dönüştürerek marka itibarınızı profesyonelce korur.' : 'Protects your brand reputation by converting customer experience into real-time structured data.' },
              { icon: <BarChart3 className="text-[#F4B400] w-8 h-8 sm:w-9 sm:h-9" strokeWidth={2} />, t: locale === 'tr' ? 'Gerçek Zamanlı Analiz' : 'Real-time Analytics', d: locale === 'tr' ? 'Müşteri memnuniyet eğilimlerini anlık grafiklerle izleyin ve aksiyon alın.' : 'Monitor satisfaction trends with live charts and take immediate action.' },
              { icon: <Zap className="text-[#F4B400] w-8 h-8 sm:w-9 sm:h-9" strokeWidth={2} />, t: locale === 'tr' ? 'Işık Hızında Kurulum' : 'Lightning Setup', d: locale === 'tr' ? 'Karmaşık entegrasyonlar yok. Sisteminiz 5 dakikada geri bildirim toplamaya hazır.' : 'No complex integrations. Your system is ready to collect feedback in 5 minutes.' }
            ].map((f, i) => (
              <div key={i} className="p-8 sm:p-10 bg-white/5 rounded-[32px] sm:rounded-[40px] border-[2.5px] sm:border-[3px] border-white/10 hover:border-[#F4B400]/50 hover:bg-white/10 transition-all group">
                 <div className="mb-6 w-14 h-14 sm:w-16 sm:h-16 bg-white/5 rounded-2xl flex items-center justify-center border-2 border-white/10 group-hover:scale-110 transition-transform">{f.icon}</div>
                 <h4 className="text-[20px] sm:text-[22px] font-black mb-4 uppercase tracking-tighter">{f.t}</h4>
                 <p className="text-[14px] sm:text-[15px] text-[#6B7280] font-bold leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA Section ─── */}
      <section className="py-20 sm:py-40 px-5 sm:px-8 bg-[#F8F6F1]">
        <div className="max-w-[1000px] mx-auto text-center space-y-10 sm:space-y-12">
          <h2 className="text-[32px] sm:text-[72px] font-black mb-4 sm:mb-8 leading-[1.1] sm:leading-[0.9] tracking-tight sm:tracking-[-0.05em] text-[#1A2332]">
             {locale === 'tr' ? 'Başarı Hikayenizi Yazmaya' : 'Ready to Start Writing'}<br/>
             <span className="text-[#F4B400]">{locale === 'tr' ? 'Şimdi Başlayın' : 'Your Success Story?'}</span>
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              href={`${base}/auth/register`}
              className="w-full sm:w-auto group inline-flex items-center justify-center gap-3 px-10 sm:px-12 py-5 sm:py-6 bg-[#1A2332] text-white text-[17px] sm:text-[18px] font-black rounded-[20px] sm:rounded-[24px] border-[3.5px] sm:border-[4px] border-[#1A2332] shadow-sm sm:shadow-sm hover:bg-[#1A2332] transition-all active:translate-y-[6px] sm:active:translate-y-[10px] active:shadow-none uppercase tracking-widest"
            >
              {locale === 'tr' ? 'HEMEN BAŞLA' : 'GET STARTED'} <ArrowRight className="group-hover:translate-x-2 transition-transform" strokeWidth={2} />
            </Link>
          </div>
          <p className="text-[11px] sm:text-[12px] font-black text-[#6B7280] uppercase tracking-[0.2em] leading-relaxed">
            {locale === 'tr' ? 'KREDİ KARTI GEREKMEZ • 14 GÜN ÜCRETSİZ ERİŞİM' : 'NO CREDIT CARD REQUIRED • 14 DAYS FREE ACCESS'}
          </p>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
