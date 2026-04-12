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
      default: `${t.siteName} — ${locale === 'tr' ? 'Restoranınızın Dijital İtibar Yönetim Platformu' : 'Restaurant Digital Reputation Management Platform'}`,
      template: `%s — ${t.siteName}`,
    },
    description: t.siteDescription,
    keywords: locale === 'tr'
      ? ['QR yorum sistemi', 'restoran itibar yönetimi', 'Google yorum toplama', 'buaze', 'dijital itibar']
      : ['QR review system', 'restaurant reputation management', 'Google review collection', 'buaze', 'digital reputation'],
    authors: [{ name: 'Buaze', url: 'https://buaze.com' }],
    creator: 'Buaze',
    publisher: 'Buaze',
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      url: `https://buaze.com/${locale}`,
      siteName: 'Buaze',
      title: `Buaze — ${locale === 'tr' ? 'Dijital İtibar Yönetim Platformu' : 'Digital Reputation Management Platform'}`,
      description: t.siteDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: `Buaze — ${locale === 'tr' ? 'Dijital İtibar' : 'Digital Reputation'}`,
      description: t.siteDescription,
    },
    alternates: {
      canonical: `https://buaze.com/${locale}`,
      languages: {
        'tr': 'https://buaze.com/tr',
        'en': 'https://buaze.com/en',
        'x-default': 'https://buaze.com/en',
      },
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
