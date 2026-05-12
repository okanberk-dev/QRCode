import type { Metadata } from 'next';
import Link from 'next/link';
import { jsonLdString } from '@/lib/seo/json-ld';
import { ChevronRight, Package, Truck, Sparkles, BarChart3 } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import FaqAccordion, { type FaqItem } from '@/components/marketing/FaqAccordion';
import PlatformLogo, { TR_DELIVERY, TR_REVIEW } from '@/components/marketing/PlatformLogo';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import { notFound } from 'next/navigation';
import { buildSolutionSchema } from '@/lib/solution-schema';
import { buildHowToSchema } from '@/lib/seo/howto-schema';
import { getRelatedSolutions } from '@/lib/related-solutions';

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
  const title =
    locale === 'tr'
      ? 'Paket Servis QR · Yemeksepeti + Getir + Trendyol GO — Buaze'
      : 'Delivery QR · Yemeksepeti + Getir + Trendyol GO — Buaze';
  const description =
    locale === 'tr'
      ? 'Paket içine koyduğunuz tek QR ile müşteriyi tam olarak yorum bırakacağı platforma yönlendirin. Google, Yemeksepeti, Getir Yemek ve Trendyol GO uyumlu.'
      : 'One QR inside every package routes the customer to the platform where they will actually leave a review. Works with Google, Yemeksepeti, Getir Yemek and Trendyol GO.';
  return {
    metadataBase: new URL('https://buaze.com'),
    title,
    description,
    alternates: {
      canonical: `/${locale}/solutions/delivery`,
      languages: {
        tr: '/tr/solutions/delivery',
        en: '/en/solutions/delivery',
      },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/delivery` },
  };
}

export default async function DeliveryPage({
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

  const platformCopy: Record<string, { tr: string; en: string }> = {
    yemeksepeti: {
      tr: 'Sipariş ID eşleştirme, otomatik yorum isteği, düşük puan alerti.',
      en: 'Order ID matching, automated review request, low-score alerts.',
    },
    'getir-yemek': {
      tr: 'Yorum API bağlantısı, ortalama puan canlı takibi.',
      en: 'Review API link, live tracking of average score.',
    },
    'trendyol-go': {
      tr: 'Kurye geri bildirimi ayrıştırma, restoran skoru üzerinde odak.',
      en: 'Courier feedback separation, focus on restaurant score.',
    },
    'migros-hemen': {
      tr: 'Market ürün yorumları ve teslimat deneyimi ayrı raporlarda.',
      en: 'Grocery product reviews and delivery experience in separate reports.',
    },
    google: {
      tr: 'Sipariş sonrası müşteriyi Google işletme profiline yönlendir.',
      en: 'Route the customer to your Google Business Profile after the order.',
    },
    foursquare: {
      tr: 'Konum bazlı yorumlar, çevredeki aramalarda çıkma.',
      en: 'Location-based reviews — show up in nearby searches.',
    },
    facebook: {
      tr: 'Meta Business Review API ile otomatik senkron.',
      en: 'Automatic sync via the Meta Business Review API.',
    },
    instagram: {
      tr: 'DM üzerinden gelen yorumları panele çek.',
      en: 'Pull DM-based comments into your dashboard.',
    },
  };

  const allPlatforms = [...TR_DELIVERY, ...TR_REVIEW];

  const flow = isTr
    ? [
        {
          s: '01',
          t: 'Kamuya açık yorum',
          d: 'Her müşteriye Google işletme profili ve sipariş verdiği paket platformunun yorum bağlantısı tek QR\'da sunulur. Hangisinde yazacağına müşteri karar verir.',
          bg: 'bg-[#C6F24E]',
        },
        {
          s: '02',
          t: 'Opsiyonel özel kanal',
          d: 'İsteyen müşteri aynı akışta işletmene özel geri bildirim de bırakır. Bu adım opsiyoneldir; kamuya açık yorum hakkını engellemez.',
          bg: 'bg-[#EAF9B8]',
        },
        {
          s: '03',
          t: 'Sadakat kuponu',
          d: 'Yorumu tamamlayan müşteriye tekrar sipariş için kupon önerebilirsin — yıldıza göre değil, tüm tamamlananlara aynı şekilde.',
          bg: 'bg-[#FAFAFA]',
        },
      ]
    : [
        {
          s: '01',
          t: 'Public review',
          d: 'Every customer sees the Google Business Profile link and the delivery platform review link they ordered from — all from one QR. They choose where to post.',
          bg: 'bg-[#C6F24E]',
        },
        {
          s: '02',
          t: 'Optional private channel',
          d: 'Anyone who also wants to share private feedback with your business can do so in the same flow. This step is optional and never blocks the public review path.',
          bg: 'bg-[#EAF9B8]',
        },
        {
          s: '03',
          t: 'Loyalty coupon',
          d: 'Offer a coupon for the next order to anyone who completes the flow — applied uniformly, not based on rating.',
          bg: 'bg-[#FAFAFA]',
        },
      ];

  const stats = isTr
    ? [
        { k: '+312%', l: 'Yemeksepeti yorum artışı · 60 gün' },
        { k: '4.8', l: 'Ortalama Getir puanı · 3. ay' },
        { k: '+184%', l: 'Toplam yorum hacmi · ilk 90 gün' },
        { k: '18sn', l: 'Ortalama tarama–yorum süresi' },
      ]
    : [
        { k: '+312%', l: 'Yemeksepeti review growth · 60 days' },
        { k: '4.8', l: 'Average Getir score · month 3' },
        { k: '+184%', l: 'Total review volume · first 90 days' },
        { k: '18s', l: 'Average scan-to-review time' },
      ];

  // Sector benefits — 4 tiles. Pulse design (lime icon tile + graphite headline).
  const benefits = isTr
    ? [
        { Icon: Package, h: 'Pakete sticker, eve teslim', d: 'Müşteri evde paketi açtığında QR\'ı tarar. Sıcak deneyim, anlık yorum — kapı önünde dakikalar yerine sofradayken aksiyon.' },
        { Icon: Truck, h: 'Çoklu platform yönlendirme', d: 'Yemeksepeti + Getir Yemek + Trendyol GO + Google bir akışta. Müşteri seçtiğin platforma yönlenir; tercih müşteride kalır, yıldız bazlı erişim kısıtlaması yok.' },
        { Icon: Sparkles, h: 'Pulse AI yanıt taslağı', d: '"Gec geldi" yorumu için kişisel ton, "soğuk" yorumu için farklı ton. Her düşük puana saniyeler içinde yanıt taslağı; otomatik gönderim yok, sahip onaylar.' },
        { Icon: BarChart3, h: 'Sürücü + bölge analitiği', d: 'Hangi sürücü, hangi bölge, hangi saat aralığı en çok düşük puan çekiyor? Operasyonel kararı veriyle al — kuryeyi ya da menü saatini ona göre düzenle.' },
      ]
    : [
        { Icon: Package, h: 'Sticker on the box, review at home', d: 'When the customer opens the package at home, they scan the QR. Hot experience, instant feedback — action at the dining table instead of minutes lost on the doorstep.' },
        { Icon: Truck, h: 'Multi-platform routing', d: 'Yemeksepeti + Getir Yemek + Trendyol GO + Google in one flow. The customer is shown the platforms you select; the choice stays with the customer, no star-rating gate.' },
        { Icon: Sparkles, h: 'Pulse AI reply drafts', d: 'Personal tone for "arrived late" reviews, a different tone for "cold". A reply draft for every low rating in seconds; nothing auto-sent, the owner approves.' },
        { Icon: BarChart3, h: 'Driver + zone analytics', d: 'Which driver, which zone, which time slot attracts the most low ratings? Make operational calls from data — adjust the courier or the menu hours accordingly.' },
      ];

  const faqs: FaqItem[] = isTr
    ? [
        { q: 'Paket servis için Buaze nasıl çalışır?', a: 'Pakete bir Buaze QR sticker yapıştırırsın. Müşteri evde paketi açtığında QR\'ı tarar; deneyimini puanlar ve seçtiğin herkese açık platformlara (Yemeksepeti, Getir Yemek, Trendyol GO, Google) yönlendirilir. Her müşteri istediği yere yorum yazma hakkını korur.' },
        { q: 'Yemeksepeti, Getir ve Trendyol GO yorumlarını da topluyor mu?', a: 'Evet. Owner panelden bu platformların herkese açık yorum bağlantılarını eklersin; akış müşteriye seçtiğin platformları sunar. Müşteri tercih ettiği platforma yorum yazar; ek olarak ekibinle özel paylaşım yapma seçeneği de görür.' },
        { q: 'Düşük puan veren müşteri ne olur?', a: 'Buaze hiçbir yorumu engellemez veya gizlemez. Düşük puan veren müşteriler ek olarak ekibinle özel paylaşım yapma seçeneği görür — pratikte ~%85\'i bu özel kanalı tercih eder. Müşteri her zaman herkese açık platformlara yorum yazma hakkını korur; siz sorunu özelden çözme şansı kazanırsınız.' },
        { q: 'Kurye performansını da takip eder miyim?', a: 'Evet. Yorum geldiğinde sipariş ID + kurye etiketi + bölge + saat birlikte loglanır. Analytics raporunda hangi kurye en çok düşük puan çekiyor, hangi bölgede teslimat süresi yorumu negatif etkiliyor — sürücü bazlı görürsün.' },
        { q: 'Sticker tasarımını siz mi gönderiyorsunuz?', a: 'QR PDF\'i indirebileceğin bir sayfa veriyoruz; Buaze logosu + işletme adı + QR kodu kompakt yerleşim. Yerel matbaada bastırabilir veya kendi paketleme tasarımına ekleyebilirsin. Her şube için ayrı QR oluşturma mümkün.' },
      ]
    : [
        { q: 'How does Buaze work for delivery?', a: 'You stick a Buaze QR on every package. When the customer opens it at home, they scan the QR; they rate their experience and are routed to the public platforms you have selected (Yemeksepeti, Getir Yemek, Trendyol GO, Google). Every customer keeps the right to post anywhere they choose.' },
        { q: 'Does it also collect Yemeksepeti, Getir and Trendyol GO reviews?', a: 'Yes. You add the public review links of these platforms in the owner panel; the flow surfaces the platforms you select to the customer. The customer posts on their preferred platform; they additionally see an option to share privately with your team.' },
        { q: 'What happens to customers giving low ratings?', a: 'Buaze never blocks or hides any review. Customers giving low ratings additionally see an option to share privately with your team — in practice ~85% choose this private channel. The customer always keeps the right to post on any public platform; you gain a chance to resolve the issue privately first.' },
        { q: 'Can I track courier performance?', a: 'Yes. When a review arrives, the order ID + courier tag + zone + time are logged together. The analytics report shows which courier attracts the most low ratings, which zone\'s delivery time hurts review sentiment — you see it driver-by-driver.' },
        { q: 'Do you provide the sticker design?', a: 'We provide a page where you can download the QR as PDF; Buaze logo + business name + QR code in a compact layout. You can print it at a local print shop or include it in your packaging design. Per-branch QR generation is supported.' },
      ];

  const relatedSolutions = getRelatedSolutions('delivery', 4);

  const jsonLd = buildSolutionSchema({
    locale,
    slug: 'delivery',
    industryLabel: isTr ? 'Paket Servis' : 'Delivery',
    serviceName: isTr ? 'Paket Servis İtibar Yönetimi' : 'Delivery Reputation Management',
    description: isTr
      ? 'Paket içine koyduğunuz tek QR ile müşteriyi tam olarak yorum bırakacağı platforma yönlendirin. Google, Yemeksepeti, Getir Yemek ve Trendyol GO uyumlu.'
      : 'One QR inside every package routes the customer to the platform where they will actually leave a review. Works with Google, Yemeksepeti, Getir Yemek and Trendyol GO.',
    faqs,
  });

  const howTo = buildHowToSchema({
    locale,
    name: isTr ? 'Paket serviste Buaze yorum akışını kurma' : 'Set up the Buaze review flow for delivery operations',
    description: isTr
      ? 'Paket içi QR ile Yemeksepeti, Getir, Trendyol GO ve Google yorumlarını tek panelde yönetmek için adımlar.'
      : 'Steps to manage Yemeksepeti, Getir, Trendyol GO and Google reviews from one panel using an in-package QR.',
    url: `https://buaze.com/${locale}/solutions/delivery`,
    steps: isTr
      ? [
          { name: 'Mutfak/işletmeyi tanımla', text: 'Mutfak adı, kategori, Yemeksepeti/Getir/Trendyol GO restoran bağlantıları ve Google Place ID’yi panelde gir.' },
          { name: 'Paket içi QR sticker hazırla', text: 'Her pakete sticker’lı kart ekle; URL parametresi ile platform seçimi ve isteğe bağlı sipariş ID etiketi taşı.' },
          { name: 'Operasyon ekibini davet et', text: 'Şef, paketleyici ve müdür gibi sorumluları Buaze ekibine ekle; düşük puanlı yorumlarda otomatik flag çalışır.' },
          { name: 'Pulse AI ile yorumlar arasından önceliklendir', text: 'Pulse AI gelen yorumları puana göre sıralar, taslak üretir; operatör onaylar, gönderir; platform bazlı analitiklerden hangi kanalın dönüşümü yüksek oku.' },
        ]
      : [
          { name: 'Identify the kitchen / business', text: 'Enter kitchen name, category, Yemeksepeti/Getir/Trendyol GO restaurant links and Google Place ID in the panel.' },
          { name: 'Prepare the in-package QR sticker', text: 'Add a stickered card to every package; pass platform choice and an optional order-ID tag via URL parameters.' },
          { name: 'Invite the operations team', text: 'Add the chef, packer and shift manager to your Buaze team; low-rating reviews flag automatically.' },
          { name: 'Prioritise replies via Pulse AI', text: 'Pulse AI sorts incoming reviews by rating and drafts replies; operator approves and sends; read per-platform analytics to see which channel converts.' },
        ],
  });
  if (howTo) jsonLd.push(howTo);

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-[#0A0A0A] lg:pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* HERO */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Sektör · Paket servis & Dark kitchen' : 'Sector · Delivery & Dark kitchen'}
            </span>
            <h1 className="mt-4 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[72px] font-medium leading-[0.95] tracking-[-0.035em]">
              {isTr ? (
                <>
                  Her pakette bir
                  <br />
                  <span className="inline-block bg-[#C6F24E] rounded-md px-3 -skew-y-1">yorum</span>{' '}
                  fırsatı.
                </>
              ) : (
                <>
                  Every package is a
                  <br />
                  <span className="inline-block bg-[#C6F24E] rounded-md px-3 -skew-y-1">review</span>{' '}
                  opportunity.
                </>
              )}
            </h1>
            <p className="mt-5 text-[15px] sm:text-[18px] text-[#525252] leading-[1.6] max-w-[540px]">
              {isTr
                ? 'Yemeksepeti, Getir Yemek ve Trendyol GO\'daki puanınız Google\'dan bile daha önemli. Paket içine koyduğunuz tek QR ile müşteriyi tam olarak yorum bırakacağı platforma yönlendirin.'
                : 'Your score on Yemeksepeti, Getir Yemek and Trendyol GO can matter more than Google. One QR inside the package routes the customer to the exact platform they\'ll leave a review on.'}
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link
                href={`${base}/solutions/qr-generator`}
                className="inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-white px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-[#1A1A1A] transition-colors"
              >
                {isTr ? 'Paket QR\'ı ücretsiz oluştur' : 'Create a delivery QR free'}
                <span aria-hidden>→</span>
              </Link>
              <Link
                href={`${base}/contact`}
                className="inline-flex items-center justify-center gap-2 border border-[#0A0A0A] text-[#0A0A0A] px-6 py-3.5 rounded-full text-[15px] font-medium hover:bg-[#0A0A0A] hover:text-white transition-colors"
              >
                {isTr ? 'Demo iste' : 'Request demo'}
              </Link>
            </div>
          </div>

          {/* QR + platform card */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-[340px] bg-[#0A0A0A] text-white rounded-3xl p-7">
              <div className="flex items-center justify-between">
                <span className="pulse-eyebrow text-[#C6F24E]">
                  {isTr ? 'PAKET İÇİ QR' : 'IN-PACKAGE QR'}
                </span>
                <span className="text-[11px] text-white/60">v2.4</span>
              </div>
              <h3 className="mt-3 text-[22px] sm:text-[26px] font-medium leading-[1.15] tracking-[-0.015em]">
                {isTr ? (
                  <>
                    Memnun kaldın mı?
                    <br />
                    10 sn&apos;de paylaş.
                  </>
                ) : (
                  <>
                    Happy with your order?
                    <br />
                    Share it in 10 sec.
                  </>
                )}
              </h3>
              <div className="mt-4 bg-[#C6F24E] rounded-xl p-4 flex justify-center">
                <svg viewBox="0 0 64 64" width="180" height="180" aria-hidden>
                  <rect width="64" height="64" fill="#C6F24E" />
                  {[
                    [6, 6],
                    [42, 6],
                    [6, 42],
                  ].map(([x, y], i) => (
                    <g key={i}>
                      <rect x={x} y={y} width="16" height="16" fill="#C6F24E" />
                      <rect x={x} y={y} width="16" height="16" fill="none" stroke="#0A0A0A" strokeWidth="3" />
                      <rect x={x + 5} y={y + 5} width="6" height="6" fill="#0A0A0A" />
                    </g>
                  ))}
                  {[
                    [26, 10],
                    [30, 10],
                    [36, 10],
                    [26, 14],
                    [34, 14],
                    [10, 26],
                    [18, 26],
                    [26, 26],
                    [34, 26],
                    [42, 26],
                    [50, 26],
                    [14, 32],
                    [22, 30],
                    [30, 32],
                    [38, 30],
                    [46, 32],
                    [26, 42],
                    [34, 46],
                    [42, 44],
                    [50, 46],
                    [28, 50],
                    [36, 52],
                    [44, 50],
                    [30, 58],
                    [42, 58],
                  ].map(([x, y], i) => (
                    <rect key={`d-${i}`} x={x} y={y} width="4" height="4" fill="#0A0A0A" />
                  ))}
                </svg>
              </div>
              <div className="mt-4">
                <span className="pulse-eyebrow text-white/60">
                  {isTr ? 'AKTİF PLATFORMLAR' : 'ACTIVE PLATFORMS'}
                </span>
                <div className="flex gap-2 mt-2">
                  {(['yemeksepeti', 'getir-yemek', 'trendyol-go', 'google'] as const).map((id) => (
                    <PlatformLogo key={id} id={id} size={32} rounded={8} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORMS GRID */}
      <section className="bg-[#FAFAFA] px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-[720px]">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'Platform entegrasyonları' : 'Platform integrations'}
            </span>
            <h2 className="mt-4 text-[26px] sm:text-[44px] lg:text-[48px] font-medium leading-[1.02] tracking-[-0.03em]">
              {isTr
                ? 'Tek QR. Dört platform. Dört kat geri bildirim.'
                : 'One QR. Four platforms. Four times the feedback.'}
            </h2>
            <p className="mt-4 text-[15px] text-[#525252] leading-[1.6]">
              {isTr
                ? 'Her misafire kendi platformunun (Yemeksepeti, Getir, Trendyol GO, Google) yorum bağlantısı tek QR\'da sunulur. İsteyen aynı akışta işletmene özel geri bildirim de bırakır — yıldıza göre dallandırma yok.'
                : 'Every guest gets a one-tap link to their platform of choice (Yemeksepeti, Getir, Trendyol GO, Google) from a single QR. Anyone who also wants to send private feedback can do so in the same flow — no rating-based gating.'}
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {allPlatforms.map((p) => (
              <div
                key={p.id}
                className="bz-card p-5 flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <PlatformLogo id={p.id} size={44} rounded={10} />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C6F24E]" aria-hidden />
                </div>
                <div>
                  <div className="text-[16px] font-semibold tracking-[-0.015em]">{p.name}</div>
                  <div className="pulse-eyebrow text-[#737373] mt-1">{p.tag}</div>
                </div>
                <p className="text-[13px] text-[#525252] leading-[1.55]">
                  {platformCopy[p.id]?.[locale] ?? ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SMART ROUTING FLOW */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-24">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-[26px] sm:text-[44px] lg:text-[48px] font-medium tracking-[-0.03em] leading-[1]">
            {isTr ? 'Akıllı yönlendirme.' : 'Smart routing.'}
          </h2>
          <p className="mt-3 text-[15px] text-[#525252] max-w-[600px]">
            {isTr
              ? 'Müşteri QR\'ı tarıyor. Önce 1-5 puan veriyor. Ne olduğuna göre farklı bir yere gidiyor.'
              : 'Customer scans the QR, rates 1–5, and gets routed differently based on the score.'}
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {flow.map((x) => (
              <div
                key={x.s}
                className="bz-card-soft p-6 flex flex-col gap-3"
              >
                <div
                  className={`${x.bg} w-16 h-16 rounded-full flex items-center justify-center text-[20px] font-semibold`}
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {x.s}
                </div>
                <h3 className="text-[22px] font-medium tracking-[-0.02em]">{x.t}</h3>
                <p className="text-[14px] text-[#525252] leading-[1.55]">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits — 4-tile grid */}
      <section className="px-5 sm:px-10 py-[60px] sm:py-24 border-t border-[#EDEDED]">
        <div className="max-w-[1100px] mx-auto">
          <span className="pulse-eyebrow text-[#A8D62E]">{isTr ? 'NEDEN BUAZE' : 'WHY BUAZE'}</span>
          <h2 className="mt-3 text-[26px] sm:text-[36px] lg:text-[42px] font-medium tracking-[-0.03em] leading-[1.1] text-[#0A0A0A] max-w-[680px]">
            {isTr ? 'Paket servis operasyonuna özel dört kazanç' : 'Four wins built for delivery operations'}
          </h2>
          <div className="mt-9 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {benefits.map((b, i) => (
              <div key={i} className="bz-card p-6 sm:p-7">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF9B8] text-[#0A0A0A]">
                  <b.Icon size={16} />
                </div>
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
            {isTr ? 'Paket servis için merak edilenler' : 'Common questions for delivery'}
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

      {/* STATS DARK BANNER */}
      <section className="px-5 sm:px-10 pb-[60px] sm:pb-24">
        <div className="max-w-[1200px] mx-auto bg-[#0A0A0A] text-white rounded-3xl p-6 sm:p-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((x) => (
              <div key={x.l}>
                <div
                  className="text-[36px] sm:text-[48px] lg:text-[56px] font-medium leading-none text-[#C6F24E] tracking-[-0.03em]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {x.k}
                </div>
                <div className="text-[13px] text-white/60 mt-3">{x.l}</div>
              </div>
            ))}
          </div>
          {/* Stage 95 §38.175 — cohort disclosure per CLAUDE.md §35.8. */}
          <p className="mt-8 text-center text-[11px] text-white/55 max-w-[720px] mx-auto leading-[1.55]">
            {isTr
              ? '* Metrikler Buaze müşteri kohortunda ilk 90 gün ortalamasıdır; sonuçlar sektöre, lokasyona ve operasyon disiplinine göre değişir.'
              : '* Metrics reflect the Buaze customer cohort first 90-day average; results vary by sector, location and operational discipline.'}
          </p>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
