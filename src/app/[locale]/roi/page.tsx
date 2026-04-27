import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
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
      ? 'Buaze ile aylık kaç TL geri dönüş alacağınızı hesaplayın. 30 sn\'de net çıktı.'
      : 'Calculate how much return Buaze brings you every month. Net result in 30 seconds.';
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
  const currency = isTr ? '₺' : '$';

  // Pre-computed demo scenario (static page — real calculator exists in pricing page)
  const monthlyCustomers = isTr ? 1200 : 800;
  const reviewRate = 0.24;
  const currentGoogle = 4.2;
  const projectedGoogle = 4.8;
  const newCustomersFromReviews = Math.round(monthlyCustomers * 0.18);
  const avgTicket = isTr ? 320 : 28;
  const monthlyUplift = newCustomersFromReviews * avgTicket;
  const yearlyUplift = monthlyUplift * 12;
  const buazePlan = isTr ? 890 : 49;
  const yearlyPlan = buazePlan * 12;
  const roiMultiple = Math.round((yearlyUplift - yearlyPlan) / yearlyPlan);

  const pipeline = isTr
    ? [
        { l: 'Aylık müşteri', v: monthlyCustomers.toLocaleString('tr-TR') },
        { l: 'QR\'ı tarayan oran', v: '%24' },
        { l: 'Yorum bırakan', v: Math.round(monthlyCustomers * reviewRate).toLocaleString('tr-TR') },
        { l: 'Google puan artışı', v: `${currentGoogle} → ${projectedGoogle}` },
      ]
    : [
        { l: 'Monthly customers', v: monthlyCustomers.toLocaleString('en-US') },
        { l: 'QR scan rate', v: '24%' },
        { l: 'Leaves a review', v: Math.round(monthlyCustomers * reviewRate).toLocaleString('en-US') },
        { l: 'Google score lift', v: `${currentGoogle} → ${projectedGoogle}` },
      ];

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-[#0A0A0A] pt-[64px]">
      <MarketingNavbar locale={locale} t={t} />

      <section className="px-5 sm:px-10 pt-[60px] sm:pt-20 pb-10">
        <div className="max-w-[1000px] mx-auto text-center">
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
          <p className="mt-5 text-[15px] sm:text-[16px] text-[#525252] max-w-[560px] mx-auto leading-[1.6]">
            {isTr
              ? 'Orta ölçekli bir restoran için demo hesap. İşletmeniz için özel senaryoyu ücretsiz danışmanlığımızda çıkarıyoruz.'
              : 'Demo scenario for a mid-size restaurant. We build a scenario for your exact business in a free consultation.'}
          </p>
        </div>
      </section>

      <section className="px-5 sm:px-10 pb-[60px] sm:pb-20">
        <div className="max-w-[1000px] mx-auto">
          <div className="bg-[#0A0A0A] text-white rounded-3xl p-6 sm:p-12 grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 items-center">
            <div>
              <span className="pulse-eyebrow text-[#C6F24E]">
                {isTr ? 'Yıllık net kazanç' : 'Annual net gain'}
              </span>
              <div
                className="mt-3 text-[44px] sm:text-[72px] font-medium leading-none tracking-[-0.035em] text-[#C6F24E]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {currency}
                {yearlyUplift.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
              </div>
              <p className="mt-4 text-[14px] text-white/70 leading-[1.6] max-w-[380px]">
                {isTr
                  ? `Buaze yatırımını ${roiMultiple}x geri veriyor. Yeni müşteri + tekrar ziyaret birleşimi.`
                  : `Buaze returns your investment ${roiMultiple}×. Combined new customers + repeat visits.`}
              </p>
            </div>
            <div className="space-y-3">
              {pipeline.map((x) => (
                <div
                  key={x.l}
                  className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-0"
                >
                  <span className="text-[13px] text-white/70">{x.l}</span>
                  <span
                    className="text-[18px] sm:text-[20px] font-medium tracking-[-0.02em]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {x.v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { k: `${currency}${monthlyUplift.toLocaleString(isTr ? 'tr-TR' : 'en-US')}`, l: isTr ? 'Aylık uplift' : 'Monthly uplift' },
              { k: `${currency}${buazePlan.toLocaleString(isTr ? 'tr-TR' : 'en-US')}/${isTr ? 'ay' : 'mo'}`, l: isTr ? 'Buaze Growth planı' : 'Buaze Growth plan' },
              { k: `${roiMultiple}×`, l: isTr ? 'ROI · yıllık' : 'ROI · annual' },
            ].map((x) => (
              <div key={x.l} className="bz-card p-6">
                <div
                  className="text-[22px] sm:text-[32px] font-medium leading-none tracking-[-0.025em]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {x.k}
                </div>
                <div className="pulse-eyebrow text-[#737373] mt-3">{x.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#C6F24E] px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="max-w-[900px] mx-auto text-center">
          <h2 className="text-[26px] sm:text-[40px] font-medium tracking-[-0.03em] leading-[1.05] text-[#0A0A0A]">
            {isTr ? 'Kendi senaryonu çıkart.' : 'Build your own scenario.'}
          </h2>
          <p className="mt-4 text-[15px] text-[#1A1A1A] max-w-[540px] mx-auto">
            {isTr
              ? '30 dakika, canlı demo, işletmenize özel rakamlar.'
              : '30 minutes, live demo, numbers tailored to your business.'}
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
