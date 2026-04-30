import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import QRGeneratorForm from '@/components/marketing/QRGeneratorForm';
import { getTranslations, type Locale } from '@/lib/translations';

const VALID_LOCALES = ['tr', 'en'] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';

  const title = isTr
    ? 'Ücretsiz QR Kod Oluşturucu | Buaze'
    : 'Free QR Code Generator | Buaze';
  const description = isTr
    ? 'İşletmeniz için saniyeler içinde ücretsiz QR kod oluşturun. Menü, rezervasyon veya bilgi sayfanız için yüksek çözünürlüklü, süresiz kullanılabilir QR kodlarını tek bir URL ile üretin.'
    : 'Generate a free QR code for your business in seconds. Create a high-resolution, forever-valid QR code for your menu, reservations, or info page from a single URL.';

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/solutions/qr-generator`,
      languages: {
        tr: '/tr/solutions/qr-generator',
        en: '/en/solutions/qr-generator',
      },
    },
    openGraph: {
      type: 'website',
      url: `https://buaze.com/${locale}/solutions/qr-generator`,
      locale: isTr ? 'tr_TR' : 'en_US',
      siteName: 'Buaze',
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function QRGeneratorPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!VALID_LOCALES.includes(locale as (typeof VALID_LOCALES)[number])) {
    notFound();
  }

  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: isTr ? 'Buaze QR Kod Oluşturucu' : 'Buaze QR Code Generator',
        url: `https://buaze.com/${locale}/solutions/qr-generator`,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Web',
        description: isTr
          ? "Web sitenizin URL'sinden ücretsiz yüksek çözünürlüklü QR kodu oluşturun."
          : 'Generate a free, high-resolution QR code from your website URL.',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: isTr ? 'Ana Sayfa' : 'Home',
            item: `https://buaze.com/${locale}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: isTr ? 'Çözümler' : 'Solutions',
            item: `https://buaze.com/${locale}/solutions`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: isTr ? 'QR Kod Oluşturucu' : 'QR Code Generator',
            item: `https://buaze.com/${locale}/solutions/qr-generator`,
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-[#FFFFFF] text-[#0A0A0A] pt-[64px] selection:bg-[#C6F24E]/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MarketingNavbar locale={locale} t={t} />

      <main>
        {/* ─── Hero (design 1:1: site-more.jsx:13-21) ─── */}
        <section className="px-5 sm:px-10 lg:px-12 pt-[60px] pb-10 text-center">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'ÜCRETSİZ ARAÇ' : 'FREE TOOL'}
          </span>
          <h1
            className="mt-3 text-[38px] sm:text-[56px] lg:text-[68px] font-medium leading-[1.02] sm:leading-[1] tracking-[-0.035em] text-[#0A0A0A]"
          >
            {isTr ? 'QR kod oluşturucu.' : 'QR code generator.'}
          </h1>
          <p className="mx-auto mt-3.5 max-w-[560px] text-[15px] sm:text-[16px] leading-[1.6] text-[#525252]">
            {isTr
              ? 'Hesap açmadan, ücretsiz, sınırsız QR kod üret. Markana göre özelleştir, PDF olarak indir.'
              : 'Generate unlimited QR codes for free — no account required. Customize to your brand, download as PDF.'}
          </p>
        </section>

        {/* ─── Generator (design 1:1: site-more.jsx:23-87) ─── */}
        <section
          aria-label={isTr ? 'QR kod oluşturucu' : 'QR code generator'}
          className="px-5 sm:px-10 lg:px-12 pt-5 pb-28 sm:pb-20"
        >
          <div className="max-w-[1200px] mx-auto">
            <QRGeneratorForm locale={locale} />
          </div>
        </section>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
