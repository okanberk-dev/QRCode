import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronRight,
  ClipboardCheck,
  Layers,
  QrCode,
  Star,
  Stethoscope,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import {
  FEATURE_CARD,
  FEATURE_CONTAINER,
  FEATURE_SECTION_Y,
  FeatureCtaSection,
  FeatureFaqSection,
  FeaturePageShell,
  FeatureSectionHeading,
  type FeatureFaq,
} from '@/components/marketing/FeaturePageLayout';
import { SECTOR_COUNT } from '@/lib/related-solutions';
import { SECTOR_PLATFORMS } from '@/lib/sector-platforms';
import { SITE_URL } from '@/lib/site';
import { WEBSITE_ID } from '@/lib/company-constants';
import type { Locale } from '@/lib/translations';
import {
  getSectorDirectory,
  getSectorDirectoryFlat,
  joinNames,
  platformNamesForSector,
  platformSummary,
} from './_components/sector-directory';

// /solutions — the directory of every sector page. The grid, its groups and
// the page count come from RELATED_SOLUTIONS_LIST (via sector-directory), so a
// new sector page shows up here and in the count without editing this file.
// Static (ISR from the locale layout): reads only `params`.
// JSON-LD: CollectionPage + BreadcrumbList + ItemList of the sector pages +
// FAQPage built from the visible FAQ.

const PATH = '/solutions';

/** Platform facts quoted in the copy, read from the panel's own whitelist. */
const FOOD_PLATFORM_COUNT = SECTOR_PLATFORMS.food.length;
const OTHER_PLATFORM_NAMES = platformNamesForSector('other');

interface ChangeItem {
  icon: LucideIcon;
  title: string;
  body: string;
}

interface HubCopy {
  meta: { title: string; description: string };
  breadcrumb: { label: string; home: string; current: string };
  eyebrow: string;
  h1: string;
  lead: string;
  primary: string;
  secondary: string;
  note: string;
  flow: {
    label: string;
    title: string;
    steps: ReadonlyArray<{ title: string; body: string }>;
    privateLabel: string;
    publicLabel: string;
    footnote: string;
  };
  directory: {
    eyebrow: string;
    title: string;
    lead: string;
    where: string;
    platforms: string;
    listName: string;
  };
  changes: { eyebrow: string; title: string; lead: string; items: readonly ChangeItem[] };
  tool: { eyebrow: string; title: string; lead: string; cta: string };
  faq: { eyebrow: string; title: string; items: readonly FeatureFaq[]; more: string };
  ctaTitle: string;
}

function getCopy(locale: Locale): HubCopy {
  if (locale === 'tr') {
    return {
      meta: {
        title: 'Sektörlere göre QR geri bildirim çözümleri',
        description: `Restoran, otel, klinik, mağaza ve hukuk bürosu dahil ${SECTOR_COUNT} sektör için QR ile müşteri geri bildirimi ve Google yorumları. 14 gün ücretsiz deneyin.`,
      },
      breadcrumb: { label: 'Sayfa konumu', home: 'Ana sayfa', current: 'Çözümler' },
      eyebrow: 'Sektörel çözümler',
      h1: 'Sektörlere göre QR ile müşteri geri bildirimi ve Google yorumları',
      lead: `Restorandan hukuk bürosuna ${SECTOR_COUNT} sektör için ayrı sayfa hazırladık. Her sayfada QR kodu nereye koyacağınızı, panelin o sektörde hangi yorum platformlarını gösterdiğini ve müşterilerinize neler sorabileceğinizi bulursunuz.`,
      primary: 'Ücretsiz deneyin',
      secondary: 'Sektörünüzü seçin',
      note: '14 gün ücretsiz deneme · Kredi kartı gerekmez',
      flow: {
        label: 'Örnek akış',
        title: 'Her sektörde aynı akış',
        steps: [
          {
            title: 'Müşteri QR kodu okutur',
            body: 'Masadaki, odadaki ya da kasadaki QR kodu okutur ve 1–5 yıldız verir.',
          },
          {
            title: 'Eşik ve üzerindeki puanlar',
            body: 'Eşiği 4 ya da 5 yıldız olarak siz belirlersiniz; varsayılan 5 yıldızdır. Bu puanlarda seçtiğiniz platformun yorum sayfası açılır.',
          },
          {
            title: 'Eşiğin altındaki puanlar',
            body: 'Müşteri önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
          },
        ],
        privateLabel: 'Size özel geri bildirim',
        publicLabel: 'Herkese açık yorum bağlantısı',
        footnote: '1–3 yıldızlık her geri bildirimde size anında e-posta gelir.',
      },
      directory: {
        eyebrow: 'Sektörler',
        title: `${SECTOR_COUNT} sektör için hazırlanmış sayfalar`,
        lead: 'Her sayfada QR yerleşimi, panelin o sektörde gösterdiği yorum platformları, örnek anket soruları, hazır şablonlar ve sık sorulan sorular yer alır.',
        where: 'QR yeri',
        platforms: 'Platformlar',
        listName: 'Buaze sektör sayfaları',
      },
      changes: {
        eyebrow: 'Sektöre göre değişenler',
        title: 'Akış aynı kalır, ayrıntılar sektörünüze göre değişir',
        lead: 'Puan akışı, düşük puan uyarıları, Pulse AI yanıt taslakları ve analitik her sektörde aynıdır. Sektör sayfalarında anlatılan farklar şunlardır:',
        items: [
          {
            icon: Tag,
            title: 'QR kodun yeri ve etiketi',
            body: 'Restoranda masa, otelde oda, salonda koltuk: her QR koda kısa bir etiket verirsiniz (ör. A12, 204). Etikette boşluk ve Türkçe karakter kullanılmaz. Etiket düşük puan e-postasında ve geri bildirim CSV dosyasında görünür.',
          },
          {
            icon: Layers,
            title: 'Panelin gösterdiği yorum platformları',
            body: `Kurulumda seçtiğiniz sektör, panelde hangi platformların görüneceğini belirler: restoranlarda ${FOOD_PLATFORM_COUNT} platform, hukuk bürolarında yalnızca Google. Buaze bu platformlardaki yorumları gelen kutunuza aktarmaz; müşteriyi seçtiğiniz yorum sayfasına gönderir.`,
          },
          {
            icon: ClipboardCheck,
            title: 'Önerilen anket ve denetim şablonları',
            body: 'Restoran, otel, klinik, güzellik salonu ve mağazalar için ayrı anket şablonları vardır. Denetim Merkezi de yeni denetim oluştururken önce işletmenizin sektörüne uygun şablonları önerir.',
          },
          {
            icon: Stethoscope,
            title: 'Kliniklerde hasta dili',
            body: 'Sektör olarak “Klinik & Sağlık”ı seçerseniz panel geri bildirimleri “Hasta geri bildirimleri”, müşteri listesini “Hastalar” olarak adlandırır ve QR Menü bölümünü gizler.',
          },
        ],
      },
      tool: {
        eyebrow: 'Ücretsiz araç',
        title: 'Ücretsiz QR kod oluşturucu',
        lead: 'Bir bağlantıyı hesap açmadan QR koda dönüştürün: 4 kart temasından birini seçin, PNG olarak indirin ya da A5 sayfaya PDF olarak yazdırın. Bu kodlar statiktir; puan akışı ve uyarılar için Buaze hesabınızdaki QR kodları kullanılır.',
        cta: 'QR kod oluşturucuyu açın',
      },
      faq: {
        eyebrow: 'Sık sorulan sorular',
        title: 'Sektör sayfaları hakkında sorular',
        more: 'Tüm soruları görün',
        items: [
          {
            q: 'Sektörüm listede yok, Buaze’yi kullanabilir miyim?',
            a: `Evet. Kurulumda “Diğer” sektörünü seçebilirsiniz; panel bu durumda ${joinNames(OTHER_PLATFORM_NAMES, 'tr')} bağlantılarını gösterir. Puan akışı, uyarılar ve analitik her sektörde aynı çalışır.`,
          },
          {
            q: 'Sektörümü sonradan değiştirebilir miyim?',
            a: 'Evet. İşletme ayarlarından sektörü değiştirdiğinizde panelin gösterdiği yorum platformları ve önerilen şablonlar da değişir. Daha önce kaydettiğiniz platform bağlantıları silinmez.',
          },
          {
            q: 'Farklı sektörlerde birden çok işletmem var, ne olur?',
            a: 'Her işletmenin kendi sektörü vardır. Panelde işletmeler arasında geçtiğinizde platform listesi ve önerilen şablonlar o işletmeye göre değişir; hepsini aynı hesaptan yönetirsiniz.',
          },
          {
            q: 'Buaze diğer platformlardaki yorumları panele getirir mi?',
            a: 'Hayır. Buaze Yemeksepeti, Tripadvisor veya Booking.com gibi platformlardan yorum çekmez; bu platformların yorum bağlantılarını yönetir ve müşteriyi seçtiğiniz yorum sayfasına gönderir. Panelde QR akışından gelen geri bildirimleri ve Google profilinizin özetini (puan, yorum sayısı ve Google’ın gösterdiği en fazla 5 yorum) görürsünüz.',
          },
        ],
      },
      ctaTitle: 'Sektörünüz için geri bildirim toplamaya başlayın',
    };
  }
  return {
    meta: {
      title: 'QR feedback and review solutions by industry',
      description: `QR customer feedback and Google reviews for ${SECTOR_COUNT} industries, from restaurants and hotels to clinics, stores and law firms. Try it free for 14 days.`,
    },
    breadcrumb: { label: 'Breadcrumb', home: 'Home', current: 'Solutions' },
    eyebrow: 'Industry solutions',
    h1: 'QR customer feedback and Google reviews by industry',
    lead: `From restaurants to law firms, we have a separate page for each of ${SECTOR_COUNT} industries. Each one covers where to put the QR code, which review platforms the panel shows for that industry and what you can ask your customers.`,
    primary: 'Start free trial',
    secondary: 'Choose your industry',
    note: '14-day free trial · No credit card required',
    flow: {
      label: 'Sample flow',
      title: 'The same flow in every industry',
      steps: [
        {
          title: 'The customer scans the QR code',
          body: 'They scan the code on the table, in the room or at the till and give 1–5 stars.',
        },
        {
          title: 'Ratings at or above your threshold',
          body: 'You set the threshold at 4 or 5 stars; the default is 5. At these ratings, your chosen platform’s review page opens.',
        },
        {
          title: 'Ratings below your threshold',
          body: 'The customer can first send you private feedback; the public review link is shown on the same screen.',
        },
      ],
      privateLabel: 'Private feedback to you',
      publicLabel: 'Public review link',
      footnote: 'Every 1–3★ piece of feedback sends you an instant e-mail.',
    },
    directory: {
      eyebrow: 'Industries',
      title: `Pages for ${SECTOR_COUNT} industries`,
      lead: 'Each page covers QR placement, the review platforms the panel shows for that industry, sample survey questions, ready-made templates and common questions.',
      where: 'QR placement',
      platforms: 'Platforms',
      listName: 'Buaze industry pages',
    },
    changes: {
      eyebrow: 'What changes by industry',
      title: 'The flow stays the same; the details follow your industry',
      lead: 'The rating flow, low-rating alerts, Pulse AI reply drafts and analytics work the same in every industry. These are the differences the industry pages cover:',
      items: [
        {
          icon: Tag,
          title: 'Where the QR code goes and its label',
          body: 'A table in a restaurant, a room in a hotel, a chair in a salon: you give each QR code a short label (for example A12 or 204). Labels can’t contain spaces or accented letters. The label shows in the low-rating e-mail and in the feedback CSV file.',
        },
        {
          icon: Layers,
          title: 'The review platforms the panel shows',
          body: `The industry you pick at setup decides which platforms the panel shows: ${FOOD_PLATFORM_COUNT} for restaurants, only Google for law firms. Buaze doesn’t bring these platforms’ reviews into your inbox; it sends the customer to the review page you choose.`,
        },
        {
          icon: ClipboardCheck,
          title: 'Suggested survey and audit templates',
          body: 'Restaurants, hotels, clinics, beauty salons and stores each have their own survey template. When you create a new audit, the Audit Center also suggests templates for your industry first.',
        },
        {
          icon: Stethoscope,
          title: 'Patient wording for clinics',
          body: 'If you pick “Clinic & Health” as your industry, the panel calls feedback “Patient feedback” and the customer list “Patients”, and hides the QR Menu section.',
        },
      ],
    },
    tool: {
      eyebrow: 'Free tool',
      title: 'Free QR code generator',
      lead: 'Turn a link into a QR code without an account: pick one of 4 card themes, then download a PNG or print it on an A5 page as a PDF. These codes are static; the rating flow and alerts use the QR codes in your Buaze account.',
      cta: 'Open the QR code generator',
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Questions about the industry pages',
      more: 'See all questions',
      items: [
        {
          q: 'My industry isn’t listed. Can I still use Buaze?',
          a: `Yes. Pick “Other” at setup; the panel then shows ${joinNames(OTHER_PLATFORM_NAMES, 'en')} links. The rating flow, alerts and analytics work the same in every industry.`,
        },
        {
          q: 'Can I change my industry later?',
          a: 'Yes. When you change the industry in your business settings, the review platforms the panel shows and the suggested templates change too. Platform links you saved before are not deleted.',
        },
        {
          q: 'I have businesses in different industries. What happens?',
          a: 'Each business has its own industry. When you switch between businesses in the panel, the platform list and suggested templates follow that business; you manage them all from the same account.',
        },
        {
          q: 'Does Buaze bring reviews from other platforms into the panel?',
          a: 'No. Buaze doesn’t import reviews from platforms such as Yemeksepeti, Tripadvisor or Booking.com; it manages their review links and sends the customer to the review page you choose. In the panel you see the feedback from your QR flow and a summary of your Google profile (rating, review count and up to 5 reviews Google returns).',
        },
      ],
    },
    ctaTitle: 'Start collecting feedback for your industry',
  };
}

function resolveLocale(raw: string): Locale {
  return raw === 'en' ? 'en' : 'tr';
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const { title, description } = getCopy(locale).meta;
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${PATH}`,
      languages: { tr: `/tr${PATH}`, en: `/en${PATH}`, 'x-default': `/tr${PATH}` },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${locale}${PATH}`,
      title,
      description,
      images: [{ url: `/images/open-graph-${locale}.png`, width: 1200, height: 630, alt: title }],
    },
  };
}

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6CF0] focus-visible:ring-offset-2';
const BTN = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-colors ${FOCUS}`;

export default async function SolutionsHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = resolveLocale((await params).locale);
  const copy = getCopy(locale);
  const base = `/${locale}`;
  const url = `${SITE_URL}/${locale}${PATH}`;
  const inLanguage = locale === 'tr' ? 'tr-TR' : 'en-US';
  const groups = getSectorDirectory();
  const flat = getSectorDirectoryFlat();
  const directoryId = locale === 'tr' ? 'sektorler' : 'industries';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${url}#webpage`,
        url,
        name: copy.meta.title,
        description: copy.meta.description,
        inLanguage,
        isPartOf: { '@id': WEBSITE_ID },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        mainEntity: { '@id': `${url}#sectors` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: copy.breadcrumb.home, item: `${SITE_URL}/${locale}` },
          { '@type': 'ListItem', position: 2, name: copy.breadcrumb.current, item: url },
        ],
      },
      {
        '@type': 'ItemList',
        '@id': `${url}#sectors`,
        name: copy.directory.listName,
        numberOfItems: flat.length,
        itemListElement: flat.map((entry, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: entry.name[locale],
          url: `${SITE_URL}/${locale}/solutions/${entry.slug}`,
        })),
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        inLanguage,
        mainEntity: copy.faq.items.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  };

  return (
    <FeaturePageShell locale={locale} jsonLd={jsonLd}>
      {/* 1 · Hero: what the section is, with the flow every sector shares */}
      <section aria-labelledby="solutions-title" className="bg-white pb-[60px] pt-10 sm:pb-24 sm:pt-16">
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
                <span aria-current="page" className="font-medium text-[#0A0A0A]">
                  {copy.breadcrumb.current}
                </span>
              </li>
            </ol>
          </nav>

          <div className="mt-8 lg:mt-10 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14">
            <div className="max-w-[680px]">
              <p className="pulse-eyebrow text-[#737373]">{copy.eyebrow}</p>
              <h1
                id="solutions-title"
                className="mt-5 text-balance text-[38px] leading-[1.06] tracking-[-0.03em] text-[#0A0A0A] sm:text-[52px] md:text-[48px] lg:text-[56px]"
              >
                {copy.h1}
              </h1>
              <p className="mt-6 max-w-[620px] text-pretty text-[16px] leading-[1.6] text-[#525252] sm:text-[18px]">
                {copy.lead}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={`${base}/auth/register`}
                  rel="nofollow"
                  className={`${BTN} bg-[#0A0A0A] text-white hover:bg-[#1A1A1A]`}
                >
                  {copy.primary}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <a
                  href={`#${directoryId}`}
                  className={`${BTN} border border-[#D4D4D4] bg-white text-[#0A0A0A] hover:border-[#0A0A0A]`}
                >
                  {copy.secondary}
                </a>
              </div>
              <p className="mt-5 text-[14px] leading-[1.5] text-[#737373]">{copy.note}</p>
            </div>

            <div className="mx-auto mt-12 w-full max-w-[520px] lg:mt-0">
              <div className="rounded-[24px] border border-[#EDEDED] bg-[#FAFAFA] p-3 shadow-[0_24px_60px_-32px_rgba(10,10,10,0.28)] sm:p-4">
                <p className="pulse-eyebrow px-2 pb-3 pt-1 text-[#737373]">{copy.flow.label}</p>
                <div className="rounded-[16px] border border-[#EDEDED] bg-white p-5 sm:p-6">
                  <p className="text-[18px] font-semibold leading-[1.3] text-[#0A0A0A]">{copy.flow.title}</p>
                  <ol className="mt-5 space-y-5">
                    {copy.flow.steps.map((step, i) => (
                      <li key={step.title} className="flex gap-4">
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5D3EBC] font-mono text-[13px] font-semibold text-white"
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold leading-[1.4] text-[#0A0A0A]">{step.title}</p>
                          <p className="mt-1 text-[14px] leading-[1.55] text-[#525252]">{step.body}</p>
                          {i === 1 ? (
                            <span aria-hidden="true" className="mt-2.5 flex gap-1">
                              {[0, 1, 2, 3, 4].map((star) => (
                                <Star key={star} size={16} className="fill-[#5D3EBC] text-[#5D3EBC]" strokeWidth={1.5} />
                              ))}
                            </span>
                          ) : null}
                          {i === 2 ? (
                            <span aria-hidden="true" className="mt-2.5 flex flex-wrap gap-2">
                              <span className="inline-flex min-h-[30px] items-center rounded-full bg-[#0A0A0A] px-3 text-[12px] font-medium text-white">
                                {copy.flow.privateLabel}
                              </span>
                              <span className="inline-flex min-h-[30px] items-center rounded-full border border-[#D4D4D4] bg-white px-3 text-[12px] font-medium text-[#0A0A0A]">
                                {copy.flow.publicLabel}
                              </span>
                            </span>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-6 border-t border-[#EDEDED] pt-4 text-[13px] leading-[1.5] text-[#525252]">
                    {copy.flow.footnote}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2 · Directory: every sector page, grouped */}
      <section
        id={directoryId}
        aria-labelledby="solutions-directory-title"
        className={`scroll-mt-24 bg-[#FAFAFA] ${FEATURE_SECTION_Y}`}
      >
        <div className={FEATURE_CONTAINER}>
          <FeatureSectionHeading
            id="solutions-directory-title"
            eyebrow={copy.directory.eyebrow}
            title={copy.directory.title}
            lead={copy.directory.lead}
          />
          <div className="mt-12 divide-y divide-[#E5E5E5] border-y border-[#E5E5E5] sm:mt-14">
            {groups.map((group) => (
              <div key={group.id} className="grid grid-cols-1 gap-5 py-8 lg:grid-cols-[220px_1fr] lg:gap-8 lg:py-10">
                <h3 className="text-[20px] leading-[1.25] text-[#0A0A0A] lg:pt-4">{group.title[locale]}</h3>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {group.entries.map((entry) => {
                    const Icon = entry.Icon;
                    return (
                      <li
                        key={entry.slug}
                        className="group relative flex h-full flex-col rounded-[20px] border border-[#EDEDED] bg-white p-5 transition-colors hover:border-[#0A0A0A] focus-within:ring-2 focus-within:ring-[#8C6CF0] focus-within:ring-offset-2 sm:p-6"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#EFEAFB] text-[#0A0A0A]"
                          >
                            <Icon size={18} strokeWidth={2} />
                          </span>
                          <p className="min-w-0 flex-1 text-[17px] font-semibold leading-[1.3] text-[#0A0A0A]">
                            <Link
                              href={`${base}/solutions/${entry.slug}`}
                              className="after:absolute after:inset-0 after:rounded-[20px] focus-visible:outline-none"
                            >
                              {entry.name[locale]}
                            </Link>
                          </p>
                          <ArrowRight
                            size={16}
                            aria-hidden="true"
                            className="shrink-0 text-[#A3A3A3] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0A0A0A] motion-reduce:transition-none"
                          />
                        </div>
                        {entry.where ? (
                          <p className="mt-4 text-[14px] leading-[1.55] text-[#525252]">
                            <span className="font-medium text-[#0A0A0A]">{copy.directory.where}:</span>{' '}
                            {entry.where[locale]}
                          </p>
                        ) : null}
                        {entry.platforms.length > 0 ? (
                          <p className="mt-1 text-[14px] leading-[1.55] text-[#525252]">
                            <span className="font-medium text-[#0A0A0A]">{copy.directory.platforms}:</span>{' '}
                            {platformSummary(entry.platforms)}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 · What changes by sector */}
      <section aria-labelledby="solutions-changes-title" className={`bg-white ${FEATURE_SECTION_Y}`}>
        <div className={FEATURE_CONTAINER}>
          <FeatureSectionHeading
            id="solutions-changes-title"
            eyebrow={copy.changes.eyebrow}
            title={copy.changes.title}
            lead={copy.changes.lead}
          />
          <ul className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-6">
            {copy.changes.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className={FEATURE_CARD}>
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#EFEAFB] text-[#0A0A0A]"
                  >
                    <Icon size={20} strokeWidth={2} />
                  </span>
                  <h3 className="mt-5 text-[20px] leading-[1.25] text-[#0A0A0A]">{item.title}</h3>
                  <p className="mt-3 text-[15px] leading-[1.65] text-[#525252]">{item.body}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 4 · Free QR generator */}
      <section aria-labelledby="solutions-tool-title" className={`bg-[#FAFAFA] ${FEATURE_SECTION_Y}`}>
        <div className={FEATURE_CONTAINER}>
          <div className="relative overflow-hidden rounded-[28px] bg-[#5D3EBC] px-6 py-10 text-white sm:px-12 sm:py-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-28 -top-28 h-[360px] w-[360px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.14), transparent 70%)' }}
            />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
              <div className="max-w-[640px]">
                <p className="pulse-eyebrow text-white/85">{copy.tool.eyebrow}</p>
                <h2
                  id="solutions-tool-title"
                  className="mt-4 text-balance text-[28px] leading-[1.08] text-white sm:text-[40px]"
                >
                  {copy.tool.title}
                </h2>
                <p className="mt-5 text-[16px] leading-[1.6] text-white/85 sm:text-[17px]">{copy.tool.lead}</p>
              </div>
              <Link
                href={`${base}/solutions/qr-generator`}
                className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-[#5D3EBC] transition-colors hover:bg-[#EFEAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#5D3EBC]"
              >
                <QrCode size={18} aria-hidden="true" />
                {copy.tool.cta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5 · FAQ (same array as the FAQPage JSON-LD) */}
      <FeatureFaqSection
        locale={locale}
        eyebrow={copy.faq.eyebrow}
        title={copy.faq.title}
        items={copy.faq.items}
        more={{ href: `${base}/faq`, label: copy.faq.more }}
        className="bg-white"
      />

      {/* 6 · Closing CTA */}
      <FeatureCtaSection locale={locale} title={copy.ctaTitle} />
    </FeaturePageShell>
  );
}
