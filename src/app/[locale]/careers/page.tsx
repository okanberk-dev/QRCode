import type { Metadata } from 'next';
import Link from 'next/link';
import { jsonLdString } from '@/lib/seo/json-ld';
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
  const title = locale === 'tr' ? 'Kariyer — Buaze' : 'Careers — Buaze';
  const description =
    locale === 'tr'
      ? 'Buaze\'de çalış — İstanbul merkezli, uzaktan-uyumlu, ürün odaklı ve hızlı büyüyen bir ekip. Açık pozisyonlara bak.'
      : 'Work at Buaze — Istanbul-based, remote-friendly, product-driven and fast-growing. See open roles.';
  return {
    metadataBase: new URL('https://buaze.com'),
    title,
    description,
    alternates: {
      canonical: `/${locale}/careers`,
      languages: { tr: '/tr/careers', en: '/en/careers' },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/careers` },
  };
}

export default async function CareersPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) {
    notFound();
  }
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const values = isTr
    ? [
        { n: '01', t: 'Nabız gibi hızlı', d: 'Haftalık sprintler, günlük push\'lar. Kullanıcılar feedback\'i 24 saatte görür.' },
        { n: '02', t: 'Veri ile konuş', d: 'Her karar bir metriğe bağlı. Fikir değil, ölçüm.' },
        { n: '03', t: 'Birlikte inşa et', d: 'Ürün + destek + tasarım + satış — hepsi aynı Slack kanalında.' },
        { n: '04', t: 'Yerelden globale', d: 'İstanbul\'da başladık, Amsterdam\'da ofisimiz var. Dünya ritmi.' },
      ]
    : [
        { n: '01', t: 'Pulse-fast', d: 'Weekly sprints, daily pushes. Users see feedback within 24 hours.' },
        { n: '02', t: 'Speak with data', d: 'Every decision maps to a metric. No opinions, measurements.' },
        { n: '03', t: 'Build together', d: 'Product + support + design + sales — all on the same Slack channel.' },
        { n: '04', t: 'Local to global', d: 'Started in Istanbul, office in Amsterdam. World pulse.' },
      ];

  const roles = isTr
    ? [
        { title: 'Senior Full-Stack Engineer', team: 'Mühendislik', location: 'İstanbul / Remote (TR)', type: 'Tam zamanlı' },
        { title: 'Product Designer', team: 'Tasarım', location: 'İstanbul', type: 'Tam zamanlı' },
        { title: 'Customer Success Manager', team: 'Müşteri başarısı', location: 'İstanbul', type: 'Tam zamanlı' },
        { title: 'Growth Marketing Lead', team: 'Pazarlama', location: 'İstanbul / Remote (TR)', type: 'Tam zamanlı' },
        { title: 'Data Analyst', team: 'Ürün', location: 'Remote (TR)', type: 'Tam zamanlı' },
      ]
    : [
        { title: 'Senior Full-Stack Engineer', team: 'Engineering', location: 'Istanbul / Remote (EU)', type: 'Full-time' },
        { title: 'Product Designer', team: 'Design', location: 'Istanbul', type: 'Full-time' },
        { title: 'Customer Success Manager', team: 'Customer success', location: 'Istanbul', type: 'Full-time' },
        { title: 'Growth Marketing Lead', team: 'Marketing', location: 'Istanbul / Remote (EU)', type: 'Full-time' },
        { title: 'Data Analyst', team: 'Product', location: 'Remote (EU)', type: 'Full-time' },
      ];

  const canonicalUrl = `https://buaze.com/${locale}/careers`;
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: isTr ? 'Açık pozisyonlar' : 'Open positions',
    inLanguage: isTr ? 'tr-TR' : 'en-US',
    url: canonicalUrl,
    numberOfItems: roles.length,
    itemListElement: roles.map((role, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: role.title,
      description: `${role.team} · ${role.location} · ${role.type}`,
    })),
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isTr ? 'Ana Sayfa' : 'Home', item: `https://buaze.com/${locale}` },
      { '@type': 'ListItem', position: 2, name: isTr ? 'Kariyer' : 'Careers', item: canonicalUrl },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-[#0A0A0A] lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbSchema) }} />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      <section className="px-5 sm:px-10 pt-[60px] sm:pt-20 pb-10">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-12 items-center">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Kariyer' : 'Careers'}
            </span>
            <h1 className="mt-4 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[72px] font-medium leading-[0.95] tracking-[-0.035em]">
              {isTr ? (
                <>
                  Gerçek işletmeler için
                  <br />
                  <span className="inline-block bg-[#C6F24E] rounded-md px-3 -skew-y-1">
                    gerçek ürün
                  </span>{' '}
                  yap.
                </>
              ) : (
                <>
                  Build a{' '}
                  <span className="inline-block bg-[#C6F24E] rounded-md px-3 -skew-y-1">
                    real product
                  </span>{' '}
                  for real businesses.
                </>
              )}
            </h1>
            <p className="mt-5 text-[15px] sm:text-[16px] text-[#525252] max-w-[520px] leading-[1.6]">
              {isTr
                ? '14 kişilik bir ekibiz. 3 ay içinde 22\'ye çıkıyoruz. Sen de bu hikayenin parçası olabilirsin.'
                : 'We\'re a team of 14 scaling to 22 in the next 3 months. You could be part of this story.'}
            </p>
          </div>
          <div className="bz-card p-6 sm:p-10">
            <div className="pulse-eyebrow text-[#737373]">{isTr ? 'Sayılarla biz' : 'By the numbers'}</div>
            <div className="mt-5 grid grid-cols-2 gap-6">
              {[
                { k: '14 → 22', l: isTr ? 'Ekip (3 ay)' : 'Team (3 mo)' },
                { k: '2.400+', l: isTr ? 'Müşteri' : 'Customers' },
                { k: '4.9/5', l: isTr ? 'Çalışan puanı' : 'Glassdoor score' },
                { k: '28', l: isTr ? 'Ülke' : 'Countries' },
              ].map((x) => (
                <div key={x.l}>
                  <div
                    className="text-[28px] sm:text-[36px] font-medium leading-none tracking-[-0.03em]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {x.k}
                  </div>
                  <div className="pulse-eyebrow text-[#737373] mt-3">{x.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 sm:px-10 py-[60px] sm:py-24 bg-[#FAFAFA]">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-[26px] sm:text-[44px] font-medium tracking-[-0.03em] leading-[1]">
            {isTr ? 'Değerlerimiz' : 'Our values'}
          </h2>
          <div className="mt-8 sm:mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((v) => (
              <div key={v.n} className="bz-card p-6 sm:p-7">
                <span className="pulse-eyebrow text-[#A8D62E]">{v.n}</span>
                <h3 className="mt-3 text-[20px] sm:text-[22px] font-medium tracking-[-0.02em]">{v.t}</h3>
                <p className="mt-3 text-[14px] text-[#525252] leading-[1.6]">{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'Açık pozisyonlar' : 'Open roles'}
              </span>
              <h2 className="mt-3 text-[26px] sm:text-[44px] font-medium tracking-[-0.03em] leading-[1]">
                {isTr ? `${roles.length} pozisyon` : `${roles.length} open roles`}
              </h2>
            </div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Hepsi uzaktan-uyumlu' : 'All remote-friendly'}
            </span>
          </div>

          <ul className="mt-10 divide-y divide-[#EDEDED] border-y border-[#EDEDED]">
            {roles.map((r) => (
              <li
                key={r.title}
                className="py-6 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 md:gap-6 items-center"
              >
                <div>
                  <h3 className="text-[18px] sm:text-[20px] font-semibold tracking-[-0.015em]">
                    {r.title}
                  </h3>
                  <div className="pulse-eyebrow text-[#737373] mt-1">{r.team}</div>
                </div>
                <div className="text-[14px] text-[#525252]">{r.location}</div>
                <div className="text-[14px] text-[#525252]">{r.type}</div>
                <Link
                  href={`mailto:kariyer@buaze.com?subject=${encodeURIComponent(r.title)}`}
                  className="inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-white px-5 py-2.5 rounded-full text-[13px] font-medium hover:bg-[#1A1A1A] transition-colors"
                >
                  {isTr ? 'Başvur' : 'Apply'}
                  <span aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
