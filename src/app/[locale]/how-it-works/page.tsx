import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, Mail, QrCode, Sparkles, Star } from 'lucide-react';
import { jsonLdString } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/site';
import { QR_PRESETS } from '@/lib/qr-colors';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PageHero from '@/components/marketing/commercial/PageHero';
import SectionHeader from '@/components/marketing/commercial/SectionHeader';
import FaqList, { type FaqEntry } from '@/components/marketing/commercial/FaqList';
import CtaBand from '@/components/marketing/commercial/CtaBand';
import {
  BTN_DARK,
  BTN_OUTLINE,
  CONTAINER,
  CONTAINER_NARROW,
  SECTION_Y,
  TEXT_LINK,
} from '@/components/marketing/commercial/styles';
import type { Locale } from '@/lib/translations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx`.

const META = {
  tr: {
    title: 'Nasıl çalışır: QR kodla yorum toplama adım adım',
    description:
      'QR ile yorum toplama dört adımda: işletmenizi ekleyin, QR kodunuzu yerleştirin, müşteriniz puan versin, geri bildirimi yanıtlayın. 14 gün ücretsiz deneyin.',
  },
  en: {
    title: 'How it works: collecting reviews with QR',
    description:
      'Collecting reviews with QR codes in four steps: add your business, place your QR code, let customers rate, reply to feedback. 14 days free, no card needed.',
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
      canonical: `/${lang}/how-it-works`,
      languages: { tr: '/tr/how-it-works', en: '/en/how-it-works', 'x-default': '/tr/how-it-works' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${lang}/how-it-works`,
      title,
      description,
      images: [{ url: `/images/open-graph-${lang}.png`, width: 1200, height: 630, alt: title }],
    },
  };
}

const COPY = {
  tr: {
    eyebrow: 'Nasıl çalışır',
    title: 'QR ile yorum toplama nasıl çalışır',
    lead:
      'Panelden QR kodunuzu oluşturursunuz, müşteriniz puan verir, size gelen geri bildirimi tek yerden yanıtlarsınız. Teknik bilgi gerekmez.',
    heroPrimary: 'Ücretsiz deneyin',
    heroSecondary: 'Planları görün',
    stepsEyebrow: 'Dört adım',
    stepsTitle: 'Kurulumdan ilk yanıta',
    stepsLead: 'Her adım panelde çalışan bir özelliği anlatır. Yanlarındaki görseller örnek ekrandır.',
    sample: 'Örnek ekran',
    stepLabel: 'Adım',
    steps: [
      {
        title: 'İşletmenizi ve platformlarınızı ekleyin',
        body:
          'Kurulum sihirbazı beş adımda işletmenizi, sektörünüzü, konumunuzu, yorum platformlarınızı ve ilk QR kodunuzu sorar. Google işletme profilinizi adıyla arayıp seçtiğinizde resmi yorum bağlantınız oluşturulur.',
        details: [
          '10 yorum platformundan istediklerinizi eklersiniz',
          'Bağlantılar her gün otomatik kontrol edilir',
          'Google profilinizi seçmek için Google hesabıyla giriş gerekmez',
        ],
      },
      {
        title: 'QR kodunuzu oluşturun ve yerleştirin',
        body:
          'İstediğiniz kadar QR kod oluşturun; isterseniz masa veya oda etiketi ekleyin ve kodu bir platforma bağlayın. QR kodu PNG olarak indirin ya da PDF olarak yazdırın; masaya, adisyona, kapıya veya pakete koyun.',
        details: [
          '6 hazır renk ya da kendi renginiz',
          'Okunması zor renklerde sihirbaz uyarır',
          'Bağlantı değişirse kodu yeniden basmazsınız',
        ],
      },
      {
        title: 'Müşteri puan verir',
        body:
          'Müşteri QR kodu okutur ve puan verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) seçtiğiniz platformun yorum sayfası açılır. Eşiğin altındaki puanlarda müşteri önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
        details: [
          'Eşik 4 ya da 5 yıldız olabilir',
          'Form, müşterinin tarayıcı diline göre Türkçe ya da İngilizce açılır',
          'KVKK aydınlatma ve açık rıza onayı; pazarlama izni ayrı ve varsayılan olarak kapalı',
        ],
      },
      {
        title: 'Yanıtlayın ve takip edin',
        body:
          '1–3 yıldızlık her geri bildirimde size anında e-posta gelir. Müşteri e-posta adresini bıraktıysa yanıtınızı e-postayla gönderirsiniz; Pulse AI 2–4 cümlelik bir taslak hazırlar, siz onaylamadan hiçbir şey gönderilmez. Her pazartesi haftalık özet e-postası gelir.',
        details: [
          'Pulse AI: sıcak, resmi ya da özür dileyen ton',
          '7, 30, 90 gün ve 12 aylık raporlar',
          'Geri bildirimleri CSV olarak indirebilirsiniz',
        ],
      },
    ],
    mock: {
      wizardTitle: 'Kurulum',
      wizardSteps: ['İşletme', 'Sektör', 'Konum', 'Platformlar', 'İlk QR'],
      wizardProgress: 'Adım 4 / 5',
      table: 'Masa 12',
      download: 'PNG indir',
      print: 'PDF yazdır',
      colors: 'Renk',
      high: 'Yorum sayfası açılır',
      low: 'Özel form ve herkese açık bağlantı',
      customer: 'Müşteri',
      feedback: 'Servis biraz yavaştı.',
      draft: 'Pulse AI taslağı · Sıcak ton',
      draftText: 'Geri bildiriminiz için teşekkür ederiz. Bekleme süresini ekibimizle konuştuk…',
      approve: 'Düzenle ve onayla',
    },
    thresholdEyebrow: 'Eşik ve Google kuralları',
    thresholdTitle: 'Eşik ne işe yarar, ne yapmaz',
    thresholdBody: [
      'Eşik, yorum sayfasının hangi puanda kendiliğinden açılacağını belirler. Eşiğin altında puan veren müşteri de herkese açık yorum bağlantısını aynı ekranda görür ve istediği yere yorum yazabilir.',
      'Buaze yorum silmez, gizlemez veya değiştirmez; sahte yorum yazmaz ve yorum karşılığında indirim, hediye ya da ödül sunmaz.',
    ],
    thresholdLink: 'Google yorum kuralları ve Buaze akışı',
    faqEyebrow: 'Sık sorulan sorular',
    faqTitle: 'Kurulum ve kullanım hakkında',
    faqs: [
      {
        q: 'Müşterinin bir uygulama indirmesi gerekiyor mu?',
        a: 'Hayır. QR kod, telefonun tarayıcısında açılan bir sayfaya gider; müşteri uygulama indirmez ya da hesap açmaz.',
      },
      {
        q: 'QR kodu nereye koymalıyım?',
        a: 'Müşterinin hizmeti aldıktan sonra rahatça göreceği yerlere: masa, adisyon, kasa, kapı ya da paket. Masa veya oda etiketi eklerseniz düşük puan e-postasında ve CSV dışa aktarımında hangi koddan geldiğini görürsünüz.',
      },
      {
        q: 'Birden çok şubem var, ne yapmalıyım?',
        a: 'Her şubeyi ayrı bir işletme olarak eklersiniz. Panelde işletmeler arasında tek tıkla geçer, işletmeler tablosunda son 30 günün yorum sayısını, puanını ve bağlantı durumunu yan yana görürsünüz.',
      },
      {
        q: 'Eşiği sonradan değiştirebilir miyim?',
        a: 'Evet. Eşiği panelden 4 ya da 5 yıldız olarak istediğiniz zaman değiştirebilirsiniz; QR kodlarınızı yeniden basmanız gerekmez.',
      },
    ],
    cta: {
      title: 'Buaze’yi 14 gün ücretsiz deneyin',
      facts: ['Kredi kartı gerekmez', 'Kurulum sihirbazı adım adım ilerler', 'İstediğiniz zaman iptal'],
      primary: 'Ücretsiz deneyin',
      secondary: 'Planları görün',
    },
    breadcrumbHome: 'Ana sayfa',
    breadcrumbSelf: 'Nasıl çalışır',
    howToName: 'QR ile yorum toplama nasıl çalışır',
    howToDescription:
      'Buaze ile QR kodla puan ve geri bildirim toplamanın dört adımı: kurulum, QR kodun yerleştirilmesi, müşterinin puanı ve geri bildirime yanıt.',
  },
  en: {
    eyebrow: 'How it works',
    title: 'How collecting reviews with QR works',
    lead:
      'You create your QR code in the panel, your customer gives a rating, and you answer the feedback from one place. No technical skills needed.',
    heroPrimary: 'Start free trial',
    heroSecondary: 'See plans',
    stepsEyebrow: 'Four steps',
    stepsTitle: 'From setup to your first reply',
    stepsLead: 'Each step describes a feature that works in the panel. The pictures next to them are sample screens.',
    sample: 'Sample screen',
    stepLabel: 'Step',
    steps: [
      {
        title: 'Add your business and platforms',
        body:
          'A five-step setup wizard asks for your business, sector, location, review platforms and first QR code. Search for your Google Business Profile by name and pick it, and your official review link is created.',
        details: [
          'Add any of the 10 review platforms you use',
          'Links are checked automatically every day',
          'No Google sign-in needed to pick your profile',
        ],
      },
      {
        title: 'Create and place your QR code',
        body:
          'Create as many QR codes as you need, add a table or room label if you like and tie a code to one platform. Download it as PNG or print it to PDF, then put it on tables, bills, doors or packages.',
        details: [
          '6 preset colors or your own',
          'The wizard warns about colors that are hard to scan',
          'If a link changes, you do not reprint the code',
        ],
      },
      {
        title: 'The customer gives a rating',
        body:
          'The customer scans the QR code and gives a rating. At or above the threshold you set (5 stars by default), your chosen platform’s review page opens. Below it, the customer can first send you private feedback; the public review link is shown on the same screen.',
        details: [
          'The threshold can be 4 or 5 stars',
          'The form opens in Turkish or English, following the browser language',
          'KVKK notice and explicit consent; marketing consent is separate and off by default',
        ],
      },
      {
        title: 'Reply and keep track',
        body:
          'Every 1–3 star piece of feedback triggers an instant e-mail. If the customer left an e-mail address, you reply by e-mail; Pulse AI prepares a 2–4 sentence draft and nothing is sent until you approve it. A weekly summary e-mail arrives every Monday.',
        details: [
          'Pulse AI: warm, formal or apologetic tone',
          'Reports for 7, 30 and 90 days and 12 months',
          'Download feedback as CSV',
        ],
      },
    ],
    mock: {
      wizardTitle: 'Setup',
      wizardSteps: ['Business', 'Sector', 'Location', 'Platforms', 'First QR'],
      wizardProgress: 'Step 4 / 5',
      table: 'Table 12',
      download: 'Download PNG',
      print: 'Print PDF',
      colors: 'Color',
      high: 'Review page opens',
      low: 'Private form plus the public link',
      customer: 'Customer',
      feedback: 'Service was a bit slow.',
      draft: 'Pulse AI draft · Warm tone',
      draftText: 'Thank you for your feedback. We have talked about the waiting time with our team…',
      approve: 'Edit and approve',
    },
    thresholdEyebrow: 'The threshold and Google’s rules',
    thresholdTitle: 'What the threshold does, and what it does not',
    thresholdBody: [
      'The threshold sets the rating at which the review page opens on its own. A customer who rates below it still sees the public review link on the same screen and can post a review wherever they like.',
      'Buaze does not delete, hide or change reviews; it does not write fake reviews and offers no discount, gift or reward for a review.',
    ],
    thresholdLink: 'Google review rules and the Buaze flow',
    faqEyebrow: 'Frequently asked questions',
    faqTitle: 'About setup and daily use',
    faqs: [
      {
        q: 'Does the customer need to download an app?',
        a: 'No. The QR code opens a page in the phone’s browser; the customer does not download an app or create an account.',
      },
      {
        q: 'Where should I put the QR code?',
        a: 'Where customers can see it easily after the service: tables, bills, the till, the door or the package. If you add a table or room label, the low-rating e-mail and the CSV export show which code the feedback came from.',
      },
      {
        q: 'I have several locations. What should I do?',
        a: 'Add each location as a separate business. You switch between businesses in one click, and the businesses table shows each one’s last 30 days of reviews, rating and link status side by side.',
      },
      {
        q: 'Can I change the threshold later?',
        a: 'Yes. You can switch the threshold between 4 and 5 stars in the panel at any time; you do not need to reprint your QR codes.',
      },
    ],
    cta: {
      title: 'Try Buaze free for 14 days',
      facts: ['No credit card required', 'A setup wizard guides you', 'Cancel anytime'],
      primary: 'Start free trial',
      secondary: 'See plans',
    },
    breadcrumbHome: 'Home',
    breadcrumbSelf: 'How it works',
    howToName: 'How collecting reviews with QR works',
    howToDescription:
      'The four steps to collecting ratings and feedback with QR codes in Buaze: setup, placing the QR code, the customer’s rating and replying to feedback.',
  },
} as const;

type Mock = (typeof COPY)[keyof typeof COPY]['mock'];

function MockFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div aria-hidden="true" className="w-full max-w-[420px] rounded-[20px] border border-[#EDEDED] bg-[#FAFAFA] p-5 sm:p-6">
      <p className="pulse-eyebrow text-[#737373]">{label}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function WizardMock({ mock }: { mock: Mock }) {
  return (
    <div className="rounded-[14px] border border-[#EDEDED] bg-white p-4">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-[#0A0A0A]">{mock.wizardTitle}</span>
        <span className="text-[#737373]">{mock.wizardProgress}</span>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-[#EDEDED]">
        <div className="h-1.5 w-4/5 rounded-full bg-[#C6F24E]" />
      </div>
      <ul className="mt-4 space-y-2">
        {mock.wizardSteps.map((label, i) => (
          <li key={label} className="flex items-center gap-2.5 text-[13px] text-[#1A1A1A]">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                i < 3 ? 'bg-[#0A0A0A] text-[#C6F24E]' : i === 3 ? 'border-2 border-[#0A0A0A] bg-white' : 'border border-[#D4D4D4] bg-white'
              }`}
            >
              {i < 3 ? <Check size={11} strokeWidth={3} /> : null}
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function QrMock({ mock }: { mock: Mock }) {
  return (
    <div className="flex items-center gap-4 rounded-[14px] border border-[#EDEDED] bg-white p-4">
      <div className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-[14px] border border-[#EDEDED] bg-white">
        <QrCode size={52} strokeWidth={1.4} color="#0A0A0A" />
      </div>
      <div className="min-w-0 space-y-2.5">
        <span className="inline-flex rounded-full bg-[#EAF9B8] px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#3F5408]">
          {mock.table}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-[12px] text-[#737373]">{mock.colors}</span>
          {QR_PRESETS.map((preset) => (
            <span
              key={preset.id}
              className="h-3.5 w-3.5 rounded-full border border-[#D4D4D4]"
              style={{ background: `linear-gradient(135deg, ${preset.dark} 50%, ${preset.light} 50%)` }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 text-[12px] font-medium text-[#0A0A0A]">
          <span className="rounded-full border border-[#D4D4D4] bg-white px-2.5 py-1">{mock.download}</span>
          <span className="rounded-full border border-[#D4D4D4] bg-white px-2.5 py-1">{mock.print}</span>
        </div>
      </div>
    </div>
  );
}

function Stars({ filled }: { filled: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={13}
          strokeWidth={1.8}
          fill={i < filled ? '#0A0A0A' : 'none'}
          color={i < filled ? '#0A0A0A' : '#A3A3A3'}
        />
      ))}
    </span>
  );
}

function RatingMock({ mock }: { mock: Mock }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-[12px] border border-[#EDEDED] bg-white px-3 py-3">
        <Stars filled={5} />
        <span className="min-w-0 flex-1 text-[13px] text-[#0A0A0A]">{mock.high}</span>
        <ArrowUpRight size={14} className="shrink-0 text-[#525252]" />
      </div>
      <div className="flex items-center gap-3 rounded-[12px] border border-[#EDEDED] bg-white px-3 py-3">
        <Stars filled={3} />
        <span className="min-w-0 flex-1 text-[13px] text-[#0A0A0A]">{mock.low}</span>
      </div>
    </div>
  );
}

function ReplyMock({ mock }: { mock: Mock }) {
  return (
    <div className="space-y-2.5">
      <div className="rounded-[12px] border border-[#EDEDED] bg-white p-3">
        <div className="flex items-center justify-between gap-2 text-[12px] text-[#737373]">
          <span>{mock.customer}</span>
          <Stars filled={2} />
        </div>
        <p className="mt-1.5 text-[13px] text-[#0A0A0A]">{mock.feedback}</p>
      </div>
      <div className="rounded-[12px] border border-[#C6F24E] bg-white p-3">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-[#3F5408]">
          <Sparkles size={13} />
          {mock.draft}
        </p>
        <p className="mt-1.5 text-[13px] leading-[1.5] text-[#1A1A1A]">{mock.draftText}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-3 py-1.5 text-[12px] font-medium text-white">
          <Mail size={12} />
          {mock.approve}
        </span>
      </div>
    </div>
  );
}

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: 'tr' | 'en' = rawLocale === 'en' ? 'en' : 'tr';
  const base = `/${locale}`;
  const copy = COPY[locale];
  const pageUrl = `${SITE_URL}/${locale}/how-it-works`;
  const mocks = [WizardMock, QrMock, RatingMock, ReplyMock];

  const faqs: FaqEntry[] = [...copy.faqs];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'HowTo',
        '@id': `${pageUrl}#howto`,
        name: copy.howToName,
        description: copy.howToDescription,
        inLanguage: locale === 'tr' ? 'tr-TR' : 'en-US',
        step: copy.steps.map((step, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: step.title,
          text: step.body,
          url: `${pageUrl}#step-${i + 1}`,
        })),
      },
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faq`,
        inLanguage: locale === 'tr' ? 'tr-TR' : 'en-US',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: copy.breadcrumbHome, item: `${SITE_URL}/${locale}` },
          { '@type': 'ListItem', position: 2, name: copy.breadcrumbSelf, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-[#0A0A0A] selection:bg-[#C6F24E]/40 lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
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

        <section aria-labelledby="hiw-steps-title" className={`bg-[#FAFAFA] ${SECTION_Y}`}>
          <div className={CONTAINER}>
            <SectionHeader
              id="hiw-steps-title"
              eyebrow={copy.stepsEyebrow}
              title={copy.stepsTitle}
              lead={copy.stepsLead}
            />
            <ol className="mt-12 space-y-6 sm:mt-14">
              {copy.steps.map((step, i) => {
                const MockView = mocks[i];
                return (
                  <li
                    key={step.title}
                    id={`step-${i + 1}`}
                    className="scroll-mt-24 rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8 lg:p-10"
                  >
                    <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
                      <div>
                        <p className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A0A0A] font-mono text-[14px] font-semibold text-[#C6F24E]"
                          >
                            {i + 1}
                          </span>
                          <span className="pulse-eyebrow text-[#737373]">
                            {copy.stepLabel} {i + 1}
                          </span>
                        </p>
                        <h3 className="mt-5 text-[24px] leading-[1.15] text-[#0A0A0A] sm:text-[30px]">{step.title}</h3>
                        <p className="mt-4 max-w-[560px] text-[16px] leading-[1.65] text-[#525252]">{step.body}</p>
                        <ul className="mt-5 space-y-2.5">
                          {step.details.map((detail) => (
                            <li key={detail} className="flex items-start gap-2.5 text-[15px] leading-[1.5] text-[#1A1A1A]">
                              <span
                                aria-hidden="true"
                                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EAF9B8]"
                              >
                                <Check size={12} strokeWidth={2.75} className="text-[#0A0A0A]" />
                              </span>
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex justify-center lg:justify-end">
                        <MockFrame label={copy.sample}>
                          <MockView mock={copy.mock} />
                        </MockFrame>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section aria-labelledby="hiw-threshold-title" className={SECTION_Y}>
          <div className={`${CONTAINER} lg:grid lg:grid-cols-[1fr_1fr] lg:gap-16`}>
            <SectionHeader id="hiw-threshold-title" eyebrow={copy.thresholdEyebrow} title={copy.thresholdTitle} />
            <div className="mt-6 space-y-4 text-[16px] leading-[1.65] text-[#525252] lg:mt-12">
              {copy.thresholdBody.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <p>
                <Link href={`${base}/google-compliance`} className={TEXT_LINK}>
                  {copy.thresholdLink}
                </Link>
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="hiw-faq-title" className={`border-t border-[#EDEDED] ${SECTION_Y}`}>
          <div className={CONTAINER_NARROW}>
            <SectionHeader id="hiw-faq-title" eyebrow={copy.faqEyebrow} title={copy.faqTitle} />
            <div className="mt-10">
              <FaqList items={faqs} idPrefix="hiw-faq" />
            </div>
          </div>
        </section>

        <CtaBand
          id="hiw-cta-title"
          title={copy.cta.title}
          facts={copy.cta.facts}
          primary={{ href: `${base}/auth/register`, label: copy.cta.primary, nofollow: true }}
          secondary={{ href: `${base}/pricing`, label: copy.cta.secondary }}
        />
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
