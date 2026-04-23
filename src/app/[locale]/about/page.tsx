import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { IllusLighthouse } from '@/components/marketing/PulseIllustrations';

export const dynamic = 'force-dynamic';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const title = isTr ? 'Hakkımızda | Buaze — Dijital İtibar Yönetimi Platformu' : 'About Us | Buaze — Digital Reputation Management Platform';
  const description = isTr
    ? 'Buaze, restoranlar, oteller, klinikler ve daha fazlası için QR tabanlı müşteri geri bildirimi ve itibar yönetimi sunan Türkiye\'nin öncü SaaS platformudur.'
    : 'Buaze is Turkey\'s leading SaaS platform offering QR-based customer feedback and reputation management for restaurants, hotels, clinics, and more.';
  return {
    title: { absolute: title },
    description,
    keywords: isTr
      ? ['buaze hakkında', 'dijital itibar yönetimi şirketi', 'restoran itibar platformu', 'müşteri geri bildirim sistemi', 'QR yorum yönetimi']
      : ['about buaze', 'digital reputation management company', 'restaurant reputation platform', 'customer feedback system Turkey'],
    openGraph: {
      title,
      description,
      url: `https://buaze.com/${locale}/about`,
      images: [{ url: 'https://buaze.com/og-image.png', width: 1200, height: 630, alt: 'Buaze' }],
    },
    alternates: {
      canonical: `https://buaze.com/${locale}/about`,
      languages: { tr: 'https://buaze.com/tr/about', en: 'https://buaze.com/en/about', 'x-default': 'https://buaze.com/en/about' },
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: isTr ? 'Hakkımızda | Buaze' : 'About Us | Buaze',
    url: `https://buaze.com/${locale}/about`,
    description: isTr
      ? 'Buaze, işletmelerin dijital itibarını yöneten ve büyüten Türkiye\'nin öncü SaaS platformudur.'
      : 'Buaze is Turkey\'s leading SaaS platform for managing and growing digital reputation for businesses.',
    publisher: {
      '@type': 'Organization',
      name: 'Buaze',
      url: 'https://buaze.com',
      logo: 'https://buaze.com/favicon.svg',
    },
  };

  // Values aligned with site-more.jsx §136-148 — exactly three items
  const values = isTr
    ? [
        { n: '01', title: 'Şeffaflık', desc: 'Yorum sahte olduğunda biz de söyleriz. Müşterinin sesi, müşterinin kalır.' },
        { n: '02', title: 'Hız', desc: 'Kurulum 5 dakika, ilk yorum aynı gün. Büyüme hızlı geri bildirime bağlı.' },
        { n: '03', title: 'Yerlilik', desc: 'Türkçe destek, Türk işletmesinin gerçek problemleri. Biz de buradayız.' },
      ]
    : [
        { n: '01', title: 'Transparency', desc: "When a review is fake, we'll tell you. The customer's voice stays the customer's." },
        { n: '02', title: 'Speed', desc: '5-minute setup, first review the same day. Growth depends on fast feedback.' },
        { n: '03', title: 'Locality', desc: 'Turkish support, Turkish business realities. We are here too.' },
      ];

  // Numbers aligned with site-more.jsx §117-128
  const numbers = isTr
    ? [
        { num: '2.400+', label: 'İŞLETME' },
        { num: '340K+', label: 'AYLIK YORUM' },
        { num: '28', label: 'ÜLKE' },
        { num: '4.9/5', label: 'MÜŞTERİ PUANI' },
      ]
    : [
        { num: '2,400+', label: 'BUSINESSES' },
        { num: '340K+', label: 'REVIEWS/MO' },
        { num: '28', label: 'COUNTRIES' },
        { num: '4.9/5', label: 'CUSTOMER SCORE' },
      ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] pt-[64px] selection:bg-[#C6F24E]/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Hero · design: 1.3fr / 1fr with lighthouse right ─── */}
      <section className="px-6 sm:px-10 pt-16 sm:pt-20 pb-16">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-10 lg:gap-12 items-center">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Biz kimiz' : 'Who we are'}
            </span>
            <h1 className="mt-3 text-[40px] sm:text-[64px] lg:text-[72px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]">
              {isTr ? (
                <>
                  Her işletmenin
                  <br />
                  bir{' '}
                  <span className="inline-block bg-[#C6F24E] rounded-md px-3 -skew-y-1">
                    nabzı
                  </span>{' '}
                  vardır.
                </>
              ) : (
                <>
                  Every business
                  <br />
                  has a{' '}
                  <span className="inline-block bg-[#C6F24E] rounded-md px-3 -skew-y-1">
                    pulse
                  </span>
                  .
                </>
              )}
            </h1>
            <p className="mt-5 text-[17px] text-[#525252] leading-[1.6] max-w-[560px]">
              {isTr
                ? "2023'te İstanbul'da kurulduk. Küçük bir kafeyi büyütmeye çalışırken gördük: işletmelerin en değerli geri bildirimi hiçbir zaman duyulmuyor. Buaze bu sessizliği nabza çeviriyor."
                : 'Founded in Istanbul in 2023. While helping a small café grow, we noticed that the most valuable customer feedback never reaches the business. Buaze turns that silence into a pulse.'}
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <IllusLighthouse size={320} className="w-full max-w-[320px] h-auto" />
          </div>
        </div>
      </section>

      {/* ─── Numbers · design: #FAFAFA bg + top-2 rule per stat ─── */}
      <section className="bg-[#FAFAFA] px-6 sm:px-10 py-14 sm:py-16">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6">
          {numbers.map((item, i) => (
            <div key={i} className="border-t-2 border-[#0A0A0A] pt-4">
              <div
                className="text-[36px] sm:text-[48px] font-medium text-[#0A0A0A] leading-none tracking-[-0.03em]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {item.num}
              </div>
              <div className="pulse-eyebrow text-[#737373] mt-3">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Values · design: 3-card grid with 01/02/03 ─── */}
      <section className="px-6 sm:px-10 py-20 sm:py-24">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-[32px] sm:text-[44px] lg:text-[48px] font-medium leading-[1.02] tracking-[-0.03em] text-[#0A0A0A] mb-10">
            {isTr ? 'Değerlerimiz' : 'Our values'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {values.map((value) => (
              <div key={value.n} className="bg-white border border-[#EDEDED] rounded-2xl p-7">
                <span className="pulse-eyebrow text-[#A8D62E]">{value.n}</span>
                <h3
                  className="mt-3 text-[24px] sm:text-[26px] font-medium text-[#0A0A0A] tracking-[-0.02em] leading-tight"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {value.title}
                </h3>
                <p className="mt-3 text-[14px] text-[#525252] leading-[1.6]">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Team · design: 4 lime-soft square avatar cards ─── */}
      <section className="px-6 sm:px-10 pb-24">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-[32px] sm:text-[44px] lg:text-[48px] font-medium leading-[1.02] tracking-[-0.03em] text-[#0A0A0A] mb-10">
            {isTr ? 'Takım' : 'Team'}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {(isTr
              ? [
                  { i: 'EK', n: 'Emre Kaya', r: 'Kurucu · CEO' },
                  { i: 'ZA', n: 'Zeynep Aydın', r: 'Kurucu · CTO' },
                  { i: 'MY', n: 'Mert Yılmaz', r: 'Ürün' },
                  { i: 'SD', n: 'Selin Demir', r: 'Büyüme' },
                ]
              : [
                  { i: 'EK', n: 'Emre Kaya', r: 'Founder · CEO' },
                  { i: 'ZA', n: 'Zeynep Aydın', r: 'Founder · CTO' },
                  { i: 'MY', n: 'Mert Yılmaz', r: 'Product' },
                  { i: 'SD', n: 'Selin Demir', r: 'Growth' },
                ]
            ).map((p) => (
              <div key={p.i} className="flex flex-col gap-3">
                <div
                  className="aspect-square bg-[#EAF9B8] rounded-2xl flex items-center justify-center text-[#0A0A0A] text-[56px] sm:text-[64px] font-medium leading-none tracking-[-0.04em]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {p.i}
                </div>
                <div>
                  <div
                    className="text-[17px] sm:text-[18px] font-semibold tracking-[-0.015em]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {p.n}
                  </div>
                  <div className="pulse-eyebrow text-[#737373] mt-1">{p.r}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
