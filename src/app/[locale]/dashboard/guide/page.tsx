import { BookOpen, QrCode, Star, ShieldCheck, Zap, MessageSquare, Printer, Settings } from 'lucide-react';
import Link from 'next/link';
import type { Locale } from '@/lib/translations';

export default async function GuidePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  const steps = [
    {
      icon: <QrCode size={32} className="text-[#ea580c]" />,
      title: locale === 'tr' ? '1. QR Kodunuzu Oluşturun' : '1. Create Your QR Code',
      desc: locale === 'tr'
        ? 'Dashboard üzerinden "Restoranlarım" sekmesine gidin ve bir restoran ekleyin. Ardından "QR Yönetimi" kısmından size özel QR kodunuzu oluşturun.'
        : 'Go to the "My Restaurants" tab on the dashboard and add a restaurant. Then create your unique QR code from the "QR Management" section.',
      link: `/${locale}/dashboard/qr`,
      linkText: locale === 'tr' ? 'QR Oluşturucuyu Aç' : 'Open QR Generator',
    },
    {
      icon: <Printer size={32} className="text-[#3b82f6]" />,
      title: locale === 'tr' ? '2. Basın ve Sergileyin' : '2. Print and Display',
      desc: locale === 'tr'
        ? 'Oluşturulan QR kodu yüksek çözünürlükte indirin. Masalara, menülere veya kasa yanına müşterilerinizin kolayca görebileceği şekilde yerleştirin.'
        : 'Download the generated QR code in high resolution. Place it on tables, menus, or near the checkout where customers can easily see it.',
    },
    {
      icon: <Star size={32} className="text-[#FDBF1D]" />,
      title: locale === 'tr' ? '3. Geri Bildirim Toplayın' : '3. Collect Feedback',
      desc: locale === 'tr'
        ? 'Müşterileriniz QR kodu taradığında saniyeler içinde puanlama ekranına ulaşır. 4 ve 5 yıldızlı yorumlar otomatik olarak Google\'a yönlendirilir.'
        : 'When customers scan the QR code, they reach the rating screen in seconds. 4 and 5-star reviews are automatically redirected to Google.',
      link: `/${locale}/dashboard/feedbacks`,
      linkText: locale === 'tr' ? 'Gelen Kutusu' : 'Inbox',
    },
    {
      icon: <ShieldCheck size={32} className="text-[#10b981]" />,
      title: locale === 'tr' ? '4. Olumsuz Yorumları Filtreleyin' : '4. Filter Negative Feedback',
      desc: locale === 'tr'
        ? '1-3 yıldız arası düşük puanlar Google\'da yayınlanmaz. Bunun yerine müşteriye bir şikayet formu sunulur ve bu bildirim doğrudan panelinize düşer.'
        : 'Low ratings between 1-3 stars are not published on Google. Instead, a complaint form is presented to the customer, and this feedback goes directly to your panel.',
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-4xl mx-auto space-y-10">
      {/* Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FDBF1D] text-[#1f1e1d] border-2 border-[#1f1e1d] rounded-full text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0_0_#1f1e1d]">
          <BookOpen size={14} /> {locale === 'tr' ? 'REHBER' : 'GUIDE'}
        </div>
        <h1 className="text-[32px] sm:text-[44px] font-black text-[#111827] leading-[1] tracking-tighter uppercase italic">
          {locale === 'tr' ? 'Kullanım Kılavuzu' : 'User Guide'}
        </h1>
        <p className="text-[14px] sm:text-[16px] text-[#6b6760] font-bold max-w-xl italic">
          {locale === 'tr'
            ? 'Buaze platformunu en verimli şekilde kullanmanız için hazırladığımız adım adım başlangıç rehberi.'
            : 'A step-by-step startup guide we prepared for you to use the Buaze platform most efficiently.'}
        </p>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="group bg-white rounded-[32px] border-2 border-[#1f1e1d] shadow-[6px_8px_0_0_#1f1e1d] p-8 space-y-6 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#FCFBF7] border-2 border-[#1f1e1d] flex items-center justify-center shadow-[4px_4px_0_0_#1f1e1d] group-hover:bg-[#FDBF1D] transition-colors">
              {step.icon}
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-black text-[#111827] uppercase tracking-tight italic">{step.title}</h3>
              <p className="text-sm font-bold text-[#6b6760] leading-relaxed">{step.desc}</p>
            </div>
            {step.link && (
              <Link
                href={step.link}
                className="inline-flex items-center gap-2 text-xs font-black text-[#ea580c] uppercase tracking-widest hover:gap-3 transition-all"
              >
                {step.linkText} <Zap size={14} fill="currentColor" />
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Pro Tips */}
      <div className="bg-[#111827] rounded-[40px] border-2 border-[#1f1e1d] p-8 sm:p-12 shadow-[8px_10px_0_0_#FDBF1D] space-y-10">
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white uppercase italic">{locale === 'tr' ? 'Önemli İpuçları' : 'Pro Tips'}</h2>
          <div className="h-1.5 w-20 bg-[#FDBF1D] rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[#FDBF1D]">
              <Settings size={20} strokeWidth={3} />
              <h4 className="font-black uppercase text-sm tracking-wide">{locale === 'tr' ? 'Düzenli Takip' : 'Regular Monitoring'}</h4>
            </div>
            <p className="text-[#ada89f] text-sm font-bold leading-relaxed">
              {locale === 'tr'
                ? 'Gelen geri bildirimlere 24 saat içinde yanıt vermek müşteri sadakatini %40 oranında artırır.'
                : 'Responding to feedback within 24 hours increases customer loyalty by 40%.'}
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[#FDBF1D]">
              <MessageSquare size={20} strokeWidth={3} />
              <h4 className="font-black uppercase text-sm tracking-wide">{locale === 'tr' ? 'Kişiselleştirme' : 'Personalization'}</h4>
            </div>
            <p className="text-[#ada89f] text-sm font-bold leading-relaxed">
              {locale === 'tr'
                ? 'Müşterilere isimleriyle hitap etmek güven duygusunu perçinler.'
                : 'Addressing customers by their names reinforces the sense of trust.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
