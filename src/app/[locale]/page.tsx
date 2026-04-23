import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import Link from 'next/link';
import {
  IllusLighthouse,
  IllusMountain,
  IllusCompass,
  IllusInbox,
  IllusChart,
  IllusShield,
} from '@/components/marketing/PulseIllustrations';
import PlatformLogo, { GLOBAL_REVIEW, GLOBAL_DELIVERY } from '@/components/marketing/PlatformLogo';
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
      İtibarınızı bir{' '}
      <span className="inline-block bg-[#C6F24E] rounded-lg px-3 py-0.5 -skew-y-1">nabız</span>{' '}
      gibi izleyin.
    </>
  ) : (
    <>
      Track your reputation like a{' '}
      <span className="inline-block bg-[#C6F24E] rounded-lg px-3 py-0.5 -skew-y-1">pulse</span>.
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

  const livePoints = [4, 12, 8, 16, 10, 20, 14, 24, 22];
  const liveReviews = isTr
    ? [
        { n: 'Ayşe K.', c: 'Servis çok hızlıydı, tatlılar harika.', r: 5 },
        { n: 'Mert D.', c: 'Mekan güzel, sadece ses biraz yüksekti.', r: 4 },
        { n: 'Zeynep A.', c: 'Kahve tam istediğim gibi geldi.', r: 5 },
      ]
    : [
        { n: 'Alice K.', c: 'Service was fast, desserts were great.', r: 5 },
        { n: 'Mark D.', c: 'Nice place, just a bit loud.', r: 4 },
        { n: 'Jenny A.', c: 'Coffee came exactly how I ordered.', r: 5 },
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

  const sectors = isTr
    ? [
        { t: 'Restoran & Kafe', c: '1.200+', s: 'mekan' },
        { t: 'Otel', c: '340+', s: 'konaklama' },
        { t: 'Klinik & Muayenehane', c: '520+', s: 'sağlık' },
        { t: 'Hukuk Ofisi', c: '180+', s: 'ofis' },
        { t: 'Güzellik & Spa', c: '410+', s: 'salon' },
        { t: 'Perakende', c: '260+', s: 'mağaza' },
        { t: 'Spor & Fitness', c: '140+', s: 'tesis' },
        { t: 'Eğitim', c: '90+', s: 'kurum' },
      ]
    : [
        { t: 'Restaurant & Café', c: '1,200+', s: 'venues' },
        { t: 'Hotel', c: '340+', s: 'properties' },
        { t: 'Clinic & Practice', c: '520+', s: 'providers' },
        { t: 'Legal', c: '180+', s: 'offices' },
        { t: 'Beauty & Spa', c: '410+', s: 'salons' },
        { t: 'Retail', c: '260+', s: 'stores' },
        { t: 'Sports & Fitness', c: '140+', s: 'facilities' },
        { t: 'Education', c: '90+', s: 'institutions' },
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
          1. HERO — grid bg + lighthouse + lime-highlighted word
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-6 sm:px-10 pt-10 sm:pt-16 lg:pt-20 pb-14 sm:pb-20">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.5]"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="pulseGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDEDED" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pulseGrid)" />
        </svg>

        <div className="relative max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-center">
          <div className="space-y-7 sm:space-y-8">
            <div className="inline-flex items-center gap-2 bg-[#EAF9B8] border border-[#C6F24E] rounded-full pl-2 pr-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] pulse-heartbeat" />
              <span className="pulse-eyebrow text-[#0A0A0A]">
                {isTr ? '2.400+ işletme kullanıyor' : '2,400+ businesses using it'}
              </span>
            </div>

            <h1 className="text-[40px] sm:text-[56px] lg:text-[80px] font-medium leading-[0.95] tracking-[-0.04em] text-[#0A0A0A] text-balance">
              {heroHeadline}
            </h1>

            <p className="text-[17px] sm:text-[18px] text-[#525252] font-normal leading-[1.55] max-w-[540px]">
              {heroSub}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-white px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-[#1A1A1A] transition-colors"
              >
                {isTr ? '14 gün ücretsiz başla' : 'Start 14-day free trial'}
                <span aria-hidden>→</span>
              </Link>
              <Link
                href={`${base}/how-it-works`}
                className="inline-flex items-center justify-center gap-2 border border-[#0A0A0A] text-[#0A0A0A] px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-[#0A0A0A] hover:text-white transition-colors"
              >
                <span aria-hidden>▶</span>
                {isTr ? 'Demo izle (2 dk)' : 'Watch demo (2 min)'}
              </Link>
            </div>

            <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
              {trustTicks.map((tick) => (
                <li key={tick} className="flex items-center gap-2 text-[14px] text-[#525252]">
                  <span className="w-4 h-4 rounded-full bg-[#C6F24E] flex items-center justify-center text-[#0A0A0A] text-[10px] font-bold">
                    ✓
                  </span>
                  {tick}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-center md:justify-end">
            <IllusLighthouse size={340} className="w-full max-w-[340px] h-auto" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          2. LOGO STRIP — trusted brands
      ═══════════════════════════════════════════════════════════ */}
      <section className="border-y border-[#EDEDED] py-8 px-6 sm:px-10">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
          <span className="pulse-eyebrow text-[#737373] whitespace-nowrap">
            {isTr ? 'Güvenen markalar' : 'Trusted by'}
          </span>
          <div className="flex-1 flex flex-wrap items-center justify-start md:justify-between gap-x-8 gap-y-3">
            {brandWordmarks.map((name) => (
              <span
                key={name}
                className="text-[16px] sm:text-[18px] font-semibold tracking-[0.08em] text-[#A3A3A3]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
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
          {/* Live stream card */}
          <div className="bg-[#1A1A1A] border border-[#333333] rounded-2xl p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-[#C6F24E] pulse-heartbeat" />
              <span className="pulse-eyebrow text-[#C6F24E]">
                {isTr ? 'CANLI AKIŞ' : 'LIVE STREAM'}
              </span>
            </div>

            <svg viewBox="0 0 320 100" className="w-full h-auto mb-5" aria-hidden>
              <defs>
                <linearGradient id="liveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C6F24E" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#C6F24E" stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const pts = livePoints.map((v, i) => {
                  const x = (i / (livePoints.length - 1)) * 320;
                  const y = 90 - (v / 24) * 70;
                  return `${x},${y}`;
                });
                const line = pts.join(' ');
                const area = `0,100 ${line} 320,100`;
                return (
                  <>
                    <polygon points={area} fill="url(#liveGrad)" />
                    <polyline points={line} fill="none" stroke="#C6F24E" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                    {livePoints.map((v, i) => {
                      const x = (i / (livePoints.length - 1)) * 320;
                      const y = 90 - (v / 24) * 70;
                      return <circle key={i} cx={x} cy={y} r="3" fill="#C6F24E" />;
                    })}
                  </>
                );
              })()}
            </svg>

            <div className="space-y-3">
              {liveReviews.map((r, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-t border-[#333333] first:border-t-0">
                  <div className="w-9 h-9 rounded-full bg-[#C6F24E] text-[#0A0A0A] flex items-center justify-center text-[13px] font-semibold shrink-0">
                    {r.n.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-medium text-white truncate">{r.n}</span>
                      <span className="text-[#C6F24E] text-[12px] tracking-wide shrink-0">
                        {'★'.repeat(r.r)}
                        <span className="text-[#525252]">{'★'.repeat(5 - r.r)}</span>
                      </span>
                    </div>
                    <p className="text-[13px] text-[#A3A3A3] mt-0.5 truncate">{r.c}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

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

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          6. SOLUTIONS GRID
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-[#FAFAFA] px-6 sm:px-10 py-20 sm:py-28">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-14 max-w-[720px] mx-auto">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Sektörler' : 'Industries'}
            </span>
            <h2 className="mt-4 text-[36px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em] text-[#0A0A0A]">
              {isTr ? 'Her sektör için, tam oturur.' : 'Fits every industry, perfectly.'}
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sectors.map((s) => (
              <div
                key={s.t}
                className="bg-white border border-[#EDEDED] rounded-2xl p-5 flex flex-col gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-[#EAF9B8] flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden>
                    <path d="M4 16 L9 16 L11 10 L15 22 L17 14 L20 18 L28 18" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="text-[15px] font-medium text-[#0A0A0A] leading-tight">{s.t}</div>
                <div className="pulse-eyebrow text-[#737373] mt-auto">
                  {s.c} {s.s}
                </div>
              </div>
            ))}
          </div>
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
              className="inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-white px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#1A1A1A] transition-colors"
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
    </div>
  );
}
