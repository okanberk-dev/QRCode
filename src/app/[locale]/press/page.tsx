import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ArrowUpRight, Download, Mail } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import CopyTextButton from '@/components/marketing/company/CopyTextButton';
import { jsonLdString } from '@/lib/seo/json-ld';
import { SITE_URL, SITE_HOST } from '@/lib/site';
import { getCompanyFacts, ORGANIZATION_ID, SUPPORT_HOURS, WEBSITE_ID } from '@/lib/company-facts';
import { getSiteSettings } from '@/lib/site-settings';
import type { Locale } from '@/lib/translations';

/**
 * /press — company descriptions in three lengths, verified company facts
 * (getCompanyFacts: same source as the footer and the Organization JSON-LD),
 * the logo and brand colours, and one press contact (support@buaze.com).
 * The descriptions describe the review flow exactly as it works (spec D1)
 * and Buaze's behaviour without any certification (D2).
 * ISR (1 day); nothing here reads headers()/cookies()/searchParams.
 */

export const revalidate = 86400;

type Lang = 'tr' | 'en';

const META = {
  tr: {
    title: 'Basın kiti: şirket bilgileri, logo ve renkler',
    description:
      'Buaze basın kiti: üç uzunlukta şirket tanımı, temel şirket bilgileri, SVG logo ve marka renkleri. Basın talepleriniz için support@buaze.com adresine yazın.',
  },
  en: {
    title: 'Press kit: company facts, logo and colours',
    description:
      'The Buaze press kit: company descriptions in three lengths, key company facts, the SVG logo and brand colours. For press requests, write to support@buaze.com.',
  },
} as const;

const PLATFORMS_TR =
  'Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking.com, Airbnb, Yandex, Yelp ve Foursquare';
const PLATFORMS_EN =
  'Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking.com, Airbnb, Yandex, Yelp and Foursquare';

const MEDIUM_TR = `Buaze, restoran, otel, klinik ve mağaza gibi işletmeler için geliştirilen bir geri bildirim ve yorum bağlantısı yazılımıdır. Müşteri QR kodu okutup puan verir; işletmenin belirlediği eşik ve üzerindeki puanlarda seçilen platformun yorum sayfası açılır, eşiğin altındaki puanlarda müşteri önce işletmeye özel geri bildirim yazabilir ve herkese açık yorum bağlantısı aynı ekranda görünür. Buaze 10 platformun yorum bağlantısını yönetir: ${PLATFORMS_TR}.`;
const MEDIUM_EN = `Buaze is feedback and review-link software for businesses such as restaurants, hotels, clinics and shops. The customer scans a QR code and gives a rating; at or above the threshold the business sets, the chosen platform's review page opens, and below it the customer can first send the business private feedback, with the public review link shown on the same screen. Buaze manages review links for 10 platforms: ${PLATFORMS_EN}.`;

const COPY = {
  tr: {
    eyebrow: 'Basın',
    h1: 'Buaze basın kiti',
    lead: 'Buaze hakkında yazarken kullanabileceğiniz şirket tanımlarını, temel şirket bilgilerini, logoyu ve marka renklerini burada bulabilirsiniz.',
    factsTitle: 'Şirket bilgileri',
    facts: {
      brand: 'Marka',
      legalName: 'Ticari unvan',
      mersis: 'MERSİS no',
      tax: 'Vergi dairesi / no',
      founded: 'Kuruluş',
      based: 'Merkez',
      product: 'Ürün',
      productValue: 'QR ile müşteri geri bildirimi ve yorum bağlantıları yazılımı (SaaS)',
      languages: 'Diller',
      languagesValue: 'Türkçe, İngilizce',
      website: 'Web sitesi',
      press: 'Basın iletişimi',
    },
    descTitle: 'Şirket tanımı',
    descLead: 'Üç farklı uzunlukta; olduğu gibi kullanabilirsiniz.',
    descriptions: [
      {
        id: 'short',
        label: 'Kısa (1 cümle)',
        aria: 'Kısa tanımı kopyala',
        text: 'Buaze, işletmelerin müşteri geri bildirimini QR kodla topladığı ve müşterilerini Google gibi platformlardaki yorum sayfalarına yönlendirdiği bir yazılım hizmetidir.',
      },
      { id: 'medium', label: 'Orta (3 cümle)', aria: 'Orta uzunluktaki tanımı kopyala', text: MEDIUM_TR },
      {
        id: 'long',
        label: 'Uzun (paragraf)',
        aria: 'Uzun tanımı kopyala',
        text: `${MEDIUM_TR} Geri bildirimler tek gelen kutusunda toplanır; Pulse AI yanıt taslağı hazırlar, yanıtı işletme onaylar. Panelde analitik, QR menü, kısa anketler, denetim kontrol listeleri ve ekip rolleri de bulunur. Buaze yorum silmez, gizlemez veya değiştirmez ve yorum karşılığında ödül sunmaz. Şirket 2023'te İstanbul'da kuruldu; ürün Türkçe ve İngilizce kullanılabilir.`,
      },
    ],
    copy: 'Kopyala',
    copied: 'Kopyalandı',
    brandTitle: 'Logo ve renkler',
    brandLead: 'Logoyu orantısını değiştirmeden ve çevresinde yeterli boşluk bırakarak kullanın; renkleri aşağıdaki değerlerle eşleştirin.',
    logo: 'Logo',
    logoDownload: 'Logoyu indir (SVG)',
    icon: 'Uygulama simgesi',
    iconDownload: 'Simgeyi indir (SVG)',
    iconAlt: 'Buaze uygulama simgesi',
    palette: 'Renk paleti',
    colors: [
      { name: 'Grafit', hex: '#0A0A0A', use: 'Metin ve koyu yüzeyler' },
      { name: 'Lime', hex: '#C6F24E', use: 'Vurgu rengi ve ana düğmeler' },
      { name: 'Koyu lime', hex: '#A8D62E', use: 'Üzerine gelme durumu' },
      { name: 'Açık lime', hex: '#EAF9B8', use: 'Yumuşak arka planlar' },
    ],
    profilesTitle: 'Bağımsız profiller',
    profilesLead: "Buaze'nin bağımsız kaynaklardaki kayıtları.",
    profileDesc: {
      Wikidata: "Buaze'nin Wikidata kaydı.",
      G2: "G2'deki Buaze profili.",
      Crunchbase: "Crunchbase'deki şirket profili.",
      Capterra: "Capterra'daki Buaze profili.",
    } as Record<string, string>,
    contactEyebrow: 'Basın iletişimi',
    contactTitle: 'Bir haber ya da yazı mı hazırlıyorsunuz?',
    contactBody: 'Görüşme ve bilgi talepleriniz için support@buaze.com adresine yazın; konu satırına “Basın” eklemeniz yeterli.',
    mailSubject: 'Basın',
    home: 'Ana sayfa',
  },
  en: {
    eyebrow: 'Press',
    h1: 'Buaze press kit',
    lead: 'Company descriptions, key facts, the logo and the brand colours you can use when writing about Buaze.',
    factsTitle: 'Company facts',
    facts: {
      brand: 'Brand',
      legalName: 'Legal name',
      mersis: 'MERSIS no',
      tax: 'Tax office / no',
      founded: 'Founded',
      based: 'Based in',
      product: 'Product',
      productValue: 'Software for QR customer feedback and review links (SaaS)',
      languages: 'Languages',
      languagesValue: 'Turkish, English',
      website: 'Website',
      press: 'Press contact',
    },
    descTitle: 'Company description',
    descLead: 'Three lengths; use them as they are.',
    descriptions: [
      {
        id: 'short',
        label: 'Short (1 sentence)',
        aria: 'Copy the short description',
        text: 'Buaze is software that helps businesses collect customer feedback with QR codes and send customers on to their review pages on platforms such as Google.',
      },
      { id: 'medium', label: 'Medium (3 sentences)', aria: 'Copy the medium description', text: MEDIUM_EN },
      {
        id: 'long',
        label: 'Long (paragraph)',
        aria: 'Copy the long description',
        text: `${MEDIUM_EN} Feedback arrives in one inbox; Pulse AI drafts replies, and the business approves every reply. The panel also includes analytics, a QR menu, short surveys, audit checklists and team roles. Buaze does not delete, hide or edit reviews, and it offers no rewards for reviews. The company was founded in Istanbul in 2023; the product is available in Turkish and English.`,
      },
    ],
    copy: 'Copy',
    copied: 'Copied',
    brandTitle: 'Logo and colours',
    brandLead: 'Use the logo without changing its proportions and with clear space around it; match colours to the values below.',
    logo: 'Logo',
    logoDownload: 'Download logo (SVG)',
    icon: 'App icon',
    iconDownload: 'Download icon (SVG)',
    iconAlt: 'Buaze app icon',
    palette: 'Colour palette',
    colors: [
      { name: 'Graphite', hex: '#0A0A0A', use: 'Text and dark surfaces' },
      { name: 'Lime', hex: '#C6F24E', use: 'Accent and primary buttons' },
      { name: 'Lime deep', hex: '#A8D62E', use: 'Hover state' },
      { name: 'Lime soft', hex: '#EAF9B8', use: 'Soft backgrounds' },
    ],
    profilesTitle: 'Independent profiles',
    profilesLead: "Buaze's entries on independent sites.",
    profileDesc: {
      Wikidata: "Buaze's Wikidata entry.",
      G2: 'Buaze on G2.',
      Crunchbase: 'Company profile on Crunchbase.',
      Capterra: 'Buaze on Capterra.',
    } as Record<string, string>,
    contactEyebrow: 'Press contact',
    contactTitle: 'Working on a story?',
    contactBody: 'For interviews and information requests, write to support@buaze.com and add “Press” to the subject line.',
    mailSubject: 'Press',
    home: 'Home',
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lang: Lang = locale === 'en' ? 'en' : 'tr';
  const { title, description } = META[lang];
  const ogImage = lang === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png';
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/press`,
      languages: { tr: '/tr/press', en: '/en/press', 'x-default': '/tr/press' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${lang}/press`,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
  };
}

const sectionTitle = 'mt-4 text-balance text-[28px] leading-[1.08] tracking-[-0.02em] text-[#0A0A0A] sm:text-[40px]';
const sectionLead = 'mt-4 max-w-[640px] text-pretty text-[16px] leading-[1.6] text-[#525252] sm:text-[18px]';

export default async function PressPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const lang: Lang = locale === 'en' ? 'en' : 'tr';
  const copy = COPY[lang];
  // Sequential on purpose: the pooled DB connection is single-lane (§14.1).
  const company = await getCompanyFacts();
  const settings = await getSiteSettings();
  const pageUrl = `${SITE_URL}/${lang}/press`;

  // External profiles that ops configured in Site Settings (only real URLs).
  const profiles = [
    { label: 'Wikidata', url: settings.wikidataUrl },
    { label: 'G2', url: settings.g2Url },
    { label: 'Crunchbase', url: settings.crunchbaseUrl },
    { label: 'Capterra', url: settings.capterraUrl },
  ].filter((p): p is { label: string; url: string } => typeof p.url === 'string' && p.url.length > 0);

  const mailHref = `mailto:${company.supportEmail}?subject=${encodeURIComponent(copy.mailSubject)}`;
  const linkClass =
    'font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 hover:decoration-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] rounded-sm';

  const facts: Array<{ term: string; value: ReactNode }> = [
    { term: copy.facts.brand, value: 'Buaze' },
    ...(company.legalName ? [{ term: copy.facts.legalName, value: company.legalName }] : []),
    ...(company.registry
      ? [
          { term: copy.facts.mersis, value: company.registry.mersisNo },
          { term: copy.facts.tax, value: `${company.registry.taxOffice} · ${company.registry.taxNo}` },
        ]
      : []),
    { term: copy.facts.founded, value: '2023' },
    { term: copy.facts.based, value: company.addressDisplay[lang] },
    { term: copy.facts.product, value: copy.facts.productValue },
    { term: copy.facts.languages, value: copy.facts.languagesValue },
    {
      term: copy.facts.website,
      value: (
        <a href={`${SITE_URL}/${lang}`} className={linkClass}>
          {SITE_HOST}
        </a>
      ),
    },
    {
      term: copy.facts.press,
      value: (
        <a href={mailHref} className={linkClass}>
          {company.supportEmail}
        </a>
      ),
    },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: copy.h1,
        description: META[lang].description,
        inLanguage: lang === 'tr' ? 'tr-TR' : 'en-US',
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': ORGANIZATION_ID },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: copy.home, item: `${SITE_URL}/${lang}` },
          { '@type': 'ListItem', position: 2, name: copy.h1, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] lg:pt-[64px] selection:bg-[#C6F24E]/40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <MarketingNavbar locale={lang} />
      <main id="main-content">
        {/* Hero + company facts */}
        <section aria-labelledby="press-title" className="pt-[60px] pb-[60px] sm:pt-20 sm:pb-24">
          <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-start gap-10 px-5 sm:px-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="pulse-eyebrow text-[#737373]">{copy.eyebrow}</p>
              <h1
                id="press-title"
                className="mt-4 text-balance text-[38px] leading-[1.02] tracking-[-0.035em] text-[#0A0A0A] sm:text-[56px] md:text-[52px] lg:text-[64px]"
              >
                {copy.h1}
              </h1>
              <p className="mt-6 max-w-[560px] text-pretty text-[17px] leading-[1.65] text-[#525252] sm:text-[19px]">
                {copy.lead}
              </p>
            </div>
            <section
              aria-labelledby="press-facts-title"
              className="rounded-[20px] border border-[#EDEDED] bg-[#FAFAFA] p-6 sm:p-8"
            >
              <h2 id="press-facts-title" className="text-[20px] leading-[1.2] text-[#0A0A0A] sm:text-[22px]">
                {copy.factsTitle}
              </h2>
              <dl className="mt-5 divide-y divide-[#EDEDED]">
                {facts.map((fact) => (
                  <div key={fact.term} className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 py-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                    <dt className="pulse-eyebrow pt-[3px] text-[#737373]">{fact.term}</dt>
                    <dd className="text-[15px] leading-[1.5] text-[#0A0A0A]">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </section>

        {/* Company descriptions */}
        <section aria-labelledby="press-desc-title" className="bg-[#FAFAFA] py-[60px] sm:py-24">
          <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
            <div className="max-w-[720px]">
              <h2 id="press-desc-title" className={sectionTitle}>
                {copy.descTitle}
              </h2>
              <p className={sectionLead}>{copy.descLead}</p>
            </div>
            <div className="mt-10 space-y-4 sm:space-y-6">
              {copy.descriptions.map((d) => (
                <article
                  key={d.id}
                  aria-labelledby={`press-desc-${d.id}`}
                  className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 id={`press-desc-${d.id}`} className="pulse-eyebrow text-[#737373]">
                      {d.label}
                    </h3>
                    <CopyTextButton text={d.text} label={copy.copy} copiedLabel={copy.copied} ariaLabel={d.aria} />
                  </div>
                  <p className="mt-4 max-w-[860px] text-[16px] leading-[1.7] text-[#0A0A0A] sm:text-[17px]">{d.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Logo and colours */}
        <section aria-labelledby="press-brand-title" className="py-[60px] sm:py-24">
          <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
            <div className="max-w-[720px]">
              <h2 id="press-brand-title" className={sectionTitle}>
                {copy.brandTitle}
              </h2>
              <p className={sectionLead}>{copy.brandLead}</p>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
              <div className="flex flex-col rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8">
                <h3 className="pulse-eyebrow text-[#737373]">{copy.logo}</h3>
                <div className="flex flex-1 items-center justify-center py-8">
                  <BuazeLogo size={88} />
                </div>
                <a
                  href="/buaze-logo.svg"
                  download="buaze-logo.svg"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[#D4D4D4] px-4 text-[14px] font-semibold text-[#0A0A0A] transition-colors hover:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                >
                  <Download size={15} aria-hidden="true" />
                  {copy.logoDownload}
                </a>
              </div>
              <div className="flex flex-col rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8">
                <h3 className="pulse-eyebrow text-[#737373]">{copy.icon}</h3>
                <div className="flex flex-1 items-center justify-center py-8">
                  <img src="/favicon.svg" alt={copy.iconAlt} width={88} height={88} loading="lazy" decoding="async" />
                </div>
                <a
                  href="/favicon.svg"
                  download="buaze-icon.svg"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[#D4D4D4] px-4 text-[14px] font-semibold text-[#0A0A0A] transition-colors hover:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                >
                  <Download size={15} aria-hidden="true" />
                  {copy.iconDownload}
                </a>
              </div>
              <div className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:col-span-2 sm:p-8 lg:col-span-1">
                <h3 className="pulse-eyebrow text-[#737373]">{copy.palette}</h3>
                <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {copy.colors.map((c) => (
                    <li key={c.hex}>
                      <div
                        className="h-16 w-full rounded-[12px] border border-[#EDEDED]"
                        style={{ backgroundColor: c.hex }}
                        aria-hidden="true"
                      />
                      <p className="mt-3 text-[14px] font-semibold text-[#0A0A0A]">{c.name}</p>
                      <p className="text-[12px] text-[#525252]" style={{ fontFamily: 'var(--font-mono)' }}>
                        {c.hex}
                      </p>
                      <p className="mt-1 text-[13px] leading-[1.45] text-[#525252]">{c.use}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Independent profiles — only when ops configured real URLs */}
        {profiles.length > 0 ? (
          <section aria-labelledby="press-profiles-title" className="bg-[#FAFAFA] py-[60px] sm:py-24">
            <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
              <div className="max-w-[720px]">
                <h2 id="press-profiles-title" className={sectionTitle}>
                  {copy.profilesTitle}
                </h2>
                <p className={sectionLead}>{copy.profilesLead}</p>
              </div>
              <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                {profiles.map((p) => (
                  <li key={p.label}>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between gap-3 rounded-[20px] border border-[#EDEDED] bg-white p-6 transition-colors hover:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                    >
                      <span>
                        <span className="block text-[17px] font-semibold text-[#0A0A0A]">{p.label}</span>
                        <span className="mt-1 block text-[14px] text-[#525252]">{copy.profileDesc[p.label]}</span>
                      </span>
                      <ArrowUpRight
                        size={18}
                        aria-hidden="true"
                        className="shrink-0 text-[#737373] transition-colors group-hover:text-[#0A0A0A]"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* Press contact */}
        <section aria-labelledby="press-contact-title" className="bg-[#C6F24E] py-[60px] sm:py-24">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-5 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-[640px]">
              <p className="pulse-eyebrow text-[#0A0A0A]">{copy.contactEyebrow}</p>
              <h2
                id="press-contact-title"
                className="mt-4 text-balance text-[28px] leading-[1.08] text-[#0A0A0A] sm:text-[40px]"
              >
                {copy.contactTitle}
              </h2>
              <p className="mt-5 text-pretty text-[16px] leading-[1.6] text-[#1A1A1A] sm:text-[18px]">
                {copy.contactBody} {SUPPORT_HOURS[lang]}
              </p>
            </div>
            <a
              href={mailHref}
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 self-start rounded-full bg-[#0A0A0A] px-7 text-[15px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#C6F24E] lg:self-auto"
            >
              <Mail size={16} aria-hidden="true" />
              {company.supportEmail}
            </a>
          </div>
        </section>
      </main>
      <MarketingFooter locale={lang} />
    </div>
  );
}
