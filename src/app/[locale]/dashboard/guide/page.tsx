'use client';

import { ArrowLeft, BookOpen, QrCode, Star, ShieldCheck, Zap, MessageSquare, Printer, Settings } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';

export default function GuidePage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const t = getTranslations(locale);

  const steps = [
    {
      icon: <QrCode size={32} className="text-[#FF9A14]" />,
      title: locale === 'tr' ? '1. QR Kodunuzu Oluşturun' : '1. Create Your QR Code',
      desc: locale === 'tr' 
        ? 'Dashboard üzerinden "Restoranlarım" sekmesine gidin ve bir restoran ekleyin. Ardından "QR Yönetimi" kısmından size özel QR kodunuzu oluşturun.'
        : 'Go to the "My Restaurants" tab on the dashboard and add a restaurant. Then create your unique QR code from the "QR Management" section.',
      link: `/${locale}/dashboard/qr`,
      linkText: locale === 'tr' ? 'QR Oluşturucuyu Aç' : 'Open QR Generator'
    },
    {
      icon: <Printer size={32} className="text-[#3b82f6]" />,
      title: locale === 'tr' ? '2. Basın ve Sergileyin' : '2. Print and Display',
      desc: locale === 'tr'
        ? 'Oluşturulan QR kodu yüksek çözünürlükte indirin. Masalara, menülere veya kasa yanına müşterilerinizin kolayca görebileceği şekilde yerleştirin.'
        : 'Download the generated QR code in high resolution. Place it on tables, menus, or near the checkout where customers can easily see it.',
    },
    {
      icon: <Star size={32} className="text-[#FF9A14]" />,
      title: locale === 'tr' ? '3. Geri Bildirim Toplayın' : '3. Collect Feedback',
      desc: locale === 'tr'
        ? 'Müşterileriniz QR kodu taradığında saniyeler içinde geri bildirim ekranına ulaşır. Organik etkileşimle dijital itibarınızı güçlendirin.'
        : 'When customers scan the QR code, they reach the feedback screen in seconds. Strengthen your digital reputation with organic interaction.',
    },
    {
      icon: <ShieldCheck size={32} className="text-[#10b981]" />,
      title: locale === 'tr' ? '4. Operasyonel Takip' : '4. Operational Monitoring',
      desc: locale === 'tr'
        ? 'Tüm geri bildirimler yapılandırılmış bir veri akışına dönüştürülür ve doğrudan panelinize düşer. Deneyimi anlık takip ederek marka itibarınızı koruyun.'
        : 'All feedback is converted into a structured data stream and goes directly to your panel. Protect your brand reputation by monitoring experience in real-time.',
      link: `/${locale}/dashboard/feedbacks`,
      linkText: locale === 'tr' ? 'Gelen Kutusu' : 'Inbox'
    }
  ];

  return (
    <div className="min-h-screen bg-[#F5F4F1] font-sans selection:bg-[#FF9A14]/30 p-4 sm:p-6 md:p-10 lg:p-16">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-6">
          <Link 
            href={`/${locale}/dashboard`}
            className="inline-flex items-center gap-2 text-xs font-black text-[#243554] hover:text-[#0F2348] transition-all uppercase tracking-widest group"
          >
            <div className="w-8 h-8 rounded-lg bg-white border-2 border-[#0F2348] flex items-center justify-center shadow-[2px_2px_0_0_#0F2348] group-hover:translate-y-0.5 group-hover:shadow-none transition-all">
              <ArrowLeft size={16} strokeWidth={3} />
            </div>
            {locale === 'tr' ? 'Dashboard\'a Dön' : 'Back to Dashboard'}
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF9A14] text-[#0F2348] border-2 border-[#0F2348] rounded-full text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0_0_#0F2348]">
                <BookOpen size={14} /> {locale === 'tr' ? 'REHBER' : 'GUIDE'}
              </div>
              <h1 className="text-[36px] sm:text-[48px] font-black text-[#0F2348] leading-[1] tracking-tighter uppercase italic">
                {locale === 'tr' ? 'Kullanım Kılavuzu' : 'User Guide'}
              </h1>
              <p className="text-[15px] sm:text-[17px] text-[#243554] font-bold max-w-xl italic">
                {locale === 'tr' 
                  ? 'Buaze platformunu en verimli şekilde kullanmanız için hazırladığımız adım adım başlangıç rehberi.' 
                  : 'A step-by-step startup guide we prepared for you to use the Buaze platform most efficiently.'}
              </p>
            </div>
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {steps.map((step, idx) => (
            <div 
              key={idx}
              className="group bg-white rounded-[32px] border-2 border-[#0F2348] shadow-[6px_8px_0_0_#0F2348] p-8 space-y-6 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#F5F4F1] border-2 border-[#0F2348] flex items-center justify-center shadow-[4px_4px_0_0_#0F2348] group-hover:bg-[#FF9A14] transition-colors">
                {step.icon}
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-black text-[#0F2348] uppercase tracking-tight italic">{step.title}</h3>
                <p className="text-sm font-bold text-[#243554] leading-relaxed">
                  {step.desc}
                </p>
              </div>
              {step.link && (
                <Link 
                  href={step.link}
                  className="inline-flex items-center gap-2 text-xs font-black text-[#FF9A14] uppercase tracking-widest hover:gap-3 transition-all"
                >
                  {step.linkText} <Zap size={14} fill="currentColor" />
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* FAQ - Quick Tips */}
        <div className="bg-[#0F2348] rounded-[40px] border-2 border-[#0F2348] p-8 sm:p-12 shadow-[8px_10px_0_0_#FF9A14] space-y-10">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white uppercase italic">{locale === 'tr' ? 'Önemli İpuçları' : 'Pro Tips'}</h2>
            <div className="h-1.5 w-20 bg-[#FF9A14] rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[#FF9A14]">
                <Settings size={20} strokeWidth={3} />
                <h4 className="font-black uppercase text-sm tracking-wide">{locale === 'tr' ? 'Düzenli Takip' : 'Regular Monitoring'}</h4>
              </div>
              <p className="text-[#6B7B93] text-sm font-bold leading-relaxed">
                {locale === 'tr'
                  ? 'Gelen geri bildirimlere 24 saat içinde yanıt vermek müşteri sadakatini %40 oranında artırır.'
                  : 'Responding to feedback within 24 hours increases customer loyalty by 40%.'}
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[#FF9A14]">
                <MessageSquare size={20} strokeWidth={3} />
                <h4 className="font-black uppercase text-sm tracking-wide">{locale === 'tr' ? 'Kişiselleştirme' : 'Personalization'}</h4>
              </div>
              <p className="text-[#6B7B93] text-sm font-bold leading-relaxed">
                {locale === 'tr'
                  ? 'Müşterilere isimleriyle hitap etmek güven duygusunu perçinler.'
                  : 'Addressing customers by their names reinforces the sense of trust.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
