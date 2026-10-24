import type { Metadata } from 'next';
import { getTranslations } from '@/lib/translations';
import { jsonLdString } from '@/lib/seo/json-ld';
import type { Locale } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import FaqAccordion, { type FaqItem } from '@/components/marketing/FaqAccordion';
import Link from 'next/link';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';

  const title = isTr
    ? 'Sıkça Sorulan Sorular — QR Yorum Yönetimi'
    : 'Frequently Asked Questions — QR Review Management';
  const description = isTr
    ? 'Buaze hakkında merak ettiğiniz tüm soruların cevapları. QR itibar yönetimi, akıllı yönlendirme, fiyatlandırma ve kurulum hakkında detaylı bilgi alın.'
    : 'Find answers to all your questions about Buaze — QR reputation management, smart routing, pricing, and setup explained in detail.';
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `https://www.buaze.com/${locale}/faq`,
      languages: { tr: 'https://www.buaze.com/tr/faq', en: 'https://www.buaze.com/en/faq', 'x-default': 'https://www.buaze.com/tr/faq' },
    },
    openGraph: {
      title,
      description,
      url: `https://www.buaze.com/${locale}/faq`,
      images: [{ url: isTr ? '/images/open-graph-tr.png' : '/images/open-graph-en.png', width: 1200, height: 630, alt: title }],
    },
  };
}

// Stage 27 §38.103 Fix M3 — ISR cache window. FAQ içeriği hardcoded
// `FaqItem[]` array (TR/EN, line ~50-118); DB query yok, kararsızlık
// kaynağı yok. force-dynamic her request server-render zorluyordu;
// 1 saat fresh CDN edge cache ile TTFB ~150ms düşer + Vercel function
// invocation %90+ azalır. FAQ içeriği yıllık değişir → 1 saat stale
// kabul.
export const revalidate = 3600;

/**
 * 1:1 with .design/site/site-pages3.jsx:FAQPage (lines 431-471).
 * 2-column grid: left = eyebrow + "Cevaplar." + support email; right = 8 Q/A
 * accordion (first two open by default).
 */
export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const base = `/${locale}`;
  const isTr = locale === 'tr';

  const faqs: FaqItem[] = isTr
    ? [
        {
          q: "Buaze Google'ın politikalarına uyumlu mu?",
          a: 'Evet. Her müşteriye Google yorum bağlantısı sunulur; yıldıza göre dallandırma yapmıyoruz. İsteyen müşteri ek olarak işletmeye özel geri bildirim de gönderebilir, fakat bu opsiyoneldir ve Google\'a yorum yazmasını engellemez.',
        },
        {
          q: 'Kurulum ne kadar sürer?',
          a: 'Ortalama 5 dakika. İşletme bilgileri, Google Business Profile bağlantısı, ilk QR — tek oturumda bitiyor.',
        },
        {
          q: 'Hangi cihazlarda çalışır?',
          a: 'Müşteri tarafında sadece kamera var — her QR okuyan telefonda çalışır. Panel web tabanlıdır ve mobil tarayıcıda tam uyumlu çalışır; ayrı bir iOS/Android uygulaması gerekmez.',
        },
        {
          q: 'Kredi kartı vermem gerekiyor mu?',
          a: 'Hayır. 14 gün tamamen ücretsiz. Beğenirseniz kart bilgisi eklersiniz.',
        },
        {
          q: 'Yemeksepeti ve Getir entegrasyonu nasıl çalışıyor?',
          a: "Sipariş numarası üzerinden eşleştirme. QR'ı tarayan müşteri otomatik olarak doğru platforma yönlendirilir.",
        },
        {
          q: 'Fiyatlandırma nasıl?',
          a: 'Konum başına aylık sabit fiyat. Yıllık ödemede %20 indirim. Küçük işletme için ücretsiz plan da var.',
        },
        {
          q: 'Ekip üyelerimi nasıl ekleyebilirim?',
          a: 'Panel → Ekip → Davet et. Rol bazlı yetkilendirme: Admin, Manager, Staff, Viewer.',
        },
        {
          q: 'Veri güvenliği?',
          a: "Veriler, AB ve ABD'de bulunan altyapı sağlayıcılarında işlenir. Yurt dışı aktarım KVKK m. 9 kapsamında açık rızaya dayanır; sağlayıcıların tam listesi ve bulundukları ülkeler Veri İşleyici Sözleşmesi'nde yer alır. KVKK + GDPR uyumlu çalışırız.",
        },
      ]
    : [
        {
          q: "Is Buaze compliant with Google's policies?",
          a: "Yes. Every customer is offered the Google review link with no rating-based branching. Anyone who also wants to share private feedback can do so in the same flow — but that step is optional and never blocks the public Google path.",
        },
        {
          q: 'How long does setup take?',
          a: 'Roughly 5 minutes. Business details, Google Business Profile connection, your first QR — all in one session.',
        },
        {
          q: 'Which devices does it work on?',
          a: 'The customer only needs a camera — any phone that scans a QR works. The panel is web-based and fully responsive on mobile browsers; no separate iOS/Android app is required.',
        },
        {
          q: 'Do I need a credit card?',
          a: 'No. 14 days completely free. Add card info later if you want to continue.',
        },
        {
          q: 'How does the Yemeksepeti / Getir integration work?',
          a: 'Matched via order ID. Customers who scan the QR are auto-routed to the right platform.',
        },
        {
          q: 'How is pricing?',
          a: 'A flat monthly rate per location. 20% off on annual billing. We also offer a free tier for very small businesses.',
        },
        {
          q: 'How do I add team members?',
          a: 'Panel → Team → Invite. Role-based access: Admin, Manager, Staff, Viewer.',
        },
        {
          q: 'What about data security?',
          a: 'Data is processed by infrastructure providers located in the EU and the USA. Cross-border transfers rely on explicit consent under KVKK art. 9; the full list of providers and their locations is in the Data Processing Agreement. We operate KVKK + GDPR compliant.',
        },
      ];

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(faqSchema) }}
      />
      <MarketingNavbar locale={locale} t={t} />
      <main id="main-content">

      {/* Hero + FAQ — 2-col grid (1fr 2fr) */}
      <section className="px-5 sm:px-10 pt-[60px] sm:pt-20 pb-10">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 lg:grid-cols-[1fr_2fr] lg:gap-12">
          <div>
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'SSS' : 'FAQ'}
            </span>
            <h1
              className="mt-3 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[64px] font-medium leading-[0.95] tracking-[-0.035em] text-[#0A0A0A]"
            >
              {isTr ? 'Yorum yönetimi SSS' : 'Review management FAQ'}
            </h1>
            <p className="mt-4 max-w-[320px] text-[15px] leading-[1.55] text-[#525252]">
              {isTr ? 'Başka sorun var mı? ' : 'More questions? '}
              <a
                href="mailto:destek@buaze.com"
                className="font-semibold text-[#0A0A0A] border-b border-[#0A0A0A] hover:text-[#A8D62E] hover:border-[#A8D62E] transition-colors"
              >
                destek@buaze.com
              </a>
            </p>
          </div>

          <div>
            <FaqAccordion faqs={faqs} />
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="border-t border-[#EDEDED] px-5 sm:px-10 py-[60px] sm:py-16">
        <div className="max-w-[720px] mx-auto text-center">
          <h2
            className="text-[24px] sm:text-[28px] font-medium text-[#0A0A0A] tracking-[-0.02em] leading-tight"
          >
            {isTr ? 'Cevabını bulamadığın bir soru mu var?' : "Can't find what you're looking for?"}
          </h2>
          <p className="mt-3 text-[15px] text-[#525252]">
            {isTr ? 'Ekibimize yaz, 2 saat içinde dönelim.' : 'Write to our team — we reply within 2 hours.'}
          </p>
          <Link
            href={`${base}/contact`}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 py-3.5 text-[14px] font-medium text-white transition-colors hover:bg-[#1A1A1A]"
          >
            {isTr ? 'İletişime geç' : 'Contact us'}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      </main>
      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
