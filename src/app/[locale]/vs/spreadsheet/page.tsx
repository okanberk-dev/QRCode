import type { Metadata } from 'next';
import ComparisonLayout, { type ComparisonLayoutProps } from '@/components/marketing/ComparisonLayout';
import { SITE_URL } from '@/lib/site';
import type { Locale } from '@/lib/translations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx`.

const PATH = '/vs/spreadsheet';

const META = {
  tr: {
    title: 'Excel ile müşteri geri bildirimi takibi',
    description:
      'Excel veya Google E-Tablolar ne zaman yeterli, ne zaman yetmez? Otomatik kayıt, düşük puanda e-posta, ekip erişimi ve geçiş adımlarıyla Buaze karşılaştırması.',
  },
  en: {
    title: 'Tracking customer feedback in a spreadsheet',
    description:
      'When is a spreadsheet enough for customer feedback? Compare it with Buaze on automatic records, low-rating e-mails, team access and the steps to switch.',
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
      canonical: `/${lang}${PATH}`,
      languages: { tr: `/tr${PATH}`, en: `/en${PATH}`, 'x-default': `/tr${PATH}` },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${lang}${PATH}`,
      title,
      description,
      images: [{ url: `/images/open-graph-${lang}.png`, width: 1200, height: 630, alt: title }],
    },
  };
}

function buildContent(locale: 'tr' | 'en'): Omit<ComparisonLayoutProps, 'locale' | 'slug' | 'jsonLd'> & {
  crumbs: [string, string, string];
} {
  const base = `/${locale}`;
  if (locale === 'tr') {
    return {
      crumbs: ['Ana sayfa', 'Karşılaştırma', 'Excel ve E-Tablolar'],
      hero: {
        eyebrow: 'Excel ile karşılaştırma',
        title: 'Geri bildirim takibi: Excel mi, Buaze mi?',
        lead:
          'Excel ya da Google E-Tablolar, birkaç geri bildirimi kayıt altına almak için iyi bir başlangıçtır. Burada tablonun neyi iyi yaptığını, nerede zorlandığını ve Buaze’ye nasıl geçileceğini anlatıyoruz.',
        primary: { href: `${base}/auth/register`, label: 'Ücretsiz deneyin', nofollow: true },
        secondary: { href: `${base}/pricing`, label: 'Planları görün' },
      },
      table: {
        eyebrow: 'Yan yana',
        title: 'Tablo ve Buaze aynı işi nasıl yapar',
        lead: 'Tablo, siz bilgi girdikçe çalışır. Buaze’de geri bildirimi müşteri bırakır, kayıt ve uyarı kendiliğinden oluşur.',
        caption: 'Excel veya Google E-Tablolar ile Buaze’nin karşılaştırması',
        featureLabel: 'Konu',
        otherLabel: 'Excel',
        rows: [
          {
            label: 'Geri bildirimin kaydı',
            cells: {
              buaze: { kind: 'yes', text: 'Müşteri gönderince otomatik' },
              other: { kind: 'partial', text: 'Siz elle girersiniz' },
            },
          },
          {
            label: 'Müşterinin dolduracağı form',
            cells: {
              buaze: { kind: 'yes', text: 'QR ile açılan puan ekranı' },
              other: { kind: 'no', text: 'Ayrı bir araç gerekir' },
            },
          },
          {
            label: 'Düşük puan haberi',
            cells: {
              buaze: { kind: 'yes', text: '1–3 yıldızda anında e-posta' },
              other: { kind: 'no', text: 'Tabloyu açtığınızda' },
            },
          },
          {
            label: 'Herkese açık yorum bağlantısı',
            cells: {
              buaze: { kind: 'yes', text: '10 platformdan seçtiğiniz' },
              other: { kind: 'no', text: 'Yok' },
            },
          },
          {
            label: 'Müşteriye yanıt',
            cells: {
              buaze: { kind: 'yes', text: 'E-posta bırakan müşteriye, panelden' },
              other: { kind: 'partial', text: 'Ayrı bir e-postayla' },
            },
          },
          {
            label: 'Raporlar',
            cells: {
              buaze: { kind: 'yes', text: 'Hazır grafikler: 7, 30, 90 gün ve 12 ay' },
              other: { kind: 'partial', text: 'Grafikleri siz kurarsınız' },
            },
          },
          {
            label: 'Ekip erişimi',
            cells: {
              buaze: { kind: 'yes', text: 'Yönetici, personel ve görüntüleyici rolleri' },
              other: { kind: 'partial', text: 'Dosya paylaşımıyla' },
            },
          },
          {
            label: 'Dışa aktarma',
            cells: {
              buaze: { kind: 'yes', text: 'CSV' },
              other: { kind: 'yes', text: 'Dosyanın kendisi' },
            },
          },
          {
            label: 'Maliyet',
            cells: {
              buaze: { kind: 'text', text: 'Aylık plan, 14 gün ücretsiz' },
              other: { kind: 'text', text: 'Mevcut lisansınız' },
            },
          },
        ],
      },
      fit: {
        eyebrow: 'Hangisi size uygun?',
        title: 'Tablo ne zaman yeterli, ne zaman yetmez',
        enough: {
          title: 'Tablo yeterlidir, eğer',
          items: [
            'Ayda birkaç geri bildirim alıyorsanız',
            'Kayıtları tek bir kişi tutuyorsa',
            'Geri bildirimi zaten telefon ya da e-postayla topluyorsanız',
          ],
        },
        notEnough: {
          title: 'Buaze’yi düşünün, eğer',
          items: [
            'Geri bildirimi tabloya girmeye zaman ayıramıyorsanız',
            'Düşük bir puanı gün sonunu beklemeden duymak istiyorsanız',
            'Ekipte birden çok kişinin aynı kayıtları görmesi gerekiyorsa',
            'Müşterinin herkese açık yorum sayfanıza da kolayca ulaşmasını istiyorsanız',
          ],
        },
      },
      migration: {
        eyebrow: 'Geçiş',
        title: 'Tablodan Buaze’ye üç adımda geçin',
        lead: 'Mevcut tablonuz olduğu gibi kalır; Buaze yeni gelen geri bildirimleri kaydetmeye başlar.',
        steps: [
          {
            title: 'Hesabınızı açın',
            body: '14 günlük ücretsiz denemeyle başlayın; kart bilgisi istenmez. Kurulum sihirbazı işletmenizi, sektörünüzü ve konumunuzu sorar.',
          },
          {
            title: 'QR kodunuzu yerleştirin',
            body: 'Panelden QR kodunuzu oluşturun, isterseniz masa veya oda etiketi ekleyin ve müşterinin göreceği yerlere koyun. Yeni geri bildirimler panelinize kendiliğinden düşer.',
          },
          {
            title: 'Eski tablonuzu saklayın',
            body: 'Buaze eski kayıtları içe aktarmaz; tablonuzu olduğu gibi saklayın. Buaze’deki geri bildirimleri istediğiniz zaman CSV olarak indirip aynı tabloda birleştirebilirsiniz.',
          },
        ],
      },
      faq: {
        eyebrow: 'Sık sorulan sorular',
        title: 'Tablodan geçiş hakkında',
        items: [
          {
            q: 'Mevcut Excel tablomu Buaze’ye aktarabilir miyim?',
            a: 'Hayır, Buaze eski kayıtları içe aktarmaz. Tablonuzu saklayın; Buaze yeni geri bildirimleri kaydeder ve bunları CSV olarak dışa aktarabilirsiniz.',
          },
          {
            q: 'Buaze’deki verileri Excel’de açabilir miyim?',
            a: 'Evet. Geri bildirimleri ve raporları CSV olarak indirip Excel’de ya da Google E-Tablolar’da açabilirsiniz.',
          },
          {
            q: 'Ekibim aynı kayıtları görebilir mi?',
            a: 'Evet. Ekip üyelerini e-postayla davet edip yönetici, personel ya da görüntüleyici rolü verirsiniz ve hangi işletmelere erişeceklerini seçersiniz. Davetler 7 gün geçerlidir.',
          },
        ],
      },
      cta: {
        title: 'Tablodan Buaze’ye geçin',
        facts: ['14 gün ücretsiz', 'Kredi kartı gerekmez', 'İstediğiniz zaman iptal'],
        primary: { href: `${base}/auth/register`, label: 'Ücretsiz deneyin', nofollow: true },
        secondary: { href: `${base}/how-it-works`, label: 'Nasıl çalıştığını görün' },
      },
    };
  }
  return {
    crumbs: ['Home', 'Comparison', 'Spreadsheets'],
    hero: {
      eyebrow: 'Compared with a spreadsheet',
      title: 'Feedback tracking: a spreadsheet or Buaze?',
      lead:
        'Excel or Google Sheets is a good start for keeping a record of a few pieces of feedback. Here we explain what a spreadsheet does well, where it struggles and how to switch to Buaze.',
      primary: { href: `${base}/auth/register`, label: 'Start free trial', nofollow: true },
      secondary: { href: `${base}/pricing`, label: 'See plans' },
    },
    table: {
      eyebrow: 'Side by side',
      title: 'How a spreadsheet and Buaze do the same job',
      lead: 'A spreadsheet works as long as you keep typing. In Buaze the customer leaves the feedback, and the record and the alert appear on their own.',
      caption: 'Comparison of Excel or Google Sheets and Buaze',
      featureLabel: 'Topic',
      otherLabel: 'Spreadsheet',
      rows: [
        {
          label: 'Recording feedback',
          cells: {
            buaze: { kind: 'yes', text: 'Automatic when the customer sends it' },
            other: { kind: 'partial', text: 'You type it in' },
          },
        },
        {
          label: 'A form for the customer',
          cells: {
            buaze: { kind: 'yes', text: 'Rating screen opened by QR' },
            other: { kind: 'no', text: 'Needs a separate tool' },
          },
        },
        {
          label: 'Notice of low ratings',
          cells: {
            buaze: { kind: 'yes', text: 'Instant e-mail for 1–3 stars' },
            other: { kind: 'no', text: 'When you open the sheet' },
          },
        },
        {
          label: 'Public review link',
          cells: {
            buaze: { kind: 'yes', text: 'The one you pick from 10 platforms' },
            other: { kind: 'no', text: 'None' },
          },
        },
        {
          label: 'Replying to the customer',
          cells: {
            buaze: { kind: 'yes', text: 'From the panel, by e-mail if they left an address' },
            other: { kind: 'partial', text: 'In a separate e-mail' },
          },
        },
        {
          label: 'Reports',
          cells: {
            buaze: { kind: 'yes', text: 'Ready-made charts: 7, 30, 90 days and 12 months' },
            other: { kind: 'partial', text: 'You build the charts' },
          },
        },
        {
          label: 'Team access',
          cells: {
            buaze: { kind: 'yes', text: 'Manager, staff and viewer roles' },
            other: { kind: 'partial', text: 'By sharing the file' },
          },
        },
        {
          label: 'Export',
          cells: {
            buaze: { kind: 'yes', text: 'CSV' },
            other: { kind: 'yes', text: 'The file itself' },
          },
        },
        {
          label: 'Cost',
          cells: {
            buaze: { kind: 'text', text: 'Monthly plan, 14 days free' },
            other: { kind: 'text', text: 'Your existing licence' },
          },
        },
      ],
    },
    fit: {
      eyebrow: 'Which one fits?',
      title: 'When a spreadsheet is enough, and when it is not',
      enough: {
        title: 'A spreadsheet is enough if',
        items: [
          'You get a few pieces of feedback a month',
          'One person keeps the records',
          'You already collect feedback by phone or e-mail',
        ],
      },
      notEnough: {
        title: 'Consider Buaze if',
        items: [
          'You have no time to type feedback into a sheet',
          'You want to hear about a low rating without waiting for the end of the day',
          'Several people on your team need to see the same records',
          'You want customers to reach your public review page easily as well',
        ],
      },
    },
    migration: {
      eyebrow: 'Switching',
      title: 'Move from a spreadsheet to Buaze in three steps',
      lead: 'Your current sheet stays as it is; Buaze starts recording new feedback as it comes in.',
      steps: [
        {
          title: 'Create your account',
          body: 'Start with the 14-day free trial; no card details needed. The setup wizard asks for your business, sector and location.',
        },
        {
          title: 'Place your QR code',
          body: 'Create your QR code in the panel, add a table or room label if you like, and put it where customers will see it. New feedback lands in your panel on its own.',
        },
        {
          title: 'Keep your old sheet',
          body: 'Buaze does not import old records, so keep your sheet as it is. You can download the feedback in Buaze as CSV at any time and combine it with the same sheet.',
        },
      ],
    },
    faq: {
      eyebrow: 'Frequently asked questions',
      title: 'About moving from a spreadsheet',
      items: [
        {
          q: 'Can I import my existing Excel sheet into Buaze?',
          a: 'No, Buaze does not import old records. Keep your sheet; Buaze records new feedback and you can export it as CSV.',
        },
        {
          q: 'Can I open my Buaze data in Excel?',
          a: 'Yes. Download feedback and reports as CSV and open them in Excel or Google Sheets.',
        },
        {
          q: 'Can my team see the same records?',
          a: 'Yes. You invite team members by e-mail, give them a manager, staff or viewer role and choose which businesses they can access. Invites are valid for 7 days.',
        },
      ],
    },
    cta: {
      title: 'Move from a spreadsheet to Buaze',
      facts: ['14 days free', 'No credit card required', 'Cancel anytime'],
      primary: { href: `${base}/auth/register`, label: 'Start free trial', nofollow: true },
      secondary: { href: `${base}/how-it-works`, label: 'See how it works' },
    },
  };
}

export default async function VsSpreadsheetPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: 'tr' | 'en' = rawLocale === 'en' ? 'en' : 'tr';
  const { crumbs, ...content } = buildContent(locale);
  const pageUrl = `${SITE_URL}/${locale}${PATH}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: crumbs[0], item: `${SITE_URL}/${locale}` },
          { '@type': 'ListItem', position: 2, name: crumbs[1], item: `${SITE_URL}/${locale}/compare` },
          { '@type': 'ListItem', position: 3, name: crumbs[2], item: pageUrl },
        ],
      },
      ...(content.faq
        ? [
            {
              '@type': 'FAQPage',
              '@id': `${pageUrl}#faq`,
              inLanguage: locale === 'tr' ? 'tr-TR' : 'en-US',
              mainEntity: content.faq.items.map((item) => ({
                '@type': 'Question',
                name: item.q,
                acceptedAnswer: { '@type': 'Answer', text: item.a },
              })),
            },
          ]
        : []),
    ],
  };

  return <ComparisonLayout locale={locale} slug="vs-sheet" jsonLd={jsonLd} {...content} />;
}
