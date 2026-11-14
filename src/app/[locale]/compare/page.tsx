import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { jsonLdString } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/site';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PageHero from '@/components/marketing/commercial/PageHero';
import SectionHeader from '@/components/marketing/commercial/SectionHeader';
import CtaBand from '@/components/marketing/commercial/CtaBand';
import ComparisonTable, {
  type ComparisonColumn,
  type ComparisonRow,
} from '@/components/marketing/commercial/ComparisonTable';
import { BTN_DARK, BTN_OUTLINE, CONTAINER, SECTION_Y, TEXT_LINK } from '@/components/marketing/commercial/styles';
import type { Locale } from '@/lib/translations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx`.

const META = {
  tr: {
    title: 'Yorum toplama yöntemleri: statik QR, Excel, kâğıt',
    description:
      'Statik QR kod, Excel tablosu, kâğıt form ve Buaze’yi karşılaştırın: puan kaydı, herkese açık yorum bağlantısı, düşük puanda e-posta ve maliyet tek tabloda.',
  },
  en: {
    title: 'Ways to collect reviews: static QR, Excel, paper',
    description:
      'Compare a static QR code, a spreadsheet, a paper form and Buaze: rating capture, public review links, low-rating e-mail alerts and cost, side by side.',
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale === 'en' ? 'en' : 'tr';
  const { title, description } = META[lang];
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/compare`,
      languages: { tr: '/tr/compare', en: '/en/compare', 'x-default': '/tr/compare' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${lang}/compare`,
      title,
      description,
      images: [{ url: `/images/open-graph-${lang}.png`, width: 1200, height: 630, alt: title }],
    },
  };
}

function buildCopy(locale: 'tr' | 'en') {
  const tr = locale === 'tr';
  const columns: ComparisonColumn[] = [
    { key: 'buaze', label: 'Buaze', highlight: true },
    { key: 'qr', label: tr ? 'Statik QR kod' : 'Static QR code' },
    { key: 'sheet', label: tr ? 'Excel veya E-Tablolar' : 'Excel or Sheets' },
    { key: 'paper', label: tr ? 'Kâğıt form' : 'Paper form' },
  ];
  const rows: ComparisonRow[] = tr
    ? [
        {
          label: 'Müşterinin puanını kaydetme',
          cells: {
            buaze: { kind: 'yes', text: 'Otomatik' },
            qr: { kind: 'no', text: 'Yok, yalnızca bağlantıyı açar' },
            sheet: { kind: 'partial', text: 'Siz elle girersiniz' },
            paper: { kind: 'partial', text: 'Formları siz toplarsınız' },
          },
        },
        {
          label: 'Herkese açık yorum bağlantısı',
          cells: {
            buaze: { kind: 'yes', text: '10 platformdan seçtiğiniz' },
            qr: { kind: 'yes', text: 'Koda yazdığınız tek bağlantı' },
            sheet: { kind: 'no', text: 'Yok' },
            paper: { kind: 'no', text: 'Yok' },
          },
        },
        {
          label: 'Size özel geri bildirim formu',
          cells: {
            buaze: { kind: 'yes', text: 'Eşiğin altındaki puanlarda' },
            qr: { kind: 'no', text: 'Yok' },
            sheet: { kind: 'no', text: 'Yok' },
            paper: { kind: 'yes', text: 'Kâğıt üzerinde' },
          },
        },
        {
          label: 'Düşük puanda anında haber',
          cells: {
            buaze: { kind: 'yes', text: '1–3 yıldızda e-posta' },
            qr: { kind: 'no', text: 'Yok' },
            sheet: { kind: 'no', text: 'Yok' },
            paper: { kind: 'no', text: 'Yok' },
          },
        },
        {
          label: 'Hedefi yeniden basmadan değiştirme',
          cells: {
            buaze: { kind: 'yes', text: 'Panelden' },
            qr: { kind: 'no', text: 'Yeniden baskı gerekir' },
            sheet: { kind: 'na', text: 'Uygulanmaz' },
            paper: { kind: 'na', text: 'Uygulanmaz' },
          },
        },
        {
          label: 'Müşteriye yanıt',
          cells: {
            buaze: { kind: 'yes', text: 'E-postayla; Pulse AI taslağıyla' },
            qr: { kind: 'no', text: 'Yok' },
            sheet: { kind: 'partial', text: 'Ayrı bir e-postayla' },
            paper: { kind: 'no', text: 'Yok' },
          },
        },
        {
          label: 'Raporlar',
          cells: {
            buaze: { kind: 'yes', text: 'Hazır grafikler ve CSV' },
            qr: { kind: 'no', text: 'Yok' },
            sheet: { kind: 'partial', text: 'Grafikleri siz kurarsınız' },
            paper: { kind: 'no', text: 'Yok' },
          },
        },
        {
          label: 'Maliyet',
          cells: {
            buaze: { kind: 'text', text: 'Aylık plan, 14 gün ücretsiz' },
            qr: { kind: 'text', text: 'Ücretsiz' },
            sheet: { kind: 'text', text: 'Mevcut lisansınız' },
            paper: { kind: 'text', text: 'Baskı maliyeti' },
          },
        },
      ]
    : [
        {
          label: 'Recording the customer’s rating',
          cells: {
            buaze: { kind: 'yes', text: 'Automatic' },
            qr: { kind: 'no', text: 'No, it only opens a link' },
            sheet: { kind: 'partial', text: 'You type it in' },
            paper: { kind: 'partial', text: 'You collect the forms' },
          },
        },
        {
          label: 'Public review link',
          cells: {
            buaze: { kind: 'yes', text: 'The one you pick from 10 platforms' },
            qr: { kind: 'yes', text: 'The single link in the code' },
            sheet: { kind: 'no', text: 'None' },
            paper: { kind: 'no', text: 'None' },
          },
        },
        {
          label: 'Private feedback form',
          cells: {
            buaze: { kind: 'yes', text: 'For ratings below your threshold' },
            qr: { kind: 'no', text: 'None' },
            sheet: { kind: 'no', text: 'None' },
            paper: { kind: 'yes', text: 'On paper' },
          },
        },
        {
          label: 'Instant notice of low ratings',
          cells: {
            buaze: { kind: 'yes', text: 'E-mail for 1–3 stars' },
            qr: { kind: 'no', text: 'None' },
            sheet: { kind: 'no', text: 'None' },
            paper: { kind: 'no', text: 'None' },
          },
        },
        {
          label: 'Changing the target without reprinting',
          cells: {
            buaze: { kind: 'yes', text: 'From the panel' },
            qr: { kind: 'no', text: 'Needs a reprint' },
            sheet: { kind: 'na', text: 'Not applicable' },
            paper: { kind: 'na', text: 'Not applicable' },
          },
        },
        {
          label: 'Replying to the customer',
          cells: {
            buaze: { kind: 'yes', text: 'By e-mail, with Pulse AI drafts' },
            qr: { kind: 'no', text: 'None' },
            sheet: { kind: 'partial', text: 'In a separate e-mail' },
            paper: { kind: 'no', text: 'None' },
          },
        },
        {
          label: 'Reports',
          cells: {
            buaze: { kind: 'yes', text: 'Ready-made charts and CSV' },
            qr: { kind: 'no', text: 'None' },
            sheet: { kind: 'partial', text: 'You build the charts' },
            paper: { kind: 'no', text: 'None' },
          },
        },
        {
          label: 'Cost',
          cells: {
            buaze: { kind: 'text', text: 'Monthly plan, 14 days free' },
            qr: { kind: 'text', text: 'Free' },
            sheet: { kind: 'text', text: 'Your existing licence' },
            paper: { kind: 'text', text: 'Printing costs' },
          },
        },
      ];

  return tr
    ? {
        eyebrow: 'Karşılaştırma',
        title: 'Yorum toplama yöntemlerini karşılaştırın',
        lead:
          'Statik QR kod, Excel tablosu ve kâğıt form bazı işletmeler için yeterlidir. Hangisinin ne zaman yettiğini ve Buaze’nin neyi farklı yaptığını tek tabloda görün.',
        heroPrimary: 'Ücretsiz deneyin',
        heroSecondary: 'Planları görün',
        tableEyebrow: 'Yan yana',
        tableTitle: 'Dört yöntem, aynı sorular',
        tableLead:
          'Tablo, her yöntemin bugün neyi yapıp neyi yapmadığını gösterir. Buaze sütunundaki her madde üründe çalışan bir özelliktir.',
        tableCaption: 'Buaze, statik QR kod, Excel ve kâğıt formun karşılaştırması',
        featureLabel: 'Ne lazım?',
        scrollHint: 'Tüm sütunları görmek için tabloyu yana kaydırın.',
        whenEyebrow: 'Ne zaman yeterli?',
        whenTitle: 'Her yöntemin yeri var',
        whenLead: 'İşletmenizin ihtiyacı küçükse ücretsiz yöntemlerle başlamak mantıklıdır. Şu durumlar sınırı gösterir.',
        cards: [
          {
            title: 'Statik QR kod',
            body:
              'Tek bir işletmeniz ve tek bir yorum bağlantınız varsa, geri bildirimi takip etmeniz de gerekmiyorsa ücretsiz bir statik QR yeterlidir. Bağlantınız değiştiğinde kodu yeniden basmanız gerekir.',
            links: [
              { href: '/solutions/qr-generator', label: 'Ücretsiz QR kod oluşturun' },
              { href: '/vs/individual-qr', label: 'Statik QR ile Buaze karşılaştırması' },
            ],
          },
          {
            title: 'Excel veya Google E-Tablolar',
            body:
              'Ayda birkaç geri bildirim alıyorsanız ve kayıtları tek kişi tutuyorsa bir tablo iş görür. Geri bildirimi müşteriden alıp tabloya sizin girmeniz gerekir; düşük bir puanı da ancak tabloyu açtığınızda görürsünüz.',
            links: [{ href: '/vs/spreadsheet', label: 'Excel ile Buaze karşılaştırması' }],
          },
          {
            title: 'Kâğıt form',
            body:
              'Müşteri masada yazmayı tercih ediyorsa kâğıt form işe yarar. Formları toplamak, okumak ve sonuçları bir yere aktarmak ise size kalır.',
            links: [],
          },
        ],
        cta: {
          title: 'Buaze’yi kendi işletmenizde deneyin',
          facts: ['14 gün ücretsiz', 'Kredi kartı gerekmez', 'İstediğiniz zaman iptal'],
          primary: 'Ücretsiz deneyin',
          secondary: 'Nasıl çalıştığını görün',
        },
        breadcrumbHome: 'Ana sayfa',
        breadcrumbSelf: 'Karşılaştırma',
        columns,
        rows,
      }
    : {
        eyebrow: 'Comparison',
        title: 'Compare ways to collect reviews',
        lead:
          'A static QR code, a spreadsheet or a paper form is enough for some businesses. See when each one is enough and what Buaze does differently, in one table.',
        heroPrimary: 'Start free trial',
        heroSecondary: 'See plans',
        tableEyebrow: 'Side by side',
        tableTitle: 'Four methods, the same questions',
        tableLead:
          'The table shows what each method does and does not do today. Every item in the Buaze column is a feature that works in the product.',
        tableCaption: 'Comparison of Buaze, a static QR code, a spreadsheet and a paper form',
        featureLabel: 'What you need',
        scrollHint: 'Scroll the table sideways to see every column.',
        whenEyebrow: 'When is it enough?',
        whenTitle: 'Each method has its place',
        whenLead: 'If your needs are small, starting with a free method makes sense. These are the signs you have outgrown it.',
        cards: [
          {
            title: 'Static QR code',
            body:
              'If you run one business with one review link and do not need to track feedback, a free static QR code is enough. When your link changes, you have to reprint the code.',
            links: [
              { href: '/solutions/qr-generator', label: 'Create a free QR code' },
              { href: '/vs/individual-qr', label: 'Static QR compared with Buaze' },
            ],
          },
          {
            title: 'Excel or Google Sheets',
            body:
              'If you get a few pieces of feedback a month and one person keeps the records, a spreadsheet does the job. You have to collect the feedback and type it in yourself, and you only see a low rating when you open the sheet.',
            links: [{ href: '/vs/spreadsheet', label: 'Spreadsheets compared with Buaze' }],
          },
          {
            title: 'Paper form',
            body:
              'If customers prefer to write at the table, a paper form works. Collecting the forms, reading them and moving the results somewhere is up to you.',
            links: [],
          },
        ],
        cta: {
          title: 'Try Buaze in your own business',
          facts: ['14 days free', 'No credit card required', 'Cancel anytime'],
          primary: 'Start free trial',
          secondary: 'See how it works',
        },
        breadcrumbHome: 'Home',
        breadcrumbSelf: 'Comparison',
        columns,
        rows,
      };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: 'tr' | 'en' = rawLocale === 'en' ? 'en' : 'tr';
  const base = `/${locale}`;
  const copy = buildCopy(locale);

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: copy.breadcrumbHome, item: `${SITE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: copy.breadcrumbSelf, item: `${SITE_URL}/${locale}/compare` },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-[#0A0A0A] selection:bg-[#C6F24E]/40 lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }} />
      <MarketingNavbar locale={locale} />
      <main id="main-content">
        <PageHero
          align="center"
          eyebrow={copy.eyebrow}
          title={copy.title}
          lead={copy.lead}
          actions={
            <>
              <Link href={`${base}/auth/register`} rel="nofollow" className={BTN_DARK}>
                {copy.heroPrimary}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href={`${base}/pricing`} className={BTN_OUTLINE}>
                {copy.heroSecondary}
              </Link>
            </>
          }
        />

        <section aria-labelledby="compare-table-title" className={`bg-[#FAFAFA] ${SECTION_Y}`}>
          <div className={CONTAINER}>
            <SectionHeader
              id="compare-table-title"
              eyebrow={copy.tableEyebrow}
              title={copy.tableTitle}
              lead={copy.tableLead}
            />
            <p className="mt-8 text-[13px] text-[#737373] md:hidden">{copy.scrollHint}</p>
            <div className="mt-4 md:mt-10">
              <ComparisonTable
                caption={copy.tableCaption}
                featureLabel={copy.featureLabel}
                columns={copy.columns}
                rows={copy.rows}
                minWidth={720}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="compare-when-title" className={SECTION_Y}>
          <div className={CONTAINER}>
            <SectionHeader
              id="compare-when-title"
              eyebrow={copy.whenEyebrow}
              title={copy.whenTitle}
              lead={copy.whenLead}
            />
            <ul className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 sm:gap-6 lg:grid-cols-3">
              {copy.cards.map((card) => (
                <li key={card.title} className="flex flex-col rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8">
                  <h3 className="text-[22px] leading-[1.2] text-[#0A0A0A]">{card.title}</h3>
                  <p className="mt-3 flex-1 text-[15px] leading-[1.65] text-[#525252]">{card.body}</p>
                  {card.links.length > 0 ? (
                    <ul className="mt-5 space-y-2 text-[15px]">
                      {card.links.map((link) => (
                        <li key={link.href}>
                          <Link href={`${base}${link.href}`} className={TEXT_LINK}>
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <CtaBand
          id="compare-cta-title"
          title={copy.cta.title}
          facts={copy.cta.facts}
          primary={{ href: `${base}/auth/register`, label: copy.cta.primary, nofollow: true }}
          secondary={{ href: `${base}/how-it-works`, label: copy.cta.secondary }}
        />
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
