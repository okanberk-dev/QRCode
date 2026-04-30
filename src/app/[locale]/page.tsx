import type { Metadata } from 'next';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import Link from 'next/link';
import { IllusMountain, IllusShield } from '@/components/marketing/PulseIllustrations';
import PlatformLogo, { GLOBAL_REVIEW, GLOBAL_DELIVERY } from '@/components/marketing/PlatformLogo';
import { BarChart3, Inbox, QrCode, Sparkles, Star } from 'lucide-react';
import MarqueeRow from '@/components/marketing/MarqueeRow';
import StickyCtaBar from '@/components/marketing/StickyCtaBar';
import SocialProofToast from '@/components/marketing/SocialProofToast';
import HomeIndustryTabs from '@/components/marketing/HomeIndustryTabs';
import LiveReviewTicker from '@/components/marketing/LiveReviewTicker';
import HomeHero from '@/components/marketing/HomeHero';
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
  const ogImage = locale === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png';

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
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
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
  // Audit §8.4 — fake-looking wordmarks ("HOTEL NORA", "LAW&CO", ...) were
  // implying specific paying customers without consent, which is FTC and
  // Reklam Kurulu deceptive-advertising risk. Replaced with industry
  // categories until real customer logos with usage permission are added.
  const industryCategories = isTr
    ? ['Restoranlar', 'Oteller', 'Klinikler', 'Hukuk büroları', 'Kafeler', 'Spa & güzellik']
    : ['Restaurants', 'Hotels', 'Clinics', 'Law firms', 'Cafés', 'Spa & wellness'];

  // Three step cards — design `.design/site/site-homepage-v3.jsx:268-282 + 504-535`.
  // Each card carries an inline product-mock visual instead of a decorative illustration.
  const steps = [
    {
      n: 1,
      title: isTr ? 'Topla' : 'Collect',
      body: isTr
        ? 'Masanızdaki QR kodu tarayan müşteri, 20 saniyede yorum bırakır. Zahmet sıfır.'
        : 'A customer scans the QR on your table and leaves a review in 20 seconds. Zero friction.',
      Icon: QrCode,
      iconBg: '#C6F24E',
      iconFg: '#0A0A0A',
      visual: (
        <div className="flex items-center gap-3 rounded-[14px] border border-[#EDEDED] bg-white px-3.5 py-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF9B8] text-[12px] font-semibold text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            M
          </span>
          <p className="min-w-0 flex-1 truncate text-[13px] text-[#0A0A0A]">
            <strong className="font-semibold">M. Demir</strong>{' '}
            <span className="text-[#525252]">
              {isTr ? 'Servis harikaydı!' : 'Service was great!'}
            </span>
          </p>
          <span
            className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-[#0A0A0A] px-2 py-1 text-[#C6F24E]"
            aria-label={isTr ? '5 yıldız' : '5 stars'}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={9} fill="currentColor" strokeWidth={0} />
            ))}
          </span>
        </div>
      ),
    },
    {
      n: 2,
      title: isTr ? 'Yönet' : 'Manage',
      body: isTr
        ? "Hem Google'a düşen yorumları hem de işletmene özel gönderilen geri bildirimleri tek panelden yanıtla."
        : 'Reply to every review — public Google posts and private guest feedback — from one shared inbox.',
      Icon: Inbox,
      iconBg: '#0A0A0A',
      iconFg: '#C6F24E',
      visual: (
        <div className="rounded-xl bg-[#0A0A0A] px-3.5 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C6F24E] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#C6F24E]" />
            </span>
            <span className="pulse-eyebrow text-[#C6F24E]">+184%</span>
          </div>
          <p className="mt-2 text-[12px] leading-snug text-[#A3A3A3]">
            {isTr ? 'Tüm yorumlar tek yerde. Ata, yanıtla, kapat.' : 'All reviews in one place. Assign, reply, close.'}
          </p>
        </div>
      ),
    },
    {
      n: 3,
      title: isTr ? 'Büyü' : 'Grow',
      body: isTr
        ? 'Canlı analitik ile puanını izle, Google sıralamanı yükselt, organik büyümeyi yakala.'
        : 'Track your score with live analytics, lift your Google ranking, capture organic growth.',
      Icon: BarChart3,
      iconBg: '#EAF9B8',
      iconFg: '#0A0A0A',
      visual: (
        <svg viewBox="0 0 260 140" className="w-full" aria-hidden>
          {/* Browser-style card */}
          <rect x="8" y="20" width="244" height="115" rx="10" fill="#FFFFFF" stroke="#EDEDED" strokeWidth="1.5" />
          {/* Title placeholders */}
          <rect x="22" y="32" width="60" height="6" rx="3" fill="#0A0A0A" />
          <rect x="22" y="42" width="40" height="4" rx="2" fill="#EDEDED" />
          {/* Grid lines */}
          {[60, 85, 110].map((y) => (
            <line key={y} x1="22" y1={y} x2="240" y2={y} stroke="#F5F5F5" strokeWidth="1" />
          ))}
          {/* Bars — 5 bars, 3rd one (peak) is lime */}
          {([
            [45, 50],
            [80, 70],
            [115, 100],
            [150, 55],
            [185, 80],
          ] as const).map(([x, h], i) => (
            <rect
              key={x}
              x={x - 9}
              y={120 - h}
              width="18"
              height={h}
              rx="2.5"
              fill={i === 2 ? '#C6F24E' : '#0A0A0A'}
            />
          ))}
          {/* Trend line — dashed, connects bar tops */}
          <path
            d="M45 70 L80 50 L115 20 L150 65 L185 40"
            fill="none"
            stroke="#0A0A0A"
            strokeWidth="1.5"
            strokeDasharray="3,3"
          />
          {/* Leader line from peak to +184% pill */}
          <path d="M115 20 L195 11" fill="none" stroke="#0A0A0A" strokeWidth="1" />
          {/* +184% pill — top-right floating badge */}
          <rect x="195" y="2" width="55" height="18" rx="9" fill="#0A0A0A" />
          <text
            x="222.5"
            y="14.5"
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="10"
            fill="#C6F24E"
            fontWeight="600"
          >
            +184%
          </text>
          {/* Peak dot — lime fill, graphite stroke */}
          <circle cx="115" cy="20" r="6" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
        </svg>
      ),
    },
  ];

  const darkFeatures = isTr
    ? [
        { t: 'Otomatik etiketleme', d: 'Anahtar kelime ve duyguya göre.' },
        { t: 'Buaze Pulse AI duygu analizi', d: 'Pozitif / nötr / negatif sinyalleri otomatik ayırır.' },
        { t: 'Takım atama', d: 'Yorum doğru kişiye düşer.' },
        { t: 'SLA takibi', d: 'Yanıt süresi hedefleri tutulsun.' },
      ]
    : [
        { t: 'Auto-tagging', d: 'By keyword and sentiment.' },
        { t: 'Buaze Pulse AI sentiment', d: 'Automatically separates positive, neutral and negative signals.' },
        { t: 'Team assignment', d: 'Reviews land on the right person.' },
        { t: 'SLA tracking', d: 'Hit your response-time targets.' },
      ];

  const policyBlocks = isTr
    ? [
        { n: '01', t: 'Google önce', d: 'Her misafire önce Google yorum bağlantısı sunulur — yıldıza göre dallandırma yok.' },
        { n: '02', t: 'Şeffaf akış', d: 'Negatif yorumlar süzülmez veya engellenmez; isteyen Google\'a yazar, isteyen ek olarak işletmeye özel geri bildirim de bırakır.' },
        { n: '03', t: 'Şeffaf raporlama', d: 'Yorumlar gizlenmez veya filtrelenmez; her sinyal panelde olduğu gibi görünür.' },
      ]
    : [
        { n: '01', t: 'Google first', d: 'Every guest sees the public Google review link first — no rating-based gating.' },
        { n: '02', t: 'Transparent flow', d: 'Negative reviews are never filtered or blocked; private feedback to your team is an optional extra step in the same flow.' },
        { n: '03', t: 'Transparent reporting', d: 'No review is hidden or filtered; every signal lands in the panel as-is.' },
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
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#FFFFFF] text-[#0A0A0A] selection:bg-[#C6F24E]/40 selection:text-[#0A0A0A] pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <MarketingNavbar locale={locale} t={t} />

      {/* a11y: explicit <main> landmark — PageSpeed/Lighthouse flagged
          the document as missing one. Screen-reader users use it to skip
          past nav/header to the actual page content. */}
      <main id="main-content">

      {/* ═══════════════════════════════════════════════════════════
          1. HERO — Reputation OS edition
      ═══════════════════════════════════════════════════════════ */}
      <HomeHero locale={locale} />

      {/* ═══════════════════════════════════════════════════════════
          2. LOGO STRIP — trusted brands
      ═══════════════════════════════════════════════════════════ */}
      <section className="border-y border-[#EDEDED] bg-[#FAFAFA] py-4">
        <MarqueeRow
          eyebrow={isTr ? 'BUAZE\'İ KULLANAN İŞLETME TÜRLERİ' : 'BUILT FOR TEAMS LIKE THESE'}
          itemClassName="shrink-0 px-10 sm:px-12"
          items={industryCategories.map((name) => (
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
      <section id="how-it-works" className="scroll-mt-24 px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12 sm:mb-16 max-w-[720px]">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Nasıl çalışır' : 'How it works'}
            </span>
            <h2 className="mt-4 text-[28px] sm:text-[48px] font-medium leading-[1.05] sm:leading-[1.02] tracking-[-0.035em] text-[#0A0A0A] text-balance">
              {isTr ? 'Üç adım, üç saniye.' : 'Three steps, three seconds.'}
            </h2>
          </div>

          {/* design `.design/site/site-homepage-v3.jsx:268-282` — fixed 3-col grid;
              each card has a watermarked step number, lucide icon tile, STEP chip,
              h3, body, and an inline product mock at the bottom. */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {steps.map(({ n, title, body, Icon, iconBg, iconFg, visual }) => (
              <div
                key={n}
                className="bz-card relative flex flex-col overflow-hidden p-7"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-2.5 right-1.5 select-none text-[100px] font-extrabold leading-none tracking-[-0.05em] text-[#F5F5F5]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  0{n}
                </span>
                <div className="relative">
                  <div className="mb-4 flex items-center gap-2.5">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: iconBg, color: iconFg }}
                    >
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <span className="rounded bg-[#0A0A0A] px-2 py-0.5 text-[10px] font-bold tracking-[0.16em] text-[#C6F24E]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {isTr ? 'ADIM' : 'STEP'} 0{n}
                    </span>
                  </div>
                  <h3 className="text-[22px] sm:text-[26px] font-medium leading-[1.1] tracking-[-0.02em] text-[#0A0A0A] text-balance">
                    {title}
                  </h3>
                  <p className="mt-2 text-[14px] text-[#525252] leading-[1.6] text-pretty">{body}</p>
                  <div className="mt-4">{visual}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          4. DARK FEATURE — live stream mock
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-[#0A0A0A] text-white px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Live stream card — auto-rotating review ticker, mirrors the
              HeroProduct helper in .design/site/site-homepage-v3.jsx:174 */}
          <LiveReviewTicker locale={locale} />

          {/* Copy + feature grid */}
          <div>
            <span className="pulse-eyebrow text-[#C6F24E]">
              {isTr ? 'Merkezi yönetim' : 'Central control'}
            </span>
            <h2 className="mt-4 text-[28px] sm:text-[40px] lg:text-[52px] font-medium leading-[1.02] tracking-[-0.035em] text-white">
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
            <p className="mt-5 text-[16px] text-white leading-[1.6] max-w-[480px]">
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

            {/* Always 2-col on mobile too — design buaze-mobil/home.jsx:473
                renders `gridTemplateColumns:'1fr 1fr'` regardless of viewport.
                Stacking would make the panel feel sparse on dark bg. */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
              {darkFeatures.map((f) => (
                <div key={f.t} className="flex items-start gap-2.5">
                  <span className="mt-0.5 h-[22px] w-[22px] rounded-full bg-[#C6F24E] text-[#0A0A0A] flex items-center justify-center text-[11px] font-bold shrink-0">
                    ✓
                  </span>
                  <div>
                    <div className="text-[14px] font-medium text-white">{f.t}</div>
                    <div className="text-[12px] text-white mt-0.5">{f.d}</div>
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
      <section className="px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="pulse-chip-soft">
              <span className="h-2 w-2 rounded-full bg-[#16A34A] pulse-heartbeat" />
              <span className="pulse-eyebrow whitespace-nowrap leading-none text-[#0A0A0A]">
                {isTr ? 'Şeffaf akış' : 'Transparent flow'}
              </span>
            </span>
            <h2 className="mt-4 text-[26px] sm:text-[40px] lg:text-[48px] font-medium leading-[1.05] sm:leading-[1.02] tracking-[-0.035em] text-[#0A0A0A]">
              {isTr ? 'Şeffaf akış. Organik büyüme.' : 'Transparent flow. Organic growth.'}
            </h2>

            <div className="mt-10 divide-y divide-[#EDEDED] border-y border-[#EDEDED]">
              {policyBlocks.map((b) => (
                <div key={b.n} className="grid grid-cols-[auto_1fr] items-start gap-4 py-5 sm:gap-5">
                  <span className="pulse-eyebrow text-[#A8D62E] pt-1">{b.n}</span>
                  <div>
                    <h3 className="text-[18px] font-medium text-[#0A0A0A] leading-snug">{b.t}</h3>
                    <p className="mt-1 text-[13px] text-[#525252] leading-[1.55]">{b.d}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href={`${base}/google-compliance`}
              className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 hover:decoration-[#A8D62E]"
            >
              {isTr ? 'Politika uyum detayları' : 'Policy compliance details'}
              <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="flex justify-center lg:justify-end">
            <IllusShield size={300} className="w-full max-w-[300px] h-auto" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          5.5 BENTO — Tek panelde dört süper güç
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-[#FAFAFA] px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-[720px] mb-10 sm:mb-14">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Tek platform' : 'One platform'}
            </span>
            <h2 className="mt-4 text-[26px] sm:text-[40px] lg:text-[46px] font-medium leading-[1.05] sm:leading-[1.02] tracking-[-0.035em] text-[#0A0A0A] text-balance">
              {isTr ? 'Tek panelde, dört süper güç.' : 'One panel, four superpowers.'}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
            {/* QR Studio — large dark hero (2x2) */}
            <div className="bz-fade-up bz-d1 pulse-card-hover relative overflow-hidden rounded-2xl border border-[#0A0A0A] bg-[#0A0A0A] p-6 text-white sm:p-7 lg:col-span-2 lg:row-span-2">
              <div
                className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#C6F24E]/10 blur-3xl"
                aria-hidden
              />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="pulse-eyebrow text-[#C6F24E]">QR STUDIO</span>
                </div>
                <h3
                  className="mt-3 text-[26px] sm:text-[34px] font-medium leading-[1.05] tracking-[-0.025em] text-white"
                >
                  {isTr ? 'Tasarla. Yerleştir. Takip et.' : 'Design. Place. Track.'}
                </h3>
                <p className="mt-3 max-w-[400px] text-[14px] leading-[1.6] text-white/70">
                  {isTr
                    ? 'Markana özel QR şablonları, dört yerleştirme yolu (masa / fatura / kapı / paket), ham rapor.'
                    : 'Branded QR templates, four placement modes (table / receipt / door / pack), raw reports.'}
                </p>
                <div className="mt-8 flex items-end justify-between gap-6">
                  {/* Realistic QR mock — 3 finder patterns + scattered data cells */}
                  <svg viewBox="0 0 100 100" className="h-32 w-32 sm:h-36 sm:w-36" aria-hidden>
                    <rect x="2" y="2" width="96" height="96" rx="8" fill="#C6F24E" />
                    <g fill="#0A0A0A">
                      {[
                        [10, 10],
                        [70, 10],
                        [10, 70],
                      ].map(([x, y], i) => (
                        <g key={i}>
                          <rect x={x} y={y} width="20" height="20" rx="2" />
                          <rect x={x + 4} y={y + 4} width="12" height="12" fill="#C6F24E" />
                          <rect x={x + 7} y={y + 7} width="6" height="6" />
                        </g>
                      ))}
                      {[
                        [36, 12], [42, 12], [48, 12], [54, 12], [60, 12],
                        [36, 18], [48, 18], [60, 18],
                        [36, 24], [42, 24], [54, 24],
                        [12, 36], [18, 36], [30, 36], [36, 42], [48, 42], [60, 42],
                        [12, 48], [24, 48], [36, 48], [42, 48], [54, 48], [60, 48],
                        [12, 54], [30, 54], [36, 54], [60, 54],
                        [36, 60], [42, 60], [54, 60],
                        [40, 72], [46, 72], [58, 72], [70, 72], [78, 72],
                        [40, 78], [52, 78], [64, 78],
                        [40, 84], [64, 84], [78, 84],
                        [46, 90], [58, 90], [70, 90],
                      ].map(([x, y], i) => (
                        <rect key={`d-${i}`} x={x} y={y} width="4" height="4" />
                      ))}
                    </g>
                  </svg>
                  <div className="text-right">
                    <p
                      className="text-[40px] sm:text-[52px] font-semibold leading-none tracking-tight text-[#C6F24E]"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      +184%
                    </p>
                    <p className="pulse-eyebrow mt-1.5 text-white/60">
                      {isTr ? 'ORGANİK YORUM' : 'ORGANIC REVIEWS'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Buaze Pulse AI — top-right tile */}
            <div className="bz-fade-up bz-d2 pulse-card-hover relative overflow-hidden rounded-2xl border border-[#C6F24E] bg-gradient-to-br from-[#EAF9B8]/70 to-[#EAF9B8]/30 p-6">
              <div className="flex items-center gap-2">
                <span className="pulse-eyebrow text-[#0A0A0A]">BUAZE PULSE AI</span>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#0A0A0A]">
                  <Sparkles size={11} className="text-[#C6F24E]" strokeWidth={2.5} />
                </span>
              </div>
              <h3
                className="mt-3 text-[20px] font-medium leading-tight tracking-tight text-[#0A0A0A]"
              >
                {isTr ? 'Yanıtı saniyede yaz.' : 'Draft replies in seconds.'}
              </h3>
              <p className="mt-2 text-[13px] leading-[1.55] text-[#525252]">
                {isTr
                  ? 'Her yorum için Buaze Pulse AI ile Türkçe yanıt taslağı.'
                  : 'Turkish/English reply drafts with Buaze Pulse AI.'}
              </p>
              <div className="mt-4 rounded-xl bg-[#0A0A0A] px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="pulse-eyebrow text-[#C6F24E]">DRAFT</span>
                  <span
                    className="text-[10px] text-[#A3A3A3]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    0.8s
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-white/85">
                  {isTr
                    ? '"Merhaba Mert, harika yorumun için çok teşekkür ederiz…"'
                    : '"Hi Mark, thank you so much for taking the time…"'}
                </p>
              </div>
            </div>

            {/* Analitik — top-right corner tile */}
            <div className="bz-fade-up bz-d3 pulse-card-hover relative rounded-2xl border border-[#EDEDED] bg-white p-6">
              <div className="flex items-center gap-2">
                <span className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'ANALİTİK' : 'ANALYTICS'}
                </span>
                <span className="hidden sm:flex relative h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16A34A] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                </span>
              </div>
              <h3
                className="mt-3 text-[20px] font-medium leading-tight tracking-tight text-[#0A0A0A]"
              >
                {isTr ? 'Nabzını canlı izle.' : 'Watch your pulse live.'}
              </h3>
              <svg viewBox="0 0 220 56" className="mt-4 w-full" aria-hidden>
                <defs>
                  <linearGradient id="bentoG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C6F24E" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#C6F24E" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[14, 28, 42].map((y) => (
                  <line key={y} x1="0" y1={y} x2="220" y2={y} stroke="#F5F5F5" strokeWidth="1" />
                ))}
                <path
                  d="M0 42 L25 38 L50 32 L75 22 L100 26 L125 16 L150 18 L175 10 L200 8 L220 6 L220 56 L0 56 Z"
                  fill="url(#bentoG)"
                />
                <path
                  d="M0 42 L25 38 L50 32 L75 22 L100 26 L125 16 L150 18 L175 10 L200 8 L220 6"
                  fill="none"
                  stroke="#0A0A0A"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="220" cy="6" r="4" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
              </svg>
              <p className="mt-3 text-[12px] text-[#737373]">
                {isTr ? 'NPS, trend, konum kırılımı.' : 'NPS, trend, per-location breakdown.'}
              </p>
            </div>

            {/* Entegrasyonlar — bottom-right wide tile */}
            <div className="bz-fade-up bz-d4 pulse-card-hover relative rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-6 sm:col-span-2">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'ENTEGRASYONLAR' : 'INTEGRATIONS'}
              </span>
              <h3
                className="mt-3 text-[20px] font-medium leading-tight tracking-tight text-[#0A0A0A]"
              >
                {isTr ? 'Türkiye ve dünya — aynı panelde.' : 'Turkey and the world, same panel.'}
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {(['google', 'yemeksepeti', 'getir-yemek', 'trendyol-go', 'yelp', 'tripadvisor', 'booking'] as const).map(
                  (id) => (
                    <div
                      key={id}
                      className="flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-3 py-1.5 transition-colors hover:border-[#0A0A0A] sm:rounded-lg sm:px-2.5"
                    >
                      <span className="hidden sm:inline-flex">
                        <PlatformLogo id={id} size={22} rounded={4} />
                      </span>
                      <span className="text-[12px] font-medium capitalize text-[#0A0A0A] sm:text-[11px]">
                        {id.replace('-', ' ')}
                      </span>
                    </div>
                  ),
                )}
                <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-dashed border-[#D4D4D4] bg-transparent px-2.5 py-1.5 text-[11px] font-medium text-[#737373]">
                  + {isTr ? '12 daha' : '12 more'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          6. INDUSTRY TABS — interactive sector switcher
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#FAFAFA] border-t border-[#EDEDED] px-5 py-[60px] sm:px-10 sm:py-24 lg:py-28">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C6F24E]/60 to-transparent"
        />
        <div
          aria-hidden
          className="absolute right-[-12%] top-16 hidden h-[360px] w-[360px] rounded-full bg-[#C6F24E]/20 blur-[100px] sm:block"
        />
        <div className="relative max-w-[1200px] mx-auto">
          <div className="mb-8 max-w-[760px] sm:mx-auto sm:mb-12 sm:text-center">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Sektörler' : 'Industries'}
            </span>
            <h2 className="mt-4 text-[26px] sm:text-[40px] lg:text-[52px] font-medium leading-[1] tracking-[-0.035em] text-[#0A0A0A]">
              {isTr ? 'Her sektör için, tam oturur.' : 'Fits every industry, perfectly.'}
            </h2>
            <p className="mt-4 text-[15px] leading-[1.7] text-[#525252] sm:mx-auto sm:max-w-[620px] sm:text-[17px]">
              {isTr
                ? 'Temas noktası, platform önerisi ve rapor dili sektörünüze göre şekillenir; mobilde de aynı netlikle çalışır.'
                : 'Touchpoints, platform suggestions and reporting language adapt to your industry and stay clear on mobile.'}
            </p>
          </div>
          <HomeIndustryTabs locale={locale} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          6.4 PLATFORM COVERAGE — EN ONLY (international home)
      ═══════════════════════════════════════════════════════════ */}
      {!isTr && (
        <section className="bg-[#FAFAFA] border-t border-[#EDEDED] px-5 sm:px-10 py-[60px] sm:py-24">
          <div className="max-w-[1200px] mx-auto">
            <div className="max-w-[720px]">
              <span className="pulse-eyebrow text-[#737373]">
                One dashboard · Every platform
              </span>
              <h2 className="mt-4 text-[26px] sm:text-[40px] lg:text-[48px] font-medium leading-[1.02] tracking-[-0.03em] text-[#0A0A0A]">
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
      <section className="px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="max-w-[1100px] mx-auto bg-[#0A0A0A] text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[400px] h-[400px] bg-[#C6F24E]/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
            <div>
              <span className="pulse-eyebrow text-[#C6F24E]">
                {isTr ? 'ÜCRETSİZ ARAÇ · YENİ' : 'FREE TOOL · NEW'}
              </span>
              <h2 className="mt-4 text-[24px] sm:text-[36px] lg:text-[48px] font-medium text-white tracking-[-0.03em] leading-[1.05]">
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
              <div className="mt-7 flex flex-row items-center gap-2 sm:gap-3">
                <Link
                  href={`${base}/solutions/qr-generator`}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-[#C6F24E] text-[#0A0A0A] px-4 py-3 rounded-full text-[13px] font-medium hover:bg-[#A8D62E] transition-colors sm:px-6 sm:py-3.5 sm:text-[14px]"
                >
                  {isTr ? 'QR oluşturucuya git' : 'Open the generator'}
                  <span aria-hidden>→</span>
                </Link>
                <Link
                  href={`${base}/solutions`}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap border border-white/20 text-white px-4 py-3 rounded-full text-[13px] font-medium hover:bg-white/10 transition-colors sm:px-6 sm:py-3.5 sm:text-[14px]"
                >
                  {isTr ? 'Tüm çözümler' : 'All solutions'}
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
      <section className="px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-16 items-center">
          <div className="flex justify-center lg:justify-start order-2 lg:order-1">
            <IllusMountain size={280} className="w-full max-w-[280px] h-auto" />
          </div>

          <div className="order-1 lg:order-2">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Vaka · Kadıköy Bistro' : 'Case · Kadıköy Bistro'}
            </span>
            <h2 className="mt-4 text-[26px] sm:text-[40px] lg:text-[48px] font-medium leading-[1.05] sm:leading-[1.02] tracking-[-0.035em] text-[#0A0A0A]">
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

            <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-6">
              {caseStats.map((s) => (
                <div key={s.l} className="border-t-2 border-[#0A0A0A] pt-3">
                  <div className="text-[18px] sm:text-[26px] font-medium leading-none text-[#0A0A0A] tracking-[-0.02em]">
                    {s.v}
                  </div>
                  <div className="pulse-eyebrow text-[#737373] mt-2">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* International testimonial section removed — the prior block
          attributed a quote to "Julia Martens · Hotel Nora · Amsterdam"
          but Hotel Nora was a placeholder brand name (audit §8.4 / §4),
          and an unverifiable named testimonial is FTC + Reklam Kurulu
          deceptive-advertising risk. Restore once a real consented
          customer + venue is available. */}

      {/* ═══════════════════════════════════════════════════════════
          8. LIME CTA BANNER
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-[#C6F24E] px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[900px] mx-auto text-center">
          <h2 className="text-[28px] sm:text-[44px] lg:text-[56px] font-medium leading-[1.02] tracking-[-0.04em] text-[#0A0A0A] text-balance">
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

      </main>

      <MarketingFooter locale={locale} t={t} />

      {/* Conversion layer — client-only, renders only after user interacts */}
      <StickyCtaBar locale={locale} />
      <SocialProofToast locale={locale} />
    </div>
  );
}
