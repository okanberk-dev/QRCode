import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import {
  ArrowRight,
  ChevronDown,
  ClipboardList,
  MessageSquare,
  Gift,
  QrCode,
  Smile,
  ListChecks,
  Star,
  Utensils,
  BookOpen,
  Stethoscope,
  ShoppingBag,
  Sparkles,
  Dumbbell,
} from 'lucide-react';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import { jsonLdString } from '@/lib/seo/json-ld';
import { buildHowToSchema } from '@/lib/seo/howto-schema';
import { getTranslations, type Locale } from '@/lib/translations';

// Stage 135 §38.215 — sticky CTA (desktop/tablet, mobile MobileBottomNav).
const StickyCtaBar = nextDynamic(() => import('@/components/marketing/StickyCtaBar'));

// Stage 134 §38.214 — /features/surveys marketing surface.
// Owner panel /dashboard/surveys backend marketing parity. Pattern source:
// /features/review-management. Inline TR/EN ternary (CLAUDE.md §7).

const VALID_LOCALES = ['tr', 'en'] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const title = isTr
    ? 'Anketler — NPS, CSAT ve özel sorular QR ile | Buaze'
    : 'Surveys — NPS, CSAT and custom questions via QR | Buaze';
  const description = isTr
    ? 'Müşteri memnuniyetini Google\'dan bağımsız ölç. QR\'dan açılan kısa anket, NPS / CSAT / yıldız ve metin soruları, opsiyonel kupon teşviki. Tek panel üzerinden tasarla, paylaş, analiz et.'
    : 'Measure customer satisfaction independently of Google. Short surveys opened from QR, NPS / CSAT / star and text questions, optional coupon reward. Design, share, analyze from one panel.';
  const canonicalUrl = `https://www.buaze.com/${locale}/features/surveys`;
  return {
    metadataBase: new URL('https://www.buaze.com'),
    title,
    description,
    keywords: isTr
      ? [
          'müşteri anketi',
          'NPS anketi',
          'CSAT anketi',
          'QR ile anket',
          'restoran müşteri memnuniyeti',
          'mobil anket formu',
          'KVKK uyumlu anket',
          'kupon ile geri bildirim',
        ]
      : [
          'customer survey',
          'NPS survey',
          'CSAT survey',
          'QR survey form',
          'restaurant customer satisfaction',
          'mobile survey form',
          'KVKK compliant survey',
          'coupon feedback',
        ],
    alternates: {
      canonical: canonicalUrl,
      languages: {
        tr: 'https://www.buaze.com/tr/features/surveys',
        en: 'https://www.buaze.com/en/features/surveys',
        'x-default': 'https://www.buaze.com/en/features/surveys',
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
          alt: 'Buaze — Anketler',
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

export default async function SurveysPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) notFound();

  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;
  const canonicalUrl = `https://www.buaze.com/${locale}/features/surveys`;

  // Mobile survey mockup — feels like a real customer screen
  const surveyMock = isTr
    ? {
        eyebrow: 'KARAKÖY ŞUBE',
        title: 'Ziyaretiniz nasıldı?',
        sub: '4 soru · 60 saniye',
        questions: [
          { icon: Star, q: 'Genel deneyim (1-5)', a: '★★★★★' },
          { icon: Smile, q: 'NPS — bizi tavsiye eder misin? (0-10)', a: '9' },
          { icon: ListChecks, q: 'Hangi konuda iyileşmeliyiz?', a: 'Servis hızı · Lezzet' },
          { icon: MessageSquare, q: 'Eklemek istediğin bir şey?', a: 'Personel çok ilgiliydi.' },
        ],
        reward: 'Teşekkürler! Bir sonraki ziyaretinde %10 indirim: BUAZE10',
      }
    : {
        eyebrow: 'KARAKÖY BRANCH',
        title: 'How was your visit?',
        sub: '4 questions · 60 seconds',
        questions: [
          { icon: Star, q: 'Overall experience (1-5)', a: '★★★★★' },
          { icon: Smile, q: 'NPS — would you recommend us? (0-10)', a: '9' },
          { icon: ListChecks, q: 'Where should we improve?', a: 'Service speed · Taste' },
          { icon: MessageSquare, q: 'Anything you\'d like to add?', a: 'Staff were very attentive.' },
        ],
        reward: 'Thank you! 10% off your next visit: BUAZE10',
      };

  // 4-up operating loop cards
  const cards = isTr
    ? [
        {
          icon: ClipboardList,
          title: '5 soru tipi',
          body: 'Yıldız (1-5), tavsiye skoru (NPS, 0-10), tek seçim, kısa yazı ve uzun yazı. Soruları ⋯ menüsüyle yukarı/aşağı taşı, zorunlu yap, çoğalt veya sil.',
        },
        {
          icon: QrCode,
          title: 'QR ile dağıtım',
          body: 'Her ankete özel slug + statik QR PNG/SVG. Masaya, faturaya veya kapıya yapıştır; müşteri tek tarama ile mobil-friendly form\'a iner. Yeni dosya basmadan tekrar kullan.',
        },
        {
          icon: Gift,
          title: 'Kupon teşviki (opsiyonel)',
          body: 'Anket sonunda kupon kodu + etiket göster ("BUAZE10 · %10 indirim"). Yanıt oranını yükseltir; müşteri tamamlama hissi yaşar. Ödül akışı tamamen opsiyonel.',
        },
        {
          icon: Smile,
          title: 'Analiz + CSV',
          body: 'Yanıt sayısı, ortalama puan, tavsiye skoru (NPS) ve soru bazlı dağılım; yazılı yanıtlar soru soru görünür. Excel\'e CSV indir; ek tool gerekmez.',
        },
      ]
    : [
        {
          icon: ClipboardList,
          title: '5 question types',
          body: 'Star (1-5), recommend score (NPS, 0-10), single choice, short text and long text. Move questions up or down with the ⋯ menu, make them required, duplicate or delete them.',
        },
        {
          icon: QrCode,
          title: 'QR distribution',
          body: 'Each survey has a slug + static QR (PNG/SVG). Stick it to the table, receipt or door; the customer scans once into a mobile-friendly form. Reuse without reprinting.',
        },
        {
          icon: Gift,
          title: 'Coupon reward (optional)',
          body: 'Show a coupon code + label at the end ("BUAZE10 · 10% off"). Lifts response rate; the customer feels rewarded. Reward flow is entirely optional.',
        },
        {
          icon: Smile,
          title: 'Analytics + CSV',
          body: 'Response count, average rating, recommend score (NPS) and a per-question breakdown; written answers are listed question by question. CSV export to Excel; no extra tool required.',
        },
      ];

  const featureList = isTr
    ? [
        '1 soruysa tek ekran, daha fazlaysa adım adım — anket kendiliğinden uyum sağlar',
        '5 soru tipi: yıldız (1-5), tavsiye skoru (NPS 0-10), tek seçim, kısa yazı, uzun yazı',
        'QR ile dağıtım — her anket için ayrı slug + statik PNG/SVG',
        'Mobil-first, adım adım ilerleyen müşteri formu; iletişim bilgisi alırken KVKK açık rıza onayı',
        'Opsiyonel kupon ödülü + teşekkür mesajı, marka aksent rengi',
        'Yanıt analitiği + CSV dışa aktarım, IP retention 90 gün',
      ]
    : [
        'One question shows on a single screen, more run step by step — the survey adapts by itself',
        '5 question types: star (1-5), recommend score (NPS 0-10), single choice, short text, long text',
        'QR distribution — per-survey slug + static PNG/SVG',
        'Mobile-first, step-by-step customer form; KVKK explicit consent when contact details are collected',
        'Optional coupon reward + thank-you message, brand accent color',
        'Response analytics + CSV export, IP retention 90 days',
      ];

  const faqs = isTr
    ? [
        {
          q: 'Anket sistemini Google yorumlardan farkı ne?',
          a: 'Google yorum kamuya açık ve aramanın bir parçasıdır; anket ise işletmen için özel, derinlemesine müşteri sesidir. Buaze\'de iki akış birbirini tamamlar: müşteri QR\'dan girer, yüksek puanlısı Google\'a yönlendirilir, anket ise paralel olarak NPS/CSAT, hangi alanı iyileştirmen gerektiği gibi detayları işletme içinde tutar. Müşteri her zaman istediği platforma yazma hakkını korur.',
        },
        {
          q: 'Hangi soru tiplerini sunuyorsunuz?',
          a: 'Yıldız (1-5), tavsiye skoru / NPS (0-10), tek seçim, kısa yazı ve uzun yazı. Tür seçmen gerekmez: 1 soru varsa anket tek ekranda, daha fazlaysa adım adım açılır. Her soruda zorunluluğu işaretler, soruları ⋯ menüsüyle yukarı/aşağı taşırsın. İletişim bilgisi bir soru tipi değil, isteğe bağlı son adımdır.',
        },
        {
          q: 'QR yapıştırmadan paylaşabilir miyim?',
          a: 'Evet. Her ankette `/s/[slug]` formatında benzersiz URL var; bu link\'i SMS, WhatsApp, e-posta footer\'ı, kayıt formu thank-you sayfası, sosyal medya bio\'su gibi her yere koyabilirsin. QR sadece masa içi / fiziksel ortam için ek seçenek.',
        },
        {
          q: 'Kupon ödülü nasıl çalışır?',
          a: 'Anket tasarımında "ödül kodu" alanına bir kod (örn. BUAZE10) ve etiket (%10 indirim) gir. Müşteri anketi tamamladığında thank-you ekranında bu kod + etiket görünür; müşteri ekran görüntüsünü gösterip indirim kullanır. Tamamen opsiyonel; istemezsen sadece teşekkür mesajı görünür.',
        },
        {
          q: 'KVKK + GDPR uyumu nasıl?',
          a: 'Anket formunda her müşteri açık rıza onayı verir (opt-in checkbox); rıza olmadan submit gönderilmez. IP retention 90 gün (KVKK §13.9), opt-in marketing pazarlama izni ayrı, anonim form opsiyonu var. Yanıtlardaki PII (email, telefon) opsiyonel; topladığın alanları tasarım sırasında belirlersin.',
        },
      ]
    : [
        {
          q: 'How is this different from Google reviews?',
          a: 'Google reviews are public and part of search; surveys are private, deep customer voice for your business. In Buaze the two flows complement each other: a customer scans QR, high ratings are routed to Google, while the survey holds NPS/CSAT, what to improve and similar details internally. The customer always keeps the right to post wherever they want.',
        },
        {
          q: 'Which question types do you support?',
          a: 'Star (1-5), recommend score / NPS (0-10), single choice, short text and long text. You don\'t pick a survey type: one question shows on a single screen, more run step by step. Mark each question required and move questions up or down with the ⋯ menu. Contact details are not a question type, they are an optional last step.',
        },
        {
          q: 'Can I share without sticking a QR?',
          a: 'Yes. Each survey has a unique URL at `/s/[slug]`; share it via SMS, WhatsApp, email footer, registration thank-you page, social media bio — anywhere. QR is just an extra option for in-venue / physical settings.',
        },
        {
          q: 'How does the coupon reward work?',
          a: 'When designing the survey, add a coupon code (e.g. BUAZE10) and a label (10% off) under "reward code". When the customer completes the survey, the code + label appear on the thank-you screen; the customer shows the screenshot to redeem the discount. Entirely optional; without it, only the thank-you message shows.',
        },
        {
          q: 'How do you comply with KVKK + GDPR?',
          a: 'Every customer gives explicit consent (opt-in checkbox) on the survey form; submission is blocked without it. IP retention is 90 days (KVKK §13.9), marketing consent is opt-in separately, and an anonymous form option exists. PII (email, phone) in responses is optional; you decide which fields to collect during design.',
        },
      ];

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: isTr ? 'Buaze Anketler' : 'Buaze Surveys',
    serviceType: isTr ? 'QR ile müşteri anketi' : 'QR-based customer surveys',
    provider: { '@type': 'Organization', name: 'Buaze', url: 'https://www.buaze.com' },
    areaServed: 'TR',
    availableLanguage: ['tr-TR', 'en-US'],
    url: canonicalUrl,
    description: isTr
      ? 'Müşteri memnuniyetini Google\'dan bağımsız ölçen Buaze anket modülü. NPS, CSAT, yıldız, tek seçim ve metin soruları; QR ile dağıtım, opsiyonel kupon teşviki, KVKK uyumu.'
      : 'The Buaze survey module measures customer satisfaction independently of Google. NPS, CSAT, star, single-choice and text questions; QR distribution, optional coupon reward, KVKK compliance.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: isTr ? 'TRY' : 'USD',
      description: isTr ? '14 gün ücretsiz deneme; kart gerektirmez.' : '14-day free trial; no card required.',
      url: `${base}/auth/register`,
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: isTr ? 'Anket yetenekleri' : 'Survey capabilities',
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
      { '@type': 'ListItem', position: 1, name: isTr ? 'Ana Sayfa' : 'Home', item: `https://www.buaze.com/${locale}` },
      { '@type': 'ListItem', position: 2, name: isTr ? 'Özellikler' : 'Features', item: `https://www.buaze.com/${locale}/features` },
      { '@type': 'ListItem', position: 3, name: isTr ? 'Anketler' : 'Surveys', item: canonicalUrl },
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
    name: isTr ? 'Buaze ile müşteri anketi yayınlama' : 'Publish a customer survey with Buaze',
    description: isTr
      ? 'Buaze anket modülünde anket tasarlayıp QR ile paylaşıp yanıtları analiz etme akışı.'
      : 'Design a survey in Buaze, share it via QR and analyze the responses.',
    url: canonicalUrl,
    steps: isTr
      ? [
          { name: 'Hazır bir şablon seç', text: 'Buaze panelinde Anketler > Yeni anket altında işletmene uygun hazır şablonlardan birini seç veya boş anketle başla. Soru sayısına göre anket kendiliğinden tek ekran ya da adım adım olur.' },
          { name: 'Soruları ekle', text: '5 soru tipinden seç (yıldız, tavsiye skoru, tek seçim, kısa yazı, uzun yazı). Soruları ⋯ menüsüyle yukarı/aşağı taşı, zorunlu yap, çoğalt veya sil.' },
          { name: 'QR + paylaşım', text: 'Anket yayınlandığında otomatik üretilen `/s/[slug]` URL\'sini SMS / WhatsApp / e-posta ile paylaş; veya PNG/SVG QR\'ı indir, masaya / faturaya / kapıya yapıştır.' },
          { name: 'Yanıtları analiz et', text: 'Panelde yanıt sayısı, ortalama puan, tavsiye skoru (NPS), soru bazlı dağılım ve yazılı yanıtlar görünür. CSV olarak Excel\'e indir.' },
        ]
      : [
          { name: 'Pick a ready-made template', text: 'In the Buaze panel under Surveys > New survey, pick a ready-made template that fits your business or start from a blank survey. One question shows on a single screen, more run step by step.' },
          { name: 'Add questions', text: 'Choose from 5 question types (star, recommend score, single choice, short text, long text). Move questions up or down with the ⋯ menu, mark them required, duplicate or delete them.' },
          { name: 'QR + sharing', text: 'Once published, share the auto-generated `/s/[slug]` URL via SMS / WhatsApp / email; or download the PNG/SVG QR and stick it on the table / receipt / door.' },
          { name: 'Analyze responses', text: 'In the panel see response count, average rating, recommend score (NPS), a per-question breakdown and written answers. Export CSV to Excel.' },
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

        {/* ─── HERO ─── */}
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
                  {isTr ? 'ANKETLER' : 'SURVEYS'}
                </span>
              </div>
              <h1 className="mt-5 text-[40px] font-medium leading-[0.98] tracking-[-0.035em] text-white sm:text-[56px] md:text-[52px] lg:text-[76px]">
                {isTr ? (
                  <>
                    Müşteri sesini{' '}
                    <span className="inline-block -skew-y-1 rounded-lg bg-[#C6F24E] px-3 py-0.5 text-[#0A0A0A]">
                      derinden
                    </span>{' '}
                    dinle.
                  </>
                ) : (
                  <>
                    Listen to customer voice{' '}
                    <span className="inline-block -skew-y-1 rounded-lg bg-[#C6F24E] px-3 py-0.5 text-[#0A0A0A]">
                      deeper
                    </span>
                    .
                  </>
                )}
              </h1>
              <p className="mt-6 max-w-[560px] text-[17px] leading-[1.6] text-white/70 sm:text-[18px]">
                {isTr
                  ? 'NPS, CSAT, yıldız, metin — Google\'dan bağımsız özel anket. QR ile dağıt, opsiyonel kuponla yanıt oranını yükselt, sonuçları aynı panelde analiz et.'
                  : 'NPS, CSAT, star, text — private surveys independent of Google. Share via QR, lift response rate with an optional coupon, analyze results in the same panel.'}
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
                  href={`${base}/features`}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-6 py-3 text-[15px] font-medium text-white transition-colors hover:border-white/60 hover:bg-white/5"
                >
                  {isTr ? 'Diğer özellikler' : 'See all features'}
                </Link>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/60">
                {(isTr
                  ? ['NPS · CSAT · 5 soru tipi', 'QR ile dağıtım', 'Opsiyonel kupon ödülü']
                  : ['NPS · CSAT · 5 question types', 'QR distribution', 'Optional coupon reward']
                ).map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <span className="inline-block h-1 w-1 rounded-full bg-[#C6F24E]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Mobile survey mockup — mobile max-w stabilization (Stage 135
                §38.215): mobile portrait'ta hero card 100vw doldurmasın,
                420px üst sınır + center; sm+'da grid sütunu tam doldurur. */}
            <div className="relative mx-auto w-full max-w-[440px] sm:max-w-none">
              <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.18)] sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="pulse-eyebrow text-[#A8D62E]">{surveyMock.eyebrow}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-2.5 py-1 text-[10px] font-semibold text-[#C6F24E]">
                    <QrCode size={10} />
                    {isTr ? 'QR FORM' : 'QR FORM'}
                  </span>
                </div>
                <h3 className="mt-3 text-[18px] font-semibold leading-tight text-[#0A0A0A]">
                  {surveyMock.title}
                </h3>
                <p className="mt-1 text-[12px] text-[#737373]">{surveyMock.sub}</p>
                <div className="mt-4 grid gap-2.5">
                  {surveyMock.questions.map(({ icon: Icon, q, a }) => (
                    <article
                      key={q}
                      className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF9B8] text-[#0A0A0A]">
                          <Icon size={14} strokeWidth={2.2} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold text-[#0A0A0A]">{q}</p>
                          <p className="mt-1 text-[12px] font-medium text-[#525252]">{a}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#EAF9B8] px-3 py-2.5 text-[12px] text-[#0A0A0A]">
                  <Gift size={14} className="shrink-0" />
                  <span className="font-medium leading-tight">{surveyMock.reward}</span>
                </div>
              </div>
              <span className="absolute -top-3 -right-3 inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-3 py-1 text-[11px] font-semibold text-[#0A0A0A]">
                {isTr ? 'Mobil-first' : 'Mobile-first'}
              </span>
            </div>
          </div>
        </section>

        {/* ─── AEO definitional H2s + pull quote accent (Stage 135 §38.215) ─── */}
        <section className="px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="mx-auto max-w-[820px] space-y-12 sm:space-y-16">
            <div>
              <span className="pulse-eyebrow text-[#A8D62E]">
                {isTr ? 'NEDEN ÖNEMLİ' : 'WHY IT MATTERS'}
              </span>
              <h2 className="mt-3 text-[28px] sm:text-[40px] font-medium leading-[1.05] tracking-[-0.03em] text-[#0A0A0A]">
                {isTr ? 'NPS ve CSAT anketleri neden önemli?' : 'Why are NPS and CSAT surveys important?'}
              </h2>
              <div className="mt-5 space-y-4 text-[15px] sm:text-[17px] leading-[1.65] text-[#525252]">
                <p>
                  {isTr
                    ? 'Google ya da Yemeksepeti yorumu kamuya açıktır; bu sebeple müşteri çoğu zaman güçlü bir duygu (çok olumlu veya çok olumsuz) yaşamadığı sürece yazmaz. Bu "orta" deneyimler işletmen için en değerli geri bildirimdir — operasyonel iyileştirme önerilerini taşır.'
                    : 'A Google or Yemeksepeti review is public; customers tend to write only when they experience strong emotion (very positive or very negative). The "middle" experiences in between are the most valuable feedback for your business — they carry operational improvement signals.'}
                </p>
              </div>
              {/* Pull quote accent — featured snippet eligibility + visual rhythm */}
              <blockquote className="mt-6 rounded-r-2xl border-l-[3px] border-[#C6F24E] bg-[#EAF9B8]/30 px-5 py-4 sm:px-6 sm:py-5">
                <p className="text-[15px] sm:text-[17px] font-medium leading-[1.55] text-[#0A0A0A]">
                  {isTr
                    ? '"NPS + CSAT, müşterinin kamuda söylemediği iyileştirme sinyallerini işletmeye taşır. QR ile düşük sürtünmede toplanır — Google yorum oranının çok üzerinde."'
                    : '"NPS + CSAT carry the improvement signals customers don\'t say publicly to your business. QR collects them with low friction — far above Google review rates."'}
                </p>
              </blockquote>
            </div>

            <div>
              <span className="pulse-eyebrow text-[#A8D62E]">
                {isTr ? 'TASARIM' : 'DESIGN'}
              </span>
              <h2 className="mt-3 text-[28px] sm:text-[40px] font-medium leading-[1.05] tracking-[-0.03em] text-[#0A0A0A]">
                {isTr ? 'Etkili bir müşteri anketi nasıl tasarlanır?' : 'How do you design an effective customer survey?'}
              </h2>
              <div className="mt-5 space-y-4 text-[15px] sm:text-[17px] leading-[1.65] text-[#525252]">
                <p>
                  {isTr
                    ? 'Pratik kurallar: 1) 5 sorudan fazla olmasın — 60 saniyenin altında tamamlanmalı, 2) İlk soru yıldız veya NPS olsun — düşük puanda kalan müşteriyi takip et, 3) Açık metin sadece 1-2 yerde olsun (sebep + öneri), 4) Ödül opsiyonel ama yanıt oranını %30-50 artırır, 5) Mobil-first — formun max-width 920px, font 16px+ (iOS auto-zoom önleme).'
                    : 'Practical rules: 1) No more than 5 questions — finish in under 60 seconds, 2) First question should be star or NPS — track customers who left a low score, 3) Open text only in 1-2 spots (reason + suggestion), 4) Reward is optional but lifts response rate by 30-50%, 5) Mobile-first — form max-width 920px, font 16px+ (iOS auto-zoom prevention).'}
                </p>
                <p>
                  {isTr
                    ? 'Buaze\'in anket editörü bu kuralları default olarak uygular: soru sıralama, zorunluluk işaretleme, marka aksent rengi, KVKK açık rıza onayı, opsiyonel kupon ödülü ve teşekkür mesajı. Tasarımdan yayına 5 dakika; tasarım dosyası, ek tool, başka login yok.'
                    : 'Buaze\'s survey editor applies these rules by default: question ordering, required flag, brand accent color, KVKK explicit consent, optional coupon reward and thank-you message. From design to publish in 5 minutes; no design files, no extra tool, no separate login.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4-up operating loop ─── */}
        <section className="border-y border-[#EDEDED] bg-[#FAFAFA] px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="mx-auto max-w-[1200px]">
            <div className="max-w-[640px]">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'ANKET DÖNGÜSÜ' : 'SURVEY LOOP'}
              </span>
              <h2 className="mt-3 text-[26px] font-medium leading-[1.04] tracking-[-0.03em] text-[#0A0A0A] sm:text-[42px]">
                {isTr ? 'Tasarla. Paylaş. Topla. Analiz et.' : 'Design. Share. Collect. Analyze.'}
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

        {/* ─── SPEC ROW (Stage 135 §38.215 polish) ─── */}
        <section className="px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-3">
            {[
              {
                l: isTr ? 'SORU TİPİ' : 'QUESTION TYPES',
                v: '5',
                sub: isTr
                  ? 'Yıldız, tavsiye skoru (NPS), tek seçim, kısa yazı, uzun yazı'
                  : 'Star, recommend score (NPS), single choice, short text, long text',
              },
              {
                l: isTr ? 'HEDEF SÜRE' : 'TARGET TIME',
                v: '<60sn',
                sub: isTr
                  ? 'Mobil-first form, 4-5 soru ile 60 saniyenin altında tamamlanır'
                  : 'Mobile-first form finishes in under 60 seconds with 4-5 questions',
              },
              {
                l: isTr ? 'DAĞITIM' : 'DISTRIBUTION',
                v: 'QR + Link',
                sub: isTr
                  ? 'Statik QR (PNG/SVG) + paylaşılabilir URL · SMS/WhatsApp uyumlu'
                  : 'Static QR (PNG/SVG) + shareable URL · SMS/WhatsApp friendly',
              },
            ].map((k) => (
              <div
                key={k.l}
                className="group rounded-2xl border border-[#EDEDED] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#0A0A0A] hover:shadow-[0_18px_40px_-22px_rgba(10,10,10,0.18)]"
              >
                <p className="pulse-eyebrow text-[#A8D62E]">{k.l}</p>
                <p
                  className="mt-3 text-[44px] font-medium leading-none tracking-tight text-[#0A0A0A] sm:text-[56px]"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  {k.v}
                </p>
                <p className="mt-3 text-[13px] leading-[1.55] text-[#525252]">{k.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── SECTOR CROSS-LINK — "Hangi sektörler için ideal?" (Stage 135
            §38.215). SEO + GEO impact: feature × sektör matrix snippet
            ("nps survey for restaurants"); her pill /solutions/<sektor>
            sayfasına gider. 6 sektör + "Hepsi" CTA. ─── */}
        <section className="border-t border-[#EDEDED] bg-[#FAFAFA] px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="mx-auto max-w-[1200px]">
            <div className="max-w-[680px]">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'SEKTÖRLER' : 'SECTORS'}
              </span>
              <h2 className="mt-3 text-[26px] sm:text-[36px] font-medium leading-[1.05] tracking-[-0.03em] text-[#0A0A0A]">
                {isTr ? 'Hangi sektörler için ideal?' : 'Best fit for which sectors?'}
              </h2>
              <p className="mt-3 max-w-[600px] text-[14px] sm:text-[15px] leading-[1.65] text-[#525252]">
                {isTr
                  ? 'Anketler her sektör için çalışır; aşağıda en sık kullanılan örnek senaryolar. QR + slug yapısı operasyonuna uyacak şekilde özelleştirilebilir.'
                  : 'Surveys work for any sector; below are the most common scenarios. The QR + slug structure adapts to your operation.'}
              </p>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Utensils,
                  label: isTr ? 'Restoran & Kafe' : 'Restaurant & Café',
                  sub: isTr ? 'Masa NPS, servis sonrası CSAT' : 'Table NPS, post-service CSAT',
                  href: `${base}/solutions/restaurants`,
                },
                {
                  icon: BookOpen,
                  label: isTr ? 'Otel' : 'Hotel',
                  sub: isTr ? 'Konaklama sonrası memnuniyet' : 'Post-stay satisfaction',
                  href: `${base}/solutions/hotels`,
                },
                {
                  icon: Stethoscope,
                  label: isTr ? 'Klinik & Sağlık' : 'Clinic & Health',
                  sub: isTr ? 'Hasta deneyimi, randevu sonrası' : 'Patient experience, post-visit',
                  href: `${base}/solutions/healthcare`,
                },
                {
                  icon: Sparkles,
                  label: isTr ? 'Güzellik & Spa' : 'Beauty & Spa',
                  sub: isTr ? 'Hizmet sonrası geri bildirim' : 'Post-treatment feedback',
                  href: `${base}/solutions/beauty-salon`,
                },
                {
                  icon: ShoppingBag,
                  label: isTr ? 'Perakende' : 'Retail',
                  sub: isTr ? 'Mağaza içi deneyim, ürün NPS' : 'In-store experience, product NPS',
                  href: `${base}/solutions/retail`,
                },
                {
                  icon: Dumbbell,
                  label: isTr ? 'Spor & Fitness' : 'Sports & Fitness',
                  sub: isTr ? 'Ders + üyelik memnuniyeti' : 'Class + membership satisfaction',
                  href: `${base}/solutions/gym`,
                },
              ].map((sec) => (
                <Link
                  key={sec.label}
                  href={sec.href}
                  className="group flex items-start gap-3 rounded-2xl border border-[#EDEDED] bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0A0A0A] sm:p-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF9B8] text-[#0A0A0A]">
                    <sec.icon size={18} strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold leading-tight text-[#0A0A0A]">
                      {sec.label}
                    </p>
                    <p className="mt-1 text-[12px] leading-[1.5] text-[#737373]">{sec.sub}</p>
                  </div>
                  <ArrowRight
                    size={14}
                    className="mt-1 shrink-0 text-[#A3A3A3] transition-all group-hover:translate-x-0.5 group-hover:text-[#0A0A0A]"
                  />
                </Link>
              ))}
            </div>
            <div className="mt-7 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Link
                href={`${base}/solutions`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0A0A0A] bg-transparent px-5 py-2.5 text-[13px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#0A0A0A] hover:text-white"
              >
                {isTr ? 'Tüm sektörlere bak' : 'See all sectors'}
                <ArrowRight size={14} />
              </Link>
              <span className="text-[12px] text-[#737373]">
                {isTr
                  ? 'Sektörünü göremiyor musun? Sıfırdan anket yazma yine 5 dakika sürer.'
                  : "Don't see your sector? Writing a survey from scratch still takes 5 minutes."}
              </span>
            </div>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="border-t border-[#EDEDED] px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="mx-auto max-w-[860px]">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'SIK SORULANLAR' : 'FREQUENTLY ASKED'}
            </span>
            <h2 className="mt-3 text-[26px] font-medium leading-[1.04] tracking-[-0.03em] sm:text-[40px]">
              {isTr ? 'Anketler hakkında her şey.' : 'Everything about surveys.'}
            </h2>
            <div className="mt-8 divide-y divide-[#EDEDED] border-y border-[#EDEDED]">
              {faqs.map((f, idx) => (
                <details
                  key={f.q}
                  className="group py-5"
                  open={idx < 2}
                >
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
              <Link href={`${base}/features/audit-center`} className="rounded-full border border-[#EDEDED] px-3 py-1 hover:border-[#0A0A0A]">
                {isTr ? 'Denetim Merkezi' : 'Audit Center'}
              </Link>
              <Link href={`${base}/features/pulse-ai`} className="rounded-full border border-[#EDEDED] px-3 py-1 hover:border-[#0A0A0A]">
                Pulse AI
              </Link>
              <Link href={`${base}/features/analytics-reports`} className="rounded-full border border-[#EDEDED] px-3 py-1 hover:border-[#0A0A0A]">
                {isTr ? 'Analitik & Raporlar' : 'Analytics & Reports'}
              </Link>
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="bg-[#C6F24E] px-5 py-[60px] text-center sm:px-10 sm:py-24">
          <div className="mx-auto max-w-[860px]">
            <Smile className="mx-auto mb-5 text-[#0A0A0A]" size={34} strokeWidth={2.2} />
            <h2 className="text-[28px] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[48px]">
              {isTr ? 'İlk anketin 5 dakikada hazır.' : 'Your first survey is ready in 5 minutes.'}
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
      {/* Stage 135 §38.215 — desktop/tablet sticky CTA (mobile MobileBottomNav
          §25.4 Pas 4 footer'da zaten). */}
      <StickyCtaBar locale={locale} />
    </div>
  );
}
