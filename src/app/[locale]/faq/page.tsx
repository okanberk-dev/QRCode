import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PricingFaq from '@/components/marketing/PricingFaq';

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
      languages: { 'tr': 'https://buaze.com/tr/faq', 'en': 'https://buaze.com/en/faq', 'x-default': 'https://buaze.com/en/faq' },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/faq` },
  };
}

export const dynamic = "force-dynamic";

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);

  // Generate FAQ Schema (JSON-LD) for rich snippets
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: t.faq_q1,
        acceptedAnswer: {
          '@type': 'Answer',
          text: t.faq_a1,
        },
      },
      {
        '@type': 'Question',
        name: t.faq_q2,
        acceptedAnswer: {
          '@type': 'Answer',
          text: t.faq_a2,
        },
      },
      {
        '@type': 'Question',
        name: t.faq_q3,
        acceptedAnswer: {
          '@type': 'Answer',
          text: t.faq_a3,
        },
      },
      {
        '@type': 'Question',
        name: t.faq_q4,
        acceptedAnswer: {
          '@type': 'Answer',
          text: t.faq_a4,
        },
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F8F6F1] selection:bg-[#F4B400]/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      <main className="flex-1 pt-[100px] sm:pt-[120px] pb-16 sm:pb-24">
        <div className="max-w-[800px] mx-auto px-5 sm:px-8">
          <PricingFaq
            title={t.faq_title}
            subtitle={t.faq_subtitle}
            faqs={[
              { q: t.faq_q1, a: t.faq_a1 },
              { q: t.faq_q2, a: t.faq_a2 },
              { q: t.faq_q3, a: t.faq_a3 },
              { q: t.faq_q4, a: t.faq_a4 },
            ]}
          />
        </div>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
