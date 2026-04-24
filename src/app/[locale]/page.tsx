import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import Link from 'next/link';
import {
  IllusMountain,
  IllusCompass,
  IllusInbox,
  IllusChart,
  IllusShield,
} from '@/components/marketing/PulseIllustrations';
import PlatformLogo, { GLOBAL_REVIEW, GLOBAL_DELIVERY } from '@/components/marketing/PlatformLogo';
import AnimatedCounter from '@/components/marketing/AnimatedCounter';
import MarqueeRow from '@/components/marketing/MarqueeRow';
import WatchDemoButton from '@/components/marketing/WatchDemoButton';
import StickyCtaBar from '@/components/marketing/StickyCtaBar';
import SocialProofToast from '@/components/marketing/SocialProofToast';
import HomeIndustryTabs from '@/components/marketing/HomeIndustryTabs';
import LiveReviewTicker from '@/components/marketing/LiveReviewTicker';
import HomeHeroDashboard from '@/components/marketing/HomeHeroDashboard';
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
  const t = getTranslations(locale);
  const title = locale === 'tr'
    ? 'Buaze | Dijital İtibar ve Geri Bildirim Yönetimi'
    : 'Buaze | Digital Reputation and Feedback Management';
  const description = locale === 'tr'
    ? 'Buaze ile işletmenizin dijital itibarını profesyonelleştirin. Geri bildirim operasyonlarınızı tek bir merkezden yöneterek güven inşa edin.'
    : 'Professionalize your business\'s digital reputation with Buaze. Build trust by managing your feedback operations from a single hub.';

  return {
    metadataBase: new URL('https://buaze.com'),
    title,
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        tr: '/tr',
        en: '/en',
      },
    },
    openGraph: {
      type: 'website',
      url: `https://buaze.com/${locale}`,
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      siteName: 'Buaze',
      title,
      description: t.siteDescription || description,
      images: [
        {
          url: '/assets/3d-hero.png',
          width: 1200,
          height: 630,
          alt: 'Buaze platform dashboard preview',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/assets/3d-hero.png'],
    },
  };
}

export default async function LandingPage({
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'Buaze',
        url: 'https://buaze.com',
        applicationCategory: 'BusinessApplication',
        description: t.siteDescription,
        offers: {
          '@type': 'Offer',
          price: isTr ? '500' : '10',
          priceCurrency: isTr ? 'TRY' : 'USD',
        },
        operatingSystem: 'Web',
      },
      {
        '@type': 'Organization',
        name: 'Buaze',
        url: 'https://buaze.com',
        logo: 'https://buaze.com/buaze-logo.png',
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer service',
        },
      },
      {
        '@type': 'Service',
        name: isTr ? 'Dijital İtibar Yönetimi Hizmeti' : 'Digital Reputation Management Service',
        provider: { '@type': 'Organization', name: 'Buaze' },
        description: isTr
          ? 'İşletmeler için geri bildirim operasyonlarını profesyonelleştirme ve dijital itibar yönetimi platformu.'
          : 'Platform for professionalizing feedback operations and digital reputation management for businesses.',
      },
    ],
  };

  // ── Section content (inline locale, keeps translations.ts untouched) ──
  const heroHeadline = isTr ? (
    <>
      İtibarınızı
      <br />
      <span className="relative inline-block">
        bir{' '}
        <span className="inline-block rounded-[10px] bg-[#C6F24E] px-3.5 pb-0.5 -rotate-[0.5deg]">
          nabız
        </span>{' '}
        gibi
      </span>
      <br />
      izleyin.
    </>
  ) : (
    <>
      Track your
      <br />
      reputation like
      <br />a{' '}
      <span className="inline-block rounded-[10px] bg-[#C6F24E] px-3.5 pb-0.5 -rotate-[0.5deg]">
        pulse
      </span>
      .
    </>
  );

  const heroSub = isTr
    ? 'QR ile gerçek müşterilerden geri bildirim toplayın, yorumları tek panelden yönetin, Google politikalarına uyumlu şekilde itibarınızı büyütün.'
    : 'Collect feedback from real customers via QR, manage every review from one panel, grow your reputation in a way that stays compliant with Google policies.';

  const trustTicks = isTr
    ? ['Kredi kartı gerekmez', '5 dakikada kurulum', 'Türkçe destek']
    : ['No credit card required', '5-minute setup', 'Turkish support'];

  const brandWordmarks = ['ARK BISTRO', 'HOTEL NORA', 'DERMA+', 'LAW&CO', 'KAHVE DUKKAN', 'SPA REN'];

  const steps = [
    {
      num: '01',
      title: isTr ? 'Topla' : 'Collect',
      body: isTr
        ? 'Masanızdaki QR kodu tarayan müşteri, 20 saniyede yorum bırakır. Zahmet sıfır.'
        : 'A customer scans the QR on your table and leaves a review in 20 seconds. Zero friction.',
      Ill: IllusCompass,
    },
    {
      num: '02',
      title: isTr ? 'Yönet' : 'Manage',
      body: isTr
        ? 'Tüm yorumları tek panelden yanıtla. Olumsuzu ekibine ata, olumluyu Google\'da yayına taşı.'
        : 'Reply to every review from one panel. Route negatives to your team, push positives to Google.',
      Ill: IllusInbox,
    },
    {
      num: '03',
      title: isTr ? 'Büyü' : 'Grow',
      body: isTr
        ? 'Canlı analitik ile puanını izle, Google sıralamanı yükselt, organik büyümeyi yakala.'
        : 'Track your score with live analytics, lift your Google ranking, capture organic growth.',
      Ill: IllusChart,
    },
  ];

  const darkFeatures = isTr
    ? [
        { t: 'Otomatik etiketleme', d: 'Anahtar kelime ve duyguya göre.' },
        { t: 'Duygu analizi (AI)', d: 'AI ile pozitif / nötr / negatif.' },
        { t: 'Takım atama', d: 'Yorum doğru kişiye düşer.' },
        { t: 'SLA takibi', d: 'Yanıt süresi hedefleri tutulsun.' },
      ]
    : [
        { t: 'Auto-tagging', d: 'By keyword and sentiment.' },
        { t: 'Sentiment analysis (AI)', d: 'AI: positive / neutral / negative.' },
        { t: 'Team assignment', d: 'Reviews land on the right person.' },
        { t: 'SLA tracking', d: 'Hit your response-time targets.' },
      ];

  const policyBlocks = isTr
    ? [
        { n: '01', t: 'Tercih gönderimi', d: 'QR müşteriyi önce gerçek geri bildirime yönlendirir.' },
        { n: '02', t: 'Şeffaf akış', d: 'Negatif yorumları süzmez; içeride çözüme aktarır.' },
        { n: '03', t: 'Kural motoru', d: 'Her kampanya Google politikasına göre otomatik denetlenir.' },
      ]
    : [
        { n: '01', t: 'Preference-first', d: 'The QR routes the customer to real feedback first.' },
        { n: '02', t: 'Transparent flow', d: 'Negative reviews aren\'t filtered; they reach your team for resolution.' },
        { n: '03', t: 'Rule engine', d: 'Every campaign is auto-audited against Google policy.' },
      ];

  const caseStats = isTr
    ? [
        { v: '4.2 → 4.8', l: 'Google ort.' },
        { v: '+184%', l: 'Yorum/ay' },
        { v: '12 dk', l: 'Yanıt' },
      ]
    : [
        { v: '4.2 → 4.8', l: 'Google avg.' },
        { v: '+184%', l: 'Reviews/mo' },
        { v: '12 min', l: 'Reply' },
      ];

  return (
    <div className="min-h-screen overflow-x-clip bg-[#FFFFFF] text-[#0A0A0A] selection:bg-[#C6F24E]/40 selection:text-[#0A0A0A] pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MarketingNavbar locale={locale} t={t} />

      {/* ═══════════════════════════════════════════════════════════
          1. HERO — Homepage v2 design
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 pb-16 pt-16 sm:px-8 sm:pb-20 sm:pt-20 lg:px-16 lg:pb-20 lg:pt-24">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-12 md:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6 sm:gap-7">
            <div className="bz-fade-up inline-flex items-center gap-2 self-start rounded-full bg-[#EAF9B8] px-3.5 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] pulse-heartbeat" />
              <span className="pulse-eyebrow text-[#0A0A0A]">
                <AnimatedCounter to={2400} suffix="+" locale={isTr ? 'tr-TR' : 'en-US'} />{' '}
                {isTr ? 'işletme güveniyor' : 'businesses trust Buaze'}
              </span>
            </div>

            <h1 className="bz-fade-up bz-d1 text-[44px] font-medium leading-[0.92] tracking-[-0.04em] text-[#0A0A0A] text-balance sm:text-[64px] lg:text-[76px]">
              {heroHeadline}
            </h1>

            <p className="bz-fade-up bz-d2 max-w-[500px] text-[17px] font-normal leading-[1.6] text-[#525252] sm:text-[18px]">
              {heroSub}
            </p>

            <div className="bz-fade-up bz-d3 flex flex-col items-stretch gap-3 pt-1 sm:flex-row sm:items-center">
              <Link
                href={`${base}/auth/register`}
                className="bz-btn-primary inline-flex items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-7 py-4 text-[16px] font-semibold text-white transition-all hover:bg-[#1A1A1A]"
              >
                {isTr ? '14 gün ücretsiz başla' : 'Start 14-day free trial'}
                <span aria-hidden>→</span>
              </Link>
              <WatchDemoButton locale={locale} />
            </div>

            <ul className="bz-fade-up bz-d4 flex flex-wrap gap-x-5 gap-y-2 pt-1">
              {trustTicks.map((tick) => (
                <li key={tick} className="text-[13px] text-[#737373]">
                  ✓ {tick}
                </li>
              ))}
            </ul>
          </div>

          <div className="bz-scale-in w-full pr-3 md:pr-4">
            <HomeHeroDashboard locale={locale} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          2. LOGO STRIP — trusted brands
      ═══════════════════════════════════════════════════════════ */}
      <section className="border-y border-[#EDEDED] bg-[#FAFAFA] py-5">
        <MarqueeRow
          eyebrow={isTr ? 'GÜVENEN MARKALAR' : 'TRUSTED BY'}
          itemClassName="shrink-0 px-10 sm:px-12"
          items={brandWordmarks.map((name) => (
            <span
              key={name}
              className="text-[16px] sm:text-[18px] font-semibold tracking-[0.08em] text-[#D4D4D4] whitespace-nowrap"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {name}
            </span>
          ))}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════
          3. THREE STEPS
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12 sm:mb-16 max-w-[720px]">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Nasıl çalışır' : 'How it works'}
            </span>
            <h2 className="mt-4 text-[36px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em] text-[#0A0A0A]">
              {isTr ? 'Üç adım, üç saniye.' : 'Three steps, three seconds.'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map(({ num, title, body, Ill }) => (
              <div
                key={num}
                className="bg-[#FAFAFA] border border-[#EDEDED] rounded-[18px] p-7 flex flex-col"
              >
                <div className="flex justify-center mb-4">
                  <Ill size={180} />
                </div>
                <span className="pulse-eyebrow text-[#A8D62E]">
                  {isTr ? 'ADIM' : 'STEP'} {num}
                </span>
                <h3 className="mt-3 text-[26px] sm:text-[30px] font-medium leading-[1.1] tracking-[-0.025em] text-[#0A0A0A]">
                  {title}
                </h3>
                <p className="mt-3 text-[14px] text-[#525252] leading-[1.55]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          4. DARK FEATURE — live stream mock
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-[#0A0A0A] text-white px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Live stream card — auto-rotating review ticker, mirrors the
              HeroProduct helper in .design/site/site-homepage-v3.jsx:174 */}
          <LiveReviewTicker locale={locale} />

          {/* Copy + feature grid */}
          <div>
            <span className="pulse-eyebrow text-[#C6F24E]">
              {isTr ? 'Merkezi yönetim' : 'Central control'}
            </span>
            <h2 className="mt-4 text-[36px] sm:text-[48px] lg:text-[52px] font-medium leading-[1.02] tracking-[-0.035em] text-white">
              {isTr ? (
                <>
                  Her yorum, tek bir{' '}
                  <span className="inline-block bg-[#C6F24E] text-[#0A0A0A] rounded-lg px-3 -skew-y-1">
                    panelde
                  </span>
                  .
                </>
              ) : (
                <>
                  Every review in a single{' '}
                  <span className="inline-block bg-[#C6F24E] text-[#0A0A0A] rounded-lg px-3 -skew-y-1">
                    panel
                  </span>
                  .
                </>
              )}
            </h2>
            <p className="mt-5 text-[16px] text-[#A3A3A3] leading-[1.6] max-w-[480px]">
              {isTr
                ? 'Google, Tripadvisor, Yemeksepeti, Getir — tüm platformlardaki yorumlar Buaze\'de buluşur. Olumsuzu önce sen gör, kriz büyümeden çöz.'
                : 'Google, Tripadvisor, Yemeksepeti, Getir — reviews from every platform meet inside Buaze. Spot the negative first and resolve it before it grows.'}
            </p>

            {/* Platform logos row — review + delivery platforms that Buaze pulls into the inbox */}
            <div className="mt-6">
              <span className="pulse-eyebrow text-[#C6F24E]">
                {isTr ? 'DESTEKLENEN PLATFORMLAR' : 'SUPPORTED PLATFORMS'}
              </span>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {(['google', 'tripadvisor', 'yemeksepeti', 'getir-yemek', 'trendyol-go', 'migros-hemen'] as const).map(
                  (id) => (
                    <div
                      key={id}
                      className="rounded-xl bg-white/5 border border-white/10 p-1.5 backdrop-blur"
                    >
                      <PlatformLogo id={id} size={32} rounded={8} />
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {darkFeatures.map((f) => (
                <div key={f.t} className="flex items-start gap-3">
                  <span className="mt-0.5 w-6 h-6 rounded-full bg-[#C6F24E] text-[#0A0A0A] flex items-center justify-center text-[12px] font-bold shrink-0">
                    ✓
                  </span>
                  <div>
                    <div className="text-[15px] font-medium text-white">{f.t}</div>
                    <div className="text-[13px] text-[#A3A3A3] mt-0.5">{f.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          5. GOOGLE SAFE + SHIELD
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Google güvenli' : 'Google safe'}
            </span>
            <h2 className="mt-4 text-[36px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em] text-[#0A0A0A]">
              {isTr ? 'Politikalara uyumlu. Organik büyüme.' : 'Policy compliant. Organic growth.'}
            </h2>

            <div className="mt-10 divide-y divide-[#EDEDED] border-y border-[#EDEDED]">
              {policyBlocks.map((b) => (
                <div key={b.n} className="py-5 grid grid-cols-[auto_1fr] gap-5 items-start">
                  <span className="pulse-eyebrow text-[#A8D62E] pt-1">{b.n}</span>
                  <div>
                    <h3 className="text-[18px] font-medium text-[#0A0A0A] leading-snug">{b.t}</h3>
                    <p className="mt-1 text-[13px] text-[#525252] leading-[1.55]">{b.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <IllusShield size={300} className="w-full max-w-[300px] h-auto" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          5.5 BENTO GRID — QR Studio / AI Co-Pilot / Analytics / Platforms
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 sm:px-10 py-20 sm:py-24">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-[720px] mb-10 sm:mb-12">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Tek platform' : 'One platform'}
            </span>
            <h2 className="mt-4 text-[34px] sm:text-[46px] font-medium leading-[1.02] tracking-[-0.035em] text-[#0A0A0A]">
              {isTr ? 'Tek panelde, dört süper güç.' : 'One panel, four superpowers.'}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
            {/* QR Studio — lg:col-span-2 lg:row-span-2 */}
            <div className="relative overflow-hidden rounded-2xl border border-[#EDEDED] bg-[#0A0A0A] p-6 sm:p-7 text-white lg:col-span-2 lg:row-span-2">
              <span className="pulse-eyebrow text-[#C6F24E]">QR STUDIO</span>
              <h3
                className="mt-3 text-[26px] sm:text-[32px] font-medium leading-[1.05] tracking-[-0.025em]"
                style={{ fontFamily: 'var(--font-space-grotesk)' }}
              >
                {isTr ? 'Tasarla. Yerleştir. Takip et.' : 'Design. Place. Track.'}
              </h3>
              <p className="mt-3 text-[14px] leading-[1.6] text-[#A3A3A3] max-w-[400px]">
                {isTr
                  ? 'Markana özel QR şablonları, dört yerleştirme yolu (masa / fatura / kapı / paket), ham rapor.'
                  : 'Branded QR templates, four placement modes (table / receipt / door / pack), raw reports.'}
              </p>
              <div className="mt-8 flex items-end justify-between gap-6">
                <svg viewBox="0 0 90 90" className="h-28 w-28 sm:h-32 sm:w-32" aria-hidden>
                  <rect x="2" y="2" width="86" height="86" rx="6" fill="#C6F24E" />
                  <g fill="#0A0A0A">
                    {[
                      [10, 10, 20, 20],
                      [60, 10, 20, 20],
                      [10, 60, 20, 20],
                      [40, 40, 10, 10],
                      [55, 40, 10, 10],
                      [40, 55, 10, 10],
                      [60, 60, 20, 20],
                    ].map(([x, y, w, h], i) => (
                      <rect key={i} x={x} y={y} width={w} height={h} />
                    ))}
                  </g>
                </svg>
                <div className="text-right">
                  <p
                    className="text-[38px] font-semibold leading-none tracking-tight text-[#C6F24E] sm:text-[46px]"
                    style={{ fontFamily: 'var(--font-space-grotesk)' }}
                  >
                    +184%
                  </p>
                  <p className="pulse-eyebrow mt-1 text-[#737373]">
                    {isTr ? 'ORGANİK YORUM' : 'ORGANIC REVIEWS'}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Co-Pilot */}
            <div className="rounded-2xl border border-[#C6F24E] bg-[#EAF9B8]/40 p-6">
              <span className="pulse-eyebrow text-[#0A0A0A]">AI CO-PILOT</span>
              <h3
                className="mt-3 text-[20px] font-medium leading-tight tracking-tight text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-space-grotesk)' }}
              >
                {isTr ? 'Yanıtı saniyede yaz.' : 'Draft replies in seconds.'}
              </h3>
              <p className="mt-2 text-[13px] leading-[1.55] text-[#525252]">
                {isTr
                  ? 'Her yorum için OpenAI destekli Türkçe yanıt taslağı.'
                  : 'OpenAI-backed Turkish/English reply drafts per review.'}
              </p>
              <div className="mt-4 rounded-xl bg-[#0A0A0A] px-3 py-2 text-[11px] text-white">
                <span className="pulse-eyebrow text-[#C6F24E]">DRAFT</span>
                <p className="mt-1 leading-snug text-white/80">
                  {isTr
                    ? '"Merhaba Mert, harika yorumun için çok teşekkür ederiz…"'
                    : '"Hi Mark, thank you so much for taking the time…"'}
                </p>
              </div>
            </div>

            {/* Analytics */}
            <div className="rounded-2xl border border-[#EDEDED] bg-white p-6">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'ANALİTİK' : 'ANALYTICS'}
              </span>
              <h3
                className="mt-3 text-[20px] font-medium leading-tight tracking-tight text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-space-grotesk)' }}
              >
                {isTr ? 'Nabzını canlı izle.' : 'Watch your pulse live.'}
              </h3>
              <svg viewBox="0 0 220 56" className="mt-4 w-full">
                <defs>
                  <linearGradient id="bentoG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C6F24E" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#C6F24E" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 40 L30 36 L60 30 L90 20 L120 24 L150 14 L180 16 L210 8 L220 6 L220 56 L0 56 Z" fill="url(#bentoG)" />
                <path d="M0 40 L30 36 L60 30 L90 20 L120 24 L150 14 L180 16 L210 8 L220 6" fill="none" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" />
                <circle cx="220" cy="6" r="4" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
              </svg>
              <p className="mt-3 text-[12px] text-[#737373]">
                {isTr ? 'NPS, trend, konum kırılımı.' : 'NPS, trend, per-location breakdown.'}
              </p>
            </div>

            {/* Platforms */}
            <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-6 sm:col-span-2">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'ENTEGRASYONLAR' : 'INTEGRATIONS'}
              </span>
              <h3
                className="mt-3 text-[20px] font-medium leading-tight tracking-tight text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-space-grotesk)' }}
              >
                {isTr ? 'Türkiye ve dünya — aynı panelde.' : 'Turkey and the world, same panel.'}
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {(['google', 'yemeksepeti', 'getir-yemek', 'trendyol-go', 'yelp', 'tripadvisor', 'booking'] as const).map((id) => (
                  <div
                    key={id}
                    className="flex items-center gap-2 rounded-lg border border-[#EDEDED] bg-white px-2.5 py-1.5"
                  >
                    <PlatformLogo id={id} size={22} rounded={4} />
                    <span className="text-[11px] font-medium text-[#0A0A0A] capitalize">
                      {id.replace('-', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          6. INDUSTRY TABS — interactive sector switcher
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-[#FAFAFA] px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10 max-w-[720px] mx-auto">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Sektörler' : 'Industries'}
            </span>
            <h2 className="mt-4 text-[36px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em] text-[#0A0A0A]">
              {isTr ? 'Her sektör için, tam oturur.' : 'Fits every industry, perfectly.'}
            </h2>
          </div>
          <HomeIndustryTabs locale={locale} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          6.4 PLATFORM COVERAGE — EN ONLY (international home)
      ═══════════════════════════════════════════════════════════ */}
      {!isTr && (
        <section className="bg-[#FAFAFA] border-t border-[#EDEDED] px-6 sm:px-10 py-20 sm:py-24">
          <div className="max-w-[1200px] mx-auto">
            <div className="max-w-[720px]">
              <span className="pulse-eyebrow text-[#737373]">
                One dashboard · Every platform
              </span>
              <h2 className="mt-4 text-[36px] sm:text-[48px] lg:text-[56px] font-medium leading-[1.02] tracking-[-0.03em] text-[#0A0A0A]">
                From Yelp to Tripadvisor to DoorDash.
              </h2>
            </div>
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white border border-[#EDEDED] rounded-2xl p-7 sm:p-8">
                <span className="pulse-eyebrow text-[#737373]">Review platforms</span>
                <h3 className="mt-2 text-[22px] sm:text-[26px] font-medium tracking-[-0.02em]">
                  Your brand&apos;s trust signals
                </h3>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {GLOBAL_REVIEW.map((p) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <PlatformLogo id={p.id} size={36} rounded={8} />
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold truncate">{p.name}</div>
                        <div className="pulse-eyebrow text-[#737373] mt-0.5 truncate">{p.tag}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-[#EDEDED] rounded-2xl p-7 sm:p-8">
                <span className="pulse-eyebrow text-[#737373]">Delivery &amp; booking</span>
                <h3 className="mt-2 text-[22px] sm:text-[26px] font-medium tracking-[-0.02em]">
                  Where orders happen
                </h3>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {GLOBAL_DELIVERY.map((p) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <PlatformLogo id={p.id} size={36} rounded={8} />
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold truncate">{p.name}</div>
                        <div className="pulse-eyebrow text-[#737373] mt-0.5 truncate">{p.tag}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
          6.5 QR GENERATOR TOOL TEASER
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 sm:px-10 py-16 sm:py-20">
        <div className="max-w-[1100px] mx-auto bg-[#0A0A0A] text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[400px] h-[400px] bg-[#C6F24E]/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
            <div>
              <span className="pulse-eyebrow text-[#C6F24E]">
                {isTr ? 'ÜCRETSİZ ARAÇ · YENİ' : 'FREE TOOL · NEW'}
              </span>
              <h2 className="mt-4 text-[28px] sm:text-[40px] lg:text-[48px] font-medium text-white tracking-[-0.03em] leading-[1.05]">
                {isTr ? (
                  <>
                    Saniyede{' '}
                    <span className="inline-block bg-[#C6F24E] text-[#0A0A0A] rounded-lg px-3 -skew-y-1">
                      QR kodu
                    </span>{' '}
                    oluştur.
                  </>
                ) : (
                  <>
                    Generate a{' '}
                    <span className="inline-block bg-[#C6F24E] text-[#0A0A0A] rounded-lg px-3 -skew-y-1">
                      QR code
                    </span>{' '}
                    in seconds.
                  </>
                )}
              </h2>
              <p className="mt-5 text-[15px] sm:text-[16px] text-white/70 leading-[1.65] max-w-[520px]">
                {isTr
                  ? 'Web sitenizin, menünüzün veya herhangi bir linkinizin yüksek çözünürlüklü QR kodunu hemen indirin. Kayıt gerekmez — Buaze deneyimine ısınırken kullanabileceğiniz bir araç.'
                  : "Instantly download a high-resolution QR code for your website, menu or any link. No signup needed — a tool you can use while warming up to the Buaze experience."}
              </p>
              <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href={`${base}/solutions/qr-generator`}
                  className="inline-flex items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] px-6 py-3.5 rounded-full text-[14px] font-medium hover:bg-[#A8D62E] transition-colors"
                >
                  {isTr ? 'QR oluşturucuya git' : 'Open the generator'}
                  <span aria-hidden>→</span>
                </Link>
                <Link
                  href={`${base}/solutions`}
                  className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-6 py-3.5 rounded-full text-[14px] font-medium hover:bg-white/10 transition-colors"
                >
                  {isTr ? 'Tüm çözümleri gör' : 'See all solutions'}
                </Link>
              </div>
            </div>

            {/* Decorative QR preview */}
            <div className="flex justify-center lg:justify-end">
              <div className="bg-white rounded-3xl p-6 w-[240px] aspect-square flex items-center justify-center shadow-[0_20px_60px_rgba(198,242,78,0.25)]">
                <svg viewBox="0 0 64 64" width="180" height="180" aria-hidden>
                  <rect width="64" height="64" rx="6" fill="#FFFFFF" />
                  {/* three finder patterns */}
                  {[
                    [6, 6],
                    [42, 6],
                    [6, 42],
                  ].map(([x, y], i) => (
                    <g key={i}>
                      <rect x={x} y={y} width="16" height="16" fill="#0A0A0A" />
                      <rect x={x + 3} y={y + 3} width="10" height="10" fill="#FFFFFF" />
                      <rect x={x + 5} y={y + 5} width="6" height="6" fill="#0A0A0A" />
                    </g>
                  ))}
                  {/* data cells */}
                  {[
                    [26, 8],
                    [30, 8],
                    [34, 8],
                    [38, 10],
                    [26, 14],
                    [34, 14],
                    [8, 26],
                    [14, 26],
                    [24, 26],
                    [30, 28],
                    [36, 26],
                    [42, 30],
                    [48, 26],
                    [54, 28],
                    [8, 34],
                    [14, 30],
                    [22, 34],
                    [30, 36],
                    [38, 34],
                    [46, 38],
                    [54, 34],
                    [26, 42],
                    [34, 46],
                    [42, 44],
                    [50, 46],
                    [28, 50],
                    [36, 52],
                    [44, 50],
                    [52, 54],
                    [30, 58],
                    [42, 58],
                  ].map(([x, y], i) => (
                    <rect key={`d-${i}`} x={x} y={y} width="4" height="4" fill="#0A0A0A" />
                  ))}
                  {/* lime accent dot */}
                  <rect x="48" y="48" width="4" height="4" fill="#C6F24E" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          7. CASE STUDY + MOUNTAIN
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-16 items-center">
          <div className="flex justify-center lg:justify-start order-2 lg:order-1">
            <IllusMountain size={340} className="w-full max-w-[340px] h-auto" />
          </div>

          <div className="order-1 lg:order-2">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Vaka · Kadıköy Bistro' : 'Case · Kadıköy Bistro'}
            </span>
            <h2 className="mt-4 text-[36px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em] text-[#0A0A0A]">
              {isTr ? (
                <>
                  90 günde{' '}
                  <span className="inline-block bg-[#C6F24E] rounded-lg px-3 -skew-y-1">+184%</span>{' '}
                  organik yorum.
                </>
              ) : (
                <>
                  <span className="inline-block bg-[#C6F24E] rounded-lg px-3 -skew-y-1">+184%</span>{' '}
                  organic reviews in 90 days.
                </>
              )}
            </h2>
            <p className="mt-6 text-[17px] text-[#525252] leading-[1.6] max-w-[520px]">
              {isTr
                ? '"Masalara QR koyduk. İlk ay içinde Google ortalamamız 4.2\'den 4.8\'e çıktı. Artık müşteri yorumunu bekleyecek vakit harcamıyoruz — sistem kendi kendine çalışıyor."'
                : '"We put QRs on the tables. Within the first month our Google average went from 4.2 to 4.8. We don\'t spend time waiting for reviews anymore — the system runs itself."'}
            </p>

            <div className="mt-7 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0A0A0A] text-[#C6F24E] flex items-center justify-center text-[14px] font-semibold">
                EK
              </div>
              <div>
                <div className="text-[14px] font-medium text-[#0A0A0A]">Emre Kaya</div>
                <div className="text-[12px] text-[#737373]">
                  {isTr ? 'Kadıköy Bistro · Kurucu' : 'Kadıköy Bistro · Founder'}
                </div>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-6">
              {caseStats.map((s) => (
                <div key={s.l} className="border-t-2 border-[#0A0A0A] pt-3">
                  <div className="text-[22px] sm:text-[26px] font-medium leading-none text-[#0A0A0A] tracking-[-0.02em]">
                    {s.v}
                  </div>
                  <div className="pulse-eyebrow text-[#737373] mt-2">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          7.5 INTERNATIONAL TESTIMONIAL — EN ONLY
      ═══════════════════════════════════════════════════════════ */}
      {!isTr && (
        <section className="px-6 sm:px-10 pb-20 sm:pb-24">
          <div className="max-w-[1100px] mx-auto border-t border-[#EDEDED] pt-16 sm:pt-20">
            <blockquote
              className="text-[28px] sm:text-[40px] lg:text-[48px] font-medium leading-[1.1] tracking-[-0.025em] text-[#0A0A0A] max-w-[900px]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              &ldquo;We went from 3.9 on Yelp to 4.7 in six months. The Tripadvisor sync alone paid for Buaze.&rdquo;
            </blockquote>
            <div className="mt-7 flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full bg-[#0A0A0A] text-[#C6F24E] flex items-center justify-center text-[15px] font-semibold"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                JM
              </div>
              <div>
                <div className="text-[15px] font-medium text-[#0A0A0A]">Julia Martens</div>
                <div className="pulse-eyebrow text-[#737373] mt-1">Hotel Nora · Amsterdam</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
          8. LIME CTA BANNER
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-[#C6F24E] px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[900px] mx-auto text-center">
          <h2 className="text-[36px] sm:text-[56px] font-medium leading-[1.02] tracking-[-0.04em] text-[#0A0A0A] text-balance">
            {isTr ? 'Bugün başla, ilk yorumunu yarın al.' : 'Start today, get your first review tomorrow.'}
          </h2>
          <p className="mt-5 text-[16px] sm:text-[17px] text-[#1A1A1A] max-w-[560px] mx-auto">
            {isTr
              ? '14 gün ücretsiz deneme · Kredi kartı gerekmez · İstediğinde vazgeç'
              : '14-day free trial · No credit card required · Cancel anytime'}
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link
              href={`${base}/auth/register`}
              className="pulse-btn-dark inline-flex items-center justify-center gap-2 rounded-full"
            >
              {isTr ? 'Ücretsiz başla' : 'Start free'}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href={`${base}/pricing`}
              className="inline-flex items-center justify-center gap-2 border-2 border-[#0A0A0A] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#0A0A0A] hover:text-white transition-colors"
            >
              {isTr ? 'Fiyatlara bak' : 'See pricing'}
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} t={t} />

      {/* Conversion layer — client-only, renders only after user interacts */}
      <StickyCtaBar locale={locale} />
      <SocialProofToast locale={locale} />
    </div>
  );
}
