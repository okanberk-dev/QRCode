import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import RoiCalculator from '@/components/marketing/RoiCalculator';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { notFound } from 'next/navigation';

const VALID_LOCALES = ['tr', 'en'] as const;

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === 'tr' ? 'ROI Hesaplayıcı — Buaze' : 'ROI Calculator — Buaze';
  const description =
    locale === 'tr'
      ? 'Buaze ile aylık kaç TL geri dönüş alacağınızı hesaplayın. Sürükle, gör, plan seç.'
      : 'Calculate how much return Buaze brings you every month. Drag, see, pick a plan.';
  return {
    metadataBase: new URL('https://buaze.com'),
    title,
    description,
    alternates: {
      canonical: `/${locale}/roi`,
      languages: { tr: '/tr/roi', en: '/en/roi' },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/roi` },
  };
}

export default async function RoiPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) {
    notFound();
  }
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-[#0A0A0A] pt-[64px]">
      <MarketingNavbar locale={locale} t={t} />

      <section className="px-5 sm:px-10 pt-[60px] sm:pt-20 pb-8">
        <div className="max-w-[1100px] mx-auto text-center">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'ROI hesaplayıcı' : 'ROI calculator'}
          </span>
          <h1 className="mt-4 text-[38px] sm:text-[56px] lg:text-[64px] font-medium leading-[0.95] tracking-[-0.035em]">
            {isTr ? (
              <>
                Her{' '}
                <span className="inline-block bg-[#C6F24E] rounded-md px-3 -skew-y-1">
                  ₺1
                </span>
                , 12 ay sonra ne kadar?
              </>
            ) : (
              <>
                Every{' '}
                <span className="inline-block bg-[#C6F24E] rounded-md px-3 -skew-y-1">
                  $1
                </span>{' '}
                — how much in 12 months?
              </>
            )}
          </h1>
          <p className="mt-5 text-[15px] sm:text-[16px] text-[#525252] max-w-[620px] mx-auto leading-[1.6]">
            {isTr
              ? 'Sektör ortalamalarına göre kendi senaryonu çıkar. Sürükle, plan seç, sonucu gör — kaydolmadan.'
              : 'Build your own scenario from sector averages. Drag, pick a plan, see the result — no signup.'}
          </p>
        </div>
      </section>

      <section className="px-5 sm:px-10 pb-[60px] sm:pb-20">
        <div className="max-w-[1100px] mx-auto">
          <RoiCalculator locale={locale} />
        </div>
      </section>

      <section className="bg-[#C6F24E] px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="max-w-[900px] mx-auto text-center">
          <h2 className="text-[26px] sm:text-[40px] font-medium tracking-[-0.03em] leading-[1.05] text-[#0A0A0A]">
            {isTr ? 'Sıra senin işletmende.' : 'Your business is next.'}
          </h2>
          <p className="mt-4 text-[15px] text-[#1A1A1A] max-w-[540px] mx-auto leading-[1.6]">
            {isTr
              ? '30 dakika, canlı demo, işletmene özel rakamlar. Kredi kartı sormuyoruz.'
              : '30 minutes, live demo, numbers tailored to your business. No credit card asked.'}
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href={`${base}/contact`}
              className="inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-white px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#1A1A1A] transition-colors"
            >
              {isTr ? 'Ücretsiz danışmanlık' : 'Free consultation'}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href={`${base}/pricing`}
              className="inline-flex items-center justify-center gap-2 border border-[#0A0A0A] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#0A0A0A] hover:text-white transition-colors"
            >
              {isTr ? 'Planları gör' : 'See plans'}
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
