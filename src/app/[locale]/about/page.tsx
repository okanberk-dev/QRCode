import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';

export const dynamic = 'force-dynamic';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import Link from 'next/link';

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
  const base = `/${locale}`;
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

  const values = [
    { title: t.about_val1_title, desc: t.about_val1_desc },
    { title: t.about_val2_title, desc: t.about_val2_desc },
    { title: t.about_val3_title, desc: t.about_val3_desc },
    { title: t.about_val4_title, desc: t.about_val4_desc },
  ];

  const numbers = [
    { num: '500+', label: isTr ? 'AKTİF İŞLETME' : 'ACTIVE BUSINESSES' },
    { num: '%92', label: isTr ? 'İTİBAR ARTIŞI' : 'REPUTATION GROWTH' },
    { num: '4.8', label: isTr ? 'ORT. GOOGLE SKORU' : 'AVG. GOOGLE SCORE' },
    { num: '<5dk', label: isTr ? 'KURULUM SÜRESİ' : 'SETUP TIME' },
  ];

  const storyHighlights = isTr
    ? [
        { title: 'Akıllı yönlendirme', desc: "Yüksek puanlar Google'a, düşük puanlar panele." },
        { title: 'Organik itibar artışı', desc: 'Yorum hacmi artar, Google sıralamanız yükselir.' },
        { title: 'Kriz öncesi müdahale', desc: 'Sorun büyümeden fark edin ve çözün.' },
        { title: '5 dakikada kurulum', desc: 'QR\'ı yazdırın, masaya koyun, başlayın.' },
      ]
    : [
        { title: 'Smart routing', desc: 'High ratings go to Google, low ones go to your dashboard.' },
        { title: 'Organic reputation growth', desc: 'Review volume grows, your Google ranking climbs.' },
        { title: 'Pre-crisis intervention', desc: 'Spot and resolve problems before they escalate.' },
        { title: '5-minute setup', desc: 'Print your QR, place it, and you\'re live.' },
      ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] pt-[64px] selection:bg-[#C6F24E]/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-6 sm:px-10 pt-16 sm:pt-24 pb-16 sm:pb-20">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.5]"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="aboutGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDEDED" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#aboutGrid)" />
        </svg>
        <div className="relative max-w-[900px] mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#EAF9B8] border border-[#C6F24E] rounded-full pl-2 pr-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] pulse-heartbeat" />
            <span className="pulse-eyebrow text-[#0A0A0A]">{isTr ? 'BİZ KİMİZ' : 'WHO WE ARE'}</span>
          </div>
          <h1 className="text-[40px] sm:text-[64px] lg:text-[72px] font-medium leading-[0.98] tracking-[-0.035em] text-[#0A0A0A] max-w-[820px]">
            {t.about_hero_title_1}{' '}
            <span className="inline-block bg-[#C6F24E] rounded-lg px-3 -skew-y-1">
              {t.about_hero_title_2}
            </span>
          </h1>
          <p className="mt-6 text-[17px] sm:text-[18px] text-[#525252] leading-[1.55] max-w-[620px]">
            {t.about_hero_subtitle}
          </p>
        </div>
      </section>

      {/* ─── Numbers ─── */}
      <section className="bg-[#C6F24E] border-y border-[#A8D62E] px-6 sm:px-10 py-12 sm:py-14">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {numbers.map((item, i) => (
            <div key={i}>
              <div
                className="text-[36px] sm:text-[52px] font-medium text-[#0A0A0A] leading-none tracking-[-0.03em]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {item.num}
              </div>
              <div className="pulse-eyebrow text-[#0A0A0A]/70 mt-2">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Values ─── */}
      <section className="bg-[#FAFAFA] border-y border-[#EDEDED] px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12 max-w-[720px]">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Temel değerlerimiz' : 'Core values'}
            </span>
            <h2 className="mt-4 text-[32px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em] text-[#0A0A0A]">
              {t.about_values_title}
            </h2>
            <p className="mt-5 text-[16px] text-[#525252] leading-[1.6] max-w-[520px]">
              {t.about_values_subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((value, i) => (
              <div key={i} className="bg-white border border-[#EDEDED] rounded-2xl p-7">
                <div className="w-10 h-10 rounded-lg bg-[#EAF9B8] flex items-center justify-center mb-5">
                  <span
                    className="text-[18px] text-[#0A0A0A] font-medium"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="text-[17px] font-medium text-[#0A0A0A] leading-tight mb-2">
                  {value.title}
                </h3>
                <p className="text-[13px] text-[#525252] leading-[1.6]">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Team ─── */}
      <section className="px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12 max-w-[720px]">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Ekibimiz' : 'Our team'}
            </span>
            <h2 className="mt-4 text-[32px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em] text-[#0A0A0A]">
              {isTr ? 'Takım' : 'Team'}
            </h2>
          </div>
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
                  <div className="text-[17px] sm:text-[18px] font-semibold tracking-[-0.015em]">
                    {p.n}
                  </div>
                  <div className="pulse-eyebrow text-[#737373] mt-1">{p.r}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Story ─── */}
      <section className="px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-start">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Neden kurduk' : 'Why we built this'}
            </span>
            <h2 className="mt-4 text-[32px] sm:text-[42px] font-medium text-[#0A0A0A] tracking-[-0.03em] leading-[1.05]">
              {isTr
                ? 'Bir restoranın kaybettiği itibar bizi harekete geçirdi.'
                : "A restaurant's lost reputation set us in motion."}
            </h2>
            <div className="mt-6 space-y-4 text-[16px] text-[#525252] leading-[1.65]">
              <p>
                {isTr
                  ? "İşletme sahipleriyle konuşurken fark ettik: müşteri memnuniyetsizliği çoğu zaman işletmeye değil, doğrudan Google'a gidiyordu. Bir yıldızlık yorum aylar içinde kasıp kavurabiliyordu. Buna bir çözüm olmalıydı."
                  : 'Talking with business owners, we noticed a pattern: customer dissatisfaction was going straight to Google instead of to the business. A one-star review could do months of damage. There had to be a better way.'}
              </p>
              <p>
                {isTr
                  ? "QR tabanlı akıllı yönlendirme fikri burada doğdu. Memnun müşteriler Google'a, memnun olmayanlar doğrudan işletme paneline yönlendirilsin. Basit, etkili, adil."
                  : "That's where QR-based smart routing was born. Happy customers go to Google; unhappy ones go straight to the business dashboard. Simple, effective, fair."}
              </p>
              <p>
                {isTr
                  ? "Bugün 500'den fazla işletme Buaze ile itibarını yönetiyor. Her yeni müşteri, platformumuzu daha iyi hâle getirmemize katkıda bulunuyor."
                  : 'Today, over 500 businesses manage their reputation with Buaze. Every new customer helps make our platform better.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {storyHighlights.map((item, i) => (
              <div
                key={i}
                className="flex gap-4 bg-[#FAFAFA] border border-[#EDEDED] rounded-2xl p-5"
              >
                <span className="pulse-eyebrow text-[#A8D62E] pt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-medium text-[#0A0A0A]">{item.title}</h3>
                  <p className="mt-1 text-[13px] text-[#525252] leading-[1.55]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="bg-[#0A0A0A] text-white px-6 sm:px-10 py-20 sm:py-24">
        <div className="max-w-[1000px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 text-center md:text-left">
          <div>
            <h3 className="text-[28px] sm:text-[40px] font-medium text-white tracking-[-0.03em] leading-[1.08]">
              {isTr ? 'Hemen başlayın, ilk 14 gün bizden.' : 'Start today, first 14 days on us.'}
            </h3>
            <p className="mt-3 text-[15px] sm:text-[16px] text-white/70">
              {isTr ? 'Kredi kartı gerekmez, 5 dakikada kurulum.' : 'No card required, 5-minute setup.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full md:w-auto">
            <Link
              href={`${base}/auth/register`}
              className="inline-flex items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#A8D62E] transition-colors"
            >
              {isTr ? 'Ücretsiz dene' : 'Start free trial'}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href={`${base}/how-it-works`}
              className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-7 py-4 rounded-full text-[15px] font-medium hover:bg-white/10 transition-colors"
            >
              {isTr ? 'Nasıl çalışır' : 'How it works'}
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
