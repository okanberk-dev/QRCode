import { Check, X, Minus } from 'lucide-react';
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
    title: (locale === 'tr' ? 'Buaze vs Excel/Spreadsheet | Dijital İtibar Karşılaştırması' : 'Buaze vs Spreadsheet | Digital Reputation Comparison') + ' | Buaze',
    description: locale === 'tr' 
      ? 'İtibarınızı Excel tablolarında mı takip ediyorsunuz? Manuel takibin risklerini ve Buaze\'nin otomasyon gücünü keşfedin.'
      : 'Tracking reputation in spreadsheets? Discover the risks of manual tracking and the power of Buaze automation.',
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function VsSpreadsheetPage({
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
      competitor: <X className="mx-auto text-red-400" />,
    },
    {
      label: t.compare_f2, // Negatif Yorum Filtreleme
      buaze: <Check className="mx-auto text-green-600" />,
      competitor: <X className="mx-auto text-red-400" />,
    },
    {
      label: t.compare_f3, // Anlık SMS/Email Bildirimi
      buaze: <Check className="mx-auto text-green-600" />,
      competitor: <Minus className="mx-auto text-gray-300" />,
    },
    {
        label: t.compare_f7, // Gelişmiş Analitik Panel
        buaze: <Check className="mx-auto text-green-600" />,
        competitor: <div className="text-[12px]">{locale === 'tr' ? 'Manuel Grafik' : 'Manual Charts'}</div>,
      },
    {
      label: t.compare_f4, // Müşteri Veri Tabanı (CRM)
      buaze: <Check className="mx-auto text-green-600" />,
      competitor: <div className="text-[12px]">{locale === 'tr' ? 'Zor Yönetilen Satırlar' : 'Hard to Manage Rows'}</div>,
    },
    {
      label: t.compare_f5, // Otomatik Google Yönlendirme
      buaze: <Check className="mx-auto text-green-600" />,
      competitor: <X className="mx-auto text-red-400" />,
    },
    {
        label: locale === 'tr' ? 'Veri Kayıp Riski' : 'Data Loss Risk',
        buaze: <div className="text-[12px]">{locale === 'tr' ? 'Sıfır (%100 Cloud)' : 'Zero (100% Cloud)'}</div>,
        competitor: <div className="text-[12px] font-black text-red-500">{locale === 'tr' ? 'YÜKSEK' : 'HIGH'}</div>,
      },
  ];

  return (
    <ComparisonLayout
      locale={locale}
      t={t}
      vsName={locale === 'tr' ? 'Spreadsheet' : 'Spreadsheet'}
      heroTitle={locale === 'tr' ? 'Excel Tabloları Yorum Yapmaz' : 'Spreadsheets Don\'t Write Reviews'}
      heroDesc={locale === 'tr' 
        ? 'Geri bildirimleri biriktirmek yetmez, onları birer büyüme fırsatına dönüştürmek gerekir. Manuel takibi bırakın, profesyonelliğe geçin.'
        : 'Collecting feedback isn\'t enough; you need to turn them into growth opportunities. Leave manual tracking behind and go professional.'}
      rows={rows}
      argumentTitle={locale === 'tr' ? 'Siz Veri Girişi mi Yapıyorsunuz, İş mi Yönetiyorsunuz?' : 'Are You Entering Data or Managing a Business?'}
      argumentDesc={locale === 'tr'
        ? 'Excel ve kağıt formlar statiktir. Bir müşteri mutsuz ayrıldığında Excel size haber vermez. Buaze ise o müşteriyi daha kapıdan çıkmadan yakalamanızı sağlar.\nTablolarda kaybolan veriler yerine, grafiklerde yükselen itibarınızı izleyin. Manuel hatayı sıfırlayın.'
        : 'Spreadsheets and paper forms are static. When a customer leaves unhappy, Excel won\'t notify you. Buaze allows you to catch that customer before they even walk out the door.\nInstead of data lost in tables, watch your rising reputation in charts. Eliminate manual error.'}
    />
  );
}
