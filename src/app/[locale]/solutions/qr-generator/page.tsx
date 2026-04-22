import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, QrCode, Shield, Zap, ChevronRight } from 'lucide-react';
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

/**
 * Dedicated QR code generator landing page.
 * Lives under /solutions/qr-generator and is intentionally minimal: one URL
 * input, one live preview, no colour/theme switches. Search-engine friendly
 * with structured data, canonical URL and strict heading hierarchy
 * (h1 -> h2 -> h3 only).
 */
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
          ? 'Web sitenizin URL\'sinden ücretsiz yüksek çözünürlüklü QR kodu oluşturun.'
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
    <div className="min-h-screen overflow-x-clip bg-[#F5F4F1] text-[#0F2348] font-sans pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MarketingNavbar locale={locale} t={t} />

      <main>
        {/* ─── Hero ─── */}
        <section className="pt-10 sm:pt-16 pb-8 sm:pb-12 px-5 sm:px-8">
          <div className="max-w-[1200px] mx-auto">
            {/* Breadcrumbs (also rendered as structured data above) */}
            <nav
              aria-label={isTr ? 'Site yolu' : 'Breadcrumb'}
              className="mb-8 text-[12px] sm:text-[13px] font-medium text-[#243554] flex items-center flex-wrap gap-1.5"
            >
              <Link href={base} className="hover:text-[#0F2348] transition-colors">
                {isTr ? 'Ana Sayfa' : 'Home'}
              </Link>
              <ChevronRight size={14} className="text-[#6B7B93]" aria-hidden />
              <span className="text-[#0F2348] font-bold">
                {isTr ? 'QR Kod Oluşturucu' : 'QR Code Generator'}
              </span>
            </nav>

            <div className="max-w-[720px] space-y-5">
              <div className="inline-flex items-center gap-2 bg-[#FF9A14] text-[#0F2348] px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.12em] border-[2px] border-[#0F2348] shadow-[3px_4px_0_0_#0F2348]">
                <QrCode size={14} />
                {isTr ? 'ÜCRETSİZ ARAÇ' : 'FREE TOOL'}
              </div>
              <h1 className="text-[32px] sm:text-[48px] lg:text-[56px] font-extrabold leading-[1.05] tracking-[-0.04em] text-balance">
                {isTr ? (
                  <>
                    Her Web Sitesi İçin
                    <br />
                    <span className="text-[#FF9A14]">Anında QR Kodu</span>
                  </>
                ) : (
                  <>
                    Instant QR Code for
                    <br />
                    <span className="text-[#FF9A14]">Any Website</span>
                  </>
                )}
              </h1>
              <p className="text-[16px] sm:text-[18px] text-[#243554] font-medium leading-relaxed max-w-[560px] text-pretty">
                {isTr
                  ? 'İşletmenizin web sitesini, menüsünü veya rezervasyon sayfasını girin; biz size özel, yüksek çözünürlüklü bir QR kodu oluşturalım.'
                  : 'Enter your business website, menu, or reservation page — and we\'ll generate a high-resolution QR code tailored just to that URL.'}
              </p>
            </div>
          </div>
        </section>

        {/* ─── Generator ─── */}
        <section
          aria-labelledby="generator-title"
          className="pb-16 sm:pb-24 px-5 sm:px-8"
        >
          <div className="max-w-[1200px] mx-auto">
            <div className="bg-white border-[2.5px] border-[#0F2348] rounded-[24px] sm:rounded-[32px] shadow-[10px_12px_0_0_#FF9A14] p-6 sm:p-10 lg:p-14">
              <h2
                id="generator-title"
                className="text-[24px] sm:text-[32px] font-extrabold text-[#0F2348] tracking-[-0.02em] mb-2 text-balance"
              >
                {isTr ? 'Bağlantınızı Girin' : 'Paste Your Link'}
              </h2>
              <p className="text-[14px] sm:text-[15px] text-[#243554] font-medium mb-8 max-w-[560px]">
                {isTr
                  ? 'Tam URL\'yi yapıştırın — QR kodu ve indirme hemen sağda hazır olacak.'
                  : 'Paste the full URL — the QR code and download will appear on the right immediately.'}
              </p>
              <QRGeneratorForm locale={locale} />
            </div>
          </div>
        </section>

        {/* ─── Benefits / upsell ─── */}
        <section
          aria-labelledby="benefits-title"
          className="py-16 sm:py-24 px-5 sm:px-8 bg-white border-t-[2px] border-[#C9D0DB]"
        >
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center max-w-[640px] mx-auto space-y-3 mb-10 sm:mb-14">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#FF9A14]">
                {isTr ? 'NEDEN BUAZE' : 'WHY BUAZE'}
              </p>
              <h2
                id="benefits-title"
                className="text-[26px] sm:text-[36px] font-extrabold text-[#0F2348] tracking-[-0.02em] text-balance"
              >
                {isTr
                  ? 'Basit QR kodun ötesine geçin'
                  : 'Go beyond a simple QR code'}
              </h2>
              <p className="text-[15px] text-[#243554] font-medium leading-relaxed">
                {isTr
                  ? 'Bu araç ücretsiz. Ancak Buaze hesabı oluşturduğunuzda QR kod taramalarını takip edebilir, yorum toplayabilir ve dijital itibarınızı büyütebilirsiniz.'
                  : 'This tool is free. But when you create a Buaze account you can also track scans, collect reviews, and grow your digital reputation.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              {[
                {
                  Icon: Zap,
                  title: isTr ? 'Saniyeler içinde hazır' : 'Ready in seconds',
                  desc: isTr
                    ? 'Kayıt gerekmez — URL girin, QR kodu indirin.'
                    : 'No signup required — enter a URL, download your QR.',
                },
                {
                  Icon: Shield,
                  title: isTr ? 'Süresiz çalışır' : 'Works forever',
                  desc: isTr
                    ? 'QR kodu bağlantı aktif olduğu sürece çalışır.'
                    : 'Your QR stays valid as long as the link works.',
                },
                {
                  Icon: CheckCircle2,
                  title: isTr ? 'Yüksek çözünürlük' : 'High resolution',
                  desc: isTr
                    ? 'Menü kartları, vitrinler ve baskılar için ideal.'
                    : 'Perfect for menus, window stickers, and print.',
                },
              ].map(({ Icon, title, desc }) => (
                <article
                  key={title}
                  className="bg-[#F5F4F1] border-[2px] border-[#0F2348] rounded-2xl p-6 shadow-[4px_5px_0_0_#0F2348] hover:-translate-y-1 transition-transform"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#FF9A14] border-[2px] border-[#0F2348] flex items-center justify-center mb-4">
                    <Icon size={20} className="text-[#0F2348]" />
                  </div>
                  <h3 className="text-[17px] font-extrabold text-[#0F2348] mb-2">
                    {title}
                  </h3>
                  <p className="text-[13px] text-[#243554] font-medium leading-relaxed">
                    {desc}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-10 sm:mt-14 text-center">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex items-center gap-2 bg-[#0F2348] text-white font-extrabold text-[14px] sm:text-[15px] px-7 py-4 rounded-xl border-[2.5px] border-[#0F2348] shadow-[5px_6px_0_0_#FF9A14] hover:-translate-y-0.5 hover:shadow-[6px_7px_0_0_#FF9A14] active:translate-x-[5px] active:translate-y-[6px] active:shadow-none transition-all"
              >
                {isTr ? 'Ücretsiz hesap oluştur' : 'Create a free account'}
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
