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
      default: `${t.siteName} | ${locale === 'tr' ? 'Restoranınızın Dijital İtibar Yönetim Platformu' : 'Restaurant Digital Reputation Management Platform'}`,
      template: `%s | ${t.siteName}`,
    },
    description: t.siteDescription,
    keywords: locale === 'tr'
      ? ['QR yorum sistemi', 'restoran itibar yönetimi', 'Google yorum toplama', 'dijital itibar', 'restoran yazılımı', 'müşteri memnuniyeti', 'buaze']
      : ['QR review system', 'restaurant reputation management', 'Google review collection', 'digital reputation', 'restaurant software', 'customer feedback', 'buaze'],
    authors: [{ name: 'Buaze', url: 'https://buaze.com' }],
    creator: 'Buaze',
    publisher: 'Buaze',
    applicationName: 'Buaze',
    generator: 'Next.js',
    classification: 'B2B SaaS',
    category: 'Business',
    // GEO Tags
    other: {
      'geo.region': 'TR',
      'geo.placename': 'Bursa',
      'geo.position': '40.1828;29.0667',
      'ICBM': '40.1828, 29.0667',
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
      title: `Buaze | ${locale === 'tr' ? 'Dijital İtibar Yönetim Platformu' : 'Digital Reputation Management Platform'}`,
      description: t.siteDescription,
      images: [
        {
          url: '/images/hero-dashboard.png', // Fallback social image
          width: 1200,
          height: 630,
          alt: 'Buaze Platform',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Buaze | ${locale === 'tr' ? 'Dijital İtibar' : 'Digital Reputation'}`,
      description: t.siteDescription,
      creator: '@buaze',
      images: ['/images/hero-dashboard.png'],
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
      icon: '/favicon.ico',
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
