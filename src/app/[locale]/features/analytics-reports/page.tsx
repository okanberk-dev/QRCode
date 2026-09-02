import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  ChevronDown,
  LineChart,
  MailCheck,
  MapPinned,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import { jsonLdString } from '@/lib/seo/json-ld';
import { buildHowToSchema } from '@/lib/seo/howto-schema';
import { getTranslations, type Locale } from '@/lib/translations';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

const VALID_LOCALES = ['tr', 'en'] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const title = isTr
    ? 'Analitik & Raporlar — Yorum trendlerini canlı izle | Buaze'
    : 'Analytics & Reports — Track review trends live | Buaze';
  const description = isTr
    ? 'Ortalama puan, yanıt oranı, dönüşüm, platform kırılımı, konum karşılaştırması ve haftalık raporlar tek panelde. Pulse AI tema çıkarımı entitlement açıkken çalışır; normal KPI akışı her planda canlıdır.'
    : 'Average rating, reply rate, conversion, platform breakdown, location comparison and weekly reports — all in one panel. Pulse AI theme extraction runs when the entitlement is on; core KPIs stay live on every plan.';
  const canonicalUrl = `https://buaze.com/${locale}/features/analytics-reports`;
  return {
    metadataBase: new URL('https://buaze.com'),
    title,
    description,
    keywords: isTr
      ? [
          'yorum analitiği',
          'müşteri memnuniyeti raporu',
          'NPS takip',
          'restoran analitik',
          'haftalık özet rapor',
          'platform karşılaştırma',
          'konum bazlı analitik',
          'AI tema çıkarımı',
        ]
      : [
          'review analytics',
          'customer satisfaction reports',
          'NPS tracking',
          'restaurant analytics',
          'weekly digest',
          'platform comparison',
          'location-level analytics',
          'AI theme extraction',
        ],
    alternates: {
      canonical: canonicalUrl,
      languages: {
        tr: 'https://buaze.com/tr/features/analytics-reports',
        en: 'https://buaze.com/en/features/analytics-reports',
        'x-default': 'https://buaze.com/en/features/analytics-reports',
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Buaze',
      locale: isTr ? 'tr_TR' : 'en_US',
      alternateLocale: isTr ? ['en_US'] : ['tr_TR'],
      type: 'website',
      images: [
        {
          url: isTr ? '/images/open-graph-tr.png' : '/images/open-graph-en.png',
          width: 1200,
          height: 630,
          alt: 'Buaze — Analitik & Raporlar',
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [isTr ? '/images/open-graph-tr.png' : '/images/open-graph-en.png'],
    },
  };
}

export default async function AnalyticsReportsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) notFound();

  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;
  const canonicalUrl = `https://buaze.com/${locale}/features/analytics-reports`;

  // KPI tile values — neutral and believable; never fabricated guarantees.
  const tiles = isTr
    ? [
        { label: 'Ortalama puan', value: '4.7', delta: '+0.3', deltaUp: true },
        { label: 'Yanıt oranı', value: '%92', delta: '+18%', deltaUp: true },
        { label: 'Düşük puan', value: '8', delta: '-31%', deltaUp: true }, // down is good
      ]
    : [
        { label: 'Average rating', value: '4.7', delta: '+0.3', deltaUp: true },
        { label: 'Reply rate', value: '92%', delta: '+18%', deltaUp: true },
        { label: 'Low ratings', value: '8', delta: '-31%', deltaUp: true },
      ];

  // Platform split chips — keeps the live feel + reinforces multi-platform story.
  const splits = isTr
    ? [
        { name: 'Google', share: 58, fg: '#4285F4' },
        { name: 'Yemeksepeti', share: 22, fg: '#FA0050' },
        { name: 'Tripadvisor', share: 12, fg: '#34E0A1' },
        { name: 'Diğer', share: 8, fg: '#737373' },
      ]
    : [
        { name: 'Google', share: 58, fg: '#4285F4' },
        { name: 'Yemeksepeti', share: 22, fg: '#FA0050' },
        { name: 'Tripadvisor', share: 12, fg: '#34E0A1' },
        { name: 'Other', share: 8, fg: '#737373' },
      ];

  const cards = isTr
    ? [
        {
          icon: BarChart3,
          title: 'Çekirdek KPI akışı',
          body: 'Yorum sayısı, ortalama puan, dönüşüm oranı, düşük puan hacmi ve yanıt hızı her planda canlıdır. AI yetkisi kapalıyken çekirdek metrikler etkilenmez.',
        },
        {
          icon: BrainCircuit,
          title: 'AI tema çıkarımı',
          body: 'Entitlement açıkken yorum metinleri "şikayet" ve "övgü" temalarına kümelenir. Kapatıldığında bölüm UI\'da gizlenir; çekirdek raporlar etkilenmez.',
        },
        {
          icon: MapPinned,
          title: 'Konum + platform kırılımı',
          body: 'Şube, platform, kanal ve zaman penceresine göre filtreleyerek hangi lokasyonun düşüşte olduğunu pattern haline gelmeden tespit et.',
        },
        {
          icon: MailCheck,
          title: 'Pazartesi haftalık özet',
          body: 'Pazartesi sabahları kanonik haftalık rapor çekirdek metrikleri taşır. AI insight sadece entitlement açıkken eklenir; aynı kullanıcı listesi 10:00 UTC ops e-postasıyla doğrulanır.',
        },
      ]
    : [
        {
          icon: BarChart3,
          title: 'Core KPI flow',
          body: 'Review count, average rating, conversion, low-rating volume and reply speed stay live on every plan. Core metrics never depend on AI being on.',
        },
        {
          icon: BrainCircuit,
          title: 'AI theme extraction',
          body: 'When the entitlement is on, review text is clustered into complaint and praise themes. When off, the section is hidden in the UI — core reporting is unaffected.',
        },
        {
          icon: MapPinned,
          title: 'Location + platform splits',
          body: 'Filter by branch, platform, channel and time window to spot which location is slipping before it becomes a pattern.',
        },
        {
          icon: MailCheck,
          title: 'Monday weekly digest',
          body: 'The canonical weekly report goes out Monday morning with core metrics. AI insight is added only when the entitlement is on; the same recipient list is double-checked by a 10:00 UTC ops email.',
        },
      ];

  const featureList = isTr
    ? [
        'Çekirdek KPI: yorum sayısı, ortalama puan, dönüşüm, düşük puan, yanıt hızı',
        'Trend grafiği: 7gün / 30gün / 90gün / tüm zaman pencere seçimi',
        'Platform kırılımı (Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Foursquare, Yandex, Booking, Airbnb)',
        'Konum bazlı karşılaştırma + şube filtresi',
        'AI tema çıkarımı (admin entitlement açıksa)',
        'Pazartesi 09:00 UTC haftalık e-posta raporu',
      ]
    : [
        'Core KPI: review count, average rating, conversion, low rating, reply speed',
        'Trend chart: 7-day / 30-day / 90-day / all-time window',
        'Platform breakdown (Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Foursquare, Yandex, Booking, Airbnb)',
        'Location-level comparison with branch filter',
        'AI theme extraction (when admin entitlement is on)',
        'Monday 09:00 UTC weekly email report',
      ];

  const faqs = isTr
    ? [
        {
          q: 'Hangi metrikler her planda çalışır?',
          a: 'Yorum sayısı, ortalama puan, yanıt oranı, dönüşüm, düşük puan hacmi ve yanıt hızı çekirdek KPI akışındadır ve AI yetkisinden bağımsız çalışır. Trend grafiği, platform kırılımı ve konum karşılaştırması da çekirdek katmandadır.',
        },
        {
          q: 'AI tema çıkarımı nasıl çalışır?',
          a: 'Admin entitlement açıkken yorum metinleri gpt-4o-mini ile şikayet ve övgü temalarına kümelenir. Çıkarım analitik filtreleri (range, platform, branch) ile uyumludur ve workspace başına 24 saat cache\'lenir.',
        },
        {
          q: 'Haftalık rapor ne zaman gönderilir?',
          a: 'Pazartesi 09:00 UTC. Aktif restoran sahiplerine bildirim açıksa gider; aynı recipient listesi 10:00 UTC operations e-postasıyla doğrulanır. AI insight sadece entitlement açıksa eklenir.',
        },
        {
          q: 'Konum bazlı karşılaştırma nasıl çalışır?',
          a: 'Çoklu şubesi olan zincirler için panel, her şubeyi ortalama puan + yorum hacmi + dönüşüm oranı yan yana gösterir; trend grafiği şube filtresi ile yeniden hesaplanır.',
        },
        {
          q: 'Veriyi dışa aktarabilir miyim?',
          a: 'Evet. Yorum tablosu CSV olarak dışa aktarılır; KVKK gereği IP alanı 90 gün sonra anonimleştirilir. API erişim için Pro plan + admin token üretimi gerekir.',
        },
      ]
    : [
        {
          q: 'Which metrics work on every plan?',
          a: 'Review count, average rating, reply rate, conversion, low-rating volume and reply speed are core KPIs and run independently of AI. Trend chart, platform breakdown and location comparison are also in the core layer.',
        },
        {
          q: 'How does AI theme extraction work?',
          a: 'When the admin entitlement is on, review text is clustered with gpt-4o-mini into complaint and praise themes. Extraction respects the analytics filters (range, platform, branch) and is cached per workspace for 24 hours.',
        },
        {
          q: 'When does the weekly report go out?',
          a: 'Mondays at 09:00 UTC. It is sent to active owners with notifications enabled; the same recipient list is double-checked by a 10:00 UTC ops email. AI insight is added only when the entitlement is on.',
        },
        {
          q: 'How does location comparison work?',
          a: 'For chains with multiple branches the panel shows each branch side-by-side with average rating + review volume + conversion. The trend chart recomputes when the branch filter is applied.',
        },
        {
          q: 'Can I export the data?',
          a: 'Yes. The review table can be exported as CSV; per KVKK requirements the IP field is anonymized after 90 days. API access requires the Pro plan and an admin-generated token.',
        },
      ];

  // Schemas: Service + Breadcrumb + FAQPage. CLAUDE.md §35.6 schema matrix.
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: isTr ? 'Buaze Analitik & Raporlar' : 'Buaze Analytics & Reports',
    serviceType: isTr ? 'Müşteri yorum analitiği' : 'Customer review analytics',
    provider: { '@type': 'Organization', name: 'Buaze', url: 'https://buaze.com' },
    areaServed: 'TR',
    availableLanguage: ['tr-TR', 'en-US'],
    url: canonicalUrl,
    description: isTr
      ? 'Yorum hacmi, ortalama puan, dönüşüm, platform kırılımı ve konum karşılaştırmasını canlı izlemek için Buaze analitik modülü. Haftalık e-posta raporu ve isteğe bağlı AI tema çıkarımı içerir.'
      : 'Buaze analytics module to monitor review volume, average rating, conversion, platform breakdown and location comparison live. Includes a weekly email report and optional AI theme extraction.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: isTr ? 'TRY' : 'USD',
      description: isTr ? '14 gün ücretsiz deneme; kart gerektirmez.' : '14-day free trial; no card required.',
      url: `${base}/auth/register`,
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: isTr ? 'Analitik & Raporlar yetenekleri' : 'Analytics & Reports capabilities',
      itemListElement: featureList.map((feature, idx) => ({
        '@type': 'Offer',
        position: idx + 1,
        itemOffered: { '@type': 'Service', name: feature },
      })),
    },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isTr ? 'Ana Sayfa' : 'Home', item: `https://buaze.com/${locale}` },
      { '@type': 'ListItem', position: 2, name: isTr ? 'Özellikler' : 'Features', item: `https://buaze.com/${locale}/features` },
      { '@type': 'ListItem', position: 3, name: isTr ? 'Analitik & Raporlar' : 'Analytics & Reports', item: canonicalUrl },
    ],
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const howToSchema = buildHowToSchema({
    locale,
    name: isTr ? 'Buaze panelinde yorum analitiğini okuma' : 'Read review analytics in the Buaze panel',
    description: isTr
      ? 'Çekirdek KPI’ları, platform kırılımını, AI tema çıkarımını ve haftalık raporu okuma akışı.'
      : 'How to read core KPIs, platform breakdown, AI theme extraction and the weekly digest.',
    url: canonicalUrl,
    steps: isTr
      ? [
          { name: 'Veri topla', text: 'QR ile gelen yorumlar + bağlı platformların API senkronu Buaze veri katmanına akar.' },
          { name: 'KPI’ları ölç', text: 'Ortalama puan, yorum hacmi, yanıt süresi medyanı, NPS ve dönüşüm canlı KPI tile’larında görünür.' },
          { name: 'Platform ve konuma göre karşılaştır', text: 'Platform kırılımı bar chart’ında her platformun yüzde payını okur, çok şubeli işletmelerde konum filtresiyle yan yana karşılaştırırsın.' },
          { name: 'Haftalık özetle raporla', text: 'Pazartesi sabahı gönderilen e-posta, geçen haftanın KPI delta’ları + AI temalarını + öneriyi (TREND/WIN/RISK) tek mesajda toplar.' },
        ]
      : [
          { name: 'Collect the data', text: 'Reviews from your QR flow plus the connected-platform API sync land in the Buaze data layer.' },
          { name: 'Measure the KPIs', text: 'Average rating, review volume, median reply time, NPS and conversion show on live KPI tiles.' },
          { name: 'Compare by platform and location', text: 'Read each platform\'s share on the breakdown bar chart; multi-location businesses compare branches side-by-side with the location filter.' },
          { name: 'Report with the weekly digest', text: 'The Monday-AM email combines last week\'s KPI deltas, AI themes and a single recommendation (TREND/WIN/RISK).' },
        ],
  });

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faqSchema) }} />
      {howToSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(howToSchema) }} />
      )}
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

        {/* ─── HERO — dark, 1:1 with FeatureAIPage paradigm ─── */}
        <section className="relative overflow-hidden bg-[#0A0A0A] px-5 sm:px-10 py-20 sm:py-24 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 -right-40 h-[620px] w-[620px] rounded-full bg-[#C6F24E]/10 blur-[140px]"
          />
          <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#C6F24E]/30 bg-[#C6F24E]/10 px-3 py-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C6F24E] pulse-heartbeat" />
                <span className="pulse-eyebrow text-[#C6F24E]">
                  {isTr ? 'ANALİTİK & RAPORLAR · CANLI' : 'ANALYTICS & REPORTS · LIVE'}
                </span>
              </div>
              <h1 className="mt-5 text-[38px] font-medium leading-[0.98] tracking-[-0.035em] text-white sm:text-[60px] md:text-[48px] lg:text-[72px]">
                {isTr ? (
                  <>
                    Müşteri memnuniyetinin nabzını{' '}
                    <span className="inline-block -skew-y-1 rounded-lg bg-[#C6F24E] px-3 py-0.5 text-[#0A0A0A]">
                      canlı izle
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Watch customer sentiment{' '}
                    <span className="inline-block -skew-y-1 rounded-lg bg-[#C6F24E] px-3 py-0.5 text-[#0A0A0A]">
                      pulse live
                    </span>
                    .
                  </>
                )}
              </h1>
              <p className="mt-6 max-w-[560px] text-[17px] leading-[1.6] text-white/70 sm:text-[18px]">
                {isTr
                  ? 'Buaze analitikleri yorum hacmini, puan trendini, platform kırılımını, konum karşılaştırmasını ve yanıt hızını aynı yüzeyde gösterir. Pulse AI tema çıkarımı entitlement açıkken çalışır; çekirdek metrikler her zaman canlı.'
                  : 'Buaze analytics shows review volume, rating trends, platform breakdowns, location comparison and reply speed in one surface. Pulse AI theme extraction runs when the entitlement is on; core metrics stay live always.'}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`${base}/auth/register`}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#C6F24E] px-6 py-3 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E]"
                >
                  {isTr ? 'Ücretsiz başla' : 'Start free'}
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href={`${base}/features/review-management`}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-6 py-3 text-[15px] font-medium text-white transition-colors hover:border-white/60 hover:bg-white/5"
                >
                  {isTr ? 'Yorum yönetimini gör' : 'See review management'}
                </Link>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/60">
                {(isTr
                  ? ['7g · 30g · 90g · tüm zaman', 'TR + EN raporlama', 'Pazartesi haftalık özet']
                  : ['7d · 30d · 90d · all-time', 'TR + EN reporting', 'Monday weekly digest']
                ).map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <span className="inline-block h-1 w-1 rounded-full bg-[#C6F24E]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Live analytics mockup — KPI grid + AreaChart + platform split */}
            <div className="relative">
              <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.18)] sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="pulse-eyebrow text-[#737373]">
                    {isTr ? 'CANLI RAPOR · 7 GÜN' : 'LIVE REPORT · 7 DAYS'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-2.5 py-1 text-[11px] font-semibold text-[#C6F24E]">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C6F24E] pulse-heartbeat" />
                    {isTr ? 'CANLI' : 'LIVE'}
                  </span>
                </div>

                {/* KPI tiles */}
                <div className="mt-4 grid grid-cols-3 gap-2.5">
                  {tiles.map((tile) => (
                    <div key={tile.label} className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3">
                      <p className="pulse-eyebrow text-[#737373]">{tile.label}</p>
                      <p
                        className="mt-2 text-[22px] font-medium leading-none tracking-tight text-[#0A0A0A]"
                        style={{ fontFamily: 'var(--font-space-grotesk)' }}
                      >
                        {tile.value}
                      </p>
                      <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A34A]">
                        <TrendingUp size={10} strokeWidth={2.4} />
                        {tile.delta}
                      </p>
                    </div>
                  ))}
                </div>

                {/* AreaChart — static SVG, brand-tinted */}
                <div className="mt-4 rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3">
                  <p className="pulse-eyebrow text-[#737373]">{isTr ? 'YORUM HACMİ' : 'REVIEW VOLUME'}</p>
                  <svg viewBox="0 0 420 130" className="mt-2 w-full" aria-hidden>
                    <defs>
                      <linearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C6F24E" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#C6F24E" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[35, 70, 105].map((y) => (
                      <line key={y} x1="0" y1={y} x2="420" y2={y} stroke="#EDEDED" />
                    ))}
                    <path
                      d="M0 100 L52 92 L104 78 L156 64 L208 70 L260 50 L312 56 L364 32 L420 24 L420 130 L0 130 Z"
                      fill="url(#analyticsArea)"
                    />
                    <path
                      d="M0 100 L52 92 L104 78 L156 64 L208 70 L260 50 L312 56 L364 32 L420 24"
                      fill="none"
                      stroke="#0A0A0A"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <circle cx="420" cy="24" r="6" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="3" />
                  </svg>
                </div>

                {/* Platform split bars */}
                <div className="mt-3 rounded-xl border border-[#EDEDED] bg-white p-3">
                  <div className="flex items-center justify-between">
                    <p className="pulse-eyebrow text-[#737373]">{isTr ? 'PLATFORM KIRILIMI' : 'PLATFORM SPLIT'}</p>
                    <span className="pulse-eyebrow text-[#A8D62E]">SON 7G</span>
                  </div>
                  <div className="mt-2.5 grid gap-1.5">
                    {splits.map((s) => (
                      <div key={s.name} className="flex items-center gap-2.5 text-[12px]">
                        <span className="w-[88px] shrink-0 truncate font-medium text-[#0A0A0A]">{s.name}</span>
                        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[#EDEDED]">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full"
                            style={{ width: `${s.share}%`, background: s.fg }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right font-semibold text-[#0A0A0A]">%{s.share}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <span className="absolute -top-3 -right-3 inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-3 py-1 text-[11px] font-semibold text-[#0A0A0A]">
                <Sparkles size={11} strokeWidth={2.4} />
                {isTr ? 'AI tema' : 'AI themes'}
              </span>
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS — 4 cards ─── */}
        <section className="border-y border-[#EDEDED] bg-[#FAFAFA] px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="mx-auto max-w-[1200px]">
            <div className="max-w-[640px]">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'RAPORLAMA KATMANI' : 'REPORTING LAYER'}
              </span>
              <h2 className="mt-3 text-[26px] font-medium leading-[1.04] tracking-[-0.03em] text-[#0A0A0A] sm:text-[42px]">
                {isTr ? 'AI kapalıyken bile karar aldıran metrikler.' : 'Decision-grade metrics, even when AI is off.'}
              </h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map(({ icon: Icon, title, body }, i) => (
                <article key={title} className="rounded-2xl border border-[#EDEDED] bg-white p-6">
                  <div className="flex items-center gap-3">
                    <span className="pulse-eyebrow inline-block rounded bg-[#0A0A0A] px-2 py-1 text-[#C6F24E]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF9B8] text-[#0A0A0A]">
                      <Icon size={17} strokeWidth={2.2} />
                    </span>
                  </div>
                  <h3 className="mt-4 text-[18px] font-semibold leading-tight">{title}</h3>
                  <p className="mt-2 text-[13px] leading-[1.65] text-[#525252]">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Conversational definitional H2 (AEO sweep, CLAUDE.md §35) ─── */}
        <section className="px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="mx-auto max-w-[820px]">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'METRİK SEÇİMİ' : 'PICK YOUR METRICS'}
            </span>
            <h2 className="mt-3 text-[26px] sm:text-[36px] font-medium leading-[1.1] tracking-[-0.03em] text-[#0A0A0A]">
              {isTr ? 'Hangi metrikleri ölçmeliyim?' : 'Which metrics should I track?'}
            </h2>
            <p className="mt-5 text-[15px] sm:text-[16px] leading-[1.65] text-[#525252]">
              {isTr
                ? 'Buaze analitik paneli kararı kolaylaştıran beş çekirdek KPI etrafında kurulmuştur. Her biri günlük operasyonda anlamlı bir karara dönüşür:'
                : 'The Buaze analytics panel is built around five core KPIs that translate directly into daily operational decisions:'}
            </p>
            <ul className="mt-5 space-y-3 text-[15px] sm:text-[16px] leading-[1.65] text-[#525252]">
              <li className="flex gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#C6F24E]" aria-hidden />
                <span>
                  <strong className="text-[#0A0A0A]">
                    {isTr ? 'Ortalama puan' : 'Average rating'}
                  </strong>{' '}
                  —{' '}
                  {isTr
                    ? 'Marka algısının ana göstergesi; Google arama sıralamasını doğrudan etkiler.'
                    : 'The main signal of brand perception; directly affects Google search ranking.'}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#C6F24E]" aria-hidden />
                <span>
                  <strong className="text-[#0A0A0A]">
                    {isTr ? 'Yorum hacmi' : 'Review volume'}
                  </strong>{' '}
                  —{' '}
                  {isTr
                    ? 'QR akışının verimliliğini gösterir; düşüş varsa QR yerleşimini gözden geçir.'
                    : 'Shows the efficiency of your QR flow; a drop signals to revisit QR placement.'}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#C6F24E]" aria-hidden />
                <span>
                  <strong className="text-[#0A0A0A]">
                    {isTr ? 'Yanıt süresi medyanı' : 'Median reply time'}
                  </strong>{' '}
                  —{' '}
                  {isTr
                    ? 'Düşük puanlara ekibin ne kadar hızlı dokunduğunu gösterir; 8 saatten uzun süren yanıtlar uyarı tetikler.'
                    : 'How fast your team reaches a low rating; replies longer than 8 hours trigger an alert.'}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#C6F24E]" aria-hidden />
                <span>
                  <strong className="text-[#0A0A0A]">
                    {isTr ? 'Platform dönüşümü' : 'Platform conversion'}
                  </strong>{' '}
                  —{' '}
                  {isTr
                    ? 'Hangi platforma kaç müşteri yönlendi; sektörel kazançların görünür hattı.'
                    : 'How many customers were routed to each platform; the visible line of sector-level wins.'}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#C6F24E]" aria-hidden />
                <span>
                  <strong className="text-[#0A0A0A]">
                    {isTr ? 'Konum & şube karşılaştırması' : 'Location & branch comparison'}
                  </strong>{' '}
                  —{' '}
                  {isTr
                    ? 'Çoklu işletmelerde hangi şubenin öne çıktığını veya geride kaldığını yan yana göster.'
                    : 'For multi-location businesses, see which branch leads or trails — side by side.'}
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* ─── SPEC ROW — 3 verifiable stats ─── */}
        <section className="px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                l: isTr ? 'ÇEKİRDEK METRİK' : 'CORE METRICS',
                v: '12+',
                sub: isTr
                  ? 'Yorum sayısı, puan, dönüşüm, yanıt hızı, düşük puan, platform kırılımı ve daha fazlası'
                  : 'Review count, rating, conversion, reply speed, low rating, platform split and more',
              },
              {
                l: isTr ? 'PENCERE SEÇENEĞİ' : 'WINDOWS',
                v: '4',
                sub: isTr
                  ? '7 gün · 30 gün · 90 gün · tüm zaman; trend ve karşılaştırma her seçimde tutarlı'
                  : '7d · 30d · 90d · all-time; trend and comparison stay consistent across selections',
              },
              {
                l: isTr ? 'HAFTALIK ÖZET' : 'WEEKLY DIGEST',
                v: 'Pzt 09:00',
                sub: isTr
                  ? 'UTC; AI insight entitlement açıksa eklenir, ops doğrulaması Pzt 10:00 UTC'
                  : 'UTC; AI insight added when entitlement is on, ops cross-check at Mon 10:00 UTC',
              },
            ].map((k) => (
              <div key={k.l} className="rounded-2xl border border-[#EDEDED] bg-white p-6">
                <p className="pulse-eyebrow text-[#737373]">{k.l}</p>
                <p
                  className="mt-2 text-[28px] font-medium leading-none tracking-tight text-[#0A0A0A] sm:text-[36px]"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  {k.v}
                </p>
                <p className="mt-2 text-[12px] leading-[1.55] text-[#525252]">{k.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── FAQ — visible accordion + FAQPage JSON-LD shares the same source ─── */}
        <section className="border-t border-[#EDEDED] px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="mx-auto max-w-[860px]">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'SIK SORULANLAR' : 'FREQUENTLY ASKED'}
            </span>
            <h2 className="mt-3 text-[26px] font-medium leading-[1.04] tracking-[-0.03em] sm:text-[40px]">
              {isTr ? 'Analitik ve raporlar hakkında her şey.' : 'Everything about analytics & reports.'}
            </h2>
            <div className="mt-8 divide-y divide-[#EDEDED] border-y border-[#EDEDED]">
              {faqs.map((f, idx) => (
                <details key={f.q} className="group py-5" open={idx < 2}>
                  <summary className="flex cursor-pointer items-start justify-between gap-4 text-left text-[16px] font-semibold leading-[1.4] text-[#0A0A0A] [&::-webkit-details-marker]:hidden">
                    <span>{f.q}</span>
                    <ChevronDown
                      size={18}
                      className="mt-0.5 shrink-0 text-[#737373] transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="mt-3 text-[14px] leading-[1.7] text-[#525252]">{f.a}</p>
                </details>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-[13px] text-[#525252]">
              <span>{isTr ? 'Daha fazla:' : 'More:'}</span>
              <Link href={`${base}/features/pulse-ai`} className="rounded-full border border-[#EDEDED] px-3 py-1 hover:border-[#0A0A0A]">
                {isTr ? 'Pulse AI' : 'Pulse AI'}
              </Link>
              <Link href={`${base}/features/review-management`} className="rounded-full border border-[#EDEDED] px-3 py-1 hover:border-[#0A0A0A]">
                {isTr ? 'Yorum yönetimi' : 'Review management'}
              </Link>
              <Link href={`${base}/integrations`} className="rounded-full border border-[#EDEDED] px-3 py-1 hover:border-[#0A0A0A]">
                {isTr ? 'Entegrasyonlar' : 'Integrations'}
              </Link>
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="bg-[#C6F24E] px-5 py-[60px] text-center sm:px-10 sm:py-24">
          <div className="mx-auto max-w-[860px]">
            <LineChart className="mx-auto mb-5 text-[#0A0A0A]" size={34} strokeWidth={2.2} />
            <h2 className="text-[28px] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[48px]">
              {isTr ? 'Raporu aç, aksiyonu aynı gün al.' : 'Open the report, act the same day.'}
            </h2>
            <p className="mt-4 text-[15px] text-[#1A1A1A] sm:text-[17px]">
              {isTr ? '14 gün ücretsiz. Kredi kartı gerekmez.' : '14 days free. No credit card required.'}
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-7 py-3.5 text-[15px] font-semibold text-white hover:bg-[#1A1A1A]"
              >
                {isTr ? 'Hemen başla' : 'Get started'}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`${base}/pricing`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0A0A0A] bg-transparent px-7 py-3.5 text-[15px] font-semibold text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white"
              >
                {isTr ? 'Plan detayları' : 'Plan details'}
              </Link>
            </div>
          </div>
        </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
