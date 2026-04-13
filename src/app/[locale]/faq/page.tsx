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
  
  return {
    title: isTr ? 'Sıkça Sorulan Sorular | Buaze' : 'Frequently Asked Questions | Buaze',
    description: isTr 
      ? 'Buaze hakkında merak ettiğiniz tüm soruların cevapları. İtibar yönetimi, otomasyonlar ve fiyatlandırma hakkında bilgi alın.'
      : 'Find answers to all your questions about Buaze. Learn more about reputation management, automations, and pricing.',
  };
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations(locale);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#FCFBF7] selection:bg-[#FDBF1D]/30">
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
