import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
// `next/dynamic` aliased to `nextDynamic` so the import name doesn't collide
// with a Next.js route segment config export named `dynamic`. The page ships
// via ISR (`revalidate=3600` inherited from [locale]/layout.tsx, SEO §35.11);
// it no longer force-dynamic renders.
import nextDynamic from 'next/dynamic';
import { jsonLdString } from '@/lib/seo/json-ld';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import Link from 'next/link';
import { IllusShield } from '@/components/marketing/PulseIllustrations';
import PlatformLogo, { GLOBAL_REVIEW, GLOBAL_DELIVERY } from '@/components/marketing/PlatformLogo';
import { ArrowUpRight, BarChart3, ClipboardCheck, ClipboardList, Inbox, QrCode, Sparkles, Star } from 'lucide-react';
// Stage 41 §38.122 — HANDOFF §8 step 8 (Heroes A): 3 variant + ENV flag.
// `HeroVariantPicker` is a Client Component that reads
// `process.env.NEXT_PUBLIC_HERO_VARIANT` (build-time inlined) and dynamically
// imports one of HeroCinematic / HeroStarClimb / HeroParallax with
// `ssr: false`. Default 'cinematic'. Skeleton fallback during chunk load.
// Mevcut `HomeHero` component'i intact bırakıldı (rollback path: bu import
// satırını `HomeHero` ile değiştir + line 376'da `<HeroVariantPicker>` →
// `<HomeHero>`).
import HeroVariantPicker from '@/components/marketing/heroes/HeroVariantPicker';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { notFound } from 'next/navigation';

// Below-the-fold client components — chunk-split with next/dynamic (ssr:true
// default). HTML SSR korunur (SEO intact); JS bundle ayrı chunk'a düşer ve
// hydration ana iş parçacığını blocklamaz → mobile FCP/LCP iyileşmesi.
// Vercel Speed Insights P75 mobile homepage 4.2s LCP idi (CLAUDE.md §31).
const HomeIndustryTabs = nextDynamic(() => import('@/components/marketing/HomeIndustryTabs'));
// Stage 67 §38.148 — LiveReviewTicker (fake müşteri testimonial,
// CLAUDE.md §35.10 ihlali) → LiveTicker (generic platform event
// default §38.131 paterni paralel). Mevcut counterparts §38.146 + §38.147
// PR0 base + PR1-5 migrate disipline.
const LiveTicker = nextDynamic(() => import('@/components/animations/LiveTicker'));
// Stage 70 §38.150 — site-library.jsx animation component'leri anasayfa
// surface'ine entegre edildi. Pulse §11 + CLAUDE.md §35.8 verifiable claims
// + §35.10 generic events disipline intact. PulseLine + RevealHeadline +
// FeatureCard server component (no dynamic import); diğerleri client +
// dynamic chunk lazy load.
const ToastRow = nextDynamic(() => import('@/components/animations/ToastRow'));
const Marquee = nextDynamic(() => import('@/components/animations/Marquee'));
const SweepCTA = nextDynamic(() => import('@/components/animations/SweepCTA'));
const SentimentDial = nextDynamic(() => import('@/components/animations/SentimentDial'));
const SectionDivider = nextDynamic(() => import('@/components/animations/SectionDivider'));
import PulseLine from '@/components/animations/PulseLine';
import RevealHeadline from '@/components/animations/RevealHeadline';
import FeatureCard from '@/components/animations/FeatureCard';
const StickyCtaBar = nextDynamic(() => import('@/components/marketing/StickyCtaBar'));
// Stage 86 §38.166 — SocialProofToast kaldırıldı (kullanıcı talebi:
// "sol altta firma yorum yaptı şimdi gibi şeyler çıkıyor onu kaldırabilir
// miyiz"). 5 hardcoded fake müşteri ismi ("Kadıköy Bistro / Hotel Nora /
// Derma+ Klinik / Ark Kahve / Ren Spa") + fake activity claim'leri ("az
// önce 14 günlük denemeye başladı / 284 yorum topladı / Google 4.9'a
// yükseltti") CLAUDE.md §35.10 fake testimonial paterni ihlali idi (Buaze
// gerçek müşteri 10-50 §19.4.4). Compliance disipline win — kullanıcı
// explicit removal request. Component dosyası §34 paterni gereği silindi
// (0 callsite kaldı). Future scope: real backend feed (örn. /api/feedback
// workspace aggregate) generic system event source attribution ile
// implement edilebilir (LiveTicker §38.165 + FooterLiveTicker §38.131
// paterni paralel).

const VALID_LOCALES = ['tr', 'en'] as const;

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslations(locale);
  const title = locale === 'tr'
    ? 'QR Kod ile Google Yorum Toplama ve Yorum Yönetimi'
    : 'QR Code Google Review Collection & Review Management';
  const description = locale === 'tr'
    ? 'QR kodla müşteri geri bildirimi toplayın, Google ve diğer platformlardaki yorumları tek panelden yönetin, Pulse AI ile hızlı yanıt verin. 14 gün ücretsiz.'
    : 'Collect customer feedback with a QR code, manage Google and other platform reviews in one panel and reply faster with Pulse AI. 14-day free trial.';
  const ogImage = locale === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png';

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        tr: '/tr',
        en: '/en',
        'x-default': '/tr',
      },
    },
    openGraph: {
      type: 'website',
      url: `https://www.buaze.com/${locale}`,
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      siteName: 'Buaze',
      title,
      description,
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

  // AEO answer-style Q&A — 5 quotable answers AI search engines
  // (Perplexity, Bing Chat, Gemini AIO, Google AIO) and rich result
  // crawlers can lift verbatim. Same source feeds JSON-LD FAQPage and
  // visible accordion (Stage 53 §38.134 HANDOFF FAQSection birebir).
  // Compliance disipline: Q2 Google review-gating answer mirrors
  // CLAUDE.md §19.1.1 (no incentives + no star-branching). Q5 yıllık
  // %20 indirim claim → CLAUDE.md §15.2 priceYearly admin override
  // pattern (discountedYearly = monthly × 0.8 ≈ 20% off).
  const aeoFaqs = isTr
    ? [
        {
          q: 'Buaze nedir, nasıl çalışır?',
          a: "Buaze, işletmelerin QR kodla müşteri geri bildirimi toplamasını ve online yorumlarını tek panelden yönetmesini sağlayan bir yazılımdır. Müşteri masadaki, fişteki veya paketteki QR kodu okutup puan verir; her müşteriye seçtiğiniz platformun (Google, Tripadvisor, Yemeksepeti vb.) herkese açık yorum bağlantısı gösterilir. Dilerse ekibinize özel geri bildirim de bırakır; bu geri bildirim panelinize düşer ve Pulse AI bir yanıt taslağı hazırlar.",
          meta: ['QR ile geri bildirim', 'Tek panel', 'Müşteri tercihi'],
        },
        {
          q: "QR ile yorum toplamak Google'ın kurallarına uygun mu?",
          a: 'Evet. Buaze yorumları filtrelemez, gizlemez veya engellemez; puanı ne olursa olsun her müşteriye Google\'ın resmi yorum bağlantısı gösterilir. Google, yorumları puana göre ayıklamayı ("review gating") ve yorum karşılığı teşvik vermeyi yasaklar; Buaze ikisini de yapmaz. Her müşteri istediği yere yorum yazma hakkını korur.',
          meta: ['Filtreleme yok', 'Teşvik yok', 'KVKK uyumlu'],
        },
        {
          q: 'Kurulum nasıl yapılır?',
          a: 'Hesabınızı açın, işletmenizi ekleyin ve Google işletme profilinizi arayıp seçin; Buaze resmi Google yorum bağlantınızı otomatik oluşturur. Diğer platformların yorum bağlantılarını ekleyin, QR kodlarınızı PNG veya PDF olarak indirip masaya, fişe ya da pakete yerleştirin. Teknik bilgi gerekmez.',
          meta: ['Teknik bilgi gerekmez', 'PNG · PDF QR', 'Google bağlantısı'],
        },
        {
          q: 'Pulse AI yanıtları kendiliğinden gönderir mi?',
          a: 'Hayır. Pulse AI yalnızca yanıt taslağı hazırlar; taslağı okuyup düzenler ve gönderip göndermeyeceğinize siz karar verirsiniz. Yanıt tonunu sıcak, resmi veya özür dileyen olarak seçebilir, Türkçe ya da İngilizce taslak alabilirsiniz.',
          meta: ['3 ton', 'İnsan onayı', 'TR · EN'],
        },
        {
          q: 'Buaze ücretli mi, deneme süresi var mı?',
          a: '14 gün ücretsiz deneyebilirsiniz; deneme için kredi kartı istenmez. Sonrasında aylık veya yıllık plan seçersiniz, yıllık ödeme yaklaşık %20 daha uygundur. İstediğiniz zaman iptal edebilir, geri bildirimlerinizi CSV olarak indirebilirsiniz.',
          meta: ['14 gün deneme', 'Kart gerekmez', 'Aylık · yıllık'],
        },
      ]
    : [
        {
          q: 'What is Buaze and how does it work?',
          a: 'Buaze is software that lets businesses collect customer feedback with QR codes and manage their online reviews from one panel. A customer scans the QR on the table, receipt or package and leaves a rating; every customer is shown the public review link of the platform you choose (Google, Tripadvisor and others). They can also leave private feedback for your team, which lands in your panel with a Pulse AI reply draft.',
          meta: ['QR feedback', 'One panel', 'Customer choice'],
        },
        {
          q: "Is collecting reviews with a QR code allowed by Google's policies?",
          a: 'Yes. Buaze never filters, hides or blocks reviews; every customer is shown Google\'s official review link whatever rating they give. Google bans sorting reviews by rating ("review gating") and rewarding reviews; Buaze does neither. Every customer keeps the right to post wherever they want.',
          meta: ['No filtering', 'No incentives', 'GDPR ready'],
        },
        {
          q: 'How do I set it up?',
          a: 'Create an account, add your business and search for your Google Business Profile; Buaze builds your official Google review link. Add the review links of other platforms, download your QR codes as PNG or PDF and place them on tables, receipts or packages. No technical skills needed.',
          meta: ['No coding', 'PNG · PDF QR', 'Google link'],
        },
        {
          q: 'Does Pulse AI send replies on its own?',
          a: 'No. Pulse AI only prepares a reply draft; you read it, edit it and decide whether to send it. You can pick a warm, formal or apologetic tone and get drafts in Turkish or English.',
          meta: ['3 tones', 'Human approval', 'TR · EN'],
        },
        {
          q: 'Is there a free trial?',
          a: 'Yes, 14 days free with no credit card. After that you choose a monthly or yearly plan; paying yearly is about 20% cheaper. Cancel anytime and export your feedback as CSV.',
          meta: ['14-day trial', 'No card', 'Monthly · yearly'],
        },
      ];

  // Root layout (`[locale]/layout.tsx`) already emits canonical Organization,
  // WebSite + SearchAction, and SoftwareApplication nodes. Re-declaring them
  // here used to cause duplicate Organization/WebApplication entries (with a
  // stale `/buaze-logo.png` and a TRY/USD pricing conflict against the root
  // SoftwareApplication offers). Keep only homepage-specific schemas: a
  // Service node + the FAQPage feeding the AEO section above. Root nodes
  // carry the rich identity (sameAs, contactPoint, address).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: isTr ? 'QR ile müşteri geri bildirimi ve Google yorum yönetimi' : 'QR customer feedback and Google review management',
        provider: { '@type': 'Organization', name: 'Buaze', url: 'https://www.buaze.com' },
        description: isTr
          ? 'Restoran, otel, klinik ve mağazaların QR kodla müşteri geri bildirimi toplamasını, Google ve diğer platformlardaki yorum bağlantılarını tek panelden yönetmesini ve Pulse AI ile yanıt taslağı hazırlamasını sağlayan yazılım.'
          : 'Software that lets restaurants, hotels, clinics and stores collect customer feedback with QR codes, manage Google and other review platform links from one panel and draft replies with Pulse AI.',
        serviceType: isTr ? 'Online itibar ve yorum yönetimi yazılımı' : 'Online reputation and review management software',
        areaServed: { '@type': 'Country', name: 'Turkey' },
        inLanguage: isTr ? 'tr-TR' : 'en-US',
        url: `https://www.buaze.com/${locale}`,
      },
      {
        '@type': 'FAQPage',
        mainEntity: aeoFaqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };

  // ── Section content (inline locale, keeps translations.ts untouched) ──
  // Stage 79 §38.157 — `industryCategories` const + `MarqueeRow` import
  // Section 2 LOGO STRIP'in (eski Audit §8.4 "fake wordmark" sweep
  // sonucu) silinmesi nedeniyle kaldırıldı. Yeni Section 2 BUILT FOR
  // THESE CHANNELS (Marquee partner platforms + FeatureCard 4-grid)
  // §38.157 ile hero altına taşındı; MarqueeRow industry chip strip
  // duplicate "platforms below hero" UX clutter olarak temizlendi.

  // Three step cards — design `.design/site/site-homepage-v3.jsx:268-282 + 504-535`.
  // Each card carries an inline product-mock visual instead of a decorative illustration.
  const steps = [
    {
      n: 1,
      title: isTr ? 'Topla' : 'Collect',
      body: isTr
        ? 'Müşteri masadaki, fişteki veya paketteki QR kodu tarar ve puan verir. Herkese Google yorum bağlantısı gösterilir; isteyen size özel geri bildirim de bırakır.'
        : 'A customer scans the QR on the table, receipt or package and leaves a rating. Everyone sees your Google review link; anyone can also leave private feedback for you.',
      Icon: QrCode,
      iconBg: '#C6F24E',
      iconFg: '#0A0A0A',
      visual: (
        <div className="flex items-center gap-3 rounded-[14px] border border-[#EDEDED] bg-white px-3.5 py-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF9B8] text-[12px] font-semibold text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            ★
          </span>
          <p className="min-w-0 flex-1 truncate text-[13px] text-[#0A0A0A]">
            <strong className="font-semibold">{isTr ? 'Misafir' : 'Guest'}</strong>{' '}
            <span className="text-[#525252]">
              {isTr ? 'Servis harikaydı!' : 'Service was great!'}
            </span>
          </p>
          <span
            className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-[#0A0A0A] px-2 py-1 text-[#C6F24E]"
            role="img"
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
        ? 'Özel geri bildirimler tek gelen kutusuna düşer: ekipten birine atayın, etiketleyin, Pulse AI taslağıyla yanıtlayın. Google profilinizin puanı ve son yorumları da aynı panelde.'
        : 'Private feedback lands in one inbox: assign it, tag it and reply with a Pulse AI draft. Your Google rating and latest Google reviews sit in the same panel.',
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
            <span className="pulse-eyebrow text-[#C6F24E]">{isTr ? 'TEK GELEN KUTUSU' : 'ONE INBOX'}</span>
          </div>
          <p className="mt-2 text-[12px] leading-snug text-[#A3A3A3]">
            {isTr ? 'Tüm yorumlar tek yerde. Ata, yanıtla, kapat.' : 'All reviews in one place. Assign, reply, close.'}
          </p>
        </div>
      ),
    },
    {
      n: 3,
      title: isTr ? 'Ölç' : 'Measure',
      body: isTr
        ? 'Ortalama puanı, yorum sayısını, platform ve şube dağılımını panelden izleyin; haftalık e-posta özetiyle neyin işe yaradığını görün.'
        : 'Track average rating, review count, platform and branch breakdown in the panel; a weekly e-mail summary shows what works.',
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
          {/* Leader line from peak to the trend pill */}
          <path d="M115 20 L195 11" fill="none" stroke="#0A0A0A" strokeWidth="1" />
          {/* Trend pill — top-right floating badge (illustration, not a result) */}
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
            {isTr ? 'TREND' : 'TREND'}
          </text>
          {/* Peak dot — lime fill, graphite stroke */}
          <circle cx="115" cy="20" r="6" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
        </svg>
      ),
    },
  ];

  const darkFeatures = isTr
    ? [
        { t: 'Etiket ve işaret', d: 'Geri bildirimleri konuya göre etiketleyin.' },
        { t: 'Pulse AI yanıt taslağı', d: 'Sıcak, resmi veya özür dileyen tonda.' },
        { t: 'Ekip ataması', d: 'Her geri bildirim doğru kişiye gider.' },
        { t: 'Düşük puan uyarısı', d: 'Anında e-posta bildirimi.' },
      ]
    : [
        { t: 'Tags and flags', d: 'Group feedback by topic.' },
        { t: 'Pulse AI reply drafts', d: 'In a warm, formal or apologetic tone.' },
        { t: 'Team assignment', d: 'Every piece of feedback reaches the right person.' },
        { t: 'Low-rating alerts', d: 'Instant e-mail notification.' },
      ];

  const policyBlocks = isTr
    ? [
        { n: '01', t: 'Herkese açık bağlantı', d: 'Her misafire herkese açık yorum bağlantısı sunulur; düşük puan verenler ek olarak ekibe özel paylaşım seçeneği görür.' },
        { n: '02', t: 'Filtreleme yok', d: 'Olumsuz yorumlar süzülmez veya engellenmez; isteyen Google\'a yazar, isteyen ek olarak işletmeye özel geri bildirim de bırakır.' },
        { n: '03', t: 'Teşvik yok', d: 'Yorum karşılığı indirim veya hediye verilmez; her geri bildirim panelde olduğu gibi görünür.' },
      ]
    : [
        { n: '01', t: 'Public link always', d: 'Every guest is offered the public review link; those giving a low rating additionally see an option to share privately with the team.' },
        { n: '02', t: 'No filtering', d: 'Negative reviews are never filtered or blocked; private feedback to your team is an optional extra step in the same flow.' },
        { n: '03', t: 'No incentives', d: 'No discounts or gifts in exchange for reviews; every piece of feedback lands in the panel as-is.' },
      ];

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#FFFFFF] text-[#0A0A0A] selection:bg-[#C6F24E]/40 selection:text-[#0A0A0A] lg:pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />

      <MarketingNavbar locale={locale} t={t} />

      {/* a11y: explicit <main> landmark — PageSpeed/Lighthouse flagged
          the document as missing one. Screen-reader users use it to skip
          past nav/header to the actual page content. */}
      <main id="main-content">

      {/* ═══════════════════════════════════════════════════════════
          1. HERO — Stage 41 §38.122 variant picker (Cinematic / StarClimb / Parallax)
      ═══════════════════════════════════════════════════════════ */}
      <HeroVariantPicker locale={locale} />

      {/* ═══════════════════════════════════════════════════════════
          2. BUILT FOR THESE CHANNELS — Stage 79 §38.157
          Stage 70 §38.150'de footer üstüne yerleştirilmişti; kullanıcı
          talebi ile hero altına taşındı (eski LOGO STRIP MarqueeRow
          industry chip strip kaldırıldı — duplicate "platforms below
          hero" UX clutter).
          Marquee (Buaze gerçek partner platform names — Google /
          Yemeksepeti / Getir / Trendyol / Tripadvisor / Yandex / Yelp /
          Foursquare / Booking / Airbnb verifiable §19.4) + FeatureCard
          4-card grid (Buaze gerçek feature isimleri — QR Studio / Pulse
          AI / Cross-Platform / Reviews Inbox).
          Compliance-safe verifiable claims (CLAUDE.md §35.8 + §19.4).
      ═══════════════════════════════════════════════════════════ */}
      <section className="px-5 sm:px-10 pt-[60px] pb-12 sm:pt-24 sm:pb-16 bg-white border-t border-[#EDEDED]">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-[720px] mb-10 sm:mb-14">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Desteklenen yorum platformları' : 'Supported review platforms'}
            </span>
            <h2
              className="mt-3 text-[clamp(26px,5vw,46px)] leading-[1.05] tracking-[-0.035em] font-medium text-[#0A0A0A] text-balance"
            >
              {isTr
                ? 'Google, Yemeksepeti, Tripadvisor ve 7 platform daha tek QR akışında'
                : 'Google, Tripadvisor, Booking.com and 7 more platforms in one QR flow'}
            </h2>
            <p className="mt-4 text-[15px] sm:text-[17px] leading-[1.6] text-[#525252] text-pretty">
              {isTr
                ? 'Buaze, müşterilerinizin yorum yazdığı platformların bağlantılarını tek yerde tutar. QR kodu okutan müşteri puan verir ve seçtiğiniz platformun resmi yorum sayfasına tek dokunuşla ulaşır.'
                : 'Buaze keeps the review links of the platforms your customers use in one place. A customer who scans the QR code gives a rating and reaches the official review page of the platform you chose in one tap.'}
            </p>
          </div>

          {/* Marquee — Buaze gerçek partner platform names.
              Stage 85 §38.165: locale-aware items (CLAUDE.md §19.4 PROVIDER_DOMAINS
              taxonomy + §35.8 verifiable claims).
              - TR: Türkiye pazarı odaklı (Yemeksepeti/Getir/Trendyol GO front;
                yurt içi yemek-delivery + global review platforms).
              - EN: Uluslararası odak (Google/Tripadvisor/Yelp/Foursquare/Booking/
                Airbnb global review + hospitality; TR-only delivery YOK). */}
          <div className="bg-[#FAFAFA] border-y border-[#EDEDED] -mx-5 sm:-mx-10 mb-10 sm:mb-14">
            <Marquee
              items={
                isTr
                  ? [
                      'Yemeksepeti',
                      'Getir',
                      'Trendyol',
                      'Google',
                      'Tripadvisor',
                      'Yandex',
                      'Yelp',
                      'Foursquare',
                      'Booking',
                      'Airbnb',
                    ]
                  : [
                      'Google',
                      'Tripadvisor',
                      'Yelp',
                      'Foursquare',
                      'Booking',
                      'Airbnb',
                      'Yandex',
                    ]
              }
              durationSec={28}
            />
          </div>

          {/* FeatureCard 4-grid — Buaze gerçek feature names.
              Stage 90 §38.170: 4 kart linksiz idi (kullanıcı raporu),
              gerçek route'lara wire edildi (CLAUDE.md §38.170 paterni). */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <FeatureCard
              href={`${base}/solutions/qr-generator`}
              ariaLabel={isTr ? 'QR Studio sayfasına git' : 'Go to QR Studio page'}
              title={isTr ? 'QR Studio' : 'QR Studio'}
              body={
                isTr
                  ? 'Masa, fiş, kapı ve paket için markanıza özel QR şablonları; PNG, PDF veya SVG indirin.'
                  : 'Branded QR templates for tables, receipts, doors and packaging; download PNG, PDF or SVG.'
              }
              icon={<QrCode size={16} strokeWidth={2.25} />}
            />
            <FeatureCard
              href={`${base}/features/pulse-ai`}
              ariaLabel={isTr ? 'Pulse AI özelliklerine git' : 'Go to Pulse AI features'}
              title={isTr ? 'Pulse AI' : 'Pulse AI'}
              body={
                isTr
                  ? 'Her geri bildirime tonuna uygun yanıt taslağı; siz onaylamadan hiçbir şey gönderilmez.'
                  : 'A reply draft in the right tone for every piece of feedback; nothing is sent until you approve.'
              }
              icon={<Sparkles size={16} strokeWidth={2.25} />}
            />
            <FeatureCard
              href={`${base}/features/review-management`}
              ariaLabel={isTr ? 'Yorum Akışı özelliklerine git' : 'Go to Reviews Inbox features'}
              title={isTr ? 'Yorum Akışı' : 'Reviews Inbox'}
              body={
                isTr
                  ? 'Müşteri geri bildirimleri tek gelen kutusunda; atayın, etiketleyin, e-postayla yanıtlayın.'
                  : 'All customer feedback in one inbox; assign, tag and reply by e-mail.'
              }
              icon={<Inbox size={16} strokeWidth={2.25} />}
            />
            <FeatureCard
              href={`${base}/features/analytics-reports`}
              ariaLabel={isTr ? 'Analitik özelliklerine git' : 'Go to Analytics features'}
              title={isTr ? 'Analitik' : 'Analytics'}
              body={
                isTr
                  ? 'Ortalama puan, trend, platform ve şube kırılımı; haftalık e-posta özeti.'
                  : 'Average rating, trends, platform and branch breakdown; a weekly e-mail summary.'
              }
              icon={<BarChart3 size={16} strokeWidth={2.25} />}
            />
          </div>
        </div>
      </section>

      {/* Stage 70 §38.150 — PulseLine decorative section divider
          (Pulse §11 ECG nabız motif). Pure decorative SVG — caller'a yük
          eklemez (CSS @keyframes brand-draw + animateMotion). Reduced
          motion globals.css universal `*` reset blanket'i altında
          duraklar. */}
      <div className="flex items-center justify-center bg-[#FAFAFA] py-3" aria-hidden="true">
        <PulseLine width={180} />
      </div>

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
              {isTr ? 'QR kod ile yorum toplama 3 adımda' : 'Collect reviews with a QR code in 3 steps'}
            </h2>
          </div>

          {/* design `.design/site/site-homepage-v3.jsx:268-282` — fixed 3-col grid;
              each card has a watermarked step number, lucide icon tile, STEP chip,
              h3, body, and an inline product mock at the bottom. */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
          3.5 REPUTATION OS SUITE — operational depth (Stage 134 §38.214)
          Owner panel /dashboard/{audits,surveys} + Pulse AI marketing
          parity. 3-card grid · Pulse §11 lime accent · 3-step "geri
          bildirim toplama" sonrası "operasyona dökme" narrative'i.
          Anchor href'leri /features/{audit-center,surveys,pulse-ai}
          detay sayfalarına gider.
      ═══════════════════════════════════════════════════════════ */}
      <section className="border-y border-[#EDEDED] bg-[#FAFAFA] px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-[760px]">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'YORUMDAN OPERASYONA' : 'FROM REVIEWS TO OPERATIONS'}
            </span>
            <h2 className="mt-4 text-[28px] sm:text-[44px] lg:text-[52px] font-medium leading-[1.04] tracking-[-0.035em] text-[#0A0A0A] text-balance">
              {isTr ? (
                <>
                  Geri bildirimden{' '}
                  <span className="inline-block bg-[#C6F24E] rounded-md px-3 -skew-y-1">
                    operasyona
                  </span>
                  .
                </>
              ) : (
                <>
                  From feedback to{' '}
                  <span className="inline-block bg-[#C6F24E] rounded-md px-3 -skew-y-1">
                    operations
                  </span>
                  .
                </>
              )}
            </h2>
            <p className="mt-5 text-[15px] sm:text-[17px] text-[#525252] leading-[1.6] max-w-[640px]">
              {isTr
                ? 'Yorumlar sorunu gösterir; çözmek operasyonun işidir. Buaze aynı panelde denetim listeleri (Denetim Merkezi), kısa müşteri anketleri ve Pulse AI yanıt taslaklarıyla geri bildirim döngüsünü kapatır.'
                : 'Reviews show the problem; fixing it is an operations job. In the same panel Buaze closes the feedback loop with checklists (Audit Center), short customer surveys and Pulse AI reply drafts.'}
            </p>
          </div>

          <div className="mt-10 sm:mt-12 grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
            {[
              {
                eyebrow: isTr ? 'DENETİM MERKEZİ' : 'AUDIT CENTER',
                title: isTr ? 'Operasyonu ölç, geliştir' : 'Measure operations, improve',
                body: isTr
                  ? 'Hijyen denetimi, vardiya devri, işe alım testi ve KVKK kontrol listeleri. Hazır şablonlar, fotoğraflı sorular ve puanlama; ekip telefondan doldurur.'
                  : 'Hygiene, shift-handover, hiring-test and KVKK checklists. Ready templates, photo questions and scoring; your team fills them in on their phones.',
                icon: ClipboardCheck,
                href: `${base}/features/audit-center`,
              },
              {
                eyebrow: isTr ? 'ANKETLER' : 'SURVEYS',
                title: isTr ? 'NPS, CSAT ve özel sorular' : 'NPS, CSAT and custom questions',
                body: isTr
                  ? 'QR ile açılan kısa anketler: NPS, CSAT, yıldız, çoktan seçmeli ve metin soruları. Anketi tamamlayana isteğe bağlı kupon verebilirsiniz.'
                  : 'Short QR surveys: NPS, CSAT, star, multiple-choice and text questions. You can offer an optional coupon for completing the survey.',
                icon: ClipboardList,
                href: `${base}/features/surveys`,
              },
              {
                eyebrow: isTr ? 'PULSE AI' : 'PULSE AI',
                title: isTr ? 'Her yoruma hızlı yanıt' : 'A fast reply to every review',
                body: isTr
                  ? 'Yorumun tonuna uygun yanıt taslağı saniyeler içinde hazır. Siz okuyup onaylarsınız; hiçbir yanıt sizden habersiz gönderilmez.'
                  : 'A reply draft that matches the review\'s tone, ready in seconds. You read and approve it; nothing is sent without you.',
                icon: Sparkles,
                href: `${base}/features/pulse-ai`,
              },
            ].map((suite) => (
              <Link
                key={suite.eyebrow}
                href={suite.href}
                className="group bz-card relative flex flex-col gap-5 p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-30px_rgba(10,10,10,0.18)]"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF9B8] text-[#0A0A0A]">
                    <suite.icon size={20} strokeWidth={2} />
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#EDEDED] text-[#737373] transition-colors group-hover:border-[#0A0A0A] group-hover:bg-[#0A0A0A] group-hover:text-white">
                    <ArrowUpRight size={14} />
                  </span>
                </div>
                <div>
                  <span className="pulse-eyebrow text-[#A8D62E]">{suite.eyebrow}</span>
                  <h3 className="mt-2 text-[20px] sm:text-[22px] font-medium leading-[1.15] tracking-[-0.02em] text-[#0A0A0A]">
                    {suite.title}
                  </h3>
                  <p className="mt-3 text-[13px] sm:text-[14px] leading-[1.65] text-[#525252]">
                    {suite.body}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          4. DARK FEATURE — live stream mock
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-[#0A0A0A] text-white px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Live stream card — auto-rotating activity ticker. Stage 67
              §38.148 — LiveReviewTicker (fake müşteri "Mert D. ★★★★★"
              hardcoded testimonial) → LiveTicker (generic platform event
              default — Karaköy / Bağdat / Cihangir × generic action,
              §35.10 + §38.131 paterni). Caller `items` prop ile real
              backend feed (örn. /api/feedback workspace aggregate)
              geçirebilir; default 5 generic event compliance-safe. */}
          <LiveTicker locale={locale} />

          {/* Copy + feature grid */}
          <div>
            <span className="pulse-eyebrow text-[#C6F24E]">
              {isTr ? 'Merkezi yönetim' : 'Central control'}
            </span>
            {/* Stage 136 §38.216 — h2 sondaki nokta kaldırıldı (kullanıcı talebi:
                "Her yorum, tek bir panelde. yazan kısmındaki sondaki noktayı
                kaldır + heroda da kaldır"). Chip estetik upgrade: shadow-lime
                glow + relative wrapper + bz-pulse-dot decorative dot lime
                üst-sağ köşede. Mobile responsive (sm:bigger). */}
            <h2 className="mt-4 text-[32px] sm:text-[44px] lg:text-[56px] font-medium leading-[1.02] tracking-[-0.035em] text-white">
              {isTr ? (
                <>
                  Her yorum, tek bir{' '}
                  <span className="relative inline-block">
                    <span
                      aria-hidden
                      className="bz-pulse-dot absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#C6F24E]"
                      style={{ boxShadow: '0 0 0 4px rgba(198,242,78,0.18)' }}
                    />
                    <span
                      className="inline-block -skew-y-1 rounded-lg bg-[#C6F24E] px-3 text-[#0A0A0A]"
                      style={{ boxShadow: '0 10px 30px -10px rgba(198,242,78,0.45)' }}
                    >
                      panelde
                    </span>
                  </span>
                </>
              ) : (
                <>
                  Every review in a single{' '}
                  <span className="relative inline-block">
                    <span
                      aria-hidden
                      className="bz-pulse-dot absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#C6F24E]"
                      style={{ boxShadow: '0 0 0 4px rgba(198,242,78,0.18)' }}
                    />
                    <span
                      className="inline-block -skew-y-1 rounded-lg bg-[#C6F24E] px-3 text-[#0A0A0A]"
                      style={{ boxShadow: '0 10px 30px -10px rgba(198,242,78,0.45)' }}
                    >
                      panel
                    </span>
                  </span>
                </>
              )}
            </h2>
            <p className="mt-5 text-[16px] text-white leading-[1.6] max-w-[480px]">
              {isTr
                ? 'QR ile gelen tüm özel geri bildirimler, Google profilinizin puanı ve son yorumları aynı panelde. Tripadvisor, Yemeksepeti, Getir ve Trendyol GO gibi platformların yorum bağlantılarını da buradan yönetirsiniz.'
                : 'Every piece of private QR feedback, your Google rating and your latest Google reviews in one panel. You also manage the review links of platforms like Tripadvisor, Booking.com and Yelp from here.'}
            </p>

            {/* Platform logos row — review + delivery platforms that Buaze pulls into the inbox */}
            <div className="mt-6">
              <span className="pulse-eyebrow text-[#C6F24E]">
                {isTr ? 'DESTEKLENEN PLATFORMLAR' : 'SUPPORTED PLATFORMS'}
              </span>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {(['google', 'tripadvisor', 'yemeksepeti', 'getir-yemek', 'trendyol-go', 'booking'] as const).map(
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
          4.5 BUAZE AT A GLANCE — verifiable product facts (10 review
          platforms, 14-day trial, TR/EN, KVKK) as server-rendered text, the
          four-step feedback → reply workflow (ToastRow) and a sample tone
          card. The former "cohort" claims (3.6 → 4.4 in 90 days, animated
          "10+ active venues" counter that rendered "0+" in the HTML) were
          removed: no audited data backs them (CLAUDE.md §35.8).
      ═══════════════════════════════════════════════════════════ */}
      {/* Stage 92 §38.172 — Section spacing daralt (kullanıcı raporu "çok
          fazla boşluk"). Stage 85 §38.165 "corporate breathing room"
          paterni geri çekildi; verifiable cohort content + 2-col bordered
          card chrome intact, sadece padding/margin/gap kompaktlaştırıldı. */}
      <section className="px-5 sm:px-10 py-[56px] sm:py-20 lg:py-24 bg-[#FAFAFA] border-y border-[#EDEDED]">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-[760px] mb-10 sm:mb-14">
            <span className="pulse-eyebrow inline-flex items-center gap-2 text-[#737373]">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-[#C6F24E] pulse-heartbeat"
              />
              {isTr ? 'Bir bakışta Buaze' : 'Buaze at a glance'}
            </span>
            <RevealHeadline
              text={
                isTr
                  ? 'Yorum yönetimi için ihtiyacınız olan her şey tek panelde'
                  : 'Everything you need for review management in one panel'
              }
              className="mt-3 text-[clamp(28px,5vw,48px)] leading-[1.05] tracking-[-0.025em]"
            />
            <p
              className="mt-4 text-[15px] sm:text-[16px] leading-[1.55] text-[#525252] max-w-[640px]"
            >
              {isTr
                ? 'Kurulum için teknik bilgi gerekmez. QR kodlarınızı indirip yerleştirdiğiniz andan itibaren gelen her geri bildirim, puan ve yanıt aynı panelde kayıt altında olur.'
                : 'No technical setup is needed. From the moment your QR codes are placed, every piece of feedback, rating and reply is recorded in the same panel.'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            {/* Stage 88 §38.168 — Cohort sol kolon güzelleştirme
                (kullanıcı kararı "Cohort CTA group güzelleştir"):
                - 3 module wrap'lı bordered card chrome (StarClimber +
                  BigCounter split pair + Premium CTA card)
                - Apple-soft shadow tier (CLAUDE.md §38.65 elev-1)
                - Lime accent dot eyebrow indicator (Pulse §11 brand
                  reinforcement)
                - BigCounter pair tek-card 2-col split (gap-px hairline
                  separator + symmetric padding) — eski border-y inline
                  divider yerine premium grid bordered)
                - CTA card relative + lime corner radial gradient
                  decoration (HANDOFF §38.65 + §38.151 §38.123 paterni
                  paralel)
                - Microcopy 3 verifiable trust item lime check icon
                  (verifiable §35.8 visual reinforcement) + flex-wrap
                  responsive (mobile stack OK)
                Stage 92 §38.172 — module space-y-8 → space-y-6 (kompakt). */}
            <div className="space-y-6">
              {/* Verifiable product facts — server-rendered text (the old
                  animated counters rendered "0+" in the HTML crawlers read,
                  and the "3.6 → 4.4 in 90 days" climb was not an audited
                  result). */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[18px] bg-[#EDEDED] shadow-[0_4px_24px_-12px_rgba(10,10,10,0.06)]">
                {(isTr
                  ? [
                      { v: '10', l: 'Yorum platformu' },
                      { v: '14 gün', l: 'Ücretsiz deneme' },
                      { v: 'TR · EN', l: 'Panel ve form dili' },
                      { v: 'KVKK', l: 'Uyumlu onay akışı' },
                    ]
                  : [
                      { v: '10', l: 'Review platforms' },
                      { v: '14 days', l: 'Free trial' },
                      { v: 'TR · EN', l: 'Panel and form languages' },
                      { v: 'GDPR', l: 'Ready consent flow' },
                    ]
                ).map((f) => (
                  <div key={f.l} className="bg-white p-6">
                    <p
                      className="leading-none tracking-[-0.03em] text-[#0A0A0A]"
                      style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(32px, 5vw, 48px)' }}
                    >
                      {f.v}
                    </p>
                    <p
                      className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[#737373]"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {f.l}
                    </p>
                  </div>
                ))}
              </div>

              {/* Stage 88 §38.168 — Cohort CTA premium card upgrade.
                  Önceki Stage 85 §38.165 dual CTA + plain microcopy
                  (kullanıcı raporu "düzgün olmamış") yerine premium
                  bordered card + lime corner accent radial gradient +
                  microcopy lime check icons (verifiable visual reinforcement).

                  Stage 75 §38.155 — SweepCTA polymorphic href intact
                  (Server Component caller'larında inline arrow function
                  YASAK, "Event handlers cannot be passed to Client
                  Component props"). Dual CTA: primary lime sweep
                  + secondary outline anchor. Card chrome:
                  rounded-[18px] + Apple-soft shadow elev-1 + ring-1
                  border + lime corner glow (38.123 footer + 38.151
                  primitive paterni paralel). */}
              <div className="relative overflow-hidden rounded-[18px] bg-white p-6 sm:p-8 shadow-[0_8px_30px_-12px_rgba(10,10,10,0.10)] ring-1 ring-[#EDEDED]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(198,242,78,0.22) 0%, transparent 70%)',
                  }}
                />
                <div className="relative flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <SweepCTA
                      href={`${base}/auth/register`}
                      ariaLabel={isTr ? 'Ücretsiz başla' : 'Start free'}
                    >
                      {isTr ? 'Ücretsiz başla' : 'Start free'}
                    </SweepCTA>
                    {/* Stage 90 §38.170: secondary CTA ghost-style görsel
                        ayrım (SweepCTA primary white+border+lime hover;
                        secondary inline-link black text + underline-on-hover).
                        Pulse §11 disipline — primary visual weight intact. */}
                    <a
                      href={`${base}/pricing`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full px-6 py-3.5 text-sm font-semibold text-[#0A0A0A] underline decoration-transparent decoration-1 underline-offset-4 transition-colors hover:decoration-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2"
                    >
                      {isTr ? 'Planları gör →' : 'See plans →'}
                    </a>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[#525252]">
                    {(isTr
                      ? ['14 gün ücretsiz', 'Kart gerekmez', 'KVKK + GDPR uyumlu']
                      : ['14-day free trial', 'No credit card', 'KVKK + GDPR compliant']
                    ).map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1.5"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          aria-hidden="true"
                          className="shrink-0"
                        >
                          <path
                            d="M2 6.5L5 9.5L10 3"
                            stroke="#A8D62E"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                          />
                        </svg>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ToastRow — generic platform event workflow demo.
                Stage 90 §38.170: heading h3 eklendi (kullanıcı raporu
                "bir başlık da yap"); ToastRow defaults 4 distinct
                visible icon güncellendi (kullanıcı raporu items 1+4
                icon görünmüyor — §38.170 paterni). */}
            <div className="flex flex-col gap-3">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'Bir geri bildirim, dört adım' : 'One piece of feedback, four steps'}
              </span>
              <h3 className="mt-1 text-[24px] sm:text-[30px] font-medium leading-[1.1] tracking-[-0.025em] text-[#0A0A0A] text-balance">
                {isTr
                  ? 'Geri bildirimden yanıta dört adım'
                  : 'From feedback to reply in four steps'}
              </h3>
              <p
                className="text-[14px] leading-[1.55] text-[#525252]"
              >
                {isTr
                  ? 'Müşteri geri bildirim bırakır → düşük puanda size e-posta gelir → Pulse AI yanıt taslağı hazırlar → ekibiniz düzenleyip müşteriye gönderir.'
                  : 'A customer leaves feedback → a low rating triggers an e-mail to you → Pulse AI drafts a reply → your team edits it and sends it to the customer.'}
              </p>
              <div className="mt-2">
                <ToastRow locale={locale} />
              </div>

              {/* Stage 88 §38.168 — SentimentDial card premium polish
                  (sol kolon Cohort CTA card chrome paritesi). Apple-soft
                  shadow elev-1 + ring-1 + lime corner radial gradient
                  decoration (sol kolon CTA card paterni mirror).
                  Stage 92 §38.172 — mt-6 → mt-4 (spacing kompakt). */}
              <div className="relative mt-4 overflow-hidden rounded-[18px] bg-white p-5 shadow-[0_4px_24px_-12px_rgba(10,10,10,0.06)] ring-1 ring-[#EDEDED]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(198,242,78,0.18) 0%, transparent 70%)',
                  }}
                />
                <div className="relative flex items-center gap-5">
                  <div className="rounded-[14px] bg-[#0A0A0A] p-3">
                    <SentimentDial score={84} variant="dark" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="pulse-eyebrow text-[#A8D62E]">
                      {isTr ? 'Örnek görünüm · genel ton' : 'Sample view · overall tone'}
                    </span>
                    <p className="mt-2 text-[14px] leading-[1.55] text-[#525252]">
                      {isTr
                        ? 'Analitik ekranı geri bildirimlerin genel tonunu ve en çok bahsedilen konuları özetler; neyin düzeltilmesi gerektiğini görürsünüz.'
                        : 'The analytics screen sums up the overall tone of your feedback and the most mentioned topics, so you see what needs fixing.'}
                    </p>
                  </div>
                </div>
              </div>
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
              {isTr ? "Google yorum politikalarına uygun QR akışı" : "A QR flow that follows Google's review policies"}
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
              {isTr ? 'QR kod, yanıt, analitik ve platformlar tek panelde' : 'QR codes, replies, analytics and platforms in one panel'}
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
                    ? 'Markanıza özel QR şablonları; masa, fiş, kapı ve paket için. Her QR\'a şube veya masa etiketi ekleyin, geri bildirimleri bu etikete göre ayırın.'
                    : 'Branded QR templates for tables, receipts, doors and packaging. Add a branch or table label to each QR and filter feedback by it.'}
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
                      PNG · PDF
                    </p>
                    <p className="pulse-eyebrow mt-1.5 text-white/60">
                      {isTr ? 'BASKIYA HAZIR' : 'PRINT READY'}
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
                {isTr ? 'Yanıt taslağı hazır.' : 'A reply draft, ready.'}
              </h3>
              <p className="mt-2 text-[13px] leading-[1.55] text-[#525252]">
                {isTr
                  ? 'Pulse AI her geri bildirime Türkçe veya İngilizce yanıt taslağı hazırlar; siz düzenleyip gönderirsiniz.'
                  : 'Pulse AI drafts a Turkish or English reply to every piece of feedback; you edit and send it.'}
              </p>
              <div className="mt-4 rounded-xl bg-[#0A0A0A] px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="pulse-eyebrow text-[#C6F24E]">DRAFT</span>
                  <span
                    className="text-[10px] text-[#A3A3A3]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {isTr ? 'Sıcak ton' : 'Warm tone'}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-white/85">
                  {isTr
                    ? '"Merhaba, güzel yorumunuz için çok teşekkür ederiz…"'
                    : '"Hi, thank you so much for taking the time…"'}
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
                {isTr ? 'Puanınızı takip edin.' : 'Track your rating.'}
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
                {isTr ? 'Ortalama puan, NPS, trend ve şube kırılımı.' : 'Average rating, NPS, trends and per-location breakdown.'}
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
                {isTr ? 'Türkiye ve dünyadaki yorum platformları' : 'Review platforms in Turkey and worldwide'}
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
                  + Airbnb · Yandex · Foursquare
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          5.75 SECTION DIVIDER — editorial echo divider (Stage 73 §38.153)
          Compliance-safe: 4 jenerik Buaze platform manifesto'ları
          (fake testimonial YOK §35.10), live indicator counter
          (1,2M YORUM YOK §35.8), synthetic italic Space Grotesk
          (Instrument Serif YASAK §38.114). BENTO ↔ INDUSTRY TABS arası
          editorial breath + brand reinforcement.
      ═══════════════════════════════════════════════════════════ */}
      <SectionDivider locale={locale} />

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
              {isTr ? 'Restoran, otel, klinik ve mağazalar için' : 'For restaurants, hotels, clinics and stores'}
            </h2>
            <p className="mt-4 text-[15px] leading-[1.7] text-[#525252] sm:mx-auto sm:max-w-[620px] sm:text-[17px]">
              {isTr
                ? 'QR\'ın nereye konacağı ve hangi yorum platformunun öne çıkacağı sektöre göre değişir. Buaze, sektörünüze uygun platformları önerir.'
                : 'Where the QR goes and which review platform matters most depends on your industry. Buaze suggests the platforms that fit yours.'}
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
                One panel · Supported platforms
              </span>
              <h2 className="mt-4 text-[26px] sm:text-[40px] lg:text-[48px] font-medium leading-[1.02] tracking-[-0.03em] text-[#0A0A0A]">
                From Google and Tripadvisor to Yelp and Booking.com.
              </h2>
            </div>
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white border border-[#EDEDED] rounded-2xl p-7 sm:p-8">
                <span className="pulse-eyebrow text-[#737373]">Review platforms</span>
                <h3 className="mt-2 text-[22px] sm:text-[26px] font-medium tracking-[-0.02em]">
                  Where customers read reviews
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
                <span className="pulse-eyebrow text-[#737373]">Hotels &amp; stays</span>
                <h3 className="mt-2 text-[22px] sm:text-[26px] font-medium tracking-[-0.02em]">
                  Where guests book
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
                {isTr ? 'ÜCRETSİZ QR KOD OLUŞTURUCU' : 'FREE QR CODE GENERATOR'}
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
                  ? 'Web siteniz, menünüz veya Google yorum bağlantınız için QR kod oluşturun ve PNG ya da PDF olarak indirin. Üyelik gerekmez, süre sınırı yoktur.'
                  : 'Create a QR code for your website, menu or Google review link and download it as PNG or PDF. No sign-up, no expiry.'}
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

      {/* Case-study section removed — it attributed a quoted testimonial to
          "Emre Kaya · Kadıköy Bistro · Kurucu" and a +184% / 4.2→4.8 metric set,
          but Kadıköy Bistro is listed as a placeholder brand name in this file's
          own header note. A named, unverifiable customer testimonial plus
          unsourced performance numbers is FTC + Reklam Kurulu deceptive-advertising
          risk (CLAUDE.md §35.8 / §35.10). Restore once a real consented customer
          and audited figures are available. */}

      {/* International testimonial section removed — the prior block
          attributed a quote to "Julia Martens · Hotel Nora · Amsterdam"
          but Hotel Nora was a placeholder brand name (audit §8.4 / §4),
          and an unverifiable named testimonial is FTC + Reklam Kurulu
          deceptive-advertising risk. Restore once a real consented
          customer + venue is available. */}

      {/* ═══════════════════════════════════════════════════════════
          7.5 SIK SORULANLAR · 5 SORU — Stage 53 §38.134 HANDOFF
              FAQSection birebir parity. Editorial 2-col layout
              (380px sticky left + 1fr right accordion). Same
              `aeoFaqs` array feeds JSON-LD FAQPage above.
              Synthetic italic Space Grotesk (CLAUDE.md §38.112);
              compliance-safe NAP variation bottom-left
              (CLAUDE.md §35.8 + §19.4 paterni).
      ═══════════════════════════════════════════════════════════ */}
      <section
        id="aeo"
        className="relative overflow-hidden border-t border-[#EDEDED] bg-[#FAFAFA] px-5 py-[60px] sm:px-10 sm:py-24"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[180px] -top-[160px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(198,242,78,0.16)_0%,rgba(198,242,78,0)_65%)]"
        />

        <div className="relative mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[380px_1fr] lg:gap-20">
          {/* LEFT — sticky editorial column */}
          <aside>
            <div className="lg:sticky lg:top-[100px]">
              <div className="mb-7 inline-flex items-center gap-2.5">
                <span aria-hidden className="h-px w-6 bg-[#0A0A0A]" />
                <span className="pulse-eyebrow text-[#0A0A0A]">
                  {isTr ? 'SIK SORULANLAR · 5 SORU' : 'FAQ · 5 QUESTIONS'}
                </span>
              </div>

              <h2
                className="m-0 font-normal text-[#0A0A0A]"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontStyle: 'italic',
                  fontSize: 'clamp(36px, 7vw, 56px)',
                  lineHeight: 0.98,
                  letterSpacing: '-0.025em',
                }}
              >
                {isTr ? 'En çok sorulan beş soruya' : 'Five most-asked questions,'}
                <br />
                <span
                  className="px-1"
                  style={{
                    background:
                      'linear-gradient(180deg, transparent 60%, #C6F24E 60%, #C6F24E 92%, transparent 92%)',
                  }}
                >
                  {isTr ? 'net cevaplar.' : 'clear answers.'}
                </span>
              </h2>

              <p className="mt-6 max-w-[320px] text-[15px] leading-[1.55] text-[#525252]">
                {isTr
                  ? 'QR ile yorum toplama, Google politikaları, kurulum, Pulse AI ve fiyatlandırma hakkında kısa cevaplar.'
                  : 'Short answers about collecting reviews with QR codes, Google policies, setup, Pulse AI and pricing.'}
              </p>

              {/* Help card — graphite + lime gradient orb */}
              <div className="relative mt-9 max-w-[320px] overflow-hidden rounded-[18px] bg-[#0A0A0A] p-[22px] text-white">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-[130px] w-[130px] rounded-full bg-[radial-gradient(circle,rgba(198,242,78,0.30)_0%,transparent_70%)]"
                />
                <span className="pulse-eyebrow mb-2.5 block text-white/50">
                  {isTr ? 'Hâlâ kararsız mısınız?' : 'Still on the fence?'}
                </span>
                <p
                  className="relative z-[1] mb-[18px] m-0 font-normal"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontStyle: 'italic',
                    fontSize: 24,
                    lineHeight: 1.15,
                    letterSpacing: '-0.015em',
                  }}
                >
                  {isTr
                    ? 'Kısa bir görüşmede paneli sizin işletmeniz üzerinden gösterelim.'
                    : 'In a short call we walk you through the panel set up for your business.'}
                </p>
                <Link
                  href={`${base}/contact`}
                  className="relative z-[1] inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#C6F24E] font-bold text-[#0A0A0A]"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  {isTr ? 'DEMO İSTE' : 'REQUEST A DEMO'}
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </aside>

          {/* RIGHT — editorial accordion */}
          <div>
            <div className="rounded-3xl border border-[#EDEDED] bg-white px-6 shadow-[0_1px_2px_rgba(10,10,10,0.04)] sm:px-9">
              {aeoFaqs.map((f, idx) => (
                <details
                  key={f.q}
                  open={idx === 0}
                  className="group border-b border-[#EDEDED] py-7 last:border-b-0 sm:py-8"
                >
                  <summary
                    className="grid cursor-pointer list-none items-start gap-5 sm:gap-7 [&::-webkit-details-marker]:hidden"
                    style={{ gridTemplateColumns: '50px 1fr 44px' }}
                  >
                    {/* Italic serif index */}
                    <div
                      className="pt-1 text-[#A3A3A3] transition-colors duration-[220ms] group-open:text-[#0A0A0A]"
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontStyle: 'italic',
                        fontSize: 'clamp(28px, 4vw, 36px)',
                        lineHeight: 0.9,
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    {/* Question */}
                    <h3
                      className="m-0 font-normal text-[#0A0A0A]"
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontStyle: 'italic',
                        fontSize: 'clamp(22px, 3.4vw, 30px)',
                        lineHeight: 1.15,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {f.q}
                    </h3>
                    {/* Plus / minus */}
                    <span
                      aria-hidden
                      className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#EDEDED] bg-transparent transition-all duration-[240ms] group-open:border-[#0A0A0A] group-open:bg-[#0A0A0A]"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        className="text-[#0A0A0A] transition-transform duration-[280ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-open:rotate-45 group-open:text-[#C6F24E]"
                      >
                        <path
                          d="M7 1.5v11M1.5 7h11"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </summary>

                  {/* Answer body — inline animation reduced-motion blanket'le yakalanır */}
                  <div
                    className="mt-[18px] grid items-start gap-5 sm:gap-7"
                    style={{
                      gridTemplateColumns: '50px 1fr 44px',
                      animation: 'faqOpen 320ms cubic-bezier(0.2,0.8,0.2,1)',
                    }}
                  >
                    <span aria-hidden />
                    <div>
                      <p className="m-0 max-w-[640px] text-[15px] leading-[1.65] text-[#525252] sm:text-[16px]">
                        {f.a}
                      </p>
                      {f.meta && f.meta.length > 0 && (
                        <div className="mt-[18px] flex flex-wrap gap-2">
                          {f.meta.map((m) => (
                            <span
                              key={m}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#C6F24E] bg-[#EAF9B8] px-3 py-1.5 font-semibold text-[#3F5408]"
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 10.5,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                              }}
                            >
                              <span aria-hidden className="h-1 w-1 rounded-[2px] bg-[#A8D62E]" />
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span aria-hidden />
                  </div>
                </details>
              ))}
            </div>

            {/* Tail rail — sayım + tüm sorular link */}
            <div className="mt-6 flex items-center justify-between px-1">
              <span className="pulse-eyebrow text-[#A3A3A3]">
                {isTr ? '5 SORU' : '5 QUESTIONS'}
              </span>
              <Link
                href={`${base}/faq`}
                className="inline-flex items-center gap-2 border-b-[1.5px] border-[#C6F24E] pb-0.5 font-bold uppercase text-[#0A0A0A]"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                }}
              >
                {isTr ? 'TÜM SORULAR' : 'ALL QUESTIONS'}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Mute tag bottom-left — compliance-safe NAP variation
            (CLAUDE.md §35.8: gerçek destek saati unverified iddia
            sayılır; kanonik support@buaze.com kullanılır) */}
        <div className="absolute bottom-6 left-5 hidden items-center gap-2 opacity-60 sm:left-10 sm:flex">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-[3px] bg-[#C6F24E]"
            style={{ animation: 'faqDot 2.4s ease-in-out infinite' }}
          />
          <span className="pulse-eyebrow text-[#A3A3A3]">
            {isTr
              ? 'BUAZE · DESTEK · SUPPORT@BUAZE.COM'
              : 'BUAZE · SUPPORT · SUPPORT@BUAZE.COM'}
          </span>
        </div>
      </section>

      {/* Stage 79 §38.157 — Section 7.5 (BUILT FOR THESE CHANNELS) hero
          altına taşındı (Section 2 yerine geçti); orijinal LOGO STRIP
          MarqueeRow industry chip strip kullanıcı talebi ile silindi.
          Aşağıdaki PulseLine 2/2 intact — son content section ile
          final CTA banner arasında decorative divider olarak çalışır. */}

      {/* Stage 70 §38.150 — PulseLine 2/2 decorative section divider
          between previous content and final CTA banner. */}
      <div className="flex items-center justify-center bg-white py-3" aria-hidden="true">
        <PulseLine width={180} />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          8. LIME CTA BANNER
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-[#C6F24E] px-5 sm:px-10 py-[60px] sm:py-28">
        <div className="max-w-[900px] mx-auto text-center">
          <h2 className="text-[28px] sm:text-[44px] lg:text-[56px] font-medium leading-[1.02] tracking-[-0.04em] text-[#0A0A0A] text-balance">
            {isTr ? 'QR ile müşteri geri bildirimi toplamaya bugün başlayın' : 'Start collecting customer feedback with QR codes today'}
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

      {/* Conversion layer — client-only, renders only after user interacts.
          Stage 86 §38.166 — SocialProofToast mount silindi (fake testimonial
          §35.10 disipline ihlali, kullanıcı explicit removal). */}
      <StickyCtaBar locale={locale} />
    </div>
  );
}
