import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { CUSTOMER_STORIES, storyText } from '@/lib/customer-stories';
import { notFound } from 'next/navigation';

const VALID_LOCALES = ['tr', 'en'] as const;

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === 'tr'
      ? 'Başarı Hikayeleri — Buaze'
      : 'Customer Stories — Buaze';
  const description =
    locale === 'tr'
      ? '2.400\'den fazla işletme Buaze ile nabzını dinliyor. Restoran, otel, klinik, kafe ve daha fazlasından gerçek sonuçlar.'
      : 'Over 2,400 businesses listen to their pulse with Buaze. Real outcomes from restaurants, hotels, clinics, cafés and more.';
  return {
    metadataBase: new URL('https://buaze.com'),
    title,
    description,
    alternates: {
      canonical: `/${locale}/customer-stories`,
      languages: { tr: '/tr/customer-stories', en: '/en/customer-stories' },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/customer-stories` },
  };
}

export default async function CustomerStoriesPage({
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
      <main id="main-content">

      <section className="px-5 sm:px-10 pt-[60px] sm:pt-20 pb-10">
        <div className="max-w-[1200px] mx-auto">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'Başarı hikayeleri' : 'Customer stories'}
          </span>
          <h1
            className="mt-3 text-[38px] sm:text-[56px] lg:text-[72px] font-medium leading-[0.95] tracking-[-0.035em]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {isTr ? 'Rakam konuşur.' : 'Numbers do the talking.'}
          </h1>
          <p className="mt-4 text-[15px] sm:text-[16px] text-[#525252] max-w-[560px] leading-[1.6]">
            {isTr
              ? '2.400\'den fazla işletme Buaze ile nabzını dinliyor. İşte bir kısmı.'
              : 'More than 2,400 businesses are listening to their pulse with Buaze. Here are a few.'}
          </p>
        </div>
      </section>

      <section className="px-5 sm:px-10 pb-[60px] sm:pb-20">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CUSTOMER_STORIES.map((st, i) => (
            <article
              key={st.slug}
              className="overflow-hidden rounded-[18px] border border-[#EDEDED] bg-[#FAFAFA] transition-transform duration-300 hover:-translate-y-1"
            >
              {/* Top: flat accent stat block */}
              <div
                className="px-7 py-8 sm:px-8 sm:py-9 min-h-[220px] flex flex-col"
                style={{ background: st.color }}
              >
                <span className="pulse-eyebrow text-[#0A0A0A]/70">
                  {`${storyText(st.sector, locale)} · ${st.location}`.toUpperCase()}
                </span>
                <h3
                  className="mt-2 text-[24px] sm:text-[30px] font-medium leading-none tracking-[-0.02em] text-[#0A0A0A]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {st.brand}
                </h3>
                <div className="mt-auto flex items-baseline gap-2.5 pt-6">
                  <span
                    className="text-[40px] sm:text-[56px] font-medium leading-none tracking-[-0.035em] text-[#0A0A0A]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {st.metric}
                  </span>
                  <span className="text-[12px] text-[#0A0A0A]/70">{storyText(st.metricLabel, locale)}</span>
                </div>
              </div>

              {/* Bottom: pull-quote + index row */}
              <div className="p-6">
                <p
                  className="text-[16px] sm:text-[17px] font-medium leading-[1.35] tracking-[-0.01em] text-[#0A0A0A]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  &ldquo;{storyText(st.quote, locale)}&rdquo;
                </p>
                <div className="mt-5 flex items-center justify-between text-[12px] text-[#737373]">
                  <Link
                    href={`${base}/customer-stories/${st.slug}`}
                    className="inline-flex items-center gap-1 hover:text-[#0A0A0A] transition-colors"
                  >
                    {isTr ? 'Tam hikayeyi oku' : 'Read full story'} →
                  </Link>
                  <span className="font-mono tracking-[0.1em]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#0A0A0A] text-white px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="max-w-[900px] mx-auto text-center">
          <h2
            className="text-[28px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {isTr
              ? 'Bir sonraki başarı hikayesi sizinki olsun.'
              : 'Let the next story be yours.'}
          </h2>
          <p className="mt-4 text-[15px] sm:text-[16px] text-white/70 max-w-[560px] mx-auto">
            {isTr
              ? '14 gün ücretsiz · Kredi kartı istemiyoruz · Hızlı kurulum'
              : '14-day free trial · No credit card · Fast setup'}
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href={`${base}/auth/register`}
              className="inline-flex items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#A8D62E] transition-colors"
            >
              {isTr ? 'Ücretsiz başla' : 'Start free'}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
