import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { jsonLdString } from '@/lib/seo/json-ld';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import QRGeneratorForm from '@/components/marketing/QRGeneratorForm';
// Stage 71 §38.151 — site-library.jsx animation component'lerinin
// sonraki yerleştirmesi: QRScanLoader hero altında küçük dekoratif
// teaser olarak (Buaze QR generator'ın "ne ürettiğini" visualize eder).
// Pulse §11 + framer-motion useReducedMotion + reduced-motion blanket
// (CLAUDE.md §38.61) intact. Production'da gerçek QR canvas
// QRGeneratorForm'da render edilir; bu sadece görsel teaser.
import QRScanLoader from '@/components/animations/QRScanLoader';
import { getTranslations, type Locale } from '@/lib/translations';

const VALID_LOCALES = ['tr', 'en'] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';

  const title = isTr
    ? 'Ücretsiz QR Kod Oluşturucu — Karekod Oluşturma Aracı'
    : 'Free QR Code Generator — Create a QR Code Online';
  const description = isTr
    ? 'Ücretsiz QR kod oluşturma aracı: bir bağlantı yapıştırın, karekodunuzu saniyeler içinde üretip PNG veya PDF olarak indirin. Üyelik yok, süre sınırı yok.'
    : 'Free QR code generator: paste a link, create your QR code in seconds and download it as PNG or PDF. No sign-up, no expiry, unlimited use.';

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/solutions/qr-generator`,
      languages: {
        tr: '/tr/solutions/qr-generator',
        en: '/en/solutions/qr-generator',
        'x-default': '/tr/solutions/qr-generator',
      },
    },
    openGraph: {
      type: 'website',
      url: `https://www.buaze.com/${locale}/solutions/qr-generator`,
      locale: isTr ? 'tr_TR' : 'en_US',
      siteName: 'Buaze',
      title,
      description,
      images: [{ url: `/images/open-graph-${locale}.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function QRGeneratorPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!VALID_LOCALES.includes(locale as (typeof VALID_LOCALES)[number])) {
    notFound();
  }

  const t = getTranslations(locale);
  const isTr = locale === 'tr';


  // ── SEO/AEO içerik verisi ────────────────────────────────────────────────
  // Bu sayfa 'qr kod oluşturma' (33.100/ay) ve 'karekod oluşturma' (8.100/ay)
  // kelimelerini hedefliyor ama önceden hiç h2/h3 ve gövde metni yoktu.
  // Tanımsal paragraf + adım listesi + SSS, hem klasik aramada hem de yapay
  // zekâ yanıtlarında alıntılanabilirlik için eklendi.
  const steps = isTr
    ? [
        { n: '01', t: 'Bağlantını yapıştır', d: 'Google yorum sayfan, menün, rezervasyon formun ya da web siten — QR kodun açacağı adresi gir.' },
        { n: '02', t: 'İşletme adını yaz', d: 'Karekodun üstünde görünecek işletme adı ve kısa çağrı metnini belirle.' },
        { n: '03', t: 'Şablonu seç', d: 'Beyaz, lime, koyu veya minimal — masaya, tezgâha ya da vitrine uyan tasarımı seç.' },
        { n: '04', t: 'İndir ve bas', d: 'PNG olarak indir ya da A5 baskıya hazır PDF çıkar. Boyut sınırı ve son kullanma tarihi yok.' },
      ]
    : [
        { n: '01', t: 'Paste your link', d: 'Your Google review page, menu, booking form or website — enter the address the QR code should open.' },
        { n: '02', t: 'Add your business name', d: 'Set the business name and the short call-to-action shown above the QR code.' },
        { n: '03', t: 'Pick a template', d: 'White, lime, dark or minimal — choose the design that fits your table, counter or window.' },
        { n: '04', t: 'Download and print', d: 'Download as PNG or export a print-ready A5 PDF. No size limit, no expiry date.' },
      ];

  const useCases = isTr
    ? [
        { t: 'Restoran ve kafe', d: 'Masa QR kodu ile misafirden geri bildirim topla, menünü dijitalleştir.', href: `/${locale}/solutions/restaurants` },
        { t: 'Otel ve konaklama', d: 'Oda içi karekod ile konuk memnuniyetini çıkışta değil, konaklama sırasında ölç.', href: `/${locale}/solutions/hotels` },
        { t: 'Klinik ve sağlık', d: 'Bekleme alanında hasta deneyimi anketi; KVKK uyumlu onay akışıyla.', href: `/${locale}/solutions/healthcare` },
        { t: 'Perakende', d: 'Kasa yanı QR ile mağaza deneyimini anında ölç, tekrar ziyareti artır.', href: `/${locale}/solutions/retail` },
      ]
    : [
        { t: 'Restaurants and cafés', d: 'Collect guest feedback with a table QR code and put your menu online.', href: `/${locale}/solutions/restaurants` },
        { t: 'Hotels and hospitality', d: 'Measure guest satisfaction during the stay with an in-room QR code, not after checkout.', href: `/${locale}/solutions/hotels` },
        { t: 'Clinics and healthcare', d: 'Run a patient experience survey in the waiting area, with a KVKK-compliant consent flow.', href: `/${locale}/solutions/healthcare` },
        { t: 'Retail', d: 'Measure the in-store experience instantly with a QR code at the till.', href: `/${locale}/solutions/retail` },
      ];

  const faqs = isTr
    ? [
        { q: 'QR kod oluşturmak ücretsiz mi?', a: 'Evet. Bu araçla ürettiğiniz karekodlar tamamen ücretsizdir, üyelik gerektirmez ve adet sınırı yoktur. Ürettiğiniz kodu ticari olarak da kullanabilirsiniz.' },
        { q: 'Karekod ile QR kod arasında fark var mı?', a: 'Yok. "Karekod", QR kodun Türkçe karşılığıdır; ikisi de aynı iki boyutlu barkod standardını (ISO/IEC 18004) tanımlar. Bu araçla oluşturduğunuz kod her iki isimle de aynı şeydir.' },
        { q: 'Oluşturduğum QR kodun süresi doluyor mu?', a: 'Hayır. Bu araç statik QR kod üretir: hedef adres kodun içine gömülür, aradaki bir servise bağlı değildir. Bağlantı yayında kaldığı sürece karekod çalışmaya devam eder.' },
        { q: 'QR kodu bastıktan sonra hedef adresi değiştirebilir miyim?', a: 'Statik kodda değiştiremezsiniz — yeni adres için yeni kod üretmeniz gerekir. Adresi sonradan değiştirebilmek, taramaları ölçmek ve puana göre yönlendirme yapmak isterseniz Buaze hesabındaki dinamik QR kodları kullanın.' },
        { q: 'QR kodu hangi boyutta basmalıyım?', a: 'Masa üstü kullanımda kenar uzunluğu en az 2,5 cm; vitrin veya duvar afişinde okuma mesafesinin yaklaşık onda biri kadar olmalıdır. Bu araç yüksek çözünürlüklü çıktı verdiği için büyütmede bozulma olmaz.' },
        { q: 'QR kodumu kaç kişinin taradığını görebilir miyim?', a: 'Bu ücretsiz araçta göremezsiniz; statik kod tarama verisi tutmaz. Tarama sayısı, saat dağılımı ve geri bildirime dönüşme oranını görmek için Buaze panelindeki QR kodları kullanmanız gerekir.' },
      ]
    : [
        { q: 'Is generating a QR code free?', a: 'Yes. Codes created with this tool are completely free, need no account and have no quantity limit. You can also use the generated code commercially.' },
        { q: 'What is the difference between a QR code and a "karekod"?', a: 'None. "Karekod" is simply the Turkish word for QR code; both describe the same two-dimensional barcode standard (ISO/IEC 18004).' },
        { q: 'Does the QR code I create expire?', a: 'No. This tool generates a static QR code: the destination address is encoded into the image itself and does not depend on an intermediary service. It keeps working as long as the link stays live.' },
        { q: 'Can I change the destination after printing the QR code?', a: 'Not with a static code — you would need to generate a new one. If you need to change the destination later, measure scans and route by rating, use the dynamic QR codes inside a Buaze account.' },
        { q: 'What size should I print the QR code at?', a: 'For table use, at least 2.5 cm per side; for a window or wall poster, roughly one tenth of the intended scanning distance. This tool exports at high resolution, so enlarging will not degrade quality.' },
        { q: 'Can I see how many people scanned my QR code?', a: 'Not with this free tool — a static code stores no scan data. To see scan counts, time-of-day distribution and feedback conversion, use the QR codes inside the Buaze dashboard.' },
      ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: isTr ? 'Buaze QR Kod Oluşturucu' : 'Buaze QR Code Generator',
        url: `https://www.buaze.com/${locale}/solutions/qr-generator`,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Web',
        description: isTr
          ? "Web sitenizin URL'sinden ücretsiz yüksek çözünürlüklü QR kodu oluşturun."
          : 'Generate a free, high-resolution QR code from your website URL.',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
      {
        '@type': 'HowTo',
        name: isTr ? 'QR kod nasıl oluşturulur?' : 'How to create a QR code',
        description: isTr
          ? 'Bir bağlantıdan ücretsiz, baskıya hazır QR kod üretmenin dört adımı.'
          : 'Four steps to generate a free, print-ready QR code from a link.',
        step: steps.map((st, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: st.t,
          text: st.d,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: isTr ? 'Ana Sayfa' : 'Home',
            item: `https://www.buaze.com/${locale}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: isTr ? 'Çözümler' : 'Solutions',
            item: `https://www.buaze.com/${locale}/solutions`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: isTr ? 'QR Kod Oluşturucu' : 'QR Code Generator',
            item: `https://www.buaze.com/${locale}/solutions/qr-generator`,
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-[#FFFFFF] text-[#0A0A0A] lg:pt-[64px] selection:bg-[#C6F24E]/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />

      <MarketingNavbar locale={locale} t={t} />

      <main>
        {/* ─── Hero (design 1:1: site-more.jsx:13-21) ─── */}
        <section className="px-5 sm:px-10 lg:px-12 pt-[60px] pb-10 text-center">
          <span className="pulse-eyebrow text-[#737373]">
            {isTr ? 'ÜCRETSİZ ARAÇ' : 'FREE TOOL'}
          </span>
          <h1
            className="mt-3 text-[38px] sm:text-[56px] md:text-[48px] lg:text-[68px] font-medium leading-[1.02] sm:leading-[1] tracking-[-0.035em] text-[#0A0A0A]"
          >
            {isTr ? 'QR kod oluşturucu.' : 'QR code generator.'}
          </h1>
          <p className="mx-auto mt-3.5 max-w-[560px] text-[15px] sm:text-[16px] leading-[1.6] text-[#525252]">
            {isTr
              ? 'Hesap açmadan, ücretsiz, sınırsız QR kod üret. Markana göre özelleştir, PDF olarak indir.'
              : 'Generate unlimited QR codes for free — no account required. Customize to your brand, download as PDF.'}
          </p>

          {/* Stage 71 §38.151 — QRScanLoader animated teaser. Decorative
              animated QR placeholder ile müşteri ürünü görselleştirir;
              gerçek output QRGeneratorForm canvas'ta render edilir.
              Pulse §11 disipline + framer-motion useReducedMotion (static
              QR fallback). aria-hidden because QRGeneratorForm canvas
              role="img" intact (a11y duplicate önleme). */}
          <div className="mt-8 flex justify-center" aria-hidden="true">
            <QRScanLoader size={120} scanDurationMs={2200} />
          </div>
        </section>

        {/* ─── Generator (design 1:1: site-more.jsx:23-87) ─── */}
        <section
          aria-label={isTr ? 'QR kod oluşturucu' : 'QR code generator'}
          className="px-5 sm:px-10 lg:px-12 pt-5 pb-28 sm:pb-20"
        >
          <div className="max-w-[1200px] mx-auto">
            <QRGeneratorForm locale={locale} />
          </div>
        </section>

        {/* ─── QR kod nasıl oluşturulur (AEO: tanımsal + adım listesi) ─── */}
        <section className="border-t border-[#EDEDED] bg-[#FAFAFA] px-5 sm:px-10 lg:px-12 py-[60px] sm:py-24">
          <div className="mx-auto max-w-[1100px]">
            <span className="pulse-eyebrow text-[#A8D62E]">
              {isTr ? 'NASIL ÇALIŞIR' : 'HOW IT WORKS'}
            </span>
            <h2 className="mt-3 text-[28px] sm:text-[40px] font-medium leading-[1.06] tracking-[-0.03em] text-[#0A0A0A]">
              {isTr ? 'QR kod nasıl oluşturulur?' : 'How do you create a QR code?'}
            </h2>
            <p className="mt-5 max-w-[720px] text-[16px] sm:text-[17px] leading-[1.6] text-[#525252]">
              {isTr
                ? 'QR kod (Türkçesiyle karekod), bir bağlantıyı kamerayla okunabilen iki boyutlu bir desene çeviren açık bir standarttır. Bir QR kod oluşturmak için yönlendirmek istediğiniz adresi girmeniz yeterlidir: adres kodun içine gömülür ve müşteri telefonunun kamerasıyla okuttuğunda doğrudan o sayfa açılır. Aşağıdaki araç bunu dört adımda, ücretsiz ve üyeliksiz yapar.'
                : 'A QR code is an open standard that turns a link into a two-dimensional pattern a phone camera can read. To create one you only need the address you want people to land on: it is encoded into the image itself, so scanning opens that page directly. The tool above does this in four steps, free and without an account.'}
            </p>

            <ol className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {steps.map((st) => (
                <li key={st.n} className="bz-card p-6">
                  <span className="pulse-eyebrow text-[#A8D62E]">{st.n}</span>
                  <h3 className="mt-2 text-[18px] sm:text-[20px] font-medium tracking-[-0.02em] text-[#0A0A0A]">
                    {st.t}
                  </h3>
                  <p className="mt-2 text-[14px] leading-[1.6] text-[#525252]">{st.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ─── Statik vs dinamik (ürün köprüsü + iç linkleme) ─── */}
        <section className="px-5 sm:px-10 lg:px-12 py-[60px] sm:py-24">
          <div className="mx-auto max-w-[1100px]">
            <h2 className="text-[28px] sm:text-[40px] font-medium leading-[1.06] tracking-[-0.03em] text-[#0A0A0A]">
              {isTr
                ? 'Statik karekod mu, dinamik QR mı?'
                : 'Static or dynamic QR code?'}
            </h2>
            <p className="mt-5 max-w-[720px] text-[16px] leading-[1.6] text-[#525252]">
              {isTr
                ? 'Buradaki araç statik karekod üretir: hedef adres kodun içine yazılır, kimseye bağlı değildir ve süresi dolmaz. Basıp unutabileceğiniz kullanımlar için doğru seçimdir. Hedefi sonradan değiştirmek, kaç kişinin taradığını görmek veya puana göre farklı platformlara yönlendirmek istiyorsanız dinamik QR gerekir — bunlar Buaze hesabının içinde yönetilir.'
                : 'The tool here generates a static QR code: the destination is written into the image, depends on nothing else and never expires. That is the right choice for print-and-forget use. If you need to change the destination later, see how many people scanned it, or route people to different platforms by rating, you need a dynamic QR code — those are managed inside a Buaze account.'}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={`/${locale}/features`}
                className="bz-btn-primary inline-flex min-h-[44px] items-center justify-center px-6 text-[14px]"
              >
                {isTr ? 'Dinamik QR özelliklerine bak' : 'See dynamic QR features'}
              </Link>
              <Link
                href={`/${locale}/how-it-works`}
                className="bz-btn-ghost inline-flex min-h-[44px] items-center justify-center px-6 text-[14px]"
              >
                {isTr ? 'Akış nasıl işliyor?' : 'How the flow works'}
              </Link>
            </div>

            <h3 className="mt-14 text-[20px] sm:text-[24px] font-medium tracking-[-0.02em] text-[#0A0A0A]">
              {isTr ? 'Hangi işletmeler kullanıyor?' : 'Who uses it?'}
            </h3>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {useCases.map((u) => (
                <Link
                  key={u.t}
                  href={u.href}
                  className="bz-card pulse-card-hover block p-6 transition-transform"
                >
                  <div className="text-[17px] font-medium tracking-[-0.02em] text-[#0A0A0A]">
                    {u.t}
                  </div>
                  <p className="mt-2 text-[14px] leading-[1.6] text-[#525252]">{u.d}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SSS (FAQPage JSON-LD ile eşleşir) ─── */}
        <section className="border-t border-[#EDEDED] bg-[#FAFAFA] px-5 sm:px-10 lg:px-12 py-[60px] sm:py-24">
          <div className="mx-auto max-w-[860px]">
            <h2 className="text-[28px] sm:text-[40px] font-medium leading-[1.06] tracking-[-0.03em] text-[#0A0A0A]">
              {isTr ? 'Sıkça sorulan sorular' : 'Frequently asked questions'}
            </h2>
            <dl className="mt-9 divide-y divide-[#EDEDED] border-y border-[#EDEDED]">
              {faqs.map((f) => (
                <div key={f.q} className="py-6">
                  <dt className="text-[16px] sm:text-[17px] font-medium leading-[1.4] tracking-[-0.01em] text-[#0A0A0A]">
                    {f.q}
                  </dt>
                  <dd className="mt-2.5 text-[15px] leading-[1.65] text-[#525252]">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <MarketingFooter locale={locale} t={t} />
    </div>
  );
}
