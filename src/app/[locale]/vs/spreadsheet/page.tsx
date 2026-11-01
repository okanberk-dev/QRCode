import { Check, X, Minus } from 'lucide-react';
import { jsonLdString } from '@/lib/seo/json-ld';
import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import ComparisonLayout from '@/components/marketing/ComparisonLayout';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: (locale === 'tr' ? 'Buaze vs Excel — İtibar yönetimi karşılaştırması' : 'Buaze vs Spreadsheet | Digital Reputation Comparison'),
    description: locale === 'tr'
      ? 'İtibarınızı Excel tablolarında mı takip ediyorsunuz? Manuel takibin gecikme ve kör nokta risklerini, Buaze otomasyonunun ekip ritmindeki farkını keşfedin.'
      : 'Tracking your reputation in spreadsheets? See how Buaze automation eliminates delays and blind spots, and how it changes your team\'s response cadence.',
    alternates: {
      canonical: `/${locale}/vs/spreadsheet`,
      languages: {
        tr: '/tr/vs/spreadsheet',
        en: '/en/vs/spreadsheet',
        'x-default': '/tr/vs/spreadsheet',
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      url: `https://www.buaze.com/${locale}/vs/spreadsheet`,
      images: [{ url: locale === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [locale === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png'],
    },
  };
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
      buaze: <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center mx-auto"><Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} /></span>,
      competitor: <span className="inline-flex w-7 h-7 rounded-full bg-[#FEF2F2] items-center justify-center mx-auto"><X size={14} className="text-[#B91C1C]" strokeWidth={2.5} /></span>,
    },
    {
      label: t.compare_f2, // Özel Geri Bildirim Kanalı
      buaze: <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center mx-auto"><Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} /></span>,
      competitor: <span className="inline-flex w-7 h-7 rounded-full bg-[#FEF2F2] items-center justify-center mx-auto"><X size={14} className="text-[#B91C1C]" strokeWidth={2.5} /></span>,
    },
    {
      label: t.compare_f3, // Anlık SMS/Email Bildirimi
      buaze: <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center mx-auto"><Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} /></span>,
      competitor: <span className="inline-flex w-7 h-7 rounded-full bg-[#FEF3C7] items-center justify-center mx-auto"><Minus size={14} className="text-[#92400E]" strokeWidth={2.5} /></span>,
    },
    {
        label: t.compare_f7, // Gelişmiş Analitik Panel
        buaze: <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center mx-auto"><Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} /></span>,
        competitor: <span className="text-[13px] text-[#525252]">{locale === 'tr' ? 'Manuel grafik' : 'Manual charts'}</span>,
      },
    {
      label: t.compare_f4, // Müşteri Veri Tabanı (CRM)
      buaze: <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center mx-auto"><Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} /></span>,
      competitor: <span className="text-[13px] text-[#525252]">{locale === 'tr' ? 'Zor yönetilen satırlar' : 'Hard to manage rows'}</span>,
    },
    {
      label: t.compare_f5, // Tek Tıkla Google Bağlantısı
      buaze: <span className="inline-flex w-7 h-7 rounded-full bg-[#C6F24E] items-center justify-center mx-auto"><Check size={14} className="text-[#0A0A0A]" strokeWidth={2.5} /></span>,
      competitor: <span className="inline-flex w-7 h-7 rounded-full bg-[#FEF2F2] items-center justify-center mx-auto"><X size={14} className="text-[#B91C1C]" strokeWidth={2.5} /></span>,
    },
    {
        label: locale === 'tr' ? 'Veri Kayıp Riski' : 'Data Loss Risk',
        buaze: <span className="pulse-eyebrow text-[#A8D62E]">{locale === 'tr' ? 'SIFIR' : 'ZERO'}</span>,
        competitor: <span className="pulse-eyebrow text-[#B91C1C]">{locale === 'tr' ? 'YÜKSEK' : 'HIGH'}</span>,
      },
  ];

  const isTr = locale === 'tr';
  const canonicalUrl = `https://www.buaze.com/${locale}/vs/spreadsheet`;
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: isTr ? 'Buaze vs Spreadsheet' : 'Buaze vs Spreadsheet',
    description: isTr
      ? 'Excel/Sheets ile manuel yorum takibi vs. gerçek zamanlı Buaze otomasyonu karşılaştırması.'
      : 'Manual review tracking in Excel/Sheets vs. real-time Buaze automation — side-by-side comparison.',
    url: canonicalUrl,
    inLanguage: isTr ? 'tr-TR' : 'en-US',
    about: ['Spreadsheet workflows', 'Customer feedback platform', 'Reputation management automation'],
    isPartOf: { '@type': 'WebSite', name: 'Buaze', url: 'https://www.buaze.com' },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isTr ? 'Ana Sayfa' : 'Home', item: `https://www.buaze.com/${locale}` },
      { '@type': 'ListItem', position: 2, name: isTr ? 'Karşılaştırma' : 'Compare', item: `https://www.buaze.com/${locale}/compare` },
      { '@type': 'ListItem', position: 3, name: 'Spreadsheet', item: canonicalUrl },
    ],
  };

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(webPageSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbSchema) }} />
    <ComparisonLayout
      locale={locale}
      t={t}
      vsName={locale === 'tr' ? 'Spreadsheet' : 'Spreadsheet'}
      heroTitle={locale === 'tr' ? 'Excel ile mi, Buaze ile mi yorum takibi?' : 'Tracking reviews: spreadsheet or Buaze?'}
      heroDesc={locale === 'tr' 
        ? 'Geri bildirimleri pasif birer satır olarak tutmayı bırakın. Manuel veri girişinin yarattığı operasyonel kör noktaları, gerçek zamanlı otomasyonla aşın.'
        : 'Stop keeping feedback as passive rows of data. Overcome the operational blind spots created by manual data entry with real-time automation.'}
      rows={rows}
      argumentTitle={locale === 'tr' ? 'Veri mi Giriyorsunuz, İş mi Yönetiyorsunuz?' : 'Are You Entering Data or Managing a Business?'}
      argumentDesc={locale === 'tr'
        ? 'Excel ve kağıt formlar statiktir. Bir müşteri mutsuz ayrıldığında Excel size haber vermez. Buaze ise o müşteriyi daha kapıdan çıkmadan yakalamanızı sağlar.\nTablolarda kaybolan veriler yerine, grafiklerde yükselen itibarınızı izleyin. Manuel hatayı ve veri kaybı riskini profesyonel bir SaaS altyapısı ile sıfırlayın.'
        : 'Spreadsheets and paper forms are static. When a customer leaves unhappy, Excel won\'t notify you. Buaze allows you to catch that customer before they even walk out the door.\nInstead of data lost in tables, watch your rising reputation in charts. Eliminate manual error and data loss risk with a professional SaaS infrastructure.'}
    />
    </>
  );
}
