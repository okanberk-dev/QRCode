import { Check, X, ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import ComparisonLayout from '@/components/marketing/ComparisonLayout';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  return {
    title: (locale === 'tr' ? 'Buaze vs Bireysel QR | Akıllı İtibar Yönetimi' : 'Buaze vs Individual QR | Smart Reputation Management') + ' | Buaze',
    description: locale === 'tr' 
      ? 'Ücretsiz statik QR kodları işletmeniz için ne kadar güvenli? Dinamik ve korumalı Buaze altyapısının farkını öğrenin.'
      : 'How secure are free static QR codes for your business? Learn the difference of the dynamic and protected Buaze infrastructure.',
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
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
      buaze: <Check className="mx-auto text-green-600" />,
      competitor: <div className="text-[12px]">{locale === 'tr' ? 'Statik (%100 Sabit)' : 'Static (100% Fixed)'}</div>,
    },
    {
      label: t.compare_f2, // Negatif Yorum Filtreleme
      buaze: <Check className="mx-auto text-green-600" />,
      competitor: <X className="mx-auto text-red-400" />,
    },
    {
      label: t.compare_f3, // Anlık SMS/Email Bildirimi
      buaze: <Check className="mx-auto text-green-600" />,
      competitor: <X className="mx-auto text-red-400" />,
    },
    {
      label: t.compare_f5, // Otomatik Google Yönlendirme
      buaze: <Check className="mx-auto text-green-600" />,
      competitor: <div className="text-[12px]">{locale === 'tr' ? 'Sadece Tek Link' : 'Single Link Only'}</div>,
    },
    {
      label: t.compare_f4, // Müşteri Veri Tabanı (CRM)
      buaze: <Check className="mx-auto text-green-600" />,
      competitor: <X className="mx-auto text-red-400" />,
    },
    {
        label: locale === 'tr' ? 'Link Güncelleme' : 'Link Update',
        buaze: <div className="text-[12px] text-green-600 font-bold">{locale === 'tr' ? 'ANINDA' : 'INSTANT'}</div>,
        competitor: <div className="text-[12px] font-black text-red-500">{locale === 'tr' ? 'YENİDEN BASKI GEREKİR' : 'REPRINT REQUIRED'}</div>,
      },
    {
      label: t.compare_f6, // Çoklu Şube Yönetimi
      buaze: <Check className="mx-auto text-green-600" />,
      competitor: <X className="mx-auto text-red-400" />,
    },
  ];

  return (
    <ComparisonLayout
      locale={locale}
      t={t}
      vsName={locale === 'tr' ? 'Bireysel QR' : 'Individual QR'}
      heroTitle={locale === 'tr' ? 'Sadece Bir Link Değil, Bir Akıllı Akış' : 'Not Just a Link, a Smart Workflow'}
      heroDesc={locale === 'tr' 
        ? 'Durağan QR kodları eskidi. İşletmenizin değişen ihtiyaçlarına uyum sağlayan, yorumlarınızı filtreleyen ve size veri getiren dinamik altyapıya geçin.'
        : 'Static QR codes are obsolete. Switch to a dynamic infrastructure that adapts to your business needs, filters your reviews, and brings you data.'}
      rows={rows}
      argumentTitle={locale === 'tr' ? 'Statik QR Kodları Neden Tehlikelidir?' : 'Why Are Static QR Codes Dangerous?'}
      argumentDesc={locale === 'tr'
        ? 'Ücretsiz oluşturulan statik QR kodları bir kez basıldıktan sonra değiştirilemez. Google Maps linkiniz değiştiğinde veya kampanya bittiğinde tüm baskıları çöpe atmanız gerekir.\nEn kritiği: Statik kodlar "ayrım" yapamaz. Memnun olmayan bir müşteriyi anlık yakalamak yerine doğrudan Google\'a göndererek puanınızın düşmesine seyirci kalırsınız.'
        : 'Static QR codes created for free cannot be changed once printed. When your Google Maps link changes or a campaign ends, you have to throw away all prints.\nMost critically: Static codes cannot "differentiate." Instead of catching an unhappy customer instantly, they send them directly to Google, leaving you to watch your score drop.'}
    />
  );
}
