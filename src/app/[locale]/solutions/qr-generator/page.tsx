import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
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
  const base = `/${locale}`;
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

  const benefits = isTr
    ? [
        { title: 'Saniyeler içinde hazır', desc: 'Kayıt gerekmez — URL girin, QR kodu indirin.' },
        { title: 'Süresiz çalışır', desc: 'Bağlantı aktif olduğu sürece QR kodu işler.' },
        { title: 'Yüksek çözünürlük', desc: 'Menü kartları, vitrinler ve baskı için ideal.' },
      ]
    : [
        { title: 'Ready in seconds', desc: 'No signup required — enter a URL, download your QR.' },
        { title: 'Works forever', desc: 'Your QR stays valid as long as the link works.' },
        { title: 'High resolution', desc: 'Perfect for menus, window stickers, and print.' },
      ];

  return (
    <div className="min-h-screen overflow-x-clip bg-[#FFFFFF] text-[#0A0A0A] pt-[64px] selection:bg-[#C6F24E]/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MarketingNavbar locale={locale} t={t} />

      <main>
        {/* ─── Hero ─── */}
        <section className="relative overflow-hidden pt-12 sm:pt-16 pb-10 px-6 sm:px-10">
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.5]"
            width="100%"
            height="100%"
          >
            <defs>
              <pattern id="qrGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDEDED" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#qrGrid)" />
          </svg>

          <div className="relative max-w-[1200px] mx-auto">
            <nav
              aria-label={isTr ? 'Site yolu' : 'Breadcrumb'}
              className="mb-6 text-[12px] text-[#737373] flex items-center flex-wrap gap-1.5"
            >
              <Link href={base} className="hover:text-[#0A0A0A] transition-colors">
                {isTr ? 'Ana sayfa' : 'Home'}
              </Link>
              <ChevronRight size={12} className="text-[#A3A3A3]" aria-hidden />
              <span className="text-[#0A0A0A] font-medium">
                {isTr ? 'QR Kod Oluşturucu' : 'QR Code Generator'}
              </span>
            </nav>

            <div className="max-w-[760px] space-y-5">
              <div className="inline-flex items-center gap-2 bg-[#EAF9B8] border border-[#C6F24E] rounded-full px-3 py-1.5">
                <span className="pulse-eyebrow text-[#0A0A0A]">
                  {isTr ? 'ÜCRETSİZ ARAÇ' : 'FREE TOOL'}
                </span>
              </div>
              <h1 className="text-[36px] sm:text-[52px] lg:text-[60px] font-medium leading-[0.98] tracking-[-0.035em] text-balance">
                {isTr ? (
                  <>
                    Her web sitesi için{' '}
                    <span className="inline-block bg-[#C6F24E] rounded-lg px-3 -skew-y-1">
                      anında QR kodu
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Instant{' '}
                    <span className="inline-block bg-[#C6F24E] rounded-lg px-3 -skew-y-1">QR code</span>{' '}
                    for any website.
                  </>
                )}
              </h1>
              <p className="text-[16px] sm:text-[18px] text-[#525252] leading-[1.6] max-w-[560px]">
                {isTr
                  ? 'İşletmenizin web sitesini, menüsünü veya rezervasyon sayfasını girin; biz size özel, yüksek çözünürlüklü bir QR kodu oluşturalım.'
                  : "Enter your business website, menu, or reservation page — and we'll generate a high-resolution QR code tailored just to that URL."}
              </p>
            </div>
          </div>
        </section>

        {/* ─── Generator ─── */}
        <section aria-labelledby="generator-title" className="pb-16 sm:pb-20 px-6 sm:px-10">
          <div className="max-w-[1200px] mx-auto">
            <div className="bg-white border border-[#EDEDED] rounded-3xl shadow-[0_8px_24px_rgba(10,10,10,0.04)] p-6 sm:p-10 lg:p-12">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'Oluşturucu' : 'Generator'}
              </span>
              <h2
                id="generator-title"
                className="mt-3 text-[24px] sm:text-[30px] font-medium text-[#0A0A0A] tracking-[-0.02em] mb-2"
              >
                {isTr ? 'Bağlantınızı girin' : 'Paste your link'}
              </h2>
              <p className="text-[14px] text-[#525252] mb-8 max-w-[560px] leading-relaxed">
                {isTr
                  ? "Tam URL'yi yapıştırın — QR kodu ve indirme hemen sağda hazır olacak."
                  : 'Paste the full URL — the QR code and download will appear on the right immediately.'}
              </p>
              <QRGeneratorForm locale={locale} />
            </div>
          </div>
        </section>

        {/* ─── Benefits ─── */}
        <section
          aria-labelledby="benefits-title"
          className="bg-[#FAFAFA] border-y border-[#EDEDED] px-6 sm:px-10 py-16 sm:py-20"
        >
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center max-w-[640px] mx-auto mb-12">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'Neden Buaze' : 'Why Buaze'}
              </span>
              <h2
                id="benefits-title"
                className="mt-4 text-[28px] sm:text-[40px] font-medium text-[#0A0A0A] tracking-[-0.03em] leading-[1.05]"
              >
                {isTr ? 'Basit bir QR kodun ötesi.' : 'Beyond a simple QR code.'}
              </h2>
              <p className="mt-4 text-[15px] text-[#525252] leading-relaxed">
                {isTr
                  ? 'Bu araç ücretsiz. Buaze hesabı açtığınızda taramaları takip edin, yorum toplayın, dijital itibarınızı büyütün.'
                  : 'This tool is free. With a Buaze account you can track scans, collect reviews, and grow your digital reputation.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {benefits.map((b, i) => (
                <article
                  key={b.title}
                  className="bg-white border border-[#EDEDED] rounded-2xl p-7"
                >
                  <span className="pulse-eyebrow text-[#A8D62E]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-3 text-[17px] font-medium text-[#0A0A0A]">{b.title}</h3>
                  <p className="mt-2 text-[13px] text-[#525252] leading-[1.6]">{b.desc}</p>
                </article>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex items-center gap-2 bg-[#0A0A0A] text-white text-[14px] font-medium px-6 py-3.5 rounded-full hover:bg-[#1A1A1A] transition-colors"
              >
                {isTr ? 'Ücretsiz hesap oluştur' : 'Create a free account'}
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
