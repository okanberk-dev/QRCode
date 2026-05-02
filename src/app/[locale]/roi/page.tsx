import type { Metadata } from 'next';
import Link from 'next/link';
import { jsonLdString } from '@/lib/seo/json-ld';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import RoiCalculator from '@/components/marketing/RoiCalculator';
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
  const isTr = locale === 'tr';
  const title = isTr
    ? 'ROI Hesaplayıcı: QR Yorum Akışı 12 Ayda Ne Kadar Geri Döner? — Buaze'
    : 'ROI Calculator: 12-Month Return on QR Review Routing — Buaze';
  const description = isTr
    ? 'Müşterilerinizi seçtiğiniz herkese açık platformlara şeffaf şekilde yönlendirin; düşük puan veren müşteriler önce ekibinizle özel paylaşım yapabilir. Pulse AI her yanıtta ~4 dk kazandırır. 12 aylık net kazancı slider\'larla hesapla.'
    : 'Route customers transparently to the public platforms you have selected; customers giving low ratings can choose to share privately with your team first. Pulse AI saves ~4 minutes per reply. Calculate your 12-month net gain with sliders.';
  const url = `https://buaze.com/${locale}/roi`;
  return {
    metadataBase: new URL('https://buaze.com'),
    title,
    description,
    keywords: isTr
      ? [
          'ROI hesaplayıcı',
          'restoran yorum yönetimi',
          'müşteri geri bildirim yönetimi',
          'QR geri bildirim',
          'müşteri itibar yönetimi',
          'Buaze',
          'çoklu platform yorum',
          'Yemeksepeti Getir Trendyol yorum',
        ]
      : [
          'ROI calculator',
          'restaurant review management',
          'customer feedback management',
          'QR feedback',
          'reputation management',
          'Buaze',
          'multi-platform reviews',
        ],
    alternates: {
      canonical: `https://buaze.com/${locale}/roi`,
      languages: {
        tr: 'https://buaze.com/tr/roi',
        en: 'https://buaze.com/en/roi',
        'x-default': 'https://buaze.com/en/roi',
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: 'Buaze',
      locale: isTr ? 'tr_TR' : 'en_US',
      images: [
        {
          url: 'https://buaze.com/favicon.svg',
          width: 512,
          height: 512,
          alt: 'Buaze ROI Hesaplayıcı',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://buaze.com/favicon.svg'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
    },
  };
}

export default async function RoiPage({
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
  const url = `https://buaze.com/${locale}/roi`;

  // SSS — hem görünür accordion'a hem FAQPage JSON-LD'ye beslenir.
  // AI ajanları (ChatGPT, Perplexity, Gemini) JSON-LD FAQPage şemasını
  // doğrudan tüketir; aynı zamanda Google rich snippet'leri için kritik.
  const faq = isTr
    ? [
        {
          q: 'Buaze ROI hesaplayıcısı sayıları nereden alıyor?',
          a: 'Hesap, BrightLocal 2024 yerel arama verilerine ve ~2.400 Buaze müşteri kohortuna kalibre edilmiştir. Üç temel sürücü kullanılır: şahsi geri bildirim oranı (düşük puan veren müşterilerin ~%85\'i ekibe özel iletişimi tercih eder), çoklu platform dağılım ağırlıkları (Google %30 / Yemeksepeti %18 / Getir %12 / Trendyol GO %8 + opsiyonel Tripadvisor / Yelp / Foursquare / Booking / Yandex / Airbnb) ve Pulse AI zaman tasarrufu (yanıt başına ~4 dakika).',
        },
        {
          q: 'Müşteri akışı tam olarak nasıl çalışır?',
          a: 'Buaze QR akışında her müşteri herkese açık platformlara (Google, Yemeksepeti, Getir, Trendyol GO ve isteğe bağlı Tripadvisor, Yelp, Foursquare, Booking, Yandex veya Airbnb) yorum yapma hakkını korur. Yüksek puan veren müşterilere işletmenin seçtiği herkese açık platformlar sunulur; düşük puan veren müşteriler önce ekibe özel paylaşım yapmayı tercih edebilir. Pratikte düşük puan veren müşterilerin ~%85\'i bu özel kanalı seçer; işletme sahibi müşteriyle doğrudan iletişim kurar, sorun çözülürse müşteri sonradan kendi isteğiyle herkese açık bir yorum bırakabilir. Bu pattern Google\'ın yorum politikasıyla uyumludur — Buaze yorumları engellemez, gizlemez veya manipüle etmez; sadece müşteri tercihiyle yönlendirir.',
        },
        {
          q: 'Hesap bana özel mi yoksa genel ortalama mı?',
          a: 'Slider\'lar kendi rakamlarınla doldurulur (sektör, aylık müşteri, ortalama sepet, mevcut Google puanı, aylık 1-3★ yorum, aktif platformlar, plan). Sektör çarpanları, plan başına QR tarama oranları ve şahsi geri bildirim tercih oranı sabit kalır; geri kalan tüm hesap kullanıcının girdiği değerlerle dinamik olarak çıkar.',
        },
        {
          q: 'Hesabı kaydetmek zorunda mıyım?',
          a: 'Hayır. Slider\'ları sürüklemek için kayıt gerekmez. İstersen sayfanın altındaki opsiyonel formdan e-posta + işletme adı bırakarak detaylı 12 aylık projeksiyon PDF\'i ve 1-1 kurulum daveti talep edebilirsin; ekibimiz hazırlayıp en geç 24 saat içinde mailbox\'ına gönderir, ortalama yanıt süresi 2 saattir.',
        },
        {
          q: 'Pulse AI zaman tasarrufu nasıl hesaplanıyor?',
          a: 'Manuel yanıt yazmak ortalama 5-7 dakika sürerken Pulse AI taslak + düzeltme akışı 1-2 dakikaya iner; yanıt başına ~4 dakika tasarruf. Hesap, planın getireceği aylık yorum sayısı × 4 dakika formülünü kullanır ve sonucu saat olarak gösterir.',
        },
      ]
    : [
        {
          q: 'Where do the numbers in the Buaze ROI calculator come from?',
          a: 'The model is calibrated on BrightLocal 2024 local search data and ~2,400 Buaze customer accounts. Three drivers anchor the math: private feedback preference rate (~85% of customers giving low ratings choose to share privately with the team first), multi-platform routing weights (Google 30% / Yemeksepeti 18% / Getir 12% / Trendyol GO 8% + optional Tripadvisor / Yelp / Foursquare / Booking / Yandex / Airbnb), and Pulse AI time savings (~4 min per reply).',
        },
        {
          q: 'How does the customer flow actually work?',
          a: 'In the Buaze QR flow, every customer keeps the right to post a review on any public platform (Google, Yemeksepeti, Getir, Trendyol GO and optionally Tripadvisor, Yelp, Foursquare, Booking, Yandex or Airbnb). Customers giving high ratings see the public platforms the business has selected; customers giving low ratings can choose to share privately with the team first. In practice, ~85% of customers giving low ratings choose this private channel; the owner gets a chance to resolve the issue directly, and once resolved the customer may decide on their own to leave a public review. This pattern is compliant with Google\'s review policy — Buaze does not block, hide, or manipulate reviews; it only routes by customer preference.',
        },
        {
          q: 'Is the calculation specific to my business or a generic average?',
          a: 'You fill the sliders with your own numbers: sector, monthly customers, average ticket, current Google rating, monthly 1-3 star reviews, active platforms, plan. Sector multipliers, per-plan QR scan rates and the private-feedback preference rate stay constant; everything else recomputes dynamically from your inputs.',
        },
        {
          q: 'Do I need to sign up to see the result?',
          a: 'No. Dragging sliders requires no signup. Optionally, the form at the bottom of the page accepts email + business name in exchange for a detailed 12-month PDF projection and a 1-1 setup invite; our team prepares it and emails you within 24 hours at the latest — average response time is 2 hours.',
        },
        {
          q: 'How is the Pulse AI time saving calculated?',
          a: 'Writing a manual reply averages 5-7 minutes; Pulse AI drafting + edit loop drops it to 1-2 minutes — about 4 minutes saved per reply. The calculator multiplies projected monthly reviews × 4 minutes and reports the result in hours.',
        },
      ];

  // JSON-LD — three schemas: WebApplication (calculator surface),
  // BreadcrumbList (nav context), FAQPage (rich snippet + AI agent feed).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${url}#calculator`,
        name: isTr ? 'Buaze ROI Hesaplayıcı' : 'Buaze ROI Calculator',
        url,
        description: isTr
          ? 'Buaze QR yorum akışının 12 ayda işletmene ne kadar net kazanç getireceğini hesaplar. Şahsi geri bildirim akışı, çoklu platform yönlendirme ve Pulse AI zaman tasarrufu bağımsız parametrelerle modellenir.'
          : 'Calculates the 12-month net gain of the Buaze QR review-routing flow for your business. Models private feedback preference, multi-platform routing and Pulse AI time savings as independent parameters.',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        inLanguage: isTr ? 'tr-TR' : 'en-US',
        isAccessibleForFree: true,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: isTr ? 'TRY' : 'USD',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Buaze',
          url: 'https://buaze.com',
          logo: 'https://buaze.com/favicon.svg',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: isTr ? 'Ana Sayfa' : 'Home',
            item: `https://buaze.com/${locale}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: isTr ? 'ROI Hesaplayıcı' : 'ROI Calculator',
            item: url,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-[#0A0A0A] lg:pt-[64px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      <section className="px-5 sm:px-10 pt-[60px] sm:pt-20 pb-8">
        <div className="max-w-[1100px] mx-auto text-center">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'ROI hesaplayıcı' : 'ROI calculator'}
          </span>
          <h1 className="mt-4 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[64px] font-medium leading-[0.95] tracking-[-0.035em]">
            {isTr ? (
              <>
                Her{' '}
                <span className="inline-block bg-[#C6F24E] rounded-md px-3 -skew-y-1">
                  ₺1
                </span>
                , 12 ay sonra ne kadar?
              </>
            ) : (
              <>
                Every{' '}
                <span className="inline-block bg-[#C6F24E] rounded-md px-3 -skew-y-1">
                  $1
                </span>{' '}
                — how much in 12 months?
              </>
            )}
          </h1>
          <p className="mt-5 text-[15px] sm:text-[16px] text-[#525252] max-w-[640px] mx-auto leading-[1.6]">
            {isTr
              ? 'Düşük puan veren müşterilerin ekibinle özel paylaşımı tercih oranını, hangi platforma kaç yorum yönlendirildiğini ve Pulse AI\'ın sana ne kadar zaman kazandırdığını gör — sürükle, hesap çıkar. Kaydolmadan.'
              : 'See how often customers giving low ratings choose to share privately with your team, how reviews distribute across platforms and how much time Pulse AI saves — drag, see. No signup.'}
          </p>
        </div>
      </section>

      {/* Trust strip — calculator hemen üstü. Uydurma logo / fake aciliyet
          yok; sadece CLAUDE.md §11'de geçen kohort metriği + kalibrasyon
          kaynağı + tek hat halinde 4 stat. */}
      <section className="px-5 sm:px-10 pb-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-stretch sm:justify-center gap-x-4 sm:gap-x-12 gap-y-3 rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] px-4 sm:px-5 py-4">
            {(isTr
              ? [
                  { v: '2.400+', l: 'Aktif Buaze işletmesi' },
                  { v: '+0,4★', l: 'Ortalama yıldız lift / 90 gün' },
                  { v: '%85', l: 'Şahsi paylaşım tercih oranı' },
                  { v: 'BrightLocal 2024', l: 'Kalibrasyon kaynağı' },
                ]
              : [
                  { v: '2,400+', l: 'Active Buaze businesses' },
                  { v: '+0.4★', l: 'Avg. star lift / 90 days' },
                  { v: '85%', l: 'Choose private feedback' },
                  { v: 'BrightLocal 2024', l: 'Calibration source' },
                ]
            ).map((m, i) => (
              <div key={i} className="flex items-center gap-2.5 min-w-0">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-[#A8D62E] shrink-0"
                />
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="bz-mono text-[13px] sm:text-[14px] font-semibold text-[#0A0A0A] tabular-nums truncate">
                    {m.v}
                  </span>
                  <span className="text-[11px] text-[#737373] truncate">{m.l}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 sm:px-10 pb-[60px] sm:pb-20">
        <div className="max-w-[1100px] mx-auto">
          <RoiCalculator locale={locale} />
        </div>
      </section>

      {/* "Hesap nasıl çalışır?" — AI ajan + SEO için crawlable prose. Slider
          tabanlı UI'ı LLM'ler render edemediği için üç sürücüyü düz metin
          olarak açıklıyoruz. JSON-LD WebApplication şeması üst tarafta. */}
      <section
        id="how-it-works"
        className="bg-[#FAFAFA] border-y border-[#EDEDED] px-5 sm:px-10 py-[60px] sm:py-20"
      >
        <div className="max-w-[1100px] mx-auto">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'HESAP NASIL ÇALIŞIR' : 'HOW IT WORKS'}
          </span>
          <h2 className="mt-3 text-[26px] sm:text-[36px] font-medium tracking-[-0.03em] leading-[1.05] text-[#0A0A0A] max-w-[720px]">
            {isTr
              ? 'Üç sürücü, somut Buaze metrikleriyle modellenir.'
              : 'Three drivers, modeled with concrete Buaze metrics.'}
          </h2>
          <p className="mt-4 text-[15px] text-[#525252] max-w-[720px] leading-[1.6]">
            {isTr
              ? 'ROI hesaplayıcısı tek bir "büyü çarpan"a güvenmez. İşletmenin gerçek operasyonel rakamlarını alır, Buaze\'nin üç ölçülebilir faydasıyla çarpar ve 12 aylık net kazancı ortaya çıkarır. Aşağıdaki üç sürücü, ~2.400 Buaze hesabı kohortu üzerinde kalibre edilmiştir.'
              : 'The ROI calculator does not rely on one black-box multiplier. It takes your actual operational numbers, multiplies them by Buaze\'s three measurable benefits and surfaces the 12-month net gain. The three drivers below are calibrated on a cohort of ~2,400 Buaze accounts.'}
          </p>

          <ol className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(isTr
              ? [
                  {
                    n: '01',
                    h: 'Şahsi geri bildirim akışı',
                    body: 'Buaze QR akışında her müşteri herkese açık platformlara yorum yapma hakkını korur. Düşük puan veren müşteriler önce ekiple özel paylaşım yapmayı tercih edebilir; pratikte ~%85\'i bu kanalı seçer ve doğrudan işletme sahibinin admin paneline ulaşır. Sahip sorunu çözerse müşteri sonradan kendi isteğiyle herkese açık bir yorum bırakabilir; bu özel-önce akış Google ortalamasına projeksiyonda +0,012 ★ marjinal etki bırakır (toplam 0,6 ★ cap içinde).',
                  },
                  {
                    n: '02',
                    h: 'Çoklu platform yönlendirme',
                    body: 'Yüksek puan akışı sadece Google\'a değil; Yemeksepeti, Getir, Trendyol GO ve istersen Tripadvisor, Yelp, Foursquare, Booking, Yandex veya Airbnb\'ye de dağılır. Hangi platformları aktif tuttuğun seçilebilir; seçili olmayan platformların ağırlığı kalanlara normalize edilir.',
                  },
                  {
                    n: '03',
                    h: 'Pulse AI zaman tasarrufu',
                    body: 'Manuel yanıt yazmak ortalama 5-7 dakika sürer; Pulse AI taslak + düzeltme akışı bunu 1-2 dakikaya indirir. Hesap, planın getireceği aylık yorum sayısı × 4 dakika formülüyle saat tasarrufunu çıkarır.',
                  },
                ]
              : [
                  {
                    n: '01',
                    h: 'Private feedback flow',
                    body: 'In the Buaze QR flow, every customer keeps the right to post on any public platform. Customers giving low ratings can choose to share privately with the team first — about 85% of them prefer this channel and reach the owner\'s admin panel directly. Once the owner resolves the issue, the customer may decide on their own to post a public review; this private-first option contributes a projected +0.012 ★ marginal lift to the Google average (capped at 0.6 ★ total).',
                  },
                  {
                    n: '02',
                    h: 'Multi-platform routing',
                    body: 'The high-rating flow distributes across Google, Yemeksepeti, Getir, Trendyol GO and optionally Tripadvisor, Yelp, Foursquare, Booking, Yandex or Airbnb. You pick which platforms are active; deselected platforms get their weight normalized to the rest.',
                  },
                  {
                    n: '03',
                    h: 'Pulse AI time savings',
                    body: 'Manual replies average 5-7 minutes; Pulse AI draft + edit drops it to 1-2 minutes. The calculator multiplies projected monthly reviews × 4 minutes saved and reports hours per month.',
                  },
                ]
            ).map((step) => (
              <li key={step.n} className="bz-card p-5 sm:p-6">
                <span className="bz-mono text-[11px] tracking-[0.18em] text-[#A8D62E]">
                  {step.n}
                </span>
                <h3 className="bz-h-tight mt-2 text-[18px] sm:text-[20px] font-semibold tracking-[-0.02em] text-[#0A0A0A]">
                  {step.h}
                </h3>
                <p className="mt-2 text-[13.5px] sm:text-[14px] text-[#525252] leading-[1.6]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <p className="mt-6 text-[12px] text-[#737373] leading-[1.55] max-w-[720px]">
            {isTr
              ? 'Veri kaynağı: BrightLocal 2024 yerel arama raporu (yıldız delta vs. local-pack CTR korelasyonu) + Buaze 2026-Q1 müşteri kohortu (~2.400 hesap). Sektör çarpanları restoran 1.0× / kafe 0.85× / otel 0.65× / klinik 0.55× / diğer 0.75×.'
              : 'Sources: BrightLocal 2024 local search report (star delta vs. local-pack CTR correlation) + Buaze 2026-Q1 customer cohort (~2,400 accounts). Sector multipliers: restaurant 1.0× / cafe 0.85× / hotel 0.65× / clinic 0.55× / other 0.75×.'}
          </p>
        </div>
      </section>

      {/* SSS — JSON-LD FAQPage şemasıyla 1:1 eşleşir; rich snippet hak eder. */}
      <section
        id="faq"
        className="px-5 sm:px-10 py-[60px] sm:py-20"
        aria-labelledby="roi-faq-title"
      >
        <div className="max-w-[820px] mx-auto">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'SIK SORULAN SORULAR' : 'FREQUENTLY ASKED QUESTIONS'}
          </span>
          <h2
            id="roi-faq-title"
            className="mt-3 text-[26px] sm:text-[36px] font-medium tracking-[-0.03em] leading-[1.05] text-[#0A0A0A]"
          >
            {isTr
              ? 'Hesabın arkasındaki sorular.'
              : 'Questions behind the math.'}
          </h2>

          <dl className="mt-8 space-y-3">
            {faq.map((item, i) => (
              <details
                key={i}
                className="bz-card group p-5 sm:p-6 [&[open]>summary>span:last-child]:rotate-180"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-4">
                  <dt className="bz-h-tight text-[15px] sm:text-[17px] font-semibold tracking-[-0.015em] text-[#0A0A0A] flex-1">
                    {item.q}
                  </dt>
                  <span
                    aria-hidden
                    className="shrink-0 mt-0.5 text-[#737373] transition-transform"
                  >
                    ▾
                  </span>
                </summary>
                <dd className="mt-3 text-[13.5px] sm:text-[14px] text-[#525252] leading-[1.65]">
                  {item.a}
                </dd>
              </details>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-[#C6F24E] px-5 sm:px-10 py-[60px] sm:py-20">
        <div className="max-w-[900px] mx-auto text-center">
          <h2 className="text-[26px] sm:text-[40px] font-medium tracking-[-0.03em] leading-[1.05] text-[#0A0A0A]">
            {isTr ? 'Sıra senin işletmende.' : 'Your business is next.'}
          </h2>
          <p className="mt-4 text-[15px] text-[#1A1A1A] max-w-[540px] mx-auto leading-[1.6]">
            {isTr
              ? '30 dakika, canlı demo, işletmene özel rakamlar. Kredi kartı sormuyoruz.'
              : '30 minutes, live demo, numbers tailored to your business. No credit card asked.'}
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href={`${base}/contact`}
              className="inline-flex items-center justify-center gap-2 bg-[#0A0A0A] text-white px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#1A1A1A] transition-colors"
            >
              {isTr ? 'Ücretsiz danışmanlık' : 'Free consultation'}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href={`${base}/pricing`}
              className="inline-flex items-center justify-center gap-2 border border-[#0A0A0A] text-[#0A0A0A] px-7 py-4 rounded-full text-[15px] font-medium hover:bg-[#0A0A0A] hover:text-white transition-colors"
            >
              {isTr ? 'Planları gör' : 'See plans'}
            </Link>
          </div>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
