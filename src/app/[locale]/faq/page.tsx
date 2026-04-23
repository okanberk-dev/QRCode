import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PricingFaq from '@/components/marketing/PricingFaq';
import Link from 'next/link';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';

  const title = isTr ? 'Sıkça Sorulan Sorular | Buaze — SSS' : 'Frequently Asked Questions | Buaze — FAQ';
  const description = isTr
    ? 'Buaze hakkında merak ettiğiniz tüm soruların cevapları. QR itibar yönetimi, akıllı yönlendirme, fiyatlandırma ve kurulum hakkında detaylı bilgi alın.'
    : 'Find answers to all your questions about Buaze — QR reputation management, smart routing, pricing, and setup explained in detail.';
  return {
    title: { absolute: title },
    description,
    keywords: isTr
      ? ['buaze sık sorulan sorular', 'dijital itibar yönetimi SSS', 'QR yorum sistemi sorular', 'itibar yönetimi nasıl çalışır']
      : ['buaze FAQ', 'digital reputation management questions', 'QR review system FAQ', 'reputation management how it works'],
    alternates: {
      canonical: `https://buaze.com/${locale}/faq`,
      languages: { tr: 'https://buaze.com/tr/faq', en: 'https://buaze.com/en/faq', 'x-default': 'https://buaze.com/en/faq' },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/faq` },
  };
}

export const dynamic = 'force-dynamic';

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';

  const faqs = [
    { q: t.faq_q1, a: t.faq_a1 },
    { q: t.faq_q2, a: t.faq_a2 },
    { q: t.faq_q3, a: t.faq_a3 },
    { q: t.faq_q4, a: t.faq_a4 },
    { q: t.faq_q5, a: t.faq_a5 },
    { q: t.faq_q6, a: t.faq_a6 },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#0A0A0A] pt-[64px] selection:bg-[#C6F24E]/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-6 sm:px-10 pt-16 sm:pt-24 pb-10">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.5]"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="faqGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDEDED" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#faqGrid)" />
        </svg>
        <div className="relative max-w-[800px] mx-auto text-center">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'Sıkça sorulan sorular' : 'Frequently asked'}
          </span>
          <h1 className="mt-5 text-[40px] sm:text-[56px] lg:text-[64px] font-medium leading-[1.02] tracking-[-0.035em] text-[#0A0A0A]">
            {t.faq_title}
          </h1>
          <p className="mt-5 text-[17px] text-[#525252] leading-[1.55] max-w-[520px] mx-auto">
            {t.faq_subtitle}
          </p>
        </div>
      </section>

      <main className="flex-1">
        <PricingFaq title="" subtitle="" faqs={faqs} />

        <section className="border-t border-[#EDEDED] px-6 sm:px-10 py-16">
          <div className="max-w-[720px] mx-auto text-center">
            <h2 className="text-[24px] sm:text-[28px] font-medium text-[#0A0A0A] tracking-[-0.02em] leading-tight">
              {isTr ? 'Cevabını bulamadığın bir soru mu var?' : "Can't find what you're looking for?"}
            </h2>
            <p className="mt-3 text-[15px] text-[#525252]">
              {isTr ? 'Ekibimize yaz, 2 saat içinde dönelim.' : 'Write to our team — we reply within 2 hours.'}
            </p>
            <Link
              href={`${base}/contact`}
              className="inline-flex items-center justify-center gap-2 mt-6 bg-[#0A0A0A] text-white px-6 py-3.5 rounded-full text-[14px] font-medium hover:bg-[#1A1A1A] transition-colors"
            >
              {isTr ? 'İletişime geç' : 'Contact us'}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
