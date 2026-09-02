import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import {
  ArrowRight,
  QrCode,
  LayoutGrid,
  Palette,
  BarChart3,
  ImageIcon,
  EyeOff,
  Utensils,
  Coffee,
  BookOpen,
  Stethoscope,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import { jsonLdString } from '@/lib/seo/json-ld';
import { buildHowToSchema } from '@/lib/seo/howto-schema';
import { getTranslations, type Locale } from '@/lib/translations';

const StickyCtaBar = nextDynamic(() => import('@/components/marketing/StickyCtaBar'));

// /features/menu — QR menü marketing surface.
//
// Owner panelindeki menü sistemi (DnD builder, 7 tema, ürün görselleri, menü
// QR'ı, menü analitiği — CLAUDE.md §12 / §13) uçtan uca çalışıyordu ama
// pazarlama tarafında hiçbir sayfa onu hedeflemiyordu. Semrush TR verisine
// göre boşta duran hacim: 'qr menü' 5.400/ay (KD 38), 'dijital menü' 480/ay
// (KD 21), 'qr kod menü' 260/ay (KD 31); EN 'qr menu' 590/ay (KD 34).
//
// Kalıp kaynağı: /features/surveys (Stage 134 §38.214 + Stage 135 §38.215).
// Inline TR/EN ternary — yeni translations.ts anahtarı yok (CLAUDE.md §7).

const VALID_LOCALES = ['tr', 'en'] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === 'tr';
  const title = isTr
    ? 'QR Menü — Dijital Menü Oluşturma ve Menü Analitiği'
    : 'QR Menu — Digital Menu Builder with Menu Analytics';
  const description = isTr
    ? 'İşletmen için QR menü oluştur: sürükle-bırak düzenleyici, 7 hazır tema, ürün görselleri ve hangi ürünün ilgi gördüğünü gösteren menü analitiği.'
    : 'Build a QR menu for your venue: drag-and-drop editor, 7 ready themes, product photos and menu analytics that show which items actually get attention.';
  const ogImage = isTr ? '/images/open-graph-tr.png' : '/images/open-graph-en.png';

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/features/menu`,
      languages: {
        tr: '/tr/features/menu',
        en: '/en/features/menu',
        'x-default': '/tr/features/menu',
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: isTr ? 'tr_TR' : 'en_US',
      title,
      description,
      url: `https://buaze.com/${locale}/features/menu`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export const revalidate = 3600;

export default async function FeatureMenuPage({
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
  const base = `/${locale}`;
  const url = `https://buaze.com/${locale}/features/menu`;

  const steps = isTr
    ? [
        { name: 'Kategorileri ve ürünleri gir', text: 'Kategori ekle, ürünleri altına yaz. Fiyat, açıklama ve görsel alanlarını doldur; sırayı sürükle-bırak ile değiştir.' },
        { name: 'Temanı seç', text: 'Yedi hazır tema arasından işletmenin diline uyanı seç, vurgu rengini ve logonu ayarla.' },
        { name: 'Menü QR kodunu indir', text: 'Menüne özel QR kodu PNG veya SVG olarak indir; masaya, tezgâha veya vitrine bas.' },
        { name: 'Analitiği oku', text: 'Hangi kategori açılıyor, hangi ürün görülüp tıklanmıyor — menü analitiğinde gör ve menüyü buna göre düzenle.' },
      ]
    : [
        { name: 'Add categories and items', text: 'Create categories, add items underneath. Fill in price, description and photo; reorder by dragging.' },
        { name: 'Pick a theme', text: 'Choose one of seven ready themes that fits your venue, then set your accent colour and logo.' },
        { name: 'Download the menu QR code', text: 'Download the QR code for your menu as PNG or SVG and print it for tables, counter or window.' },
        { name: 'Read the analytics', text: 'See which categories get opened and which items get seen but never tapped, then rework the menu accordingly.' },
      ];

  const capabilities = isTr
    ? [
        { Icon: LayoutGrid, t: 'Sürükle-bırak düzenleyici', d: 'Kategori ve ürün sırasını sürükleyerek değiştir. Dokunmatik ekranda da çalışır; klavye için ok tuşu desteği var.' },
        { Icon: Palette, t: '7 hazır tema', d: 'Classic, modern, elegant, gastronomy, minimal, bistro ve Pulse. Vurgu rengi ve logo her temada özelleştirilebilir.' },
        { Icon: ImageIcon, t: 'Ürün görselleri', d: 'Fotoğrafı yükle, tarayıcıda otomatik sıkıştırılıp WebP’ye çevrilir. Ayrı bir görsel servisine ihtiyaç yok.' },
        { Icon: EyeOff, t: 'Tek tıkla gizle veya tükendi işaretle', d: 'Ürün bitince menüyü baştan düzenlemene gerek yok — satır üzerinden görünürlüğü veya “tükendi” durumunu değiştir.' },
        { Icon: QrCode, t: 'Menüye özel QR kodu', d: 'Menün için ayrı QR kodu üret, PNG veya SVG indir. Bu koddan gelen ziyaretler analitikte ayrı işaretlenir.' },
        { Icon: BarChart3, t: 'Menü analitiği', d: 'Menü görüntüleme, kategori tıklaması, ürün görüntüleme ve tıklaması ayrı ayrı ölçülür; ilgi görmeyen ürünler işaretlenir.' },
      ]
    : [
        { Icon: LayoutGrid, t: 'Drag-and-drop editor', d: 'Reorder categories and items by dragging. Works on touch screens, with arrow-key support for keyboard users.' },
        { Icon: Palette, t: '7 ready themes', d: 'Classic, modern, elegant, gastronomy, minimal, bistro and Pulse. Accent colour and logo are customisable in every theme.' },
        { Icon: ImageIcon, t: 'Product photos', d: 'Upload a photo and it is compressed in the browser and converted to WebP. No separate image service needed.' },
        { Icon: EyeOff, t: 'Hide or mark sold out in one tap', d: 'When an item runs out you do not have to rebuild the menu — toggle visibility or “sold out” straight from the row.' },
        { Icon: QrCode, t: 'A QR code for the menu', d: 'Generate a dedicated QR code for your menu and download it as PNG or SVG. Visits from it are tagged separately in analytics.' },
        { Icon: BarChart3, t: 'Menu analytics', d: 'Menu views, category taps, item views and item taps are measured separately, and items nobody engages with are flagged.' },
      ];

  const sectors = isTr
    ? [
        { Icon: Utensils, t: 'Restoran', d: 'Masa QR’ı ile menü', href: `${base}/solutions/restaurants` },
        { Icon: Coffee, t: 'Kafe', d: 'Tezgâh üstü karekod', href: `${base}/solutions/restaurants` },
        { Icon: BookOpen, t: 'Otel', d: 'Oda ve restoran menüsü', href: `${base}/solutions/hotels` },
        { Icon: Sparkles, t: 'Bar ve bistro', d: 'Hızlı güncellenen içecek listesi', href: `${base}/solutions/restaurants` },
        { Icon: ShoppingBag, t: 'Perakende', d: 'Ürün ve fiyat listesi', href: `${base}/solutions/retail` },
        { Icon: Stethoscope, t: 'Klinik', d: 'Hizmet ve fiyat listesi', href: `${base}/solutions/healthcare` },
      ]
    : [
        { Icon: Utensils, t: 'Restaurants', d: 'Menu via a table QR code', href: `${base}/solutions/restaurants` },
        { Icon: Coffee, t: 'Cafés', d: 'QR code on the counter', href: `${base}/solutions/restaurants` },
        { Icon: BookOpen, t: 'Hotels', d: 'Room and restaurant menu', href: `${base}/solutions/hotels` },
        { Icon: Sparkles, t: 'Bars and bistros', d: 'A drinks list you can update fast', href: `${base}/solutions/restaurants` },
        { Icon: ShoppingBag, t: 'Retail', d: 'Product and price list', href: `${base}/solutions/retail` },
        { Icon: Stethoscope, t: 'Clinics', d: 'Service and price list', href: `${base}/solutions/healthcare` },
      ];

  const faqs = isTr
    ? [
        { q: 'QR menü nedir?', a: 'QR menü, basılı menünün yerine geçen ve müşterinin masadaki karekodu telefon kamerasıyla okutarak açtığı dijital menüdür. Uygulama indirmek gerekmez; kod tarayıcıda bir web sayfası açar. Fiyat veya ürün değiştiğinde yeniden baskı yapmadan menüyü panelden güncellersiniz.' },
        { q: 'QR menü nasıl oluşturulur?', a: 'Buaze panelinde kategorileri ve ürünleri girip bir tema seçmeniz yeterlidir. Menünüz yayına alındığında size özel bir bağlantı ve o bağlantıyı açan bir QR kod üretilir; kodu PNG veya SVG olarak indirip basarsınız.' },
        { q: 'Dijital menü ile QR menü aynı şey mi?', a: 'Pratikte evet. “Dijital menü” menünün elektronik hâlini, “QR menü” ise müşterinin ona karekod okutarak ulaşmasını anlatır. Buaze’de menü hem doğrudan bağlantıyla hem QR kodla açılabilir.' },
        { q: 'Menüyü güncellersem QR kodu yeniden basmam gerekir mi?', a: 'Hayır. QR kod menünüzün adresini işaret eder, içeriğini değil. Ürün, fiyat, görsel veya tema değiştirdiğinizde aynı kod güncel menüyü açmaya devam eder.' },
        { q: 'Ürün fotoğrafı yüklemek zorunda mıyım?', a: 'Hayır, görsel isteğe bağlıdır. Yüklerseniz fotoğraf tarayıcınızda sıkıştırılıp WebP formatına çevrilir, böylece menü mobil bağlantıda da hızlı açılır.' },
        { q: 'Menümün ne kadar görüntülendiğini görebilir miyim?', a: 'Evet. Menü analitiği; menü görüntülemelerini, kategori tıklamalarını, ürün görüntüleme ve tıklamalarını ayrı ayrı gösterir. Görülüp tıklanmayan ürünler ayrıca işaretlenir, böylece açıklamayı veya görseli gözden geçirebilirsiniz.' },
        { q: 'QR menü müşteri yorumu toplamakla nasıl birleşiyor?', a: 'Aynı hesapta çalışırlar. Menü QR’ı ile geri bildirim QR’ını ayrı ayrı basabilir, hangi kanaldan kaç kişinin geldiğini tek panelden izleyebilirsiniz.' },
      ]
    : [
        { q: 'What is a QR menu?', a: 'A QR menu is a digital menu that replaces the printed one: the guest scans a QR code at the table with their phone camera and it opens. No app install is needed — the code opens a web page in the browser. When a price or item changes you update it from the dashboard instead of reprinting.' },
        { q: 'How do you create a QR menu?', a: 'In the Buaze dashboard you add categories and items, then pick a theme. When the menu is published you get a dedicated link plus a QR code that opens it, which you can download as PNG or SVG and print.' },
        { q: 'Is a digital menu the same as a QR menu?', a: 'In practice, yes. “Digital menu” describes the electronic version of the menu; “QR menu” describes how the guest reaches it. In Buaze the menu opens both from a direct link and from a QR code.' },
        { q: 'Do I need to reprint the QR code when I update the menu?', a: 'No. The QR code points at your menu address, not at its contents. When you change items, prices, photos or the theme, the same code keeps opening the up-to-date menu.' },
        { q: 'Do I have to upload product photos?', a: 'No, images are optional. If you do upload one it is compressed in your browser and converted to WebP, so the menu still loads quickly on a mobile connection.' },
        { q: 'Can I see how often my menu is viewed?', a: 'Yes. Menu analytics reports menu views, category taps, item views and item taps separately. Items that get seen but never tapped are flagged, so you can revisit the description or the photo.' },
        { q: 'How does the QR menu fit together with collecting reviews?', a: 'They run in the same account. You can print the menu QR code and the feedback QR code separately and still track how many people arrived through each, from one dashboard.' },
      ];

  const howTo = buildHowToSchema({
    locale,
    name: isTr ? 'QR menü nasıl oluşturulur?' : 'How to create a QR menu',
    description: isTr
      ? 'Dört adımda dijital menü kurup menüye özel QR kodu basma.'
      : 'Build a digital menu and print a dedicated QR code in four steps.',
    url,
    steps: steps.map((s) => ({ name: s.name, text: s.text })),
    totalTime: 'PT15M',
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: isTr ? 'Buaze QR Menü' : 'Buaze QR Menu',
        serviceType: isTr ? 'QR menü ve dijital menü yönetimi' : 'QR menu and digital menu management',
        url,
        provider: { '@type': 'Organization', name: 'Buaze', url: 'https://buaze.com' },
        areaServed: isTr ? 'Türkiye' : 'Worldwide',
        description: isTr
          ? 'Sürükle-bırak menü düzenleyici, 7 tema, ürün görselleri, menüye özel QR kodu ve menü analitiği.'
          : 'Drag-and-drop menu editor, 7 themes, product photos, a dedicated menu QR code and menu analytics.',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isTr ? 'Ana Sayfa' : 'Home', item: `https://buaze.com/${locale}` },
          { '@type': 'ListItem', position: 2, name: isTr ? 'Özellikler' : 'Features', item: `https://buaze.com/${locale}/features` },
          { '@type': 'ListItem', position: 3, name: isTr ? 'QR Menü' : 'QR Menu', item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      ...(howTo ? [howTo] : []),
    ],
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-[#0A0A0A] lg:pt-[64px] selection:bg-[#C6F24E]/40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <MarketingNavbar locale={locale} t={t} />

      <main>
        {/* ─── HERO ─── */}
        <section className="relative overflow-hidden bg-[#0A0A0A] px-5 sm:px-10 py-20 sm:py-24 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 -right-40 h-[620px] w-[620px] rounded-full bg-[#C6F24E]/10 blur-[140px]"
          />
          <div className="relative mx-auto max-w-[1200px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C6F24E]/30 bg-[#C6F24E]/10 px-3 py-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C6F24E] pulse-heartbeat" />
              <span className="pulse-eyebrow text-[#C6F24E]">{isTr ? 'QR MENÜ' : 'QR MENU'}</span>
            </div>
            <h1 className="mt-5 max-w-[900px] text-[40px] font-medium leading-[0.98] tracking-[-0.035em] text-white sm:text-[56px] md:text-[52px] lg:text-[76px]">
              {isTr ? (
                <>
                  Menün{' '}
                  <span className="inline-block -skew-y-1 rounded-lg bg-[#C6F24E] px-3 py-0.5 text-[#0A0A0A]">
                    tek karekodda
                  </span>
                </>
              ) : (
                <>
                  Your menu in{' '}
                  <span className="inline-block -skew-y-1 rounded-lg bg-[#C6F24E] px-3 py-0.5 text-[#0A0A0A]">
                    one QR code
                  </span>
                </>
              )}
            </h1>
            <p className="mt-6 max-w-[600px] text-[17px] leading-[1.6] text-white/70 sm:text-[18px]">
              {isTr
                ? 'Sürükle-bırak düzenleyici, yedi hazır tema ve ürün görselleriyle dijital menünü kur. Menüye özel QR kodunu bas, hangi ürünün ilgi gördüğünü analitikten oku.'
                : 'Build your digital menu with a drag-and-drop editor, seven ready themes and product photos. Print a dedicated QR code and read which items actually get attention.'}
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
                href={`${base}/solutions/qr-generator`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-[15px] font-medium text-white transition-colors hover:border-white/60 hover:bg-white/5"
              >
                {isTr ? 'Önce ücretsiz QR üret' : 'Try the free QR generator'}
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/60">
              {(isTr
                ? ['7 hazır tema', 'Menüye özel QR kodu', 'Menü analitiği']
                : ['7 ready themes', 'Dedicated menu QR code', 'Menu analytics']
              ).map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="inline-block h-1 w-1 rounded-full bg-[#C6F24E]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ─── AEO tanımsal H2'ler ─── */}
        <section className="px-5 sm:px-10 py-[60px] sm:py-24">
          <div className="mx-auto max-w-[860px] space-y-12 sm:space-y-16">
            <div>
              <span className="pulse-eyebrow text-[#A8D62E]">{isTr ? 'TANIM' : 'DEFINITION'}</span>
              <h2 className="mt-3 text-[28px] sm:text-[40px] font-medium leading-[1.05] tracking-[-0.03em] text-[#0A0A0A]">
                {isTr ? 'QR menü nedir?' : 'What is a QR menu?'}
              </h2>
              <p className="mt-5 text-[16px] sm:text-[17px] leading-[1.65] text-[#525252]">
                {isTr
                  ? 'QR menü, basılı menünün yerine geçen ve müşterinin masadaki karekodu telefonuyla okutarak açtığı dijital menüdür. Uygulama indirmesi gerekmez: kod, tarayıcıda bir web sayfası açar. Fiyat değiştiğinde ya da bir ürün bittiğinde menüyü panelden güncellersiniz; yeniden baskı yoktur.'
                  : 'A QR menu is a digital menu that replaces the printed one: the guest scans a code at the table with their phone and it opens. No app install is needed — the code opens a web page in the browser. When a price changes or an item runs out you update it from the dashboard, with no reprinting.'}
              </p>
              <blockquote className="mt-6 border-l-[3px] border-[#C6F24E] bg-[#EAF9B8]/30 px-5 py-4 text-[15px] font-medium leading-[1.55] text-[#0A0A0A] sm:px-6 sm:py-5">
                {isTr
                  ? 'Basılı menünün maliyeti baskıda değil, gecikmede: fiyat değişince menü haftalarca yanlış kalır. QR menüde değişiklik anında yayına girer.'
                  : 'The cost of a printed menu is not the printing, it is the lag: when a price changes the menu stays wrong for weeks. With a QR menu the change is live immediately.'}
              </blockquote>
            </div>

            <div>
              <span className="pulse-eyebrow text-[#A8D62E]">{isTr ? 'FARK' : 'DIFFERENCE'}</span>
              <h2 className="mt-3 text-[28px] sm:text-[40px] font-medium leading-[1.05] tracking-[-0.03em] text-[#0A0A0A]">
                {isTr ? 'Buaze’de ne farklı?' : 'What is different in Buaze?'}
              </h2>
              <p className="mt-5 text-[16px] sm:text-[17px] leading-[1.65] text-[#525252]">
                {isTr
                  ? 'Çoğu QR menü aracı menüyü yayınlar ve orada biter. Buaze’de menü, geri bildirim akışıyla aynı hesapta çalışır: menü QR’ından kaç kişinin geldiğini, hangi kategoriyi açtığını ve hangi ürünü görüp tıklamadığını görürsünüz. Menü bir PDF değil, ölçülebilir bir yüzeydir.'
                  : 'Most QR menu tools publish the menu and stop there. In Buaze the menu runs in the same account as your feedback flow: you see how many people arrived from the menu QR code, which category they opened, and which items they saw but never tapped. The menu is a measurable surface, not a PDF.'}
              </p>
              <blockquote className="mt-6 border-l-[3px] border-[#C6F24E] bg-[#EAF9B8]/30 px-5 py-4 text-[15px] font-medium leading-[1.55] text-[#0A0A0A] sm:px-6 sm:py-5">
                {isTr
                  ? 'Menüde en çok görülen ürün, en çok satan ürün değildir. Aradaki farkı ancak görüntüleme ile tıklamayı ayrı ölçerseniz görürsünüz.'
                  : 'The most-viewed item on a menu is not the best-selling one. You only see that gap when views and taps are measured separately.'}
              </blockquote>
            </div>
          </div>
        </section>

        {/* ─── Yetenekler ─── */}
        <section className="border-y border-[#EDEDED] bg-[#FAFAFA] px-5 sm:px-10 py-[60px] sm:py-24">
          <div className="mx-auto max-w-[1200px]">
            <span className="pulse-eyebrow text-[#A8D62E]">{isTr ? 'NELER VAR' : 'WHAT YOU GET'}</span>
            <h2 className="mt-3 text-[26px] sm:text-[42px] font-medium leading-[1.04] tracking-[-0.03em] text-[#0A0A0A]">
              {isTr ? 'Menü düzenleyicide neler var?' : 'What is in the menu editor?'}
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map(({ Icon, t: ct, d }) => (
                <div key={ct} className="bz-card p-6">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF9B8]">
                    <Icon size={18} className="text-[#0A0A0A]" strokeWidth={2} />
                  </span>
                  <h3 className="mt-4 text-[17px] font-medium tracking-[-0.02em] text-[#0A0A0A]">{ct}</h3>
                  <p className="mt-2 text-[14px] leading-[1.6] text-[#525252]">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Adımlar ─── */}
        <section className="px-5 sm:px-10 py-[60px] sm:py-24">
          <div className="mx-auto max-w-[1100px]">
            <span className="pulse-eyebrow text-[#A8D62E]">{isTr ? 'NASIL' : 'HOW'}</span>
            <h2 className="mt-3 text-[26px] sm:text-[42px] font-medium leading-[1.04] tracking-[-0.03em] text-[#0A0A0A]">
              {isTr ? 'QR menü nasıl oluşturulur?' : 'How to create a QR menu'}
            </h2>
            <ol className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {steps.map((s, i) => (
                <li key={s.name} className="bz-card p-6">
                  <span className="pulse-eyebrow text-[#A8D62E]">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-2 text-[18px] sm:text-[20px] font-medium tracking-[-0.02em] text-[#0A0A0A]">
                    {s.name}
                  </h3>
                  <p className="mt-2 text-[14px] leading-[1.6] text-[#525252]">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ─── Sektör çapraz linkleri ─── */}
        <section className="border-y border-[#EDEDED] bg-[#FAFAFA] px-5 sm:px-10 py-[60px] sm:py-24">
          <div className="mx-auto max-w-[1100px]">
            <span className="pulse-eyebrow text-[#A8D62E]">{isTr ? 'SEKTÖRLER' : 'SECTORS'}</span>
            <h2 className="mt-3 text-[26px] sm:text-[36px] font-medium leading-[1.05] tracking-[-0.03em] text-[#0A0A0A]">
              {isTr ? 'Hangi işletmeler için uygun?' : 'Which businesses is it for?'}
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sectors.map(({ Icon, t: st, d, href }) => (
                <Link key={st + d} href={href} className="bz-card pulse-card-hover block p-5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF9B8]">
                    <Icon size={16} className="text-[#0A0A0A]" strokeWidth={2} />
                  </span>
                  <div className="mt-3 text-[15px] font-medium tracking-[-0.01em] text-[#0A0A0A]">{st}</div>
                  <div className="mt-1 text-[13px] leading-[1.55] text-[#737373]">{d}</div>
                </Link>
              ))}
            </div>
            <div className="mt-8">
              <Link
                href={`${base}/solutions`}
                className="bz-btn-ghost inline-flex min-h-[44px] items-center justify-center px-6 text-[14px]"
              >
                {isTr ? 'Tüm sektörlere bak' : 'See all sectors'}
              </Link>
            </div>
          </div>
        </section>

        {/* ─── SSS ─── */}
        <section className="px-5 sm:px-10 py-[60px] sm:py-24">
          <div className="mx-auto max-w-[860px]">
            <span className="pulse-eyebrow text-[#A8D62E]">{isTr ? 'SSS' : 'FAQ'}</span>
            <h2 className="mt-3 text-[26px] sm:text-[40px] font-medium leading-[1.04] tracking-[-0.03em] text-[#0A0A0A]">
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

        {/* ─── CTA ─── */}
        <section className="bg-[#0A0A0A] px-5 sm:px-10 py-[60px] sm:py-24 text-white">
          <div className="mx-auto max-w-[860px] text-center">
            <h2 className="text-[28px] sm:text-[48px] font-medium leading-[1.05] tracking-[-0.03em]">
              {isTr ? 'Menünü bugün karekoda taşı.' : 'Move your menu to a QR code today.'}
            </h2>
            <p className="mx-auto mt-4 max-w-[560px] text-[15px] sm:text-[16px] leading-[1.6] text-white/70">
              {isTr
                ? '14 gün ücretsiz deneyin; kredi kartı gerekmez.'
                : 'Try it free for 14 days — no card required.'}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={`${base}/auth/register`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#C6F24E] px-7 py-3 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E]"
              >
                {isTr ? 'Ücretsiz başla' : 'Start free'}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`${base}/pricing`}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/20 px-7 py-3 text-[15px] font-medium text-white transition-colors hover:border-white/60 hover:bg-white/5"
              >
                {isTr ? 'Fiyatlandırma' : 'Pricing'}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter locale={locale} t={t} />
      <StickyCtaBar locale={locale} />
    </div>
  );
}
