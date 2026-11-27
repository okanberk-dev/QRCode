import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ClipboardCheck,
  Link2,
  MessageSquareText,
  QrCode,
  Star,
  Users,
} from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { jsonLdString } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/site';
import { getCompanyFacts, ORGANIZATION_ID, SUPPORT_HOURS, WEBSITE_ID } from '@/lib/company-facts';
import type { Locale } from '@/lib/translations';

/**
 * /about — what Buaze is and how it behaves, in facts the product proves
 * today. No named team members until real people consent to being listed
 * (spec D3). Company facts (legal name, address, support e-mail) come from
 * getCompanyFacts() so they match the footer and the Organization JSON-LD,
 * which the locale layout emits — this page only references it by @id.
 * ISR (1 day); nothing here reads headers()/cookies()/searchParams.
 */

export const revalidate = 86400;

type Lang = 'tr' | 'en';

const META = {
  tr: {
    title: 'Hakkımızda: QR ile geri bildirim ve yorum toplama',
    description:
      'Buaze, işletmelerin QR kodla müşteri geri bildirimi topladığı ve müşterilerini Google dahil 10 platformdaki yorum sayfalarına yönlendirdiği yazılımdır.',
  },
  en: {
    title: 'About us: QR feedback and review collection',
    description:
      'Buaze is software that helps businesses collect customer feedback with QR codes and send customers to their review pages on Google and nine other platforms.',
  },
} as const;

const COPY = {
  tr: {
    eyebrow: 'Şirket',
    crumb: 'Hakkımızda',
    h1: 'Buaze hakkında',
    lead: 'Buaze, işletmelerin müşteri geri bildirimini QR kodla topladığı ve müşterilerini Google gibi platformlardaki yorum sayfalarına yönlendirdiği bir yazılımdır. Restoranlar, oteller, klinikler, mağazalar ve hizmet işletmeleri için geliştirildi.',
    lead2: "2023'te İstanbul'da kurulduk. Ürün Türkçe ve İngilizce kullanılabilir: panel, müşteri formu ve e-postalar iki dilde de hazır.",
    factsTitle: 'Kısaca Buaze',
    facts: {
      founded: 'Kuruluş',
      based: 'Merkez',
      legalName: 'Ticari unvan',
      mersis: 'MERSİS no',
      tax: 'Vergi dairesi / no',
      product: 'Ürün',
      productValue: 'QR ile geri bildirim ve yorum bağlantıları (SaaS)',
      languages: 'Diller',
      languagesValue: 'Türkçe, İngilizce',
      contact: 'İletişim',
      careers: 'Kariyer',
      careersValue: 'Şu anda açık pozisyon yok. Genel başvurunuzu özgeçmişinizle destek adresine gönderebilirsiniz.',
    },
    flow: {
      eyebrow: 'Nasıl çalışır',
      title: 'Müşteri puan verir, akış eşiğinize göre ilerler',
      lead: 'Her müşteri herkese açık yorum bağlantısını görür; eşiğin altındaki puanlarda önce size yazabilir.',
      step: 'QR kodu okutur ve puan verir',
      stepNote: '1 ile 5 yıldız arasında',
      highChip: 'Eşik ve üzeri',
      highTitle: 'Yorum sayfası açılır',
      highBody: 'Müşteri, seçtiğiniz platformun (örneğin Google) yorum sayfasına geçer.',
      lowChip: 'Eşiğin altı',
      lowTitle: 'Önce size yazabilir',
      lowBody: 'Özel geri bildirim formu açılır; herkese açık yorum bağlantısı aynı ekranda görünür.',
      note: 'Eşiği panelden 4 ya da 5 yıldız olarak siz seçersiniz; varsayılan değer 5 yıldızdır.',
    },
    product: {
      eyebrow: 'Ürün',
      title: 'Panelde neler var',
      lead: 'Geri bildirimi toplamaktan yanıtlamaya kadar her adım aynı hesapta.',
      cards: [
        {
          icon: 'link',
          title: 'Yorum bağlantıları',
          body: 'Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking.com, Airbnb, Yandex, Yelp ve Foursquare olmak üzere 10 platformun yorum bağlantısını tek panelde yönetirsiniz. Bağlantılar her gün otomatik olarak kontrol edilir.',
          link: { path: '/integrations', label: 'Platform bağlantıları' },
        },
        {
          icon: 'message',
          title: 'Geri bildirim ve yanıt',
          body: 'QR koddan gelen geri bildirimler tek gelen kutusunda toplanır; 1–3 yıldızlık her yeni geri bildirimde e-posta uyarısı alırsınız. Pulse AI yanıt taslağı hazırlar, siz düzenleyip onaylarsınız.',
          link: { path: '/features/review-management', label: 'Yorum yönetimi' },
        },
        {
          icon: 'clipboard',
          title: 'Menü, anket ve denetim',
          body: 'Aynı hesapta 7 temalı QR menü, 8 hazır şablonla başlayabileceğiniz kısa anketler ve hijyen ya da vardiya kontrol listeleri için Denetim Merkezi bulunur.',
          link: { path: '/features', label: 'Tüm özellikler' },
        },
        {
          icon: 'users',
          title: 'Ekip ve birden çok işletme',
          body: 'Ekip arkadaşlarınızı yönetici, personel veya görüntüleyici rolüyle davet edersiniz. Birden çok işletmeyi tek hesaptan yönetir, aralarında hızlıca geçiş yaparsınız.',
          link: null,
        },
      ],
    },
    principles: {
      eyebrow: 'İlkelerimiz',
      title: 'Yorumlara ve müşteri verisine nasıl yaklaşıyoruz',
      lead: 'Aşağıdakiler bir vaat değil, ürünün bugün nasıl çalıştığının açıklaması.',
      items: [
        {
          title: 'Yorumlara dokunmayız',
          body: 'Buaze yorum silmez, gizlemez veya değiştirmez. Sahte yorum yazmaz ve yazdırmaz.',
        },
        {
          title: 'Yorum için ödül yok',
          body: 'Buaze yorum karşılığında indirim, hediye veya ödül sunmaz. Panelden gönderilen yanıtlarda yorum karşılığı ödül teklif eden ya da yorumun değiştirilmesini isteyen ifadeler engellenir.',
        },
        {
          title: 'Son söz sizde',
          body: 'Pulse AI yanıt taslağı hazırlar; hiçbir yanıt siz onaylamadan gönderilmez.',
        },
        {
          title: 'Veriyi açıkça işleriz',
          body: "Müşteri formunda KVKK aydınlatma onayı alınır; pazarlama izni ayrıdır ve varsayılan olarak kapalıdır. IP adresleri 90 gün sonra anonimleştirilir. Veritabanı AB'de (Frankfurt) çalışır; bazı alt işleyiciler ABD'dedir ve Veri İşleyici Sözleşmesi'nde listelenir. Pulse AI taslakları için geri bildirim metni yapay zekâ sağlayıcısına (Anthropic, yedek olarak OpenAI) gönderilir.",
        },
      ],
      links: [
        { path: '/google-compliance', label: 'Google yorum kuralları ve Buaze' },
        { path: '/kvkk', label: 'KVKK Aydınlatma Metni' },
        { path: '/veri-isleyici-sozlesmesi', label: 'Veri İşleyici Sözleşmesi' },
      ],
    },
    cta: {
      title: 'Bize ulaşın',
      bodyStart: 'Ürün, iş birliği ve basın talepleriniz için',
      bodyEnd: 'adresine yazabilirsiniz.',
      primary: 'Ücretsiz deneyin',
      secondary: 'İletişim sayfası',
    },
    home: 'Ana sayfa',
    disambiguation:
      "Bu sayfa Buaze adlı yazılım şirketini anlatır; Çiçewa dilinde 'buaze' olarak bilinen Securidaca longipedunculata bitkisiyle ilgili değildir.",
  },
  en: {
    eyebrow: 'Company',
    crumb: 'About us',
    h1: 'About Buaze',
    lead: 'Buaze is software that helps businesses collect customer feedback with QR codes and send customers on to their review pages on platforms such as Google. It is built for restaurants, hotels, clinics, shops and service businesses.',
    lead2: 'We started in Istanbul in 2023. The product works in Turkish and English: the panel, the customer form and the e-mails are available in both languages.',
    factsTitle: 'Buaze at a glance',
    facts: {
      founded: 'Founded',
      based: 'Based in',
      legalName: 'Legal name',
      mersis: 'MERSIS no',
      tax: 'Tax office / no',
      product: 'Product',
      productValue: 'QR feedback and review links (SaaS)',
      languages: 'Languages',
      languagesValue: 'Turkish, English',
      contact: 'Contact',
      careers: 'Careers',
      careersValue: 'No open positions right now. You can send a general application with your CV to the support address.',
    },
    flow: {
      eyebrow: 'How it works',
      title: 'The customer rates, and the flow follows your threshold',
      lead: 'Every customer sees the public review link; below your threshold they can write to you first.',
      step: 'Scans the QR code and gives a rating',
      stepNote: 'From 1 to 5 stars',
      highChip: 'At or above the threshold',
      highTitle: 'The review page opens',
      highBody: "The customer goes on to your chosen platform's review page, for example Google.",
      lowChip: 'Below the threshold',
      lowTitle: 'They can write to you first',
      lowBody: 'A private feedback form opens; the public review link is shown on the same screen.',
      note: 'You choose the threshold in the panel: 4 or 5 stars. The default is 5 stars.',
    },
    product: {
      eyebrow: 'The product',
      title: "What's in the panel",
      lead: 'Every step, from collecting feedback to replying, in one account.',
      cards: [
        {
          icon: 'link',
          title: 'Review links',
          body: 'Manage the review links of 10 platforms in one panel: Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking.com, Airbnb, Yandex, Yelp and Foursquare. Links are checked automatically every day.',
          link: { path: '/integrations', label: 'Platform links' },
        },
        {
          icon: 'message',
          title: 'Feedback and replies',
          body: 'Feedback from your QR codes arrives in one inbox, and every new piece of 1–3 star feedback triggers an e-mail alert. Pulse AI drafts a reply; you edit and approve it.',
          link: { path: '/features/review-management', label: 'Review management' },
        },
        {
          icon: 'clipboard',
          title: 'Menu, surveys and audits',
          body: 'The same account includes a QR menu with 7 themes, short surveys you can start from 8 ready templates, and the Audit Center for hygiene or shift checklists.',
          link: { path: '/features', label: 'All features' },
        },
        {
          icon: 'users',
          title: 'Teams and multiple businesses',
          body: 'Invite teammates with a manager, staff or viewer role. Manage several businesses from one account and switch between them quickly.',
          link: null,
        },
      ],
    },
    principles: {
      eyebrow: 'Our principles',
      title: 'How we treat reviews and customer data',
      lead: 'This is not a promise; it is how the product works today.',
      items: [
        {
          title: "We don't touch reviews",
          body: 'Buaze does not delete, hide or edit reviews. It does not write fake reviews or have them written.',
        },
        {
          title: 'No rewards for reviews',
          body: 'Buaze offers no discount, gift or reward in exchange for a review. Replies sent from the panel are blocked if they offer a reward for a review or ask the customer to change one.',
        },
        {
          title: 'You have the final say',
          body: 'Pulse AI drafts replies; nothing is sent until you approve it.',
        },
        {
          title: 'We are open about data',
          body: "The customer form asks for consent under KVKK, Turkey's data protection law; marketing consent is separate and off by default. IP addresses are anonymised after 90 days. The database runs in the EU (Frankfurt); some sub-processors are in the US and are listed in the Data Processing Agreement. For Pulse AI drafts, the feedback text is sent to an AI provider (Anthropic, with OpenAI as a backup).",
        },
      ],
      links: [
        { path: '/google-compliance', label: "Google's review rules and Buaze" },
        { path: '/privacy', label: 'Privacy policy' },
        { path: '/veri-isleyici-sozlesmesi', label: 'Data Processing Agreement' },
      ],
    },
    cta: {
      title: 'Get in touch',
      bodyStart: 'For product, partnership or press requests, write to',
      bodyEnd: '.',
      primary: 'Start free trial',
      secondary: 'Contact page',
    },
    home: 'Home',
    disambiguation:
      "This page is about Buaze, the software company — not Securidaca longipedunculata, the plant known as 'buaze' in Chichewa.",
  },
} as const;

const CARD_ICONS = {
  link: Link2,
  message: MessageSquareText,
  clipboard: ClipboardCheck,
  users: Users,
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
      canonical: `/${lang}/about`,
      languages: { tr: '/tr/about', en: '/en/about', 'x-default': '/tr/about' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${lang}/about`,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
  };
}

const sectionTitle = 'mt-4 text-balance text-[28px] leading-[1.08] tracking-[-0.02em] text-[#0A0A0A] sm:text-[40px] lg:text-[48px]';
const sectionLead = 'mt-5 max-w-[640px] text-pretty text-[16px] leading-[1.6] text-[#525252] sm:text-[18px]';
const textLink =
  'inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-semibold text-[#0A0A0A] underline decoration-[#5D3EBC] decoration-2 underline-offset-4 transition-colors hover:decoration-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6CF0] focus-visible:ring-offset-2';

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const lang: Lang = locale === 'en' ? 'en' : 'tr';
  const copy = COPY[lang];
  const company = await getCompanyFacts();
  const pageUrl = `${SITE_URL}/${lang}/about`;

  // The Organization node lives in the locale layout (@id ORGANIZATION_ID);
  // this page points at it instead of declaring a second one. The plant
  // disambiguation stays in structured data only, not in visible copy.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: copy.h1,
        description: META[lang].description,
        disambiguatingDescription: copy.disambiguation,
        inLanguage: lang === 'tr' ? 'tr-TR' : 'en-US',
        isPartOf: { '@id': WEBSITE_ID },
        mainEntity: { '@id': ORGANIZATION_ID },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: copy.home, item: `${SITE_URL}/${lang}` },
          { '@type': 'ListItem', position: 2, name: copy.crumb, item: pageUrl },
        ],
      },
    ],
  };

  const facts: Array<{ term: string; value: ReactNode }> = [
    { term: copy.facts.founded, value: '2023' },
    { term: copy.facts.based, value: company.addressDisplay[lang] },
    ...(company.legalName ? [{ term: copy.facts.legalName, value: company.legalName }] : []),
    ...(company.registry
      ? [
          { term: copy.facts.mersis, value: company.registry.mersisNo },
          { term: copy.facts.tax, value: `${company.registry.taxOffice} · ${company.registry.taxNo}` },
        ]
      : []),
    { term: copy.facts.product, value: copy.facts.productValue },
    { term: copy.facts.languages, value: copy.facts.languagesValue },
    {
      term: copy.facts.contact,
      value: (
        <a
          href={`mailto:${company.supportEmail}`}
          className="font-semibold text-[#0A0A0A] underline decoration-[#5D3EBC] decoration-2 underline-offset-4 hover:decoration-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6CF0] rounded-sm"
        >
          {company.supportEmail}
        </a>
      ),
    },
    // §57 — /careers was retired (no open positions); its note lives here.
    { term: copy.facts.careers, value: copy.facts.careersValue },
  ];

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <MarketingNavbar locale={lang} />
      <main id="main-content">
        {/* Hero — what Buaze is, plus the company facts */}
        <section aria-labelledby="about-title" className="pt-[60px] pb-[60px] sm:pt-20 sm:pb-24">
          <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-start gap-10 px-5 sm:px-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="pulse-eyebrow text-[#737373]">{copy.eyebrow}</p>
              <h1
                id="about-title"
                className="mt-4 text-balance text-[38px] leading-[1.02] tracking-[-0.035em] text-[#0A0A0A] sm:text-[56px] md:text-[52px] lg:text-[64px]"
              >
                {copy.h1}
              </h1>
              <p className="mt-6 max-w-[620px] text-pretty text-[17px] leading-[1.65] text-[#333333] sm:text-[19px]">
                {copy.lead}
              </p>
              <p className="mt-4 max-w-[620px] text-pretty text-[16px] leading-[1.65] text-[#525252] sm:text-[17px]">
                {copy.lead2}
              </p>
            </div>

            <aside
              aria-labelledby="about-facts-title"
              className="rounded-[20px] border border-[#EDEDED] bg-[#FAFAFA] p-6 sm:p-8"
            >
              <h2 id="about-facts-title" className="text-[20px] leading-[1.2] text-[#0A0A0A] sm:text-[22px]">
                {copy.factsTitle}
              </h2>
              <dl className="mt-5 divide-y divide-[#EDEDED]">
                {facts.map((fact) => (
                  <div key={fact.term} className="grid grid-cols-[110px_minmax(0,1fr)] gap-4 py-3 sm:grid-cols-[130px_minmax(0,1fr)]">
                    <dt className="pulse-eyebrow pt-[3px] text-[#737373]">{fact.term}</dt>
                    <dd className="text-[15px] leading-[1.5] text-[#0A0A0A]">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>
        </section>

        {/* How the review flow works (spec D1) */}
        <section aria-labelledby="about-flow-title" className="bg-[#FAFAFA] py-[60px] sm:py-24">
          <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
            <div className="max-w-[720px]">
              <p className="pulse-eyebrow text-[#737373]">{copy.flow.eyebrow}</p>
              <h2 id="about-flow-title" className={sectionTitle}>
                {copy.flow.title}
              </h2>
              <p className={sectionLead}>{copy.flow.lead}</p>
            </div>

            <div className="mt-12 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_40px_minmax(0,1.7fr)] lg:gap-5">
              <div className="flex flex-col justify-between rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#5D3EBC] text-white"
                >
                  <QrCode size={20} strokeWidth={2} />
                </span>
                <div className="mt-6">
                  <h3 className="text-[22px] leading-[1.2] text-[#0A0A0A]">{copy.flow.step}</h3>
                  <div className="mt-4 flex items-center gap-1" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star key={i} size={20} className="fill-[#5D3EBC] text-[#5D3EBC]" strokeWidth={1.5} />
                    ))}
                  </div>
                  <p className="mt-2 text-[14px] text-[#737373]">{copy.flow.stepNote}</p>
                </div>
              </div>

              <div aria-hidden="true" className="flex items-center justify-center text-[#A3A3A3]">
                <ArrowDown size={22} className="lg:-rotate-90" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                <div className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8">
                  <span className="inline-flex items-center rounded-full bg-[#EFEAFB] px-3 py-1 text-[13px] font-medium text-[#0A0A0A]">
                    {copy.flow.highChip}
                  </span>
                  <h3 className="mt-5 text-[22px] leading-[1.2] text-[#0A0A0A]">{copy.flow.highTitle}</h3>
                  <p className="mt-3 text-[15px] leading-[1.6] text-[#525252]">{copy.flow.highBody}</p>
                </div>
                <div className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8">
                  <span className="inline-flex items-center rounded-full bg-[#F2F2F2] px-3 py-1 text-[13px] font-medium text-[#0A0A0A]">
                    {copy.flow.lowChip}
                  </span>
                  <h3 className="mt-5 text-[22px] leading-[1.2] text-[#0A0A0A]">{copy.flow.lowTitle}</h3>
                  <p className="mt-3 text-[15px] leading-[1.6] text-[#525252]">{copy.flow.lowBody}</p>
                </div>
              </div>
            </div>
            <p className="mt-6 text-[14px] leading-[1.6] text-[#737373]">{copy.flow.note}</p>
          </div>
        </section>

        {/* What's in the panel */}
        <section aria-labelledby="about-product-title" className="py-[60px] sm:py-24">
          <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
            <div className="max-w-[720px]">
              <p className="pulse-eyebrow text-[#737373]">{copy.product.eyebrow}</p>
              <h2 id="about-product-title" className={sectionTitle}>
                {copy.product.title}
              </h2>
              <p className={sectionLead}>{copy.product.lead}</p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              {copy.product.cards.map((card) => {
                const Icon = CARD_ICONS[card.icon];
                return (
                  <article
                    key={card.title}
                    className="flex flex-col rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#EFEAFB] text-[#0A0A0A]"
                    >
                      <Icon size={20} strokeWidth={2} />
                    </span>
                    <h3 className="mt-5 text-[22px] leading-[1.2] text-[#0A0A0A] sm:text-[24px]">{card.title}</h3>
                    <p className="mt-3 text-[15px] leading-[1.65] text-[#525252]">{card.body}</p>
                    {card.link ? (
                      <div className="mt-auto pt-4">
                        <Link href={`/${lang}${card.link.path}`} className={textLink}>
                          {card.link.label}
                          <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Principles — behaviour, not certification (spec D2) */}
        <section aria-labelledby="about-principles-title" className="bg-[#FAFAFA] py-[60px] sm:py-24">
          <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
            <div className="max-w-[720px]">
              <p className="pulse-eyebrow text-[#737373]">{copy.principles.eyebrow}</p>
              <h2 id="about-principles-title" className={sectionTitle}>
                {copy.principles.title}
              </h2>
              <p className={sectionLead}>{copy.principles.lead}</p>
            </div>
            <ol className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              {copy.principles.items.map((item, i) => (
                <li key={item.title} className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8">
                  <span aria-hidden="true" className="pulse-eyebrow text-[#737373]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-3 text-[22px] leading-[1.2] text-[#0A0A0A] sm:text-[24px]">{item.title}</h3>
                  <p className="mt-3 text-[15px] leading-[1.65] text-[#525252]">{item.body}</p>
                </li>
              ))}
            </ol>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-1">
              {copy.principles.links.map((link) => (
                <li key={link.path}>
                  <Link href={`/${lang}${link.path}`} className={textLink}>
                    {link.label}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Contact + trial */}
        <section aria-labelledby="about-cta-title" className="bg-[#5D3EBC] py-[60px] sm:py-24">
          <div className="mx-auto w-full max-w-[880px] px-5 text-center sm:px-10">
            <h2
              id="about-cta-title"
              className="text-balance text-[30px] leading-[1.06] text-white sm:text-[44px] lg:text-[52px]"
            >
              {copy.cta.title}
            </h2>
            <p className="mx-auto mt-5 max-w-[620px] text-pretty text-[16px] leading-[1.6] text-white/90 sm:text-[18px]">
              {copy.cta.bodyStart}{' '}
              <a
                href={`mailto:${company.supportEmail}`}
                className="font-semibold text-white underline decoration-white/50 decoration-2 underline-offset-4 hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-sm"
              >
                {company.supportEmail}
              </a>
              {lang === 'tr' ? ' ' : ''}
              {copy.cta.bodyEnd} {SUPPORT_HOURS[lang]}
            </p>
            <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href={`/${lang}/auth/register`}
                rel="nofollow"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-white px-7 text-[15px] font-semibold text-[#5D3EBC] transition-colors hover:bg-[#EFEAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#5D3EBC]"
              >
                {copy.cta.primary}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link
                href={`/${lang}/contact`}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border-2 border-white px-7 text-[15px] font-semibold text-white transition-colors hover:bg-white hover:text-[#5D3EBC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#5D3EBC]"
              >
                {copy.cta.secondary}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter locale={lang} />
    </div>
  );
}
