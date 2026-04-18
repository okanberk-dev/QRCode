import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import '../globals.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);

  return {
    metadataBase: new URL('https://buaze.com'),
    title: {
      default: `${t.siteName} | ${locale === 'tr' ? 'Dijital İtibar ve Geri Bildirim Yönetimi' : 'Digital Reputation and Feedback Management'}`,
      template: `%s | ${t.siteName}`,
    },
    description: t.siteDescription,
    keywords: locale === 'tr'
      ? ['Dijital itibar yönetimi', 'Google haritalar geri bildirim toplama', 'Geri bildirim operasyonları', 'QR yorum sistemi', 'restoran itibar yönetimi', 'dijital itibar', 'müşteri deneyimi yönetimi', 'müşteri memnuniyeti', 'buaze']
      : ['Digital reputation management', 'Increase Google Maps feedback', 'Feedback operations', 'QR review system', 'reputation management', 'digital reputation', 'Google review collection', 'customer feedback', 'buaze'],
    authors: [{ name: 'Buaze', url: 'https://buaze.com' }],
    creator: 'Buaze',
    publisher: 'Buaze',
    applicationName: 'Buaze',
    generator: 'Next.js',
    classification: 'B2B SaaS',
    category: 'Business',
    // GEO Tags
    other: {
      'geo.region': 'TR-34',
      'geo.placename': 'Ataşehir, İstanbul',
      'geo.position': '40.9923;29.1244',
      'ICBM': '40.9923, 29.1244',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      url: `https://buaze.com/${locale}`,
      siteName: 'Buaze',
      title: `Buaze | ${locale === 'tr' ? 'Google Puanınızı Yükseltin' : 'Boost Your Google Ratings'}`,
      description: t.siteDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: `Buaze | ${locale === 'tr' ? 'Google Puanınızı Yükseltin' : 'Boost Your Google Ratings'}`,
      description: t.siteDescription,
      site: '@buaze',
      creator: '@buaze',
    },
    alternates: {
      canonical: `https://buaze.com/${locale}`,
      languages: {
        'tr': 'https://buaze.com/tr',
        'en': 'https://buaze.com/en',
        'x-default': 'https://buaze.com/en',
      },
    },
    icons: {
      icon: '/favicon.svg',
    },
  };
}

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'en' }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  return (
    <div className="antialiased bg-white text-[#111827] min-h-screen flex flex-col">
      {children}
    </div>
  );
}
