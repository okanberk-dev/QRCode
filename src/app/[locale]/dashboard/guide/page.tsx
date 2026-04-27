'use client';

import { use } from 'react';
import { QrCode, Star, ShieldCheck, Zap, MessageSquare, Printer, Settings } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { PageHeader } from '@/components/ui';

export default function GuidePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = use(params);
  const locale: Locale = rawLocale === 'en' ? 'en' : 'tr';
  const t = getTranslations(locale);

  const steps = [
    {
      icon: <QrCode size={32} className="text-[#C6F24E]" />,
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
      icon: <Star size={32} className="text-[#C6F24E]" />,
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

  const isTr = locale === 'tr';

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={isTr ? 'KILAVUZ' : 'GUIDE'}
        title={isTr ? 'Kullanım kılavuzu' : 'User guide'}
        description={
          isTr
            ? 'Buaze platformunu en verimli şekilde kullanmanız için hazırladığımız adım adım başlangıç rehberi.'
            : 'A step-by-step startup guide to help you use the Buaze platform most efficiently.'
        }
      />

      {/* Steps grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl border border-[#EDEDED] p-6 sm:p-7 space-y-4 hover:border-[#C6F24E] transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-[#EAF9B8] flex items-center justify-center text-[#0A0A0A]">
              {step.icon}
            </div>
            <div className="space-y-2">
              <h3
                className="text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {step.title}
              </h3>
              <p className="text-[14px] text-[#525252] leading-[1.6]">{step.desc}</p>
            </div>
            {step.link && (
              <Link
                href={step.link}
                className="inline-flex items-center gap-1.5 pulse-eyebrow text-[#0A0A0A] hover:text-[#A8D62E] transition-colors"
              >
                {step.linkText.toUpperCase()} <Zap size={11} strokeWidth={2} />
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Pro tips */}
      <section className="bg-[#0A0A0A] rounded-2xl p-8 sm:p-10 space-y-8 text-white">
        <div>
          <span className="pulse-eyebrow text-[#C6F24E]">{isTr ? 'İPUÇLARI' : 'PRO TIPS'}</span>
          <h2
            className="mt-3 text-[22px] sm:text-[26px] font-medium tracking-[-0.02em]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {isTr ? 'Önemli ipuçları' : 'Key tactics'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#C6F24E]">
              <Settings size={14} strokeWidth={2} />
              <h4 className="pulse-eyebrow text-[#C6F24E]">
                {isTr ? 'DÜZENLİ TAKİP' : 'REGULAR MONITORING'}
              </h4>
            </div>
            <p className="text-[13px] text-white/70 leading-[1.6]">
              {isTr
                ? 'Gelen geri bildirimlere 24 saat içinde yanıt vermek müşteri sadakatini %40 oranında artırır.'
                : 'Responding to feedback within 24 hours increases customer loyalty by 40%.'}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#C6F24E]">
              <MessageSquare size={14} strokeWidth={2} />
              <h4 className="pulse-eyebrow text-[#C6F24E]">
                {isTr ? 'KİŞİSELLEŞTİRME' : 'PERSONALIZATION'}
              </h4>
            </div>
            <p className="text-[13px] text-white/70 leading-[1.6]">
              {isTr
                ? 'Müşterilere isimleriyle hitap etmek güven duygusunu perçinler.'
                : 'Addressing customers by their names reinforces the sense of trust.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
