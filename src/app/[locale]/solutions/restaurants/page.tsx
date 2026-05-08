import type { Metadata } from 'next';
import Link from 'next/link';
import { jsonLdString } from '@/lib/seo/json-ld';
import { ArrowRight, ChevronRight, MessageSquare, Utensils, Sparkles, BarChart3 } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import FaqAccordion, { type FaqItem } from '@/components/marketing/FaqAccordion';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { buildSolutionSchema } from '@/lib/solution-schema';
import { getRelatedSolutions } from '@/lib/related-solutions';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === 'tr'
      ? 'Restoran & Kafe İtibar Yönetimi — Buaze'
      : 'Restaurant & Café Reputation Management — Buaze';
  const description =
    locale === 'tr'
      ? 'Masaya QR koy: Buaze müşteri kohortunda ilk 90 günde organik Google yorumlarınız ortalama %184 büyüyor. Her misafire Google bağlantısı sunulur; isteyen ek olarak ekibinize özel geri bildirim de gönderebilir.'
      : 'Put a QR on the table — Buaze customer cohort sees an average +184% organic Google review growth in the first 90 days. Every guest gets the Google review link; private feedback is an optional extra step.';
  return {
    title,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/restaurants`,
      languages: {
        tr: 'https://buaze.com/tr/solutions/restaurants',
        en: 'https://buaze.com/en/solutions/restaurants',
      },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/restaurants` },
  };
}

/**
 * 1:1 with .design/site/site-marketing.jsx:SolutionPage (lines 393-481).
 * Light gray hero + table/QR/coffee/plate/star-bubble SVG + 3-stat grid
 * + 4-use-case grid.
 */
export default async function RestaurantsSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;

  const stats = isTr
    ? [
        { k: '+184%', l: 'Organik Google yorum artışı', d: 'İlk 90 gün ortalaması' },
        { k: '4.8 / 5', l: 'Ortalama Google puanı', d: 'Buaze kullanıcılarının' },
        { k: '12 dk', l: 'Ortalama yanıt süresi', d: 'Takım atama sonrası' },
      ]
    : [
        { k: '+184%', l: 'Organic Google review growth', d: 'First 90-day average' },
        { k: '4.8 / 5', l: 'Avg. Google rating', d: 'Across Buaze customers' },
        { k: '12 min', l: 'Avg. reply time', d: 'After team assignment' },
      ];

  const useCases = isTr
    ? [
        { t: 'Masa QR', d: 'Her masa için özel kod — masa numarasıyla eşleştir.' },
        { t: 'Fatura QR', d: 'Fiş altına kod bas, ödeme sonrası yorum.' },
        { t: 'Kapıda veda', d: 'Kapıdaki stand, çıkışta son dokunuş.' },
        { t: 'Paket siparişte', d: "Pakete sticker'lı kart; evde yorum bırakır." },
      ]
    : [
        { t: 'Table QR', d: 'One code per table — maps to the table number.' },
        { t: 'Receipt QR', d: 'Print the code at the bottom of the bill.' },
        { t: 'Door farewell', d: 'A stand by the exit — the last-touch moment.' },
        { t: 'Inside packaging', d: 'A stickered card in the bag; review from home.' },
      ];

  // Sector-specific benefits — 4 tiles. Pulse design (graphite + lime),
  // each tile shows an icon, h3 headline, and a tight body.
  const benefits = isTr
    ? [
        {
          Icon: MessageSquare,
          h: 'Masada anlık geri bildirim',
          d: 'Misafir masadayken QR\'ı taradığında deneyim taze; düşük puanı servisin son saniyesinde yakalarsın, kapıda mutsuz uğurlamak yerine hemen çözüm sun.',
        },
        {
          Icon: Utensils,
          h: 'Çoklu platform yönlendirme',
          d: 'Google + Yemeksepeti + Getir + Trendyol GO + isteğe bağlı Tripadvisor / Foursquare aynı akışta. Müşteriye seçtiğin platformlar sunulur, tercih müşteride kalır.',
        },
        {
          Icon: Sparkles,
          h: 'Pulse AI yanıt taslağı',
          d: 'Düşük puanlı yorumlara saniyeler içinde kişiselleştirilmiş yanıt taslağı. İşletme sahibi onaylar veya düzenler, otomatik gönderim yok.',
        },
        {
          Icon: BarChart3,
          h: 'Şube + masa analitiği',
          d: 'Hangi masa, hangi şube, hangi vardiya en çok yorum çekiyor? QR scan + feedback funnel\'ını birleştir, operasyonel kararı veriyle al.',
        },
      ]
    : [
        {
          Icon: MessageSquare,
          h: 'Live feedback at the table',
          d: 'When the guest scans the QR while still seated, the experience is fresh — you catch low ratings in the last seconds of service and resolve them in person, not at the door.',
        },
        {
          Icon: Utensils,
          h: 'Multi-platform routing',
          d: 'Google + Yemeksepeti + Getir + Trendyol GO + optionally Tripadvisor / Foursquare in one flow. Customers see the platforms you select; the choice stays with the customer.',
        },
        {
          Icon: Sparkles,
          h: 'Pulse AI reply drafts',
          d: 'A personalized reply draft for every low-rating review in seconds. The owner approves or edits; nothing is auto-sent.',
        },
        {
          Icon: BarChart3,
          h: 'Branch + table analytics',
          d: 'Which table, which branch, which shift attracts the most reviews? Combine the QR scan + feedback funnel and make operational calls from data.',
        },
      ];

  // Sector-specific FAQ — 5 questions feeding both the visible accordion
  // and the FAQPage JSON-LD via buildSolutionSchema's faqs prop. Every
  // answer reinforces customer agency (CLAUDE.md §19.1.1) and avoids the
  // four review-gating signals (block / hide / star-branching / incentive).
  const faqs: FaqItem[] = isTr
    ? [
        {
          q: 'Restoran için Buaze kurulumu ne kadar sürer?',
          a: 'Ortalama 5-10 dakika. Hesabını aç, Google İşletme bağlantını yapıştır (isteğe bağlı: Yemeksepeti / Getir / Trendyol GO), masaya yapıştırılacak QR kartını PDF olarak indir, yazdır. Onboarding sihirbazı (5 adım) tüm bağlantıları sırayla toplar. İlk yorum genellikle aynı gün gelir.',
        },
        {
          q: 'Yemeksepeti, Getir ve Trendyol GO yönlendirmesi nasıl çalışır?',
          a: 'Owner panelden bu platformların herkese açık yorum bağlantılarını eklersin; QR akışında müşteriye seçilen platformlar sunulur. Her müşteri istediği platforma yorum yazma hakkını korur. Yıldız bazlı erişim kısıtlaması yok; akış sadece müşteri tercihiyle yönlendirir.',
        },
        {
          q: 'Masa-bazlı QR kullanabilir miyim?',
          a: 'Evet. Her masa için ayrı QR oluşturabilir, masa numarasını URL parametresine gömebilirsin. Yorum geldiğinde admin paneli "Masa 7 - 23:14" gibi gösterir; hangi vardiya, hangi servis ekibi, hangi masa konfigürasyonu en çok yorum çekiyor — analytics raporunda görürsün.',
        },
        {
          q: 'Düşük puan veren müşteri "kaybolur" mu?',
          a: 'Hayır. Buaze hiçbir yorumu engellemez veya gizlemez. Düşük puan veren müşteriler ek olarak ekibinizle özel paylaşım yapma seçeneği görür — pratikte ~%85\'i bu özel kanalı tercih eder. Müşteri her zaman herkese açık platforma yorum yazma hakkını korur; siz sadece sorunu özelden çözme şansı kazanırsınız.',
        },
        {
          q: 'Çoklu şubem var, nasıl yönetilir?',
          a: 'Her şube için ayrı işletme oluştur veya tek işletme + şube etiketleri (Buaze branch field) kullan. Analitik şube bazlı ayrılır: hangi şube ortalama 4.7, hangi şube 4.2 — peak hours ve müşteri yorumları şube bazlı incelenebilir. Pricing planı şube sayısına göre ölçeklenir.',
        },
      ]
    : [
        {
          q: 'How long does Buaze setup take for a restaurant?',
          a: 'About 5-10 minutes on average. Open an account, paste your Google Business link (optionally Yemeksepeti / Getir / Trendyol GO), download the table-QR PDF and print it. The 5-step onboarding wizard collects all links in sequence. The first review usually arrives the same day.',
        },
        {
          q: 'How does Yemeksepeti, Getir, and Trendyol GO routing work?',
          a: 'You add the public review links of these platforms in the owner panel; the selected platforms are surfaced to customers in the QR flow. Every customer keeps the right to post on any platform of their choice. There is no star-rating gate; the flow only routes by customer preference.',
        },
        {
          q: 'Can I use table-level QRs?',
          a: 'Yes. You can generate a separate QR per table and embed the table number in the URL parameter. When a review arrives, the admin panel shows it as "Table 7 - 11:14 PM"; which shift, which service team, which table configuration attracts the most reviews — visible in the analytics report.',
        },
        {
          q: 'Will customers giving low ratings simply "disappear"?',
          a: 'No. Buaze never blocks or hides any review. Customers giving low ratings additionally see an option to share privately with your team — in practice ~85% choose this private channel. The customer always retains the right to post on a public platform; you simply gain a chance to resolve the issue privately first.',
        },
        {
          q: 'I have multiple branches — how do I manage them?',
          a: 'Either create a separate business per branch or use a single business + branch tags (Buaze branch field). Analytics splits per branch: which branch averages 4.7, which 4.2 — peak hours and customer reviews can be analyzed per branch. Pricing plans scale with the number of branches.',
        },
      ];

  const relatedSolutions = getRelatedSolutions('restaurants', 4);

  const jsonLd = buildSolutionSchema({
    locale,
    slug: 'restaurants',
    industryLabel: isTr ? 'Restoran & Kafe' : 'Restaurant & Café',
    serviceName: isTr ? 'Restoran & Kafe İtibar Yönetimi' : 'Restaurant & Café Reputation Management',
    description: isTr
      ? 'Masaya QR koy: Buaze müşteri kohortunda ilk 90 günde organik Google yorumlarınız ortalama %184 büyüyor. Her misafire Google bağlantısı sunulur; isteyen ek olarak ekibinize özel geri bildirim de gönderebilir.'
      : 'Put a QR on the table — Buaze customer cohort sees an average +184% organic Google review growth in the first 90 days. Every guest gets the Google review link; private feedback is an optional extra step.',
    faqs,
  });

  return (
    <div className="min-h-screen bg-white lg:pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* Hero — light gray bg, 2-column */}
      <section className="bg-[#FAFAFA] px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          <div>
            <span className="pulse-eyebrow font-semibold text-[#C6F24E]">
              {isTr ? 'ÇÖZÜM · RESTORAN & KAFE' : 'SOLUTION · RESTAURANT & CAFÉ'}
            </span>
            <h1
              className="mt-3 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[68px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]"
            >
              {isTr ? (
                <>
                  Masanın sesi,
                  <br />
                  Google&apos;da.
                </>
              ) : (
                <>
                  Your table&apos;s voice,
                  <br />
                  on Google.
                </>
              )}
            </h1>
            <p className="mt-5 max-w-[520px] text-[15px] leading-[1.55] text-[#525252] sm:text-[18px]">
              {isTr
                ? "Masaya QR koy: Buaze müşteri kohortunda ilk 90 günde organik Google yorumlarınız ortalama %184 büyüyor. Her misafire Google bağlantısını sunuyoruz; ek olarak isteyen, ekibine özel geri bildirim de gönderebiliyor. 1.200+ restoran ve kafe Buaze'i tercih ediyor."
                : 'Put a QR on the table — Buaze customer cohort sees an average +184% organic Google review growth in the first 90 days. Every guest gets the Google review link; anyone who wants to share private feedback with your team can do so in the same flow. Trusted by 1,200+ restaurants and cafés.'}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-[#1A1A1A]"
              >
                {isTr ? 'Ücretsiz dene' : 'Try for free'}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`${base}/contact`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#0A0A0A] px-6 py-3.5 text-[15px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#0A0A0A] hover:text-white"
              >
                {isTr ? 'Demo iste' : 'Request demo'}
              </Link>
            </div>
          </div>

          {/* Restaurant table scene SVG (1:1 design) */}
          <div className="flex justify-center lg:justify-end">
            <svg viewBox="0 0 320 280" className="h-auto w-full max-w-[420px]" aria-hidden>
              <ellipse cx="160" cy="180" rx="140" ry="30" fill="#0A0A0A" />
              <ellipse cx="160" cy="175" rx="140" ry="30" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
              <path d="M110 190 L100 260 M210 190 L220 260" stroke="#0A0A0A" strokeWidth="3" />
              <rect x="140" y="80" width="60" height="95" rx="4" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
              <rect x="148" y="90" width="44" height="44" fill="#0A0A0A" rx="3" />
              {[
                [0, 0], [1, 0], [3, 0], [0, 1], [2, 1], [3, 1],
                [0, 3], [2, 3], [1, 2], [3, 2],
              ].map(([x, y], i) => (
                <rect key={i} x={150 + x * 9} y={92 + y * 9} width="7" height="7" fill="#C6F24E" />
              ))}
              <text x="170" y="152" textAnchor="middle" fontFamily="Space Grotesk" fontSize="9" fontWeight="500" fill="#0A0A0A">
                {isTr ? 'TARA' : 'SCAN'}
              </text>
              <text x="170" y="164" textAnchor="middle" fontFamily="Space Grotesk" fontSize="7" fill="#737373">
                buaze.com
              </text>
              <ellipse cx="70" cy="165" rx="20" ry="6" fill="#0A0A0A" />
              <path d="M55 160 L55 145 Q55 140 60 140 L80 140 Q85 140 85 145 L85 160 Z" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
              <path d="M85 146 Q92 146 92 152 Q92 158 85 158" fill="none" stroke="#0A0A0A" strokeWidth="2" />
              <path d="M62 132 Q65 125 68 132 M72 132 Q75 125 78 132" stroke="#A3A3A3" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <ellipse cx="250" cy="165" rx="30" ry="8" fill="#EDEDED" />
              <ellipse cx="250" cy="163" rx="30" ry="8" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
              <path
                d="M220 15 Q220 5 230 5 L290 5 Q300 5 300 15 L300 45 Q300 55 290 55 L260 55 L250 65 L250 55 L230 55 Q220 55 220 45 Z"
                fill="#C6F24E"
                stroke="#0A0A0A"
                strokeWidth="2"
              />
              <text x="260" y="34" textAnchor="middle" fontFamily="Inter" fontSize="13" fontWeight="700" fill="#0A0A0A">
                ★★★★★
              </text>
            </svg>
          </div>
        </div>
      </section>

      {/* 3-stat grid */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-16">
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <div key={s.l} className="rounded-[14px] border border-[#EDEDED] bg-[#FAFAFA] p-7">
              <div
                className="text-[48px] sm:text-[56px] font-medium leading-none tracking-[-0.03em] text-[#0A0A0A]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {s.k}
              </div>
              <div className="mt-2.5 text-[15px] font-semibold text-[#0A0A0A]">{s.l}</div>
              <div className="mt-1 text-[12px] text-[#737373]">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases — 4-col */}
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-24">
        <div className="mx-auto max-w-[1200px]">
          <h2
            className="text-[26px] sm:text-[42px] font-medium leading-[1.05] tracking-[-0.03em] text-[#0A0A0A]"
          >
            {isTr
              ? 'Restoranın her noktasında, bir nabız.'
              : 'A pulse at every point in your restaurant.'}
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((u) => (
              <div
                key={u.t}
                className="flex flex-col gap-2.5 rounded-[12px] border border-[#EDEDED] p-[22px]"
              >
                <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
                  <path
                    d="M4 6 Q4 2 8 2 L24 2 Q28 2 28 6 L28 18 Q28 22 24 22 L12 22 L6 28 L6 22 Q4 22 4 18 Z"
                    fill="#C6F24E"
                    stroke="#0A0A0A"
                    strokeWidth="1.5"
                  />
                  <circle cx="16" cy="12" r="2" fill="#0A0A0A" />
                </svg>
                <h3
                  className="text-[18px] font-semibold text-[#0A0A0A]"
                >
                  {u.t}
                </h3>
                <p className="text-[13px] leading-[1.55] text-[#525252]">{u.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits — 4-tile grid */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-24 border-t border-[#EDEDED]">
        <div className="max-w-[1100px] mx-auto">
          <span className="pulse-eyebrow text-[#A8D62E]">
            {isTr ? 'NEDEN BUAZE' : 'WHY BUAZE'}
          </span>
          <h2 className="mt-3 text-[26px] sm:text-[36px] lg:text-[42px] font-medium tracking-[-0.03em] leading-[1.1] text-[#0A0A0A] max-w-[680px]">
            {isTr
              ? 'Restoran operasyonuna özel dört kazanç'
              : 'Four wins built for restaurant operations'}
          </h2>
          <div className="mt-9 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {benefits.map((b, i) => (
              <div key={i} className="bz-card p-6 sm:p-7">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF9B8] text-[#0A0A0A]">
                  <b.Icon size={16} />
                </div>
                <h3 className="bz-h-tight mt-4 text-[18px] sm:text-[20px] font-semibold tracking-[-0.01em] text-[#0A0A0A]">
                  {b.h}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-[#525252]">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#FAFAFA] border-t border-[#EDEDED] px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="max-w-[820px] mx-auto">
          <span className="pulse-eyebrow text-[#A8D62E]">
            {isTr ? 'SIKÇA SORULAN SORULAR' : 'FREQUENTLY ASKED QUESTIONS'}
          </span>
          <h2 className="mt-3 text-[26px] sm:text-[36px] font-medium tracking-[-0.03em] leading-[1.1] text-[#0A0A0A]">
            {isTr ? 'Restoran kurulumu için merak edilenler' : 'Common questions for restaurant setup'}
          </h2>
          <div className="mt-8">
            <FaqAccordion faqs={faqs} defaultOpen={[0]} />
          </div>
        </div>
      </section>

      {/* Resources / Related Solutions */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-20 border-t border-[#EDEDED]">
        <div className="max-w-[1100px] mx-auto">
          <span className="pulse-eyebrow text-[#A8D62E]">
            {isTr ? 'İLGİLİ KAYNAKLAR' : 'RELATED RESOURCES'}
          </span>
          <h2 className="mt-3 text-[24px] sm:text-[32px] font-medium tracking-[-0.03em] leading-[1.1] text-[#0A0A0A]">
            {isTr ? 'Daha fazlasını keşfet' : 'Explore more'}
          </h2>
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href={`${base}/pricing`}
              className="group flex items-center gap-3 bg-white border border-[#EDEDED] rounded-2xl p-4 hover:border-[#C6F24E] transition-colors"
            >
              <span className="text-[13px] font-medium text-[#0A0A0A] leading-tight">
                {isTr ? 'Fiyatlandırma' : 'Pricing'}
              </span>
              <ChevronRight size={14} className="ml-auto text-[#A3A3A3] group-hover:text-[#0A0A0A] transition-colors" />
            </Link>
            <Link
              href={`${base}/roi`}
              className="group flex items-center gap-3 bg-white border border-[#EDEDED] rounded-2xl p-4 hover:border-[#C6F24E] transition-colors"
            >
              <span className="text-[13px] font-medium text-[#0A0A0A] leading-tight">
                {isTr ? 'ROI Hesaplayıcı' : 'ROI Calculator'}
              </span>
              <ChevronRight size={14} className="ml-auto text-[#A3A3A3] group-hover:text-[#0A0A0A] transition-colors" />
            </Link>
            <Link
              href={`${base}/solutions/qr-generator`}
              className="group flex items-center gap-3 bg-white border border-[#EDEDED] rounded-2xl p-4 hover:border-[#C6F24E] transition-colors"
            >
              <span className="text-[13px] font-medium text-[#0A0A0A] leading-tight">
                {isTr ? 'Ücretsiz QR Oluştur' : 'Free QR Generator'}
              </span>
              <ChevronRight size={14} className="ml-auto text-[#A3A3A3] group-hover:text-[#0A0A0A] transition-colors" />
            </Link>
            <Link
              href={`${base}/google-compliance`}
              className="group flex items-center gap-3 bg-white border border-[#EDEDED] rounded-2xl p-4 hover:border-[#C6F24E] transition-colors"
            >
              <span className="text-[13px] font-medium text-[#0A0A0A] leading-tight">
                {isTr ? 'Google Uyumluluğu' : 'Google Compliance'}
              </span>
              <ChevronRight size={14} className="ml-auto text-[#A3A3A3] group-hover:text-[#0A0A0A] transition-colors" />
            </Link>
          </div>
          {relatedSolutions.length > 0 && (
            <>
              <h3 className="bz-h-tight mt-12 text-[18px] sm:text-[20px] text-[#0A0A0A]">
                {isTr ? 'Diğer sektörler' : 'Other sectors'}
              </h3>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {relatedSolutions.map((sol) => (
                  <Link
                    key={sol.slug}
                    href={`${base}/solutions/${sol.slug}`}
                    className="group flex items-center gap-3 bg-white border border-[#EDEDED] rounded-2xl p-4 hover:border-[#C6F24E] transition-colors"
                  >
                    <span className="shrink-0 w-9 h-9 bg-[#EAF9B8] rounded-lg flex items-center justify-center text-[#0A0A0A]">
                      <sol.Icon size={16} />
                    </span>
                    <span className="text-[13px] font-medium text-[#0A0A0A] leading-tight">
                      {isTr ? sol.tr : sol.en}
                    </span>
                    <ChevronRight size={14} className="ml-auto text-[#A3A3A3] group-hover:text-[#0A0A0A] transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Dark CTA band */}
      <section className="bg-[#0A0A0A] text-white px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="mx-auto max-w-[900px] text-center">
          <h2
            className="text-[28px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em]"
          >
            {isTr ? 'Her masa, bir fırsat.' : 'Every table, an opportunity.'}
          </h2>
          <p className="mt-4 text-[16px] text-white/70 max-w-[560px] mx-auto">
            {isTr
              ? '14 gün ücretsiz · Kredi kartı istemiyoruz · 2 dakikada kurulum'
              : '14-day free · No credit card · 2-minute setup'}
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href={`${base}/auth/register`}
              className="inline-flex items-center justify-center gap-2 bg-[#C6F24E] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#A8D62E] transition-colors"
            >
              {isTr ? 'Ücretsiz başla' : 'Start free'}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
