import type { Metadata } from 'next';
import Link from 'next/link';
import { jsonLdString } from '@/lib/seo/json-ld';
import { ArrowRight, ChevronRight, Receipt, ShoppingBag, Sparkles, BarChart3 } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import FaqAccordion, { type FaqItem } from '@/components/marketing/FaqAccordion';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { buildSolutionSchema } from '@/lib/solution-schema';
import { buildHowToSchema } from '@/lib/seo/howto-schema';
import { getRelatedSolutions } from '@/lib/related-solutions';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === 'tr'
      ? 'Perakende & Mağaza İtibar Yönetimi — Buaze'
      : 'Retail & Store Reputation Management — Buaze';
  const description =
    locale === 'tr'
      ? 'Müşteri kasadan çıkarken fişinin altındaki QR\'ı tarar. Google ve Yandex\'e yönlendirilir. Çok mağaza, tek panel.'
      : 'Customers scan the QR under the receipt on the way out. Routed to Google and Yandex. Multi-store, one panel.';
  return {
    title,
    description,
    alternates: {
      canonical: `https://buaze.com/${locale}/solutions/retail`,
      languages: {
        tr: 'https://buaze.com/tr/solutions/retail',
        en: 'https://buaze.com/en/solutions/retail',
      },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/retail` },
  };
}

/**
 * 1:1 with .design/site/site-pages4.jsx:RetailSolutionPage (lines 246-292).
 * Dark hero + IllusChart + 4-stat grid + 3-feature grid.
 */
export default async function RetailSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';
  const base = `/${locale}`;

  const stats = isTr
    ? [
        { value: '+210%', label: 'Yorum artışı (ilk 30 gün)' },
        { value: 'Sınırsız', label: 'Çok mağaza desteği' },
        { value: '%88', label: 'Google sıralama iyileşme' },
        { value: '25sn', label: 'Ortalama yorum süresi' },
      ]
    : [
        { value: '+210%', label: 'Review lift (first 30 days)' },
        { value: 'Unlimited', label: 'Multi-store support' },
        { value: '88%', label: 'Google rank improvement' },
        { value: '25s', label: 'Avg. review time' },
      ];

  const features = isTr
    ? [
        {
          title: 'Fiş QR entegrasyonu',
          desc: 'POS sistemine plug-in veya ERP\'den API ile fiş altına otomatik QR basılır.',
        },
        {
          title: 'Mağaza bazlı analiz',
          desc: 'Zincir genelinde en iyi/en kötü mağazayı karşılaştır. Bölge yöneticisine haftalık özet.',
        },
        {
          title: 'Sezonsal kampanya',
          desc: '"Yılbaşı indirimi" gibi dönemsel kampanyalarda anlık yorum takibi.',
        },
      ]
    : [
        {
          title: 'Receipt QR integration',
          desc: 'POS plug-in or ERP API auto-prints the QR at the bottom of every receipt.',
        },
        {
          title: 'Per-store analytics',
          desc: 'Compare best- and worst-performing stores across the chain. Weekly digest to regional managers.',
        },
        {
          title: 'Seasonal campaigns',
          desc: 'Real-time review tracking during seasonal pushes like year-end sales.',
        },
      ];

  const benefits = isTr
    ? [
        { Icon: Receipt, h: 'Fiş altı + kasa QR\'ları', d: 'Her fişin altına QR + kasada genel QR. Müşteri ödeme sonrası deneyimini taze yorumlar — kapı çıkışı yerine işlem-an-anı.' },
        { Icon: ShoppingBag, h: 'Çoklu platform yönlendirme', d: 'Google + Yandex + Foursquare aynı akışta. Müşteri seçtiği platforma yorum yazar; tercih müşteride kalır, yıldız bazlı kısıtlama yok.' },
        { Icon: Sparkles, h: 'Pulse AI yanıt taslağı', d: 'Stokta yok / kasiyer ilgisi / mağaza temizliği gibi farklı şikayet türlerine ayrı ton. Yönetici onaylar, otomatik gönderim yok.' },
        { Icon: BarChart3, h: 'Mağaza + vardiya analitiği', d: 'Hangi mağaza, hangi vardiya, hangi kategori (gıda / giyim / elektronik) en çok düşük puan çekiyor? Operasyonel kararı veriyle al.' },
      ]
    : [
        { Icon: Receipt, h: 'Receipt + register QRs', d: 'A QR under every receipt + a general QR at the register. The customer reviews the experience while it\'s fresh — at the moment of transaction, not at the door.' },
        { Icon: ShoppingBag, h: 'Multi-platform routing', d: 'Google + Yandex + Foursquare in one flow. The customer posts on the platform of their choice; no star-rating gate.' },
        { Icon: Sparkles, h: 'Pulse AI reply drafts', d: 'Different tone for "out of stock" vs "cashier attentiveness" vs "store cleanliness" complaints. Manager approves; nothing auto-sent.' },
        { Icon: BarChart3, h: 'Store + shift analytics', d: 'Which store, which shift, which category (grocery / apparel / electronics) attracts the most low ratings? Make operational calls from data.' },
      ];

  const faqs: FaqItem[] = isTr
    ? [
        { q: 'Perakende mağaza için Buaze nasıl çalışır?', a: 'Her fişin altına QR sticker basarsın (POS yazılımı entegrasyonu varsa otomatik) + kasada genel bir QR yerleştirirsin. Müşteri kasadan çıkarken QR\'ı tarar, deneyimini puanlar ve seçtiğin platformlara (Google, Yandex, Foursquare) yönlendirilir.' },
        { q: 'Birden fazla mağaza nasıl yönetirim?', a: 'Her mağaza için ayrı işletme oluştur veya tek işletme + mağaza etiketleri (Buaze branch field) kullan. Analytics mağaza bazlı ayrılır: hangi mağaza ortalama 4.7, hangi mağaza 4.2 — bölge müdürü doğrudan veriden görür. Pricing planı mağaza sayısına göre ölçeklenir.' },
        { q: 'Düşük puan veren müşteri ne olur?', a: 'Buaze hiçbir yorumu engellemez veya gizlemez. Düşük puan veren müşteriler ek olarak mağaza yönetimiyle özel paylaşım yapma seçeneği görür — pratikte ~%85\'i bu özel kanalı tercih eder. Müşteri her zaman herkese açık platformlara yorum yazma hakkını korur; siz sorunu özelden (iade, değişim, ek hizmet) çözme şansı kazanırsınız.' },
        { q: 'Vardiya / kasiyer bazlı performans takip eder miyim?', a: 'Evet. QR\'a vardiya ID veya kasiyer etiketi URL parametresi olarak eklenebilir; yorum geldiğinde hangi vardiya + hangi kasiyer + saat loglanır. Analytics raporunda mağaza yönetimi vardiya bazlı memnuniyet farklarını görür.' },
        { q: 'Yandex entegrasyonu var mı?', a: 'Evet. Yandex Maps yorum bağlantısını owner panelden eklersin; akış müşteriye Yandex bağlantısı sunar. Türkiye\'de Yandex arama hacmi büyüyor; özellikle Anadolu mağazaları için Google\'la birlikte ikinci kanal olarak değerli.' },
      ]
    : [
        { q: 'How does Buaze work for a retail store?', a: 'You print a QR sticker under every receipt (auto if your POS supports it) + place a general QR at the register. As the customer leaves, they scan the QR, rate the experience, and are routed to the platforms you have selected (Google, Yandex, Foursquare).' },
        { q: 'How do I manage multiple stores?', a: 'Either create a separate business per store or use a single business + store tags (Buaze branch field). Analytics splits per store: which one averages 4.7, which 4.2 — area managers see it directly from data. Pricing scales with store count.' },
        { q: 'What happens to customers giving low ratings?', a: 'Buaze never blocks or hides any review. Customers giving low ratings additionally see an option to share privately with store management — in practice ~85% choose this private channel. The customer always retains the right to post on any public platform; you gain a chance to resolve the issue privately first (refund, exchange, extra service).' },
        { q: 'Can I track shift / cashier performance?', a: 'Yes. The QR can carry a shift ID or cashier tag as a URL parameter; when the review arrives, which shift + which cashier + time is logged. Store management sees per-shift satisfaction differences in the analytics report.' },
        { q: 'Is there Yandex integration?', a: 'Yes. You add the Yandex Maps review link in the owner panel; the flow surfaces the Yandex link to the customer. Yandex search volume is growing in Turkey; especially for Anatolian stores, Yandex is a valuable second channel alongside Google.' },
      ];

  const relatedSolutions = getRelatedSolutions('retail', 4);

  const jsonLd = buildSolutionSchema({
    locale,
    slug: 'retail',
    industryLabel: isTr ? 'Perakende & Mağaza' : 'Retail & Store',
    serviceName: isTr ? 'Perakende & Mağaza İtibar Yönetimi' : 'Retail & Store Reputation Management',
    description: isTr
      ? "Müşteri kasadan çıkarken fişinin altındaki QR'ı tarar. Google ve Yandex'e yönlendirilir. Çok mağaza, tek panel."
      : 'Customers scan the QR under the receipt on the way out. Routed to Google and Yandex. Multi-store, one panel.',
    faqs,
  });

  const howTo = buildHowToSchema({
    locale,
    name: isTr ? 'Perakende mağazada Buaze yorum akışını kurma' : 'Set up the Buaze review flow for a retail store',
    description: isTr
      ? 'Fiş altında veya kasa yanında QR ile müşteri yorumu toplayıp çok mağazalı operasyonu tek panelden yönetme adımları.'
      : 'Steps to collect customer reviews via QR on the receipt or near the till and run multi-store operations from one panel.',
    url: `https://buaze.com/${locale}/solutions/retail`,
    steps: isTr
      ? [
          { name: 'Mağazaları tanımla', text: 'Her mağazayı ayrı işletme veya tek işletme + mağaza etiketi olarak panelde tanımla; Google ve Yandex bağlantılarını ekle.' },
          { name: 'Fiş altına veya kasa yanına QR yerleştir', text: 'Fiş alt boşluğuna QR baskı + kasa yanındaki stand — müşteri kasadan çıkarken son temas noktası kazanılır.' },
          { name: 'Mağaza müdürlerini ekibe ekle', text: 'Her mağaza müdürünü Buaze ekibine ekle; düşük puanları kendi mağazasında görsün, merkez yönetimi toplu raporu izlesin.' },
          { name: 'Pulse AI ile yanıtla ve karşılaştır', text: 'Pulse AI taslak üretir, mağaza müdürü onaylar; mağaza bazlı analitiklerden hangi şube ortalama 4.7, hangi 4.2 — operasyonel karar tek panelde alınır.' },
        ]
      : [
          { name: 'Identify each store', text: 'Set up each store as a separate business or single business + store tag; add Google and Yandex review links.' },
          { name: 'Place the QR on the receipt or near the till', text: 'Print the QR at the bottom of the receipt + a stand near the till — the last-touch moment as customers leave.' },
          { name: 'Invite store managers', text: 'Add each store manager to your Buaze team; let them see their own store\'s low ratings while head office tracks the aggregate.' },
          { name: 'Reply and benchmark via Pulse AI', text: 'Pulse AI drafts the reply, store manager approves; per-store analytics show which branch averages 4.7 vs 4.2 — operational decisions in one panel.' },
        ],
  });
  if (howTo) jsonLd.push(howTo);

  return (
    <div className="min-h-screen bg-white lg:pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* Hero — dark (1:1 .design/site/site-pages4.jsx:246-267) */}
      <section className="bg-[#0A0A0A] px-5 sm:px-10 pt-[60px] pb-10 sm:pt-20 text-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <span className="pulse-eyebrow text-[#C6F24E]">
              {isTr ? 'SEKTÖR · PERAKENDE & MAĞAZA' : 'SECTOR · RETAIL & STORE'}
            </span>
            <h1
              className="mt-3 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[68px] font-medium leading-[0.95] tracking-[-0.035em] text-white"
            >
              {isTr ? (
                <>
                  Fiş altına koy,
                  <br />
                  yorum
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5 text-[#0A0A0A]">
                    patlasın.
                  </span>
                </>
              ) : (
                <>
                  Put it under the
                  <br />
                  receipt —
                  <br />
                  <span className="inline-block rounded-md bg-[#C6F24E] px-2.5 text-[#0A0A0A]">
                    reviews boom.
                  </span>
                </>
              )}
            </h1>
            <p className="mt-[18px] max-w-[500px] text-[15px] sm:text-[16px] leading-[1.6] text-[#A3A3A3]">
              {isTr
                ? "Müşteri kasadan çıkarken fişinin altındaki QR'ı tarar. Google ve Yandex'e yönlendirilir. Çok mağaza, tek panel."
                : 'Customers scan the QR under their receipt on the way out — routed to Google and Yandex. Multi-store, one panel.'}
            </p>
            <div className="mt-6 flex flex-col gap-[10px] sm:flex-row">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#C6F24E] px-[22px] py-[14px] text-[15px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#A8D62E]"
              >
                {isTr ? '14 gün ücretsiz başla' : 'Start 14-day free trial'}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`${base}/contact`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#333] px-[22px] py-[14px] text-[15px] font-medium text-white transition-colors hover:border-white/60 hover:bg-white/5"
              >
                {isTr ? 'Demo iste' : 'Request demo'}
              </Link>
            </div>
          </div>

          {/* IllusChart — exact SVG from .design/site/site-shared.jsx:242-267 */}
          <div className="flex justify-center lg:justify-end">
            <svg viewBox="0 0 260 220" className="h-auto w-full max-w-[260px]" aria-hidden>
              <rect x="20" y="20" width="220" height="170" rx="10" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" />
              {[60, 100, 140, 180].map((y) => (
                <line key={y} x1="20" y1={y} x2="240" y2={y} stroke="#EDEDED" strokeWidth="1" />
              ))}
              {([
                [45, 90],
                [80, 70],
                [115, 100],
                [150, 55],
                [185, 80],
              ] as const).map(([x, h], i) => (
                <rect
                  key={i}
                  x={x - 10}
                  y={180 - h}
                  width="20"
                  height={h}
                  fill={i === 3 ? '#C6F24E' : '#0A0A0A'}
                  rx="3"
                />
              ))}
              <path
                d="M45 110 L80 130 L115 90 L150 60 L185 80"
                fill="none"
                stroke="#0A0A0A"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              <circle cx="150" cy="60" r="10" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
              <path d="M150 60 L220 30 L255 30" fill="none" stroke="#0A0A0A" strokeWidth="1.5" />
              <rect x="200" y="5" width="60" height="24" rx="12" fill="#0A0A0A" />
              <text x="230" y="21" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="10" fill="#C6F24E" fontWeight="600">
                +184%
              </text>
              <rect x="30" y="30" width="90" height="10" rx="5" fill="#0A0A0A" />
              <rect x="30" y="44" width="60" height="6" rx="3" fill="#EDEDED" />
              <circle cx="230" cy="170" r="12" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
              <path
                d="M215 200 Q230 185 245 200"
                fill="none"
                stroke="#0A0A0A"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-16">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="bz-card p-5 sm:p-6"
              >
                <div
                  className="text-[32px] sm:text-[36px] font-medium leading-none tracking-[-0.025em] text-[#0A0A0A]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {s.value}
                </div>
                <div className="pulse-eyebrow mt-2 text-[#737373]">{s.label}</div>
              </div>
            ))}
          </div>
          {/* Stage 95 §38.175 — cohort disclosure per CLAUDE.md §35.8. */}
          <p className="mt-8 text-center text-[11px] text-[#737373] max-w-[720px] mx-auto leading-[1.55]">
            {isTr
              ? '* Metrikler Buaze müşteri kohortunda ilk 90 gün ortalamasıdır; sonuçlar sektöre, lokasyona ve operasyon disiplinine göre değişir.'
              : '* Metrics reflect the Buaze customer cohort first 90-day average; results vary by sector, location and operational discipline.'}
          </p>
        </div>
      </section>

      {/* 3-feature grid */}
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-24">
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-[14px] border border-[#EDEDED] bg-white p-6"
            >
              <h3
                className="text-[20px] font-semibold tracking-[-0.015em] text-[#0A0A0A]"
              >
                {f.title}
              </h3>
              <p className="mt-2 text-[13px] leading-[1.55] text-[#525252]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits — 4-tile grid */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-24 border-t border-[#EDEDED]">
        <div className="max-w-[1100px] mx-auto">
          <span className="pulse-eyebrow text-[#A8D62E]">{isTr ? 'NEDEN BUAZE' : 'WHY BUAZE'}</span>
          <h2 className="mt-3 text-[26px] sm:text-[36px] lg:text-[42px] font-medium tracking-[-0.03em] leading-[1.1] text-[#0A0A0A] max-w-[680px]">
            {isTr ? 'Perakende operasyonuna özel dört kazanç' : 'Four wins built for retail operations'}
          </h2>
          <div className="mt-9 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {benefits.map((b, i) => (
              <div key={i} className="bz-card p-6 sm:p-7">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF9B8] text-[#0A0A0A]"><b.Icon size={16} /></div>
                <h3 className="bz-h-tight mt-4 text-[18px] sm:text-[20px] font-semibold tracking-[-0.01em] text-[#0A0A0A]">{b.h}</h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-[#525252]">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#FAFAFA] border-t border-[#EDEDED] px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="max-w-[820px] mx-auto">
          <span className="pulse-eyebrow text-[#A8D62E]">{isTr ? 'SIKÇA SORULAN SORULAR' : 'FREQUENTLY ASKED QUESTIONS'}</span>
          <h2 className="mt-3 text-[26px] sm:text-[36px] font-medium tracking-[-0.03em] leading-[1.1] text-[#0A0A0A]">
            {isTr ? 'Perakende için merak edilenler' : 'Common questions for retail'}
          </h2>
          <div className="mt-8"><FaqAccordion faqs={faqs} defaultOpen={[0]} /></div>
        </div>
      </section>

      {/* Resources / Related Solutions */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-20 border-t border-[#EDEDED]">
        <div className="max-w-[1100px] mx-auto">
          <span className="pulse-eyebrow text-[#A8D62E]">{isTr ? 'İLGİLİ KAYNAKLAR' : 'RELATED RESOURCES'}</span>
          <h2 className="mt-3 text-[24px] sm:text-[32px] font-medium tracking-[-0.03em] leading-[1.1] text-[#0A0A0A]">{isTr ? 'Daha fazlasını keşfet' : 'Explore more'}</h2>
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { href: `${base}/pricing`, tr: 'Fiyatlandırma', en: 'Pricing' },
              { href: `${base}/roi`, tr: 'ROI Hesaplayıcı', en: 'ROI Calculator' },
              { href: `${base}/solutions/qr-generator`, tr: 'Ücretsiz QR Oluştur', en: 'Free QR Generator' },
              { href: `${base}/google-compliance`, tr: 'Google Uyumluluğu', en: 'Google Compliance' },
            ].map((r) => (
              <Link key={r.href} href={r.href} className="group flex items-center gap-3 bg-white border border-[#EDEDED] rounded-2xl p-4 hover:border-[#C6F24E] transition-colors">
                <span className="text-[13px] font-medium text-[#0A0A0A] leading-tight">{isTr ? r.tr : r.en}</span>
                <ChevronRight size={14} className="ml-auto text-[#A3A3A3] group-hover:text-[#0A0A0A] transition-colors" />
              </Link>
            ))}
          </div>
          {relatedSolutions.length > 0 && (
            <>
              <h3 className="bz-h-tight mt-12 text-[18px] sm:text-[20px] text-[#0A0A0A]">{isTr ? 'Diğer sektörler' : 'Other sectors'}</h3>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {relatedSolutions.map((sol) => (
                  <Link key={sol.slug} href={`${base}/solutions/${sol.slug}`} className="group flex items-center gap-3 bg-white border border-[#EDEDED] rounded-2xl p-4 hover:border-[#C6F24E] transition-colors">
                    <span className="shrink-0 w-9 h-9 bg-[#EAF9B8] rounded-lg flex items-center justify-center text-[#0A0A0A]"><sol.Icon size={16} /></span>
                    <span className="text-[13px] font-medium text-[#0A0A0A] leading-tight">{isTr ? sol.tr : sol.en}</span>
                    <ChevronRight size={14} className="ml-auto text-[#A3A3A3] group-hover:text-[#0A0A0A] transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-[#0A0A0A] text-white px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="mx-auto max-w-[900px] text-center">
          <h2
            className="text-[28px] sm:text-[48px] font-medium leading-[1.02] tracking-[-0.035em]"
          >
            {isTr ? 'Mağaza ağınızı itibara çevirin.' : 'Turn your store network into reputation.'}
          </h2>
          <p className="mt-4 text-[16px] text-white/70 max-w-[560px] mx-auto">
            {isTr
              ? '14 gün ücretsiz · Kredi kartı istemiyoruz · 5 dakikada kurulum'
              : '14-day free · No credit card · 5-minute setup'}
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
