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

  // /about is the canonical entity description for Buaze (the company).
  // We expose a richer @graph than the rest of the site so search engines and
  // LLMs can disambiguate the company from "buaze" the Securidaca plant
  // (audit Section 9 — brand-as-dictionary-word risk).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `https://buaze.com/${locale}/about#aboutpage`,
        name: isTr ? 'Hakkımızda | Buaze' : 'About Us | Buaze',
        url: `https://buaze.com/${locale}/about`,
        description: isTr
          ? 'Buaze (şirket), işletmelerin dijital itibarını yöneten Türkiye merkezli SaaS platformudur.'
          : 'Buaze (the company) is an Istanbul-based SaaS platform that helps businesses manage their digital reputation.',
        mainEntity: { '@id': 'https://buaze.com/#organization' },
        inLanguage: isTr ? 'tr-TR' : 'en-US',
      },
      {
        '@type': 'Organization',
        '@id': 'https://buaze.com/#organization',
        name: 'Buaze',
        legalName: 'Buaze Bilişim A.Ş.',
        alternateName: ['Buaze (the company)', 'Buaze SaaS'],
        url: 'https://buaze.com',
        logo: 'https://buaze.com/favicon.svg',
        foundingDate: '2023',
        foundingLocation: {
          '@type': 'Place',
          name: 'İstanbul, Türkiye',
        },
        description: isTr
          ? 'QR tabanlı müşteri geri bildirimi ve itibar yönetimi sunan SaaS platformu. Restoran, otel, klinik ve perakende sektörlerinde kullanılır.'
          : 'A SaaS platform offering QR-based customer feedback and reputation management. Used by restaurants, hotels, clinics and retail.',
        knowsAbout: [
          'Customer feedback management',
          'Online reputation management',
          'Google Business Profile reviews',
          'QR code review collection',
          'Multi-location feedback operations',
        ],
        // Disambiguates the SaaS entity from the Securidaca longipedunculata
        // plant (Chichewa "buaze") that owns the dictionary entry.
        disambiguatingDescription: isTr
          ? 'Buaze, Securidaca longipedunculata bitkisinin Çiçewa adıyla aynı yazılır; bu sayfa Buaze SaaS şirketine aittir.'
          : 'Not to be confused with Securidaca longipedunculata (Chichewa "buaze"), an African plant. This page is about Buaze, the SaaS company.',
        sameAs: [
          'https://www.instagram.com/buazerating',
          'https://twitter.com/buaze',
          'https://www.linkedin.com/company/buaze',
          'https://www.youtube.com/@buaze',
        ],
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: 'support@buaze.com',
            availableLanguage: ['Turkish', 'English'],
          },
          {
            '@type': 'ContactPoint',
            contactType: 'sales',
            email: 'sales@buaze.com',
            availableLanguage: ['Turkish', 'English'],
          },
        ],
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Workinton Maslak, Floor 4',
          addressLocality: 'Maslak',
          addressRegion: 'İstanbul',
          addressCountry: 'TR',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: isTr ? 'Anasayfa' : 'Home',
            item: `https://buaze.com/${locale}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: isTr ? 'Hakkımızda' : 'About',
            item: `https://buaze.com/${locale}/about`,
          },
        ],
      },
    ],
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
      <section className="px-5 sm:px-10 pt-[60px] sm:pt-20 pb-[60px] sm:pb-16">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-10 lg:gap-12 items-center">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Buaze (şirket) · Hakkımızda' : 'Buaze (the company) · About'}
            </span>
            <h1 className="mt-3 text-[38px] sm:text-[64px] lg:text-[72px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]">
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
              {isTr ? (
                <>
                  <strong>Buaze</strong>, 2023&apos;te İstanbul&apos;da kurulan, QR
                  tabanlı müşteri geri bildirimi ve dijital itibar yönetimi
                  sunan SaaS platformudur. Restoran, otel, klinik ve perakende
                  işletmeleri Google Business Profile, Yemeksepeti, Getir ve
                  TripAdvisor üzerindeki yorum operasyonlarını Buaze
                  üzerinden yönetir.
                </>
              ) : (
                <>
                  <strong>Buaze</strong> is an Istanbul-based SaaS platform,
                  founded in 2023, that provides QR-based customer feedback
                  and digital reputation management. Restaurants, hotels,
                  clinics and retail businesses use Buaze to operate review
                  flows across Google Business Profile, Yemeksepeti, Getir
                  and TripAdvisor.
                </>
              )}
            </p>
            <p className="mt-3 text-[12px] text-[#737373] leading-[1.6] max-w-[560px]">
              {isTr
                ? 'Not: Buaze (Çiçewa) bir Afrika bitkisinin (Securidaca longipedunculata) adıdır. Bu sayfa Buaze adlı şirket içindir.'
                : 'Note: "buaze" is also the Chichewa name of an African plant (Securidaca longipedunculata). This page is about Buaze, the company.'}
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <IllusLighthouse size={320} className="w-full max-w-[320px] h-auto" />
          </div>
        </div>
      </section>

      {/* ─── Numbers · design: #FAFAFA bg + top-2 rule per stat ─── */}
      <section className="bg-[#FAFAFA] px-5 sm:px-10 py-12 sm:py-16">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6">
          {numbers.map((item, i) => (
            <div key={i} className="border-t-2 border-[#0A0A0A] pt-4">
              <div
                className="text-[28px] sm:text-[40px] lg:text-[48px] font-medium text-[#0A0A0A] leading-none tracking-[-0.03em]"
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
      <section className="px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-[26px] sm:text-[40px] lg:text-[48px] font-medium leading-[1.05] sm:leading-[1.02] tracking-[-0.03em] text-[#0A0A0A] mb-10">
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
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-24">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-[26px] sm:text-[40px] lg:text-[48px] font-medium leading-[1.05] sm:leading-[1.02] tracking-[-0.03em] text-[#0A0A0A] mb-10">
            {isTr ? 'Takım' : 'Team'}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {(isTr
              ? [
                  { n: 'Emre Kaya', r: 'Kurucu · CEO', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80' },
                  { n: 'Zeynep Aydın', r: 'Kurucu · CTO', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80' },
                  { n: 'Mert Yılmaz', r: 'Ürün', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80' },
                  { n: 'Selin Demir', r: 'Büyüme', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=600&q=80' },
                ]
              : [
                  { n: 'Emre Kaya', r: 'Founder · CEO', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80' },
                  { n: 'Zeynep Aydın', r: 'Founder · CTO', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80' },
                  { n: 'Mert Yılmaz', r: 'Product', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80' },
                  { n: 'Selin Demir', r: 'Growth', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=600&q=80' },
                ]
            ).map((p) => (
              <div key={p.n} className="flex flex-col gap-3">
                <div className="aspect-square overflow-hidden rounded-2xl bg-[#EAF9B8]">
                  {/* Real Unsplash CC0 portrait — replaces initials placeholder for warmer team page */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.img}
                    alt={p.n}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                  />
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
