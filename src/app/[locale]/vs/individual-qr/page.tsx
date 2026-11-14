import type { Metadata } from 'next';
import ComparisonLayout, { type ComparisonLayoutProps } from '@/components/marketing/ComparisonLayout';
import { SITE_URL } from '@/lib/site';
import type { Locale } from '@/lib/translations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx`.

const PATH = '/vs/individual-qr';

const META = {
  tr: {
    title: 'Statik QR kodla yorum toplama: ne zaman yeterli',
    description:
      'Ücretsiz statik QR kod ne zaman yeterli, ne zaman yetmez? Puan kaydı, özel geri bildirim, bağlantı kontrolü ve geçiş adımlarıyla Buaze karşılaştırması.',
  },
  en: {
    title: 'Collecting reviews with a static QR code',
    description:
      'When is a free static QR code enough, and when is it not? Compare it with Buaze on rating capture, private feedback, link checks and the steps to switch.',
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
      crumbs: ['Ana sayfa', 'Karşılaştırma', 'Statik QR kod'],
      hero: {
        eyebrow: 'Statik QR ile karşılaştırma',
        title: 'Statik QR kod mu, Buaze mı?',
        lead:
          'Ücretsiz bir statik QR kod, müşteriyi tek bir yorum sayfasına götürür ve küçük bir işletme için iyi bir başlangıçtır. Burada statik QR’ın neyi iyi yaptığını, nerede yetmediğini ve Buaze’ye nasıl geçileceğini anlatıyoruz.',
        primary: { href: `${base}/auth/register`, label: 'Ücretsiz deneyin', nofollow: true },
        secondary: { href: `${base}/solutions/qr-generator`, label: 'Ücretsiz QR kod oluşturun' },
      },
      table: {
        eyebrow: 'Yan yana',
        title: 'Statik QR ve Buaze aynı tabloda',
        lead: 'Statik QR, içine yazılan bağlantıyı açar. Buaze QR kodu ise işletmenizin Buaze sayfasını açar; gerisini paneldeki ayarlarınız belirler.',
        caption: 'Statik QR kod ile Buaze QR akışının karşılaştırması',
        featureLabel: 'Konu',
        otherLabel: 'Statik QR',
        rows: [
          {
            label: 'Müşterinin gördüğü ilk ekran',
            cells: {
              buaze: { kind: 'text', text: 'Puan ekranı' },
              other: { kind: 'text', text: 'Bağlantıdaki sayfa' },
            },
          },
          {
            label: 'Puanın kaydı',
            cells: {
              buaze: { kind: 'yes', text: 'Her puan panelde' },
              other: { kind: 'no', text: 'Kaydedilmez' },
            },
          },
          {
            label: 'Size özel geri bildirim',
            cells: {
              buaze: { kind: 'yes', text: 'Eşiğin altındaki puanlarda form' },
              other: { kind: 'no', text: 'Yok' },
            },
          },
          {
            label: 'Herkese açık yorum bağlantısı',
            cells: {
              buaze: { kind: 'yes', text: 'Her puanda görünür' },
              other: { kind: 'yes', text: 'Tek bağlantı' },
            },
          },
          {
            label: 'Düşük puanda haber',
            cells: {
              buaze: { kind: 'yes', text: '1–3 yıldızda anında e-posta' },
              other: { kind: 'no', text: 'Yok' },
            },
          },
          {
            label: 'Bağlantı değişirse',
            cells: {
              buaze: { kind: 'yes', text: 'Panelden değiştirirsiniz' },
              other: { kind: 'no', text: 'Kodu yeniden basarsınız' },
            },
          },
          {
            label: 'Bozuk bağlantı kontrolü',
            cells: {
              buaze: { kind: 'yes', text: 'Her gün otomatik' },
              other: { kind: 'no', text: 'Yok' },
            },
          },
          {
            label: 'Masa veya oda etiketi',
            cells: {
              buaze: { kind: 'yes', text: 'Her QR koda ayrı etiket' },
              other: { kind: 'no', text: 'Yok' },
            },
          },
          {
            label: 'Hesap ve maliyet',
            cells: {
              buaze: { kind: 'text', text: 'Hesap gerekir; aylık plan, 14 gün ücretsiz' },
              other: { kind: 'text', text: 'Hesap gerekmez; ücretsiz' },
            },
          },
        ],
      },
      fit: {
        eyebrow: 'Hangisi size uygun?',
        title: 'Statik QR ne zaman yeterli, ne zaman yetmez',
        enough: {
          title: 'Statik QR yeterlidir, eğer',
          items: [
            'Tek bir işletmeniz ve tek bir yorum bağlantınız varsa',
            'Geri bildirimi kaydetmeniz ya da takip etmeniz gerekmiyorsa',
            'Bağlantınızın uzun süre değişmeyeceğinden eminseniz',
          ],
        },
        notEnough: {
          title: 'Buaze’yi düşünün, eğer',
          items: [
            'Memnun kalmayan müşterinin size doğrudan yazabilmesini istiyorsanız',
            'Birden çok şubeniz ya da birden çok yorum platformunuz varsa',
            'Puanların gün ve saate göre nasıl değiştiğini görmek istiyorsanız',
            'Müşteriye e-postayla yanıt vermek istiyorsanız',
          ],
        },
      },
      migration: {
        eyebrow: 'Geçiş',
        title: 'Statik QR’dan Buaze’ye üç adımda geçin',
        lead: 'Statik kodun içeriği sonradan değiştirilemediği için geçişte bir kez yeni kod basmanız gerekir.',
        steps: [
          {
            title: 'Hesabınızı açın',
            body: '14 günlük ücretsiz denemeyle başlayın; kart bilgisi istenmez. Kurulum sihirbazı işletmenizi, sektörünüzü ve konumunuzu sorar.',
          },
          {
            title: 'Yorum bağlantınızı ekleyin',
            body: 'Google işletme profilinizi adıyla arayıp seçin; resmi yorum bağlantınız oluşturulur. Diğer platformların bağlantılarını da ekleyebilirsiniz.',
          },
          {
            title: 'Yeni QR kodu yerleştirin',
            body: 'QR kodunuzu panelden oluşturun, PNG olarak indirin ya da PDF olarak yazdırın ve eski kodun yerine koyun. Bundan sonra bağlantı değişse de kodu yeniden basmanız gerekmez.',
          },
        ],
      },
      faq: {
        eyebrow: 'Sık sorulan sorular',
        title: 'Statik QR’dan geçiş hakkında',
        items: [
          {
            q: 'Ücretsiz statik QR kodumu kullanmaya devam edebilir miyim?',
            a: 'Evet. Statik kod içindeki bağlantıyı açmaya devam eder. Buaze’ye geçerseniz yeni QR kodunuzu oluşturup eskisinin yerine koymanız gerekir; statik kodun içeriği sonradan değiştirilemez.',
          },
          {
            q: 'Buaze QR kodu müşteriyi hemen yorum sayfasına götürür mü?',
            a: 'Müşteri önce puan verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) seçtiğiniz platformun yorum sayfası açılır. Eşiğin altındaki puanlarda müşteri önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
          },
          {
            q: 'Buaze’nin ücretsiz QR oluşturucusu ne işe yarar?',
            a: 'Hesap açmadan, herhangi bir bağlantı için statik QR kod oluşturup indirmenizi sağlar. Bu kod puan kaydetmez ve bir Buaze hesabına bağlı değildir.',
          },
        ],
      },
      cta: {
        title: 'Statik QR’dan Buaze’ye geçin',
        facts: ['14 gün ücretsiz', 'Kredi kartı gerekmez', 'İstediğiniz zaman iptal'],
        primary: { href: `${base}/auth/register`, label: 'Ücretsiz deneyin', nofollow: true },
        secondary: { href: `${base}/pricing`, label: 'Planları görün' },
      },
    };
  }
  return {
    crumbs: ['Home', 'Comparison', 'Static QR code'],
    hero: {
      eyebrow: 'Compared with a static QR code',
      title: 'A static QR code or Buaze?',
      lead:
        'A free static QR code takes the customer to a single review page and is a good start for a small business. Here we explain what a static QR code does well, where it falls short and how to switch to Buaze.',
      primary: { href: `${base}/auth/register`, label: 'Start free trial', nofollow: true },
      secondary: { href: `${base}/solutions/qr-generator`, label: 'Create a free QR code' },
    },
    table: {
      eyebrow: 'Side by side',
      title: 'A static QR code and Buaze in one table',
      lead: 'A static QR code opens the link written into it. A Buaze QR code opens your business’s Buaze page; what happens next depends on your settings in the panel.',
      caption: 'Comparison of a static QR code and the Buaze QR flow',
      featureLabel: 'Topic',
      otherLabel: 'Static QR',
      rows: [
        {
          label: 'First screen the customer sees',
          cells: {
            buaze: { kind: 'text', text: 'A rating screen' },
            other: { kind: 'text', text: 'The page in the link' },
          },
        },
        {
          label: 'Recording the rating',
          cells: {
            buaze: { kind: 'yes', text: 'Every rating in the panel' },
            other: { kind: 'no', text: 'Not recorded' },
          },
        },
        {
          label: 'Private feedback to you',
          cells: {
            buaze: { kind: 'yes', text: 'A form for ratings below your threshold' },
            other: { kind: 'no', text: 'None' },
          },
        },
        {
          label: 'Public review link',
          cells: {
            buaze: { kind: 'yes', text: 'Visible at every rating' },
            other: { kind: 'yes', text: 'One link' },
          },
        },
        {
          label: 'Notice of low ratings',
          cells: {
            buaze: { kind: 'yes', text: 'Instant e-mail for 1–3 stars' },
            other: { kind: 'no', text: 'None' },
          },
        },
        {
          label: 'If the link changes',
          cells: {
            buaze: { kind: 'yes', text: 'You change it in the panel' },
            other: { kind: 'no', text: 'You reprint the code' },
          },
        },
        {
          label: 'Broken link checks',
          cells: {
            buaze: { kind: 'yes', text: 'Automatic, every day' },
            other: { kind: 'no', text: 'None' },
          },
        },
        {
          label: 'Table or room label',
          cells: {
            buaze: { kind: 'yes', text: 'A label per QR code' },
            other: { kind: 'no', text: 'None' },
          },
        },
        {
          label: 'Account and cost',
          cells: {
            buaze: { kind: 'text', text: 'Account needed; monthly plan, 14 days free' },
            other: { kind: 'text', text: 'No account; free' },
          },
        },
      ],
    },
    fit: {
      eyebrow: 'Which one fits?',
      title: 'When a static QR code is enough, and when it is not',
      enough: {
        title: 'A static QR code is enough if',
        items: [
          'You run one business with one review link',
          'You do not need to record or track feedback',
          'You are sure your link will not change for a long time',
        ],
      },
      notEnough: {
        title: 'Consider Buaze if',
        items: [
          'You want unhappy customers to be able to write to you directly',
          'You have several locations or several review platforms',
          'You want to see how ratings change by day and hour',
          'You want to reply to customers by e-mail',
        ],
      },
    },
    migration: {
      eyebrow: 'Switching',
      title: 'Move from a static QR code to Buaze in three steps',
      lead: 'Because the content of a static code cannot be changed later, you print a new code once when you switch.',
      steps: [
        {
          title: 'Create your account',
          body: 'Start with the 14-day free trial; no card details needed. The setup wizard asks for your business, sector and location.',
        },
        {
          title: 'Add your review link',
          body: 'Search for your Google Business Profile by name and pick it; your official review link is created. You can add links for other platforms too.',
        },
        {
          title: 'Place the new QR code',
          body: 'Create your QR code in the panel, download it as PNG or print it to PDF, and put it where the old code was. From then on, a changed link needs no reprint.',
        },
      ],
    },
    faq: {
      eyebrow: 'Frequently asked questions',
      title: 'About moving from a static QR code',
      items: [
        {
          q: 'Can I keep using my free static QR code?',
          a: 'Yes. A static code keeps opening the link inside it. If you switch to Buaze, you create a new QR code and put it in place of the old one; the content of a static code cannot be changed later.',
        },
        {
          q: 'Does the Buaze QR code take the customer straight to the review page?',
          a: 'The customer gives a rating first. At or above the threshold you set (5 stars by default), your chosen platform’s review page opens. Below it, the customer can first send you private feedback; the public review link is shown on the same screen.',
        },
        {
          q: 'What is the free Buaze QR code generator for?',
          a: 'It lets you create and download a static QR code for any link without an account. That code does not record ratings and is not linked to a Buaze account.',
        },
      ],
    },
    cta: {
      title: 'Move from a static QR code to Buaze',
      facts: ['14 days free', 'No credit card required', 'Cancel anytime'],
      primary: { href: `${base}/auth/register`, label: 'Start free trial', nofollow: true },
      secondary: { href: `${base}/pricing`, label: 'See plans' },
    },
  };
}

export default async function VsIndividualQrPage({
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

  return <ComparisonLayout locale={locale} slug="vs-qr" jsonLd={jsonLd} {...content} />;
}
