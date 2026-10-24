import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import {
  ArrowRight,
  ClipboardCheck,
  Users,
  BarChart3,
  ChevronDown,
  ClipboardList,
  FileBarChart,
  Utensils,
  BookOpen,
  Stethoscope,
  ShoppingBag,
  Sparkles,
  Scale,
} from 'lucide-react';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import { jsonLdString } from '@/lib/seo/json-ld';
import { buildHowToSchema } from '@/lib/seo/howto-schema';
import { getTranslations, type Locale } from '@/lib/translations';

// Stage 135 §38.215 — desktop/tablet sticky CTA (mobile: MobileBottomNav
// MarketingFooter'da zaten mount, §25.4 Pas 4). dynamic import → chunk
// split, ssr default true.
const StickyCtaBar = nextDynamic(() => import('@/components/marketing/StickyCtaBar'));

// Stage 134 §38.214 — /features/audit-center marketing surface.
// Stage 100 §38.180 Audit Center backend (`/dashboard/audits/*`) marketing
// parity. Pattern source: /features/review-management. Inline TR/EN ternary
// (CLAUDE.md §7), no new translation keys.

const VALID_LOCALES = ['tr', 'en'] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const title = isTr
    ? 'Denetim Merkezi — Operasyonel checklist + skorlama'
    : 'Audit Center — Operational checklists + scoring';
  const description = isTr
    ? 'Hijyen ve vardiya devri kontrol listelerini, işe alım testlerini hazır şablonlarla başlat. Ekip telefondan doldurur, aksayan maddeleri görürsün.'
    : 'Run hygiene and shift-handover checklists and hiring tests from ready-made templates. Your team fills them in on their phone; you see missed items.';
  const canonicalUrl = `https://www.buaze.com/${locale}/features/audit-center`;
  return {
    metadataBase: new URL('https://www.buaze.com'),
    title,
    description,
    keywords: isTr
      ? [
          'denetim merkezi',
          'operasyonel checklist',
          'hijiyen denetimi',
          'işe alım testi',
          'ekip eğitim değerlendirme',
          'KVKK uyumluluk checklist',
          'restoran operasyon yönetimi',
          'audit yazılımı',
        ]
      : [
          'audit center',
          'operational checklist',
          'hygiene audit software',
          'staff training assessment',
          'KVKK compliance checklist',
          'restaurant operations management',
          'audit software',
        ],
    alternates: {
      canonical: canonicalUrl,
      languages: {
        tr: 'https://www.buaze.com/tr/features/audit-center',
        en: 'https://www.buaze.com/en/features/audit-center',
        'x-default': 'https://www.buaze.com/tr/features/audit-center',
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
          alt: 'Buaze — Denetim Merkezi',
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

export default async function AuditCenterPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) notFound();

  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;
  const canonicalUrl = `https://www.buaze.com/${locale}/features/audit-center`;

  // Score card mockup — feels like a real audit response without animation
  const scoreMock = isTr
    ? {
        title: 'Mutfak Açılış Checklist\'i',
        sector: 'Restoran',
        sectorBg: '#FEF3C7',
        sectorFg: '#92400E',
        score: '92%',
        scoreLabel: 'GEÇTİ',
        scoreBg: '#DCFCE7',
        scoreFg: '#166534',
        items: [
          { q: 'Soğuk hava deposu sıcaklığı', a: 'Evet · +3°C', score: 'Tam' },
          { q: 'Sebze hazırlık alanı temizliği', a: 'Skala 5/5', score: 'Tam' },
          { q: 'Personel hijyen kontrolü', a: 'Skala 4/5', score: 'Yarım' },
          { q: 'Bulaşık makinesi sıcaklığı', a: 'Evet · 65°C', score: 'Tam' },
        ],
      }
    : {
        title: 'Kitchen Opening Checklist',
        sector: 'Restaurant',
        sectorBg: '#FEF3C7',
        sectorFg: '#92400E',
        score: '92%',
        scoreLabel: 'PASS',
        scoreBg: '#DCFCE7',
        scoreFg: '#166534',
        items: [
          { q: 'Cold storage temperature', a: 'Yes · +3°C', score: 'Full' },
          { q: 'Prep area cleanliness', a: 'Scale 5/5', score: 'Full' },
          { q: 'Staff hygiene check', a: 'Scale 4/5', score: 'Partial' },
          { q: 'Dishwasher temperature', a: 'Yes · 65°C', score: 'Full' },
        ],
      };

  // 4-up "operating loop" cards
  const cards = isTr
    ? [
        {
          icon: ClipboardList,
          title: 'Şablon kütüphanesi',
          body: 'Restoran, otel, klinik, perakende, güzellik ve diğer sektörler için hazır şablonlar. Buaze ekibi tarafından hazırlanan denetim şablonlarını kopyalayıp kendine göre düzenle.',
        },
        {
          icon: Users,
          title: 'Linkle paylaş',
          body: 'Denetimi yayınla, linki WhatsApp veya e-posta ile ekibine gönder. Giriş gerekmez; telefondan doldurulur. Her yanıtta kimin, ne zaman, hangi cevabı verdiğini görürsün.',
        },
        {
          icon: BarChart3,
          title: 'Otomatik skor + manuel inceleme',
          body: 'Çoktan seçmeli, evet/hayır ve skala maddeleri otomatik skorlanır; metin cevaplarını istersen elle puanlarsın. İstersen yüzdelik, ağırlıklı veya geç/başarısız modunu seç.',
        },
        {
          icon: FileBarChart,
          title: 'Tarihsel raporlama',
          body: 'Yanıt sayısı, ortalama puan ve en çok aksayan maddeler tek ekranda. Yanıtları tek tek incele, istersen tablo olarak (CSV) indir.',
        },
      ]
    : [
        {
          icon: ClipboardList,
          title: 'Template library',
          body: 'Ready-made templates for restaurants, hotels, clinics, retail, beauty and other sectors. Copy the Buaze-curated audit templates and customize them for your operation.',
        },
        {
          icon: Users,
          title: 'Share with a link',
          body: 'Publish the audit and send the link to your team by WhatsApp or e-mail. No login needed; it\'s filled on a phone. Every response shows who answered what and when.',
        },
        {
          icon: BarChart3,
          title: 'Auto-score + manual review',
          body: 'Multiple-choice, yes/no and scale items auto-score; you can score text answers by hand. Optionally pick percentage, weighted or pass/fail scoring.',
        },
        {
          icon: FileBarChart,
          title: 'Historical reporting',
          body: 'Response count, average score and the items missed most often on one screen. Review responses one by one and download them as a table (CSV).',
        },
      ];

  const featureList = isTr
    ? [
        '6 sektör için hazır şablon (restoran, otel, klinik, perakende, güzellik, diğer)',
        '6 soru tipi: evet/hayır, skala 1-5, tek seçim, çoklu seçim, kısa metin, fotoğraf',
        '3 skor modu: yüzdelik, ağırlıklı, geç/başarısız (pass/fail)',
        'Paylaşım linki: giriş gerektirmez, telefondan açılır',
        'Aynı link her gün kullanılabilir; metin cevaplarını elle puanlayabilirsin',
        'CSV dışa aktarım, KVKK uyumlu IP saklama',
      ]
    : [
        'Ready templates for 6 sectors (restaurant, hotel, clinic, retail, beauty, other)',
        '6 question types: yes/no, scale 1-5, single choice, multi choice, short text, photo',
        '3 scoring modes: percentage, weighted, pass/fail',
        'Share link: no login, opens on a phone',
        'The same link works every day; score text answers by hand',
        'CSV export, KVKK-compliant IP retention',
      ];

  const faqs = isTr
    ? [
        {
          q: 'Denetim Merkezi nedir?',
          a: 'Restoran, otel veya kliniğin günlük operasyonel kontrollerini (hijyen, açılış kontrol listesi, vardiya değişimi), işe alım testlerini ve eğitim değerlendirmelerini şablon olarak hazırlayıp linkle ekibine veya adaylara paylaştığın, otomatik skorlu bir denetim sistemidir. Buaze\'in operasyonel disiplin modülüdür.',
        },
        {
          q: 'Hazır şablonlar var mı, yoksa sıfırdan mı yazmalıyım?',
          a: '6 sektör için Buaze ekibinin hazırladığı şablonlar var: restoran (mutfak açılış, servis senaryosu), otel (housekeeping günlük, check-out akışı), klinik (sterilizasyon günlük, KVKK hasta verisi), perakende (mağaza açılış, müşteri şikayet), güzellik (randevu haftalık, master self-assessment), genel (CX haftalık özet, day-1 onboarding). Hazır şablonu kopyalayıp kendi operasyonuna göre düzenle.',
        },
        {
          q: 'Skorlama nasıl çalışır?',
          a: 'Üç mod var: yüzdelik (doğru cevap / puanlanan madde × 100), ağırlıklı (her maddenin ağırlığı tanımlanır, toplam ağırlık üzerinden hesap) ve geç/başarısız (geçer puan eşiği, üstüyse PASS altıysa FAIL). Çoktan seçmeli, evet/hayır ve skala maddeleri otomatik skorlanır; kısa metin cevaplarını istersen elle puanlarsın. Doğru cevabı olmayan maddeler (not, fotoğraf) puana katılmaz.',
        },
        {
          q: 'Adaylara ve dışarıdan kişilere nasıl gönderirim?',
          a: 'Denetimi yayınla, paylaşım linkini kopyala ve adaylara gönder. Doldurma sırasında ad, e-posta ve telefon isteğe bağlı istenir; test sonucu adaya gösterilmez, yanıtları sen görürsün.',
        },
        {
          q: 'Panelle entegre mi, ayrı bir araç mı?',
          a: 'Denetim Merkezi, Buaze panelinde Yorumlar ve QR ile aynı yerde durur; ayrı bir araç veya giriş gerekmez. Denetim sonuçlarını ve yorumları aynı panelden izlersin.',
        },
      ]
    : [
        {
          q: 'What is the Audit Center?',
          a: 'A scoring-based audit system where you turn daily operational checks (hygiene, opening checklist, shift handover), hiring tests and training assessments into templates, then share them by link with your team or candidates. Buaze\'s operational discipline module.',
        },
        {
          q: 'Are there ready templates, or do I write from scratch?',
          a: 'Ready templates exist for 6 sectors curated by the Buaze team: restaurant (kitchen opening, service scenario), hotel (daily housekeeping, check-out flow), clinic (daily sterilization, KVKK patient data), retail (store opening, customer complaint), beauty (weekly appointment, master self-assessment), generic (weekly CX summary, day-1 onboarding). Copy a ready template and tailor it to your operation.',
        },
        {
          q: 'How does scoring work?',
          a: 'Three modes: percentage (correct / scored items × 100), weighted (each item carries a weight, total over all weights) and pass/fail (set a threshold — above is PASS, below is FAIL). Multiple-choice, yes/no and scale items auto-score; you can score short-text answers by hand. Items without a correct answer (notes, photos) are not scored.',
        },
        {
          q: 'How do I send it to candidates or people outside my team?',
          a: 'Publish the audit, copy the share link and send it to candidates. Name, e-mail and phone are asked optionally; the result isn\'t shown to the candidate, you see the answers.',
        },
        {
          q: 'Is it part of the panel, or a separate tool?',
          a: 'Audit Center lives in the same Buaze panel as Reviews and QR; no separate tool or login. You follow audit results and reviews from one place.',
        },
      ];

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: isTr ? 'Buaze Denetim Merkezi' : 'Buaze Audit Center',
    serviceType: isTr ? 'Operasyonel denetim ve skorlama' : 'Operational audit and scoring',
    provider: { '@type': 'Organization', name: 'Buaze', url: 'https://www.buaze.com' },
    areaServed: 'TR',
    availableLanguage: ['tr-TR', 'en-US'],
    url: canonicalUrl,
    description: isTr
      ? 'Hijyen denetimi, işe alım testi, KVKK uyumluluk ve ekip eğitim değerlendirmesini şablon, paylaşım linki ve otomatik skorla yöneten Buaze operasyon modülü. 6 sektör için hazır şablon + 6 soru tipi + 3 skor modu.'
      : 'Buaze operations module managing hygiene audits, hiring tests, KVKK compliance and team training assessments via templates, share links and auto-scoring. Ready templates for 6 sectors + 6 question types + 3 scoring modes.',
    // No `offers`: a price-0 Offer read as "this product is free" while
    // the module is part of paid plans (only the trial is free).
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: isTr ? 'Denetim Merkezi yetenekleri' : 'Audit Center capabilities',
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
      { '@type': 'ListItem', position: 3, name: isTr ? 'Denetim Merkezi' : 'Audit Center', item: canonicalUrl },
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
    name: isTr ? 'Buaze ile operasyonel denetim çalıştırma' : 'Run an operational audit with Buaze',
    description: isTr
      ? 'Buaze Denetim Merkezi\'nde şablon seçip linki ekibinle paylaşıp sonuçları okuma akışı.'
      : 'Pick a template in Buaze Audit Center, share the link with your team and read the results.',
    url: canonicalUrl,
    steps: isTr
      ? [
          { name: 'Hazır şablonu seç veya boş başla', text: 'Buaze panelinde Denetim Merkezi > Hazır şablonlar altında sektörüne uygun şablonu seç ve kullan, ya da kopyalayıp düzenle. Boş bir denetim de başlatabilirsin.' },
          { name: 'Maddeleri ekle', text: '6 tip arasından seç: evet/hayır, 1-5 puan, tek seçim, çoklu seçim, not, fotoğraf. Uygun veya doğru cevabı belirle, sırala ve yayınla.' },
          { name: 'Linki paylaş', text: 'Denetimi yayınla; Buaze sana bir paylaşım linki verir. WhatsApp veya e-posta ile ekibine gönder; telefondan açıp doldursunlar, giriş gerekmez. Aynı link her gün kullanılabilir.' },
          { name: 'Dikkat edilecek maddeleri oku', text: 'Otomatik skor anında hesaplanır; en çok aksayan maddeler listelenir. Metin cevaplarını elle puanlayabilir, sonuçları CSV olarak indirebilirsin.' },
        ]
      : [
          { name: 'Pick a ready template or start blank', text: 'In the Buaze panel, under Audit Center > Ready-made templates, pick a template for your sector and use it, or copy and edit it. You can also start a blank audit.' },
          { name: 'Add items', text: 'Pick from 6 types: yes/no, 1-5 rating, single choice, multi choice, note, photo. Set the expected or correct answer, reorder and publish.' },
          { name: 'Share the link', text: 'Publish the audit and Buaze gives you a share link. Send it to your team by WhatsApp or e-mail; they open it on a phone and fill it in, no login needed. The same link works every day.' },
          { name: 'Read the items needing attention', text: 'The auto-score is calculated instantly and the items missed most often are listed. You can score text answers by hand and download the results as CSV.' },
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
                  {isTr ? 'DENETİM MERKEZİ' : 'AUDIT CENTER'}
                </span>
              </div>
              <h1 className="mt-5 text-[40px] font-medium leading-[0.98] tracking-[-0.035em] text-white sm:text-[56px] md:text-[52px] lg:text-[76px]">
                {isTr ? (
                  <>
                    Operasyonu ölç,{' '}
                    <span className="inline-block -skew-y-1 rounded-lg bg-[#C6F24E] px-3 py-0.5 text-[#0A0A0A]">
                      geliştir
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Measure operations,{' '}
                    <span className="inline-block -skew-y-1 rounded-lg bg-[#C6F24E] px-3 py-0.5 text-[#0A0A0A]">
                      improve
                    </span>
                    .
                  </>
                )}
              </h1>
              <p className="mt-6 max-w-[560px] text-[17px] leading-[1.6] text-white/70 sm:text-[18px]">
                {isTr
                  ? 'Hijyen denetimi, işe alım testi, KVKK uyumluluk, ekip eğitim değerlendirmesi. Şablon seç, linki paylaş, otomatik skorla. Operasyonel disiplinin yorumun kalitesini şekillendirir.'
                  : 'Hygiene audits, hiring tests, KVKK compliance, team training assessments. Pick a template, share the link, auto-score. Operational discipline shapes the quality of your reviews.'}
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
                  ? ['6 sektör için hazır şablon', '6 soru tipi · 3 skor modu', 'KVKK uyumlu']
                  : ['Ready templates for 6 sectors', '6 question types · 3 scoring modes', 'KVKK compliant']
                ).map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <span className="inline-block h-1 w-1 rounded-full bg-[#C6F24E]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Score card mockup — mobile max-w stabilization (Stage 135
                §38.215): mobile portrait'ta hero card 100vw doldurmasın,
                420px üst sınır + center; sm+'da grid sütunu tam doldurur. */}
            <div className="relative mx-auto w-full max-w-[440px] sm:max-w-none">
              <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.18)] sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="pulse-eyebrow text-[#737373]">
                    {isTr ? 'DENETIM SONUCU' : 'AUDIT RESULT'}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                    style={{ background: scoreMock.scoreBg, color: scoreMock.scoreFg }}
                  >
                    {scoreMock.scoreLabel}
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <h3 className="text-[16px] font-semibold leading-tight text-[#0A0A0A]">
                    {scoreMock.title}
                  </h3>
                  <p
                    className="text-[42px] font-medium leading-none tracking-tight text-[#0A0A0A]"
                    style={{ fontFamily: 'var(--font-space-grotesk)' }}
                  >
                    {scoreMock.score}
                  </p>
                </div>
                <span
                  className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: scoreMock.sectorBg, color: scoreMock.sectorFg }}
                >
                  {scoreMock.sector}
                </span>
                <div className="mt-4 grid gap-2">
                  {scoreMock.items.map((item) => (
                    <article
                      key={item.q}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-[#0A0A0A]">{item.q}</p>
                        <p className="mt-0.5 text-[11px] text-[#737373]">{item.a}</p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          item.score === (isTr ? 'Tam' : 'Full')
                            ? 'bg-[#DCFCE7] text-[#166534]'
                            : 'bg-[#FEF3C7] text-[#92400E]'
                        }`}
                      >
                        {item.score}
                      </span>
                    </article>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl border border-[#EDEDED] bg-white px-3 py-2 text-[11px] text-[#525252]">
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={11} />
                    {isTr ? 'Ali Ş. · Şef · 09:14' : 'Ali S. · Chef · 09:14'}
                  </span>
                  <span className="pulse-eyebrow text-[#A8D62E]">
                    {isTr ? 'YÜZDELİK' : 'PERCENTAGE'}
                  </span>
                </div>
              </div>
              <span className="absolute -top-3 -right-3 inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-3 py-1 text-[11px] font-semibold text-[#0A0A0A]">
                {isTr ? '6 sektör' : '6 sectors'}
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
                {isTr ? 'Denetim Merkezi neden önemli?' : 'Why does the Audit Center matter?'}
              </h2>
              <div className="mt-5 space-y-4 text-[15px] sm:text-[17px] leading-[1.65] text-[#525252]">
                <p>
                  {isTr
                    ? 'Müşteri yorumlarınızı yönetmek tek başına yeterli değildir. Düşük puanın sebebi vardı: muhtemelen bir vardiyada hijyen kontrolü atlandı, yeni bir çalışanın eğitimi eksik kaldı, açılış kontrol listesi doldurulmadı. Buaze Denetim Merkezi bu sebebi bulup düzeltmek için tasarlandı.'
                    : 'Managing customer reviews is not enough by itself. There was a reason for the low rating: a shift missed a hygiene check, a new hire\'s training was incomplete, the opening checklist was not filled in. The Buaze Audit Center is designed to find and fix that reason.'}
                </p>
              </div>
              {/* Pull quote accent — featured snippet eligibility + visual rhythm */}
              <blockquote className="mt-6 rounded-r-2xl border-l-[3px] border-[#C6F24E] bg-[#EAF9B8]/30 px-5 py-4 sm:px-6 sm:py-5">
                <p className="text-[15px] sm:text-[17px] font-medium leading-[1.55] text-[#0A0A0A]">
                  {isTr
                    ? '"Operasyonel disiplin yorumun kalitesini şekillendirir. Denetim olmadan yorum yönetimi sebep-sonuç bağı kurmadan reaktif kalır."'
                    : '"Operational discipline shapes the quality of your reviews. Without audits, review management stays reactive — missing the cause-and-effect link."'}
                </p>
              </blockquote>
            </div>

            <div>
              <span className="pulse-eyebrow text-[#A8D62E]">
                {isTr ? 'TEK PANEL' : 'ONE PANEL'}
              </span>
              <h2 className="mt-3 text-[28px] sm:text-[40px] font-medium leading-[1.05] tracking-[-0.03em] text-[#0A0A0A]">
                {isTr ? 'Buaze ile diğer audit araçlardan farkı ne?' : 'How is Buaze different from other audit tools?'}
              </h2>
              <div className="mt-5 space-y-4 text-[15px] sm:text-[17px] leading-[1.65] text-[#525252]">
                <p>
                  {isTr
                    ? 'Çoğu audit yazılımı tek başına çalışır — şablonlar, formlar, sonuçlar bir sistem; müşteri yorumları başka bir sistem. Buaze\'de Denetim Merkezi, Yorum Yönetimi ve Pulse AI aynı operasyon panelinde buluşur. Yorumları ve denetim sonuçlarını ayrı sistemler arasında gidip gelmeden aynı yerden izlersin.'
                    : 'Most audit software lives alone — templates, forms, results in one system; customer reviews in another. In Buaze, the Audit Center, Review Management and Pulse AI meet in the same operating panel. You follow reviews and audit results from one place instead of jumping between separate systems.'}
                </p>
                <p>
                  {isTr
                    ? 'Pratik fark: 6 sektör için Buaze ekibinin hazırladığı şablonlar (restoran mutfak açılış, otel housekeeping günlük, klinik sterilizasyon, perakende mağaza açılış, güzellik master self-assessment, genel CX haftalık) hazır. Kopyala, kendi operasyonuna göre düzenle, linkle paylaş. Sıfırdan yazma yükü yok; ayrı bir araç + ek lisans + ayrı login yok.'
                    : 'Practical difference: ready templates by the Buaze team for 6 sectors (restaurant kitchen opening, hotel daily housekeeping, clinic sterilization, retail store opening, beauty master self-assessment, generic weekly CX) come included. Copy, customize, share by link. No from-scratch authoring burden; no separate tool + extra license + extra login.'}
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
                {isTr ? 'DENETIM DÖNGÜSÜ' : 'AUDIT LOOP'}
              </span>
              <h2 className="mt-3 text-[26px] font-medium leading-[1.04] tracking-[-0.03em] text-[#0A0A0A] sm:text-[42px]">
                {isTr ? 'Şablonla. Paylaş. Skorla. Düzelt.' : 'Templatize. Share. Score. Improve.'}
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

        {/* ─── SPEC ROW — 3 verifiable stats (Stage 135 §38.215 polish) ─── */}
        <section className="px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-3">
            {[
              {
                l: isTr ? 'HAZIR ŞABLON' : 'READY TEMPLATES',
                v: '25+',
                sub: isTr
                  ? '6 sektör, Buaze ekibi tarafından hazırlanmış — kopyala, kendi operasyonuna göre düzenle, linkle paylaş'
                  : '6 sectors, curated by the Buaze team — copy, customize, share by link',
              },
              {
                l: isTr ? 'SORU TİPİ' : 'QUESTION TYPES',
                v: '5',
                sub: isTr
                  ? 'Tek seçim, çoktan seçim, skala 1-5, kısa metin, evet/hayır'
                  : 'Single, multi, scale 1-5, short text, yes/no',
              },
              {
                l: isTr ? 'SKOR MODU' : 'SCORING MODES',
                v: '3',
                sub: isTr
                  ? 'Yüzdelik, ağırlıklı, geç/başarısız (pass/fail)'
                  : 'Percentage, weighted, pass/fail',
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
            ("audit-center for restaurants"); her pill /solutions/<sektor>
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
                  ? 'Denetim Merkezi 6 sektör için hazır şablon taşır; ama yapıyı kendi operasyonuna göre düzenleyebileceğin için her sektör için kullanılabilir.'
                  : 'The Audit Center ships ready templates for 6 sectors; you can also tailor the structure to any operation, so any sector can use it.'}
              </p>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Utensils,
                  label: isTr ? 'Restoran & Kafe' : 'Restaurant & Café',
                  sub: isTr ? 'Mutfak açılış, servis senaryosu' : 'Kitchen opening, service scenario',
                  href: `${base}/solutions/restaurants`,
                },
                {
                  icon: BookOpen,
                  label: isTr ? 'Otel' : 'Hotel',
                  sub: isTr ? 'Housekeeping günlük, check-out' : 'Daily housekeeping, check-out',
                  href: `${base}/solutions/hotels`,
                },
                {
                  icon: Stethoscope,
                  label: isTr ? 'Klinik & Sağlık' : 'Clinic & Health',
                  sub: isTr ? 'Sterilizasyon, KVKK hasta verisi' : 'Sterilization, KVKK patient data',
                  href: `${base}/solutions/healthcare`,
                },
                {
                  icon: ShoppingBag,
                  label: isTr ? 'Perakende' : 'Retail',
                  sub: isTr ? 'Mağaza açılış, şikayet senaryosu' : 'Store opening, complaint scenario',
                  href: `${base}/solutions/retail`,
                },
                {
                  icon: Sparkles,
                  label: isTr ? 'Güzellik & Spa' : 'Beauty & Spa',
                  sub: isTr ? 'Master self-assessment' : 'Master self-assessment',
                  href: `${base}/solutions/beauty-salon`,
                },
                {
                  icon: Scale,
                  label: isTr ? 'Hukuk Ofisi' : 'Legal',
                  sub: isTr ? 'KVKK + danışmanlık akışı' : 'KVKK + consultation flow',
                  href: `${base}/solutions/law-firms`,
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
                  ? 'Sektörünü göremiyor musun? Boş bir denetimle sıfırdan başlayabilirsin.'
                  : "Don't see your sector? You can start from scratch with a blank audit."}
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
              {isTr ? 'Denetim Merkezi hakkında her şey.' : 'Everything about the Audit Center.'}
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
              <Link href={`${base}/features/surveys`} className="rounded-full border border-[#EDEDED] px-3 py-1 hover:border-[#0A0A0A]">
                {isTr ? 'Anketler' : 'Surveys'}
              </Link>
              <Link href={`${base}/features/pulse-ai`} className="rounded-full border border-[#EDEDED] px-3 py-1 hover:border-[#0A0A0A]">
                Pulse AI
              </Link>
              <Link href={`${base}/features/review-management`} className="rounded-full border border-[#EDEDED] px-3 py-1 hover:border-[#0A0A0A]">
                {isTr ? 'Yorum Yönetimi' : 'Review Management'}
              </Link>
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="bg-[#C6F24E] px-5 py-[60px] text-center sm:px-10 sm:py-24">
          <div className="mx-auto max-w-[860px]">
            <ClipboardCheck className="mx-auto mb-5 text-[#0A0A0A]" size={34} strokeWidth={2.2} />
            <h2 className="text-[28px] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[48px]">
              {isTr ? 'Operasyonu disiplinle yönet.' : 'Run operations with discipline.'}
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
      {/* Stage 135 §38.215 — desktop/tablet sticky CTA (`hidden md:block`
          intact, scroll threshold 600px). Mobile MobileBottomNav §25.4
          Pas 4 zaten footer'da. */}
      <StickyCtaBar locale={locale} />
    </div>
  );
}
