import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  Inbox,
  Users,
  MessageSquare,
  ShieldCheck,
  Clock,
  Filter,
  Tag,
  ChevronDown,
} from 'lucide-react';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import PlatformLogo, { type PlatformId } from '@/components/marketing/PlatformLogo';
import { jsonLdString } from '@/lib/seo/json-ld';
import { getTranslations, type Locale } from '@/lib/translations';

export const dynamic = 'force-dynamic';

const VALID_LOCALES = ['tr', 'en'] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const title = isTr
    ? 'Yorum Yönetimi — Tüm platformlar tek panelde | Buaze'
    : 'Review Management — Every platform in one inbox | Buaze';
  const description = isTr
    ? 'Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Foursquare ve daha fazlasından gelen yorumları tek panelde topla. Atama, etiket, SLA takibi ve onay kontrollü yanıt akışı; KVKK + Google policy uyumlu.'
    : 'Bring reviews from Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Foursquare and more into one inbox. Assignment, tags, SLA tracking and approval-led replies — KVKK and Google policy compliant.';
  const canonicalUrl = `https://buaze.com/${locale}/features/review-management`;
  return {
    metadataBase: new URL('https://buaze.com'),
    title,
    description,
    keywords: isTr
      ? [
          'yorum yönetimi',
          'çoklu platform yorum gelen kutusu',
          'Google yorum yönetimi',
          'Yemeksepeti yorum',
          'Getir yorum',
          'restoran yorum yanıtlama',
          'KVKK uyumlu yorum',
          'müşteri geri bildirim platformu',
        ]
      : [
          'review management',
          'unified review inbox',
          'Google review management',
          'restaurant review reply',
          'multi-platform reviews',
          'customer feedback platform',
          'review SLA tracking',
        ],
    alternates: {
      canonical: canonicalUrl,
      languages: {
        tr: 'https://buaze.com/tr/features/review-management',
        en: 'https://buaze.com/en/features/review-management',
        'x-default': 'https://buaze.com/en/features/review-management',
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
          url: 'https://buaze.com/opengraph-image',
          width: 1200,
          height: 630,
          alt: 'Buaze — Yorum Yönetimi',
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://buaze.com/opengraph-image'],
    },
  };
}

export default async function ReviewManagementPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) notFound();

  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;
  const canonicalUrl = `https://buaze.com/${locale}/features/review-management`;

  // Inbox mockup rows — feels alive without animation. Brand colors are real.
  const inboxRows: Array<{
    id: PlatformId;
    title: string;
    snippet: string;
    rating: 1 | 2 | 3 | 4 | 5;
    sla: string;
    tag: string;
    tagBg: string;
    tagFg: string;
  }> = isTr
    ? [
        {
          id: 'google',
          title: 'Mert D. · Google',
          snippet: 'Servis çok yavaştı, ana yemek 40 dk geç geldi.',
          rating: 2,
          sla: '12 dk önce',
          tag: 'Yeni · Mutfak',
          tagBg: '#FEF3C7',
          tagFg: '#92400E',
        },
        {
          id: 'tripadvisor',
          title: 'Hotel Nora · Tripadvisor',
          snippet: 'Oda temizdi, kahvaltı çeşidi azdı.',
          rating: 3,
          sla: '1 sa önce',
          tag: 'Atandı · Şube müdürü',
          tagBg: '#DBEAFE',
          tagFg: '#1E40AF',
        },
        {
          id: 'yemeksepeti',
          title: 'Ayşe K. · Yemeksepeti',
          snippet: 'Sıcak geldi, paketleme harika. 5★!',
          rating: 5,
          sla: '3 sa önce',
          tag: 'Yanıtlandı',
          tagBg: '#DCFCE7',
          tagFg: '#166534',
        },
      ]
    : [
        {
          id: 'google',
          title: 'Mark D. · Google',
          snippet: 'Service was painfully slow, main came 40 min late.',
          rating: 2,
          sla: '12 min ago',
          tag: 'New · Kitchen',
          tagBg: '#FEF3C7',
          tagFg: '#92400E',
        },
        {
          id: 'tripadvisor',
          title: 'Hotel Nora · Tripadvisor',
          snippet: 'Room was clean, breakfast variety was limited.',
          rating: 3,
          sla: '1 hr ago',
          tag: 'Assigned · Manager',
          tagBg: '#DBEAFE',
          tagFg: '#1E40AF',
        },
        {
          id: 'yemeksepeti',
          title: 'Ayse K. · Yemeksepeti',
          snippet: 'Arrived hot, packaging was perfect. 5★!',
          rating: 5,
          sla: '3 hr ago',
          tag: 'Replied',
          tagBg: '#DCFCE7',
          tagFg: '#166534',
        },
      ];

  // 4-up "How it works" cards — each owns a verb in the operating loop.
  const cards = isTr
    ? [
        {
          icon: Inbox,
          title: 'Topla',
          body: 'Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Foursquare, Yandex ve diğer platformlar tek operasyon paneline akar. Yeni platform tek tıkla bağlanır.',
        },
        {
          icon: Users,
          title: 'Ata',
          body: 'Yorum, şube veya kişiye atanır; viewer rolündeki ekip üyesi yazma akışında otomatik kapanır. SLA sayacı atanan andan itibaren çalışır.',
        },
        {
          icon: MessageSquare,
          title: 'Yanıtla',
          body: 'Owner taslağı görür, düzenler, onaylar. Pulse AI öneri yardımcı kalır; otomatik public cevap yoktur. Kontrol her zaman işletmede.',
        },
        {
          icon: ShieldCheck,
          title: 'Uyumlu kal',
          body: 'KVKK + Google review-gating disiplini disiplini kod seviyesinde gate edilir; admin entitlement kapalıyken API hard-block döner. Sahte yorum üretmez.',
        },
      ]
    : [
        {
          icon: Inbox,
          title: 'Collect',
          body: 'Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Foursquare, Yandex and other platforms stream into one operating panel. New platforms connect in one click.',
        },
        {
          icon: Users,
          title: 'Assign',
          body: 'A review is routed to a branch or teammate; viewer-role members are auto-blocked from write actions. SLA counter starts the moment it is assigned.',
        },
        {
          icon: MessageSquare,
          title: 'Reply',
          body: 'The owner reviews the draft, edits, approves. Pulse AI suggests but never auto-publishes. The business stays in control.',
        },
        {
          icon: ShieldCheck,
          title: 'Stay compliant',
          body: 'KVKK + Google review-gating discipline is gated at the code level; APIs hard-block when admin entitlement is off. No fabricated reviews.',
        },
      ];

  // Feature list — 6 specific, verifiable capabilities (not a marketing wishlist).
  const featureList = isTr
    ? [
        'Çoklu platform yorum gelen kutusu (Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Foursquare, Yandex, Booking, Airbnb)',
        'Şube ve ekip üyesi atama, viewer/manager/staff rolleri',
        'Etiket sistemi: mutfak, servis, paket, ambiyans + özel etiketler',
        'SLA sayacı + bekleyen düşük puan uyarısı',
        'Pulse AI ile taslak öneri, owner onaylı yanıt akışı',
        'KVKK + Google review-gating uyumlu mimari, hard-block entitlement',
      ]
    : [
        'Multi-platform review inbox (Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Foursquare, Yandex, Booking, Airbnb)',
        'Branch and teammate assignment with viewer/manager/staff roles',
        'Tagging system: kitchen, service, packaging, ambience + custom tags',
        'SLA timer + low-rating waiting alerts',
        'Pulse AI draft suggestions, owner-approved reply flow',
        'KVKK + Google review-gating compliant architecture, hard-block entitlements',
      ];

  // 5-question FAQ — Google Rich Results + Perplexity / Bing Chat / Gemini AIO.
  const faqs = isTr
    ? [
        {
          q: 'Hangi yorum platformlarını destekliyorsunuz?',
          a: 'Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Foursquare, Yandex, Booking ve Airbnb. Yeni platform isteklerini admin panelden ekliyoruz; talep dokümante edilir.',
        },
        {
          q: 'Düşük puanları platforma yansımadan engelliyor musunuz?',
          a: 'Hayır. Buaze yorum gating yapmaz. Düşük puan veren müşteri istediği platforma yorum yazma hakkını korur; biz sadece müşteriye dahili geri bildirim seçeneği sunarız.',
        },
        {
          q: 'AI yanıtları otomatik public yapıyor musunuz?',
          a: 'Hayır. Pulse AI sadece taslak öneri üretir; her yanıt owner veya yetkili ekip üyesi tarafından onaylanır. Otomatik public cevap mimari olarak kapalıdır.',
        },
        {
          q: 'KVKK ve Google policy uyumu nasıl sağlanıyor?',
          a: 'IP retention 90 gün, açık rıza opt-in, müşteri agency wording kanonik. Google review yönetimi admin entitlement ile gate edilir; kapalıyken API hard-block döner.',
        },
        {
          q: 'Birden fazla şube için tek panel kullanabilir miyim?',
          a: 'Evet. Restoran zinciri sahibi tek hesapla tüm şubeleri yönetir; her şube ayrı QR, ayrı raporlama, ortak inbox ile çalışır.',
        },
      ]
    : [
        {
          q: 'Which review platforms do you support?',
          a: 'Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Foursquare, Yandex, Booking and Airbnb. New platform requests are added from the admin panel; requests are documented.',
        },
        {
          q: 'Do you block low ratings from going to the platform?',
          a: 'No. Buaze does not gate reviews. A customer who left a low rating keeps the right to post on any public platform; we only offer the option of private feedback to the business first.',
        },
        {
          q: 'Does Pulse AI publish replies automatically?',
          a: 'No. Pulse AI only generates a draft; every reply is approved by the owner or an authorized team member. Auto-publish is architecturally disabled.',
        },
        {
          q: 'How do you stay compliant with KVKK and Google policy?',
          a: 'IP retention 90 days, opt-in marketing consent, customer-agency wording canonical. Google review management is gated by an admin entitlement; APIs hard-block when off.',
        },
        {
          q: 'Can I manage multiple branches in one panel?',
          a: 'Yes. A chain owner manages every branch from one account; each branch has its own QR and reporting, while the inbox stays shared.',
        },
      ];

  // Schemas: Service (better fit than SoftwareApplication for an in-product
  // module) + Breadcrumb + FAQPage. CLAUDE.md §35.6 schema matrix.
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: isTr ? 'Buaze Yorum Yönetimi' : 'Buaze Review Management',
    serviceType: isTr ? 'Çoklu platform yorum yönetimi' : 'Multi-platform review management',
    provider: { '@type': 'Organization', name: 'Buaze', url: 'https://buaze.com' },
    areaServed: 'TR',
    availableLanguage: ['tr-TR', 'en-US'],
    url: canonicalUrl,
    description: isTr
      ? 'Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor ve diğer yorum platformlarını tek panelde yöneten Buaze ürün modülü. Atama, SLA, Pulse AI taslak yanıt ve KVKK uyumu içerir.'
      : 'Buaze product module that manages Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor and other review platforms in one panel. Includes assignment, SLA, Pulse AI drafts and KVKK compliance.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: isTr ? 'TRY' : 'USD',
      description: isTr ? '14 gün ücretsiz deneme; kart gerektirmez.' : '14-day free trial; no card required.',
      url: `${base}/auth/register`,
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: isTr ? 'Yorum Yönetimi yetenekleri' : 'Review Management capabilities',
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
      { '@type': 'ListItem', position: 3, name: isTr ? 'Yorum Yönetimi' : 'Review Management', item: canonicalUrl },
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

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faqSchema) }} />
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
                  {isTr ? 'YORUM YÖNETİMİ · v3' : 'REVIEW MANAGEMENT · v3'}
                </span>
              </div>
              <h1 className="mt-5 text-[38px] font-medium leading-[0.98] tracking-[-0.035em] text-white sm:text-[60px] md:text-[48px] lg:text-[72px]">
                {isTr ? (
                  <>
                    Her platformdan gelen yorum,{' '}
                    <span className="inline-block -skew-y-1 rounded-lg bg-[#C6F24E] px-3 py-0.5 text-[#0A0A0A]">
                      tek panelde
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Every platform review,{' '}
                    <span className="inline-block -skew-y-1 rounded-lg bg-[#C6F24E] px-3 py-0.5 text-[#0A0A0A]">
                      in one inbox
                    </span>
                    .
                  </>
                )}
              </h1>
              <p className="mt-6 max-w-[560px] text-[17px] leading-[1.6] text-white/70 sm:text-[18px]">
                {isTr
                  ? 'Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor ve daha fazlasından gelen yorumları tek operasyon paneline çek. Atama, SLA, Pulse AI taslak ve onay kontrollü yanıt akışı; KVKK + Google policy uyumlu.'
                  : 'Bring reviews from Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor and more into one operating panel. Assignment, SLA, Pulse AI draft and approval-led reply flow — KVKK + Google policy compliant.'}
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
                  href={`${base}/features/pulse-ai`}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-6 py-3 text-[15px] font-medium text-white transition-colors hover:border-white/60 hover:bg-white/5"
                >
                  {isTr ? 'Pulse AI yanıtlarını gör' : 'See Pulse AI replies'}
                </Link>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/60">
                {(isTr
                  ? ['9+ platform', 'TR + EN dil desteği', 'KVKK + Google policy uyumlu']
                  : ['9+ platforms', 'TR + EN', 'KVKK + Google policy ready']
                ).map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <span className="inline-block h-1 w-1 rounded-full bg-[#C6F24E]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Live inbox mockup — multi-platform rows, real brand colors */}
            <div className="relative">
              <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.18)] sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="pulse-eyebrow text-[#737373]">
                    {isTr ? 'GELEN KUTUSU · BUGÜN' : 'INBOX · TODAY'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-2.5 py-1 text-[11px] font-semibold text-[#C6F24E]">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C6F24E] pulse-heartbeat" />
                    {isTr ? 'CANLI' : 'LIVE'}
                  </span>
                </div>
                <div className="mt-4 grid gap-2.5">
                  {inboxRows.map((row) => (
                    <article
                      key={row.id}
                      className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-3.5"
                    >
                      <div className="flex items-center gap-3">
                        <PlatformLogo id={row.id} size={36} rounded={9} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[13px] font-semibold text-[#0A0A0A]">{row.title}</p>
                            <span className="pulse-eyebrow text-[#0A0A0A]">
                              {'★'.repeat(row.rating)}
                              <span className="text-[#A3A3A3]">{'☆'.repeat(5 - row.rating)}</span>
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-[12px] leading-[1.5] text-[#525252]">
                            {row.snippet}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: row.tagBg, color: row.tagFg }}
                        >
                          <Tag size={9} />
                          {row.tag}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#737373]">
                          <Clock size={10} />
                          {row.sla}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl border border-[#EDEDED] bg-white px-3 py-2 text-[12px] text-[#525252]">
                  <span className="inline-flex items-center gap-1.5">
                    <Filter size={12} />
                    {isTr ? '3 / 47 yorum gösteriliyor' : 'Showing 3 of 47 reviews'}
                  </span>
                  <span className="pulse-eyebrow text-[#A8D62E]">SLA ≤ 24h</span>
                </div>
              </div>
              <span className="absolute -top-3 -right-3 inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-3 py-1 text-[11px] font-semibold text-[#0A0A0A]">
                {isTr ? '9+ platform' : '9+ platforms'}
              </span>
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS — 4 cards ─── */}
        <section className="border-y border-[#EDEDED] bg-[#FAFAFA] px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="mx-auto max-w-[1200px]">
            <div className="max-w-[640px]">
              <span className="pulse-eyebrow text-[#737373]">
                {isTr ? 'OPERASYON DÖNGÜSÜ' : 'OPERATING LOOP'}
              </span>
              <h2 className="mt-3 text-[26px] font-medium leading-[1.04] tracking-[-0.03em] text-[#0A0A0A] sm:text-[42px]">
                {isTr ? 'Topla. Ata. Yanıtla. Uyumlu kal.' : 'Collect. Assign. Reply. Stay compliant.'}
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

        {/* ─── SPEC ROW — 3 verifiable stats ─── */}
        <section className="px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                l: isTr ? 'PLATFORM SAYISI' : 'PLATFORMS',
                v: '9+',
                sub: isTr
                  ? 'Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Foursquare, Yandex, Booking, Airbnb'
                  : 'Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Foursquare, Yandex, Booking, Airbnb',
              },
              {
                l: isTr ? 'SLA EŞİĞİ' : 'SLA TARGET',
                v: '≤24sa',
                sub: isTr
                  ? 'Düşük puan bekletilirse owner ve atanan üye uyarı alır'
                  : 'Owner and assignee get an alert when a low rating waits past target',
              },
              {
                l: isTr ? 'DİL DESTEĞİ' : 'LANGUAGES',
                v: 'TR + EN',
                sub: isTr
                  ? 'Yorum metni dili ne olursa olsun panel + AI taslak iki dilde'
                  : 'Whatever language the review is in, the panel and AI drafts are bilingual',
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
              {isTr ? 'Yorum yönetimi hakkında her şey.' : 'Everything about review management.'}
            </h2>
            <div className="mt-8 divide-y divide-[#EDEDED] border-y border-[#EDEDED]">
              {faqs.map((f, idx) => (
                <details
                  key={f.q}
                  className="group py-5"
                  // First two open by default for visual confidence + AIO snippets.
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
              <Link href={`${base}/google-compliance`} className="rounded-full border border-[#EDEDED] px-3 py-1 hover:border-[#0A0A0A]">
                {isTr ? 'Google policy uyumu' : 'Google policy compliance'}
              </Link>
              <Link href={`${base}/features/analytics-reports`} className="rounded-full border border-[#EDEDED] px-3 py-1 hover:border-[#0A0A0A]">
                {isTr ? 'Analitik & Raporlar' : 'Analytics & Reports'}
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
            <Inbox className="mx-auto mb-5 text-[#0A0A0A]" size={34} strokeWidth={2.2} />
            <h2 className="text-[28px] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[48px]">
              {isTr ? 'Yorum akışını bugün sadeleştir.' : 'Simplify your review flow today.'}
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
