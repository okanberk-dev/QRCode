import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, ChevronRight, Maximize2, Contrast, Scissors, ScanLine } from 'lucide-react';
import {
  FEATURE_CARD,
  FEATURE_CONTAINER,
  FEATURE_SECTION_Y,
  FEATURE_TEXT_LINK,
  FeatureCtaSection,
  FeatureFaqSection,
  FeaturePageShell,
  FeatureSectionHeading,
  type FeatureFaq,
} from '@/components/marketing/FeaturePageLayout';
import QRGeneratorForm from '@/components/marketing/QRGeneratorForm';
import { SECTOR_COUNT } from '@/lib/related-solutions';
import { buildSolutionMetadata, solutionUrl } from '@/lib/solution-schema';
import { buildHowToSchema } from '@/lib/seo/howto-schema';
import { SITE_URL } from '@/lib/site';
import type { Locale } from '@/lib/translations';
import { getSectorEntries } from '../_components/sector-directory';

// /solutions/qr-generator — the free static QR tool (CLAUDE.md §24).
// The tool runs in the browser (QRGeneratorForm); this server page adds the
// explanation, print advice, the static-vs-account comparison and the FAQ.
// Static (ISR from the locale layout): reads only `params`.
// JSON-LD: BreadcrumbList + HowTo built from the visible steps (each step has
// id="step-N") + FAQPage built from the visible FAQ. No WebApplication node
// (Google reports it invalid without ratings, spec D12).

const SLUG = 'qr-generator';
const SECTOR_LINKS = ['restaurants', 'delivery', 'hotels', 'healthcare', 'beauty-salon', 'retail'] as const;

interface Step {
  title: string;
  body: string;
}

interface Copy {
  meta: { title: string; description: string };
  breadcrumb: { label: string; home: string; solutions: string; current: string };
  eyebrow: string;
  h1: string;
  lead: string;
  facts: readonly string[];
  toolLabel: string;
  how: { eyebrow: string; title: string; lead: string; steps: readonly Step[] };
  tips: { eyebrow: string; title: string; lead: string; items: readonly Step[] };
  compare: {
    eyebrow: string;
    title: string;
    lead: string;
    staticTitle: string;
    staticItems: readonly string[];
    accountTitle: string;
    accountItems: readonly string[];
    primary: string;
    secondary: string;
  };
  sectors: { eyebrow: string; title: string; lead: string; all: string };
  faq: { eyebrow: string; title: string; items: readonly FeatureFaq[] };
  ctaTitle: string;
}

const COPY: Record<Locale, Copy> = {
  tr: {
    meta: {
      title: 'Ücretsiz QR kod (karekod) oluşturucu: PNG ve PDF',
      description:
        'Hesap açmadan ücretsiz QR kod oluşturun: bağlantınızı yapıştırın, 4 kart temasından birini seçin, PNG olarak indirin ya da A5 PDF olarak yazdırın.',
    },
    breadcrumb: { label: 'Sayfa konumu', home: 'Ana sayfa', solutions: 'Çözümler', current: 'Ücretsiz QR kod oluşturucu' },
    eyebrow: 'Ücretsiz araç',
    h1: 'Ücretsiz QR kod oluşturucu',
    lead: 'Bir bağlantıyı QR koda dönüştürün, kartınızı dört temadan biriyle hazırlayın ve hesap açmadan indirin: PNG olarak kaydedin ya da A5 sayfaya PDF olarak yazdırın.',
    facts: ['Hesap gerekmez', 'Süresi dolmaz', 'Tarama verisi tutulmaz'],
    toolLabel: 'QR kod oluşturucu',
    how: {
      eyebrow: 'Nasıl çalışır',
      title: 'QR kod nasıl oluşturulur',
      lead: 'QR kod (Türkçesiyle karekod), bir bağlantıyı telefon kamerasının okuyabildiği kare bir desene çeviren açık bir standarttır (ISO/IEC 18004). Adres kodun içine yazılır; kod okutulduğunda doğrudan o sayfa açılır. Bu araç kodu tarayıcınızda oluşturur; girdiğiniz bağlantı Buaze sunucularına gönderilmez.',
      steps: [
        {
          title: 'Bağlantınızı yapıştırın',
          body: 'QR kodun açacağı adresi girin: Google yorum bağlantınız, menünüz, rezervasyon sayfanız ya da web siteniz. Başına “https://” yazmazsanız araç kendisi ekler.',
        },
        {
          title: 'Kartı düzenleyin',
          body: 'İsterseniz işletmenizin adını ve QR kodun üstünde görünecek kısa bir başlık yazın; örneğin “Deneyiminizi paylaşın” ya da “Menümüz burada”.',
        },
        {
          title: 'Temayı seçin',
          body: 'Beyaz, lime, koyu veya minimal temalardan masanıza, tezgâhınıza ya da vitrininize uyanı seçin. Kodun kendisi her temada beyaz bir kutu içinde siyah basılır.',
        },
        {
          title: 'İndirin ya da yazdırın',
          body: 'Kartı PNG olarak indirin ya da A5 sayfaya PDF olarak yazdırın. Kodu kendi tasarımınızda kullanmak isterseniz yalnızca QR kodunu PNG olarak alabilirsiniz.',
        },
      ],
    },
    tips: {
      eyebrow: 'Baskı',
      title: 'QR kodu basarken dikkat edilecekler',
      lead: 'Kodun her telefonda sorunsuz okunması için birkaç basit kural yeterlidir.',
      items: [
        {
          title: 'Boyutu mesafeye göre seçin',
          body: 'Masa kartı gibi yakından okutulan yerlerde kodun kenarı en az 2–3 cm olsun. Uzaktan okutulacak afişlerde kodu okutma mesafesinin yaklaşık onda biri kadar büyük basın; 2 metreden okutulacak bir afiş için yaklaşık 20 cm.',
        },
        {
          title: 'Kontrastı koruyun',
          body: 'Koyu desen açık zemin üzerinde en iyi sonucu verir. Bu araç kodu her temada beyaz kutu içinde siyah basar; kodu kendi tasarımınıza eklerken de bu kontrastı koruyun.',
        },
        {
          title: 'Kenar boşluğunu kırpmayın',
          body: 'Kodun çevresindeki beyaz boşluk okunmasını kolaylaştırır. Kodu tasarımınıza yerleştirirken bu boşluğu silmeyin, kodun üzerine yazı ya da logo koymayın.',
        },
        {
          title: 'Basmadan önce deneyin',
          body: 'Kodu en az iki farklı telefonla okutup doğru sayfanın açıldığını kontrol edin. Bağlantı uzadıkça desen sıklaşır; mümkünse kısa ve kalıcı bir adres kullanın.',
        },
      ],
    },
    compare: {
      eyebrow: 'Statik ve hesaplı QR',
      title: 'Statik QR kod ile Buaze QR kodu arasındaki fark',
      lead: 'Bu sayfadaki araç statik kod üretir. Buaze hesabınızdaki QR kodlar ise müşteriyi önce sizin puan sayfanıza götürür.',
      staticTitle: 'Bu sayfadaki statik QR kod',
      staticItems: [
        'Hedef adres kodun içine yazılır; değiştirmek için yeni kod basmanız gerekir.',
        'Hesap gerektirmez, tarama verisi tutmaz ve süresi dolmaz.',
        'Menü, web sitesi ya da tek bir yorum bağlantısı için yeterlidir.',
      ],
      accountTitle: 'Buaze hesabınızdaki QR kod',
      accountItems: [
        'Müşteri QR kodu okutur ve puan verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) seçtiğiniz platformun yorum sayfası açılır.',
        'Eşiğin altındaki puanlarda müşteri önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
        'Kod Buaze sayfanızı açtığı için varsayılan platformu ya da eşiği panelden değiştirdiğinizde yeniden basmanız gerekmez.',
        '1–3 yıldızlık her geri bildirimde anında e-posta alırsınız; her koda masa veya oda etiketi ekleyebilirsiniz.',
      ],
      primary: 'Ücretsiz deneyin',
      secondary: 'Nasıl çalıştığını görün',
    },
    sectors: {
      eyebrow: 'Sektörler',
      title: 'QR kodu sektörünüze göre kullanın',
      lead: 'Sektör sayfalarında QR kodun nereye konacağını, hangi yorum platformlarının öne çıktığını ve müşterilere neler sorulabileceğini anlatıyoruz.',
      all: `${SECTOR_COUNT} sektör sayfasının hepsini görün`,
    },
    faq: {
      eyebrow: 'Sık sorulan sorular',
      title: 'QR kod oluşturma hakkında sorular',
      items: [
        {
          q: 'QR kod oluşturmak ücretsiz mi?',
          a: 'Evet. Bu araçla oluşturduğunuz kodlar ücretsizdir; hesap açmanız gerekmez ve oluşturabileceğiniz kod sayısında sınır yoktur.',
        },
        {
          q: 'Karekod ile QR kod aynı şey mi?',
          a: 'Evet. Karekod, QR kodun Türkçe karşılığıdır; ikisi de ISO/IEC 18004 standardındaki aynı iki boyutlu barkodu anlatır.',
        },
        {
          q: 'Google yorum bağlantımı nereden bulurum?',
          a: 'Google İşletme Profiliniz, müşterilerden yorum istemek için paylaşabileceğiniz bir bağlantı sunar; o bağlantıyı buraya yapıştırabilirsiniz. Buaze hesabında ise işletmenizi adıyla aratıp seçmeniz yeterlidir; Google yorum bağlantınızı Buaze hazırlar.',
        },
        {
          q: 'Oluşturduğum QR kodun süresi dolar mı?',
          a: 'Hayır. Statik kodda adres kodun içine yazılıdır ve arada bir hizmet yoktur. Bağlantı yayında kaldığı sürece kod çalışır; sayfa kaldırılırsa kod da o sayfayı açamaz.',
        },
        {
          q: 'QR kodu bastıktan sonra hedef adresi değiştirebilir miyim?',
          a: 'Statik kodda hayır; yeni adres için yeni kod oluşturmanız gerekir. Buaze hesabınızdaki QR kodlar Buaze sayfanızı açtığından varsayılan yorum platformunuzu panelden değiştirebilir, kodu yeniden basmadan kullanmaya devam edebilirsiniz.',
        },
        {
          // 1.000 px = QR_PX in src/components/marketing/QRGeneratorForm.tsx.
          q: 'QR kodu hangi boyutta basmalıyım?',
          a: 'Masa kartlarında kodun kenarı en az 2–3 cm olsun; uzaktan okutulacak afişlerde okutma mesafesinin yaklaşık onda biri kadar büyük basın. Bu araçtaki QR kod PNG dosyası 1.000 piksel genişliğindedir; masa kartı ve A5 baskı için yeterlidir, büyük afişlerde baskıdan önce bir deneme yapın.',
        },
        {
          q: 'QR kodumu kaç kişinin okuttuğunu görebilir miyim?',
          a: 'Bu araçla hayır; statik kod tarama verisi tutmaz ve bağlantınız Buaze’ye gönderilmez. Buaze hesabınızdaki QR kodlarla müşterilerin verdiği puanları ve geri bildirimleri panelde görürsünüz.',
        },
      ],
    },
    ctaTitle: 'QR kodla geri bildirim toplamaya başlayın',
  },
  en: {
    meta: {
      title: 'Free QR code generator with PNG and PDF download',
      description:
        'Create a free QR code without an account: paste your link, choose one of 4 card themes, then download it as a PNG file or print it as an A5 PDF.',
    },
    breadcrumb: { label: 'Breadcrumb', home: 'Home', solutions: 'Solutions', current: 'Free QR code generator' },
    eyebrow: 'Free tool',
    h1: 'Free QR code generator',
    lead: 'Turn a link into a QR code, style your card with one of four themes and download it without an account: save it as a PNG or print it on an A5 page as a PDF.',
    facts: ['No account needed', 'Never expires', 'No scan tracking'],
    toolLabel: 'QR code generator',
    how: {
      eyebrow: 'How it works',
      title: 'How to create a QR code',
      lead: 'A QR code is an open standard (ISO/IEC 18004) that turns a link into a square pattern a phone camera can read. The address is written into the code itself, so scanning it opens that page directly. This tool creates the code in your browser; the link you enter is not sent to Buaze’s servers.',
      steps: [
        {
          title: 'Paste your link',
          body: 'Enter the address the QR code should open: your Google review link, menu, booking page or website. If you leave out “https://”, the tool adds it.',
        },
        {
          title: 'Edit the card',
          body: 'Optionally add your business name and a short headline above the QR code, such as “Share your experience” or “See our menu”.',
        },
        {
          title: 'Pick a theme',
          body: 'Choose white, lime, dark or minimal to suit your table, counter or window. In every theme the code itself is printed in black inside a white box.',
        },
        {
          title: 'Download or print',
          body: 'Download the card as a PNG or print it on an A5 page as a PDF. To use the code in your own design, download just the QR code as a PNG.',
        },
      ],
    },
    tips: {
      eyebrow: 'Printing',
      title: 'What to check before you print a QR code',
      lead: 'A few simple rules make sure the code scans on every phone.',
      items: [
        {
          title: 'Size it for the distance',
          body: 'Where people scan up close, such as a table card, make each side at least 2–3 cm. For posters scanned from further away, print the code at about a tenth of the scanning distance: about 20 cm for a poster scanned from 2 metres.',
        },
        {
          title: 'Keep the contrast',
          body: 'A dark pattern on a light background works best. This tool prints the code in black inside a white box in every theme; keep that contrast when you place the code in your own design.',
        },
        {
          title: 'Don’t crop the margin',
          body: 'The white margin around the code helps phones read it. Keep it when you place the code in your design, and don’t put text or a logo over the code.',
        },
        {
          title: 'Test before printing',
          body: 'Scan the code with at least two different phones and check that the right page opens. Longer links make a denser pattern, so use a short, permanent address where you can.',
        },
      ],
    },
    compare: {
      eyebrow: 'Static and account QR codes',
      title: 'A static QR code compared with a Buaze QR code',
      lead: 'The tool on this page makes static codes. The QR codes in your Buaze account first take the customer to your own rating page.',
      staticTitle: 'The static QR code on this page',
      staticItems: [
        'The destination is written into the code; to change it, you print a new code.',
        'No account, no scan tracking, and it never expires.',
        'Enough for a menu, a website or a single review link.',
      ],
      accountTitle: 'A QR code in your Buaze account',
      accountItems: [
        'The customer scans the QR code and gives a rating. At or above the threshold you set (5 stars by default), your chosen platform’s review page opens.',
        'Below it, the customer can first send you private feedback; the public review link is shown on the same screen.',
        'The code opens your Buaze page, so you can change the default platform or the threshold in the panel without reprinting.',
        'Every 1–3★ piece of feedback sends you an instant e-mail, and you can add a table or room label to each code.',
      ],
      primary: 'Start free trial',
      secondary: 'See how it works',
    },
    sectors: {
      eyebrow: 'Industries',
      title: 'Use QR codes the way your industry does',
      lead: 'The industry pages cover where the QR code goes, which review platforms matter most and what you can ask your customers.',
      all: `See all ${SECTOR_COUNT} industry pages`,
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Questions about creating QR codes',
      items: [
        {
          q: 'Is it free to create a QR code?',
          a: 'Yes. The codes you create with this tool are free; you don’t need an account, and there is no limit on how many codes you create.',
        },
        {
          q: 'Are a QR code and a “karekod” the same thing?',
          a: 'Yes. Karekod is the Turkish word for QR code; both describe the same two-dimensional barcode defined in the ISO/IEC 18004 standard.',
        },
        {
          q: 'Where do I find my Google review link?',
          a: 'Your Google Business Profile offers a link you can share to ask customers for reviews; paste that link here. In a Buaze account, you just search for your business by name and select it, and Buaze builds your Google review link.',
        },
        {
          q: 'Does the QR code I create expire?',
          a: 'No. In a static code the address is written into the code and no service sits in between. The code works as long as the link stays online; if the page is removed, the code can no longer open it.',
        },
        {
          q: 'Can I change the destination after printing the QR code?',
          a: 'Not with a static code; for a new address you need a new code. The QR codes in your Buaze account open your Buaze page, so you can change your default review platform in the panel and keep using the same printed code.',
        },
        {
          // 1,000 px = QR_PX in src/components/marketing/QRGeneratorForm.tsx.
          q: 'What size should I print the QR code at?',
          a: 'On table cards, make each side at least 2–3 cm; for posters scanned from further away, print it at about a tenth of the scanning distance. The QR code PNG from this tool is 1,000 pixels wide, which is enough for table cards and A5 prints; test a print before ordering large posters.',
        },
        {
          q: 'Can I see how many people scanned my QR code?',
          a: 'Not with this tool: a static code keeps no scan data, and your link is not sent to Buaze. With the QR codes in your Buaze account, you see the ratings and feedback customers leave in the panel.',
        },
      ],
    },
    ctaTitle: 'Start collecting feedback with QR codes',
  },
};

const TIP_ICONS = [Maximize2, Contrast, Scissors, ScanLine] as const;

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2';
const BTN = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-colors ${FOCUS}`;

function resolveLocale(raw: string): Locale {
  return raw === 'en' ? 'en' : 'tr';
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  return buildSolutionMetadata({ locale, slug: SLUG, ...COPY[locale].meta });
}

export default async function QRGeneratorPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = resolveLocale((await params).locale);
  const copy = COPY[locale];
  const base = `/${locale}`;
  const url = solutionUrl(locale, SLUG);
  const inLanguage = locale === 'tr' ? 'tr-TR' : 'en-US';
  const sectorEntries = getSectorEntries(SECTOR_LINKS);

  const howTo = buildHowToSchema({
    locale,
    name: copy.how.title,
    description: copy.how.lead,
    url,
    steps: copy.how.steps.map((step) => ({ name: step.title, text: step.body })),
  });
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: copy.breadcrumb.home, item: `${SITE_URL}/${locale}` },
        { '@type': 'ListItem', position: 2, name: copy.breadcrumb.solutions, item: `${SITE_URL}/${locale}/solutions` },
        { '@type': 'ListItem', position: 3, name: copy.breadcrumb.current, item: url },
      ],
    },
    ...(howTo ? [howTo] : []),
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      inLanguage,
      mainEntity: copy.faq.items.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ];

  return (
    <FeaturePageShell locale={locale} jsonLd={jsonLd}>
      {/* 1 · Hero */}
      <section aria-labelledby="qr-tool-title" className="bg-white pb-8 pt-10 sm:pb-10 sm:pt-16">
        <div className={FEATURE_CONTAINER}>
          <nav aria-label={copy.breadcrumb.label} className="text-[13px] text-[#737373]">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href={base} className={`-my-3 inline-flex min-h-[44px] items-center rounded-sm hover:text-[#0A0A0A] ${FOCUS}`}>
                  {copy.breadcrumb.home}
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight size={12} className="text-[#A3A3A3]" />
              </li>
              <li>
                <Link
                  href={`${base}/solutions`}
                  className={`-my-3 inline-flex min-h-[44px] items-center rounded-sm hover:text-[#0A0A0A] ${FOCUS}`}
                >
                  {copy.breadcrumb.solutions}
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight size={12} className="text-[#A3A3A3]" />
              </li>
              <li>
                <span aria-current="page" className="font-medium text-[#0A0A0A]">
                  {copy.breadcrumb.current}
                </span>
              </li>
            </ol>
          </nav>

          <div className="mt-8 max-w-[900px] lg:mt-10">
            <p className="pulse-eyebrow text-[#737373]">{copy.eyebrow}</p>
            <h1
              id="qr-tool-title"
              className="mt-5 text-balance text-[38px] leading-[1.06] tracking-[-0.03em] text-[#0A0A0A] sm:text-[56px] md:text-[52px] lg:text-[60px]"
            >
              {copy.h1}
            </h1>
            <p className="mt-6 max-w-[640px] text-pretty text-[16px] leading-[1.6] text-[#525252] sm:text-[18px]">
              {copy.lead}
            </p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-medium text-[#1A1A1A]">
              {copy.facts.map((fact) => (
                <li key={fact} className="inline-flex items-center gap-2">
                  <Check size={16} aria-hidden="true" className="text-[#0A0A0A]" strokeWidth={2.5} />
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 2 · The tool */}
      <section aria-label={copy.toolLabel} className="bg-white pb-[60px] pt-6 sm:pb-24 sm:pt-8">
        <div className={FEATURE_CONTAINER}>
          <QRGeneratorForm locale={locale} />
        </div>
      </section>

      {/* 3 · How to create a QR code (steps feed the HowTo JSON-LD) */}
      <section aria-labelledby="qr-how-title" className={`bg-[#FAFAFA] ${FEATURE_SECTION_Y}`}>
        <div className={FEATURE_CONTAINER}>
          <FeatureSectionHeading id="qr-how-title" eyebrow={copy.how.eyebrow} title={copy.how.title} lead={copy.how.lead} />
          <ol className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {copy.how.steps.map((step, i) => (
              <li key={step.title} id={`step-${i + 1}`} className={`${FEATURE_CARD} scroll-mt-28`}>
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0A0A] font-mono text-[14px] font-semibold text-[#C6F24E]"
                >
                  {i + 1}
                </span>
                <h3 className="mt-5 text-[19px] leading-[1.3] text-[#0A0A0A]">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-[1.65] text-[#525252]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4 · Print advice */}
      <section aria-labelledby="qr-tips-title" className={`bg-white ${FEATURE_SECTION_Y}`}>
        <div className={FEATURE_CONTAINER}>
          <FeatureSectionHeading id="qr-tips-title" eyebrow={copy.tips.eyebrow} title={copy.tips.title} lead={copy.tips.lead} />
          <ul className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-6">
            {copy.tips.items.map((tip, i) => {
              const Icon = TIP_ICONS[i % TIP_ICONS.length];
              return (
                <li key={tip.title} className={FEATURE_CARD}>
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#EAF9B8] text-[#0A0A0A]"
                  >
                    <Icon size={20} strokeWidth={2} />
                  </span>
                  <h3 className="mt-5 text-[20px] leading-[1.25] text-[#0A0A0A]">{tip.title}</h3>
                  <p className="mt-3 text-[15px] leading-[1.65] text-[#525252]">{tip.body}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 5 · Static code vs a Buaze account code */}
      <section aria-labelledby="qr-compare-title" className={`bg-[#FAFAFA] ${FEATURE_SECTION_Y}`}>
        <div className={FEATURE_CONTAINER}>
          <FeatureSectionHeading
            id="qr-compare-title"
            eyebrow={copy.compare.eyebrow}
            title={copy.compare.title}
            lead={copy.compare.lead}
          />
          <div className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:gap-6 lg:grid-cols-2">
            <div className={FEATURE_CARD}>
              <h3 className="text-[20px] leading-[1.25] text-[#0A0A0A]">{copy.compare.staticTitle}</h3>
              <ul className="mt-5 space-y-3">
                {copy.compare.staticItems.map((item) => (
                  <li key={item} className="flex gap-3 text-[15px] leading-[1.6] text-[#525252]">
                    <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#A3A3A3]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[20px] border border-[#0A0A0A] bg-white p-6 sm:p-8">
              <h3 className="text-[20px] leading-[1.25] text-[#0A0A0A]">{copy.compare.accountTitle}</h3>
              <ul className="mt-5 space-y-3">
                {copy.compare.accountItems.map((item) => (
                  <li key={item} className="flex gap-3 text-[15px] leading-[1.6] text-[#333333]">
                    <Check size={16} aria-hidden="true" className="mt-1 shrink-0 text-[#0A0A0A]" strokeWidth={2.5} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`${base}/auth/register`}
              rel="nofollow"
              className={`${BTN} bg-[#0A0A0A] text-white hover:bg-[#1A1A1A]`}
            >
              {copy.compare.primary}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href={`${base}/how-it-works`}
              className={`${BTN} border border-[#D4D4D4] bg-white text-[#0A0A0A] hover:border-[#0A0A0A]`}
            >
              {copy.compare.secondary}
            </Link>
          </div>
        </div>
      </section>

      {/* 6 · Industry pages */}
      <section aria-labelledby="qr-sectors-title" className={`bg-white ${FEATURE_SECTION_Y}`}>
        <div className={FEATURE_CONTAINER}>
          <FeatureSectionHeading
            id="qr-sectors-title"
            eyebrow={copy.sectors.eyebrow}
            title={copy.sectors.title}
            lead={copy.sectors.lead}
          />
          <ul className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {sectorEntries.map((entry) => {
              const Icon = entry.Icon;
              return (
                <li
                  key={entry.slug}
                  className="group relative flex h-full flex-col rounded-[20px] border border-[#EDEDED] bg-white p-6 transition-colors hover:border-[#0A0A0A] focus-within:ring-2 focus-within:ring-[#C6F24E] focus-within:ring-offset-2"
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#F2F2F2] text-[#0A0A0A]"
                    >
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <h3 className="min-w-0 flex-1 text-[18px] leading-[1.25] text-[#0A0A0A]">
                      <Link
                        href={`${base}/solutions/${entry.slug}`}
                        className="after:absolute after:inset-0 after:rounded-[20px] focus-visible:outline-none"
                      >
                        {entry.name[locale]}
                      </Link>
                    </h3>
                    <ArrowRight
                      size={16}
                      aria-hidden="true"
                      className="shrink-0 text-[#A3A3A3] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0A0A0A] motion-reduce:transition-none"
                    />
                  </div>
                  {entry.where ? (
                    <p className="mt-4 text-[14px] leading-[1.55] text-[#525252]">{entry.where[locale]}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="mt-8">
            <Link href={`${base}/solutions`} className={FEATURE_TEXT_LINK}>
              {copy.sectors.all}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </p>
        </div>
      </section>

      {/* 7 · FAQ (same array as the FAQPage JSON-LD) */}
      <FeatureFaqSection locale={locale} eyebrow={copy.faq.eyebrow} title={copy.faq.title} items={copy.faq.items} />

      {/* 8 · Closing CTA */}
      <FeatureCtaSection locale={locale} title={copy.ctaTitle} />
    </FeaturePageShell>
  );
}
