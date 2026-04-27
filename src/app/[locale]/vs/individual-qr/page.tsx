import { Check, X } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import ComparisonLayout from '@/components/marketing/ComparisonLayout';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: (locale === 'tr' ? 'Buaze vs Bireysel QR | Akıllı İtibar Yönetimi' : 'Buaze vs Individual QR | Smart Reputation Management') + ' | Buaze',
    description: locale === 'tr' 
      ? 'Ücretsiz statik QR kodları işletmeniz için ne kadar güvenli? Dinamik ve korumalı Buaze altyapısının farkını öğrenin.'
      : 'How secure are free static QR codes for your business? Learn the difference of the dynamic and protected Buaze infrastructure.',
  };
}

export default async function VsIndividualQrPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);

  const rows = [
    {
      label: t.compare_f1, // Dinamik QR
      buaze: <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center mx-auto"><Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} /></span>,
      competitor: <span className="text-[13px] text-[#525252]">{locale === 'tr' ? 'Statik (sabit)' : 'Static (fixed)'}</span>,
    },
    {
      label: t.compare_f2, // Negatif Yorum Filtreleme
      buaze: <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center mx-auto"><Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} /></span>,
      competitor: <span className="inline-flex w-7 h-7 rounded-full bg-[#FEF2F2] items-center justify-center mx-auto"><X size={14} className="text-[#B91C1C]" strokeWidth={2.5} /></span>,
    },
    {
      label: t.compare_f3, // Anlık SMS/Email Bildirimi
      buaze: <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center mx-auto"><Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} /></span>,
      competitor: <span className="inline-flex w-7 h-7 rounded-full bg-[#FEF2F2] items-center justify-center mx-auto"><X size={14} className="text-[#B91C1C]" strokeWidth={2.5} /></span>,
    },
    {
      label: t.compare_f5, // Otomatik Google Yönlendirme
      buaze: <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center mx-auto"><Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} /></span>,
      competitor: <span className="text-[13px] text-[#525252]">{locale === 'tr' ? 'Tek link' : 'Single link'}</span>,
    },
    {
      label: t.compare_f4, // Müşteri Veri Tabanı (CRM)
      buaze: <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center mx-auto"><Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} /></span>,
      competitor: <span className="inline-flex w-7 h-7 rounded-full bg-[#FEF2F2] items-center justify-center mx-auto"><X size={14} className="text-[#B91C1C]" strokeWidth={2.5} /></span>,
    },
    {
        label: locale === 'tr' ? 'Link Güncelleme' : 'Link Update',
        buaze: <span className="pulse-eyebrow text-[#A8D62E]">{locale === 'tr' ? 'ANINDA' : 'INSTANT'}</span>,
        competitor: <span className="pulse-eyebrow text-[#B91C1C]">{locale === 'tr' ? 'YENİDEN BASKI' : 'REPRINT'}</span>,
      },
    {
      label: t.compare_f6, // Çoklu Şube Yönetimi
      buaze: <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center mx-auto"><Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} /></span>,
      competitor: <span className="inline-flex w-7 h-7 rounded-full bg-[#FEF2F2] items-center justify-center mx-auto"><X size={14} className="text-[#B91C1C]" strokeWidth={2.5} /></span>,
    },
  ];

  return (
    <ComparisonLayout
      locale={locale}
      t={t}
      vsName={locale === 'tr' ? 'Bireysel QR' : 'Individual QR'}
      heroTitle={locale === 'tr' ? 'Statik Linkler İşletmenizi Koruyamaz.' : 'Static Links Can\'t Protect Your Business.'}
      heroDesc={locale === 'tr' 
        ? 'Durağan QR kodları eskidi. İşletmenizin değişen ihtiyaçlarına uyum sağlayan, yorumlarınızı optimize eden ve size anlık veri getiren akıllı Buaze altyapısına geçin.'
        : 'Static QR codes are obsolete. Switch to the smart Buaze infrastructure that adapts to your business needs, optimizes your reviews, and brings you real-time data.'}
      rows={rows}
      argumentTitle={locale === 'tr' ? 'Ücretsiz QR Kodların Gizli Maliyeti' : 'The Hidden Cost of Free QR Codes'}
      argumentDesc={locale === 'tr'
        ? 'Ücretsiz oluşturulan statik QR kodları bir kez basıldıktan sonra değiştirilemez. Google Maps linkiniz güncellendiğinde veya şube yapınız değiştiğinde tüm baskıları çöpe atmanız gerekir.\nEn kritiği: Statik kodlar "akıllı filtreleme" yapamaz. Memnun olmayan bir müşteriyi anlık dijital operasyonla yakalamak yerine doğrudan Google\'a göndererek puanınızın düşmesine zemin hazırlarsınız.'
        : 'Static QR codes created for free cannot be changed once printed. When your Google Maps link is updated or your branch structure changes, you have to throw away all prints.\nMost critically: Static codes cannot perform "smart filtering." Instead of catching an unhappy customer with an instant digital operation, you pave the way for your score to drop by sending them directly to Google.'}
    />
  );
}
