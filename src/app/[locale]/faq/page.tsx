import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { jsonLdString } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/site';
import { SUPPORT_EMAIL, SUPPORT_HOURS } from '@/lib/company-constants';
import type { Locale } from '@/lib/translations';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import FaqAccordion, { type FaqItem } from '@/components/marketing/FaqAccordion';

/**
 * /faq — grouped questions about the product as it works today. Every answer
 * is checked against the code (review flow with the owner's 4★/5★ threshold,
 * link-only platforms, TL card payments + 14-day trial, team roles, KVKK). The
 * FAQPage JSON-LD is built from the same arrays as the visible accordion.
 * Static: no headers()/cookies()/searchParams (CLAUDE.md §35.12.3).
 */

export const revalidate = 3600;

type Lang = 'tr' | 'en';

interface FaqGroup {
  id: string;
  title: string;
  items: FaqItem[];
}

const META = {
  tr: {
    title: 'Sık sorulan sorular: kurulum, yorum akışı ve fiyat',
    description:
      'Buaze hakkında sık sorulan sorular: QR yorum akışı, kurulum, platform bağlantıları, fiyat ve 14 günlük ücretsiz deneme, ekip rolleri, KVKK ve destek.',
  },
  en: {
    title: 'FAQ: setup, the review flow, pricing and data',
    description:
      'Common questions about Buaze: the QR review flow, setup, platform links, pricing and the 14-day free trial, team roles, data protection and support.',
  },
} as const;

function buildGroups(lang: Lang): FaqGroup[] {
  const p = (path: string) => `/${lang}${path}`;

  if (lang === 'tr') {
    return [
      {
        id: 'review-flow',
        title: 'Yorum akışı ve platformlar',
        items: [
          {
            q: 'Müşteri QR kodu okuttuğunda ne olur?',
            a: 'Müşteri QR kodu okutur ve 1 ile 5 yıldız arasında puan verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) seçtiğiniz platformun yorum sayfası açılır. Eşiğin altındaki puanlarda müşteri önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
          },
          {
            q: 'Eşiği nasıl değiştiririm?',
            a: 'Eşiği panelden 4 ya da 5 yıldız olarak seçersiniz; varsayılan değer 5 yıldızdır. Eşik yalnızca hangi puanlarda yorum sayfasının doğrudan açılacağını belirler. Herkese açık yorum bağlantısı her puanda gösterilir.',
          },
          {
            q: 'Buaze yorumlara müdahale eder mi?',
            a: "Hayır. Buaze yorum silmez, gizlemez veya değiştirmez; sahte yorum yazmaz ve yazdırmaz. Yorum karşılığında indirim, hediye veya ödül de sunmaz. Google'ın yorum kurallarını ayrı bir sayfada ayrıntılı olarak anlatıyoruz.",
            links: [{ href: p('/google-compliance'), label: 'Google yorum kuralları ve Buaze' }],
          },
          {
            q: 'Yemeksepeti, Getir ve diğer platformlarla nasıl çalışır?',
            a: 'Buaze 10 platformu destekler: Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking.com, Airbnb, Yandex, Yelp ve Foursquare. Bu platformlardaki yorum sayfalarınızın bağlantılarını panele eklersiniz; QR kodu oluştururken hangi platformun açılacağını seçebilir ya da varsayılan bir platform belirleyebilirsiniz. Buaze bu platformlardaki yorumları panele aktarmaz ve onlara yanıt vermez.',
            links: [{ href: p('/integrations'), label: 'Platform bağlantıları' }],
          },
          {
            q: 'Google yorumlarını panelden yanıtlayabilir miyim?',
            a: "Şu an hayır. Google yorumlarına panelden yanıt verme, Google'ın erişim onayına bağlıdır ve genel kullanıma açık değildir. Google Yorumları sayfasında Google puanınızı, yorum sayınızı, Google'ın gösterdiği en fazla 5 yorumu ve 6 maddelik profil kontrol listesini görebilirsiniz; bunun için Google hesabıyla giriş yapmanız gerekmez.",
          },
        ],
      },
      {
        id: 'setup',
        title: 'Kurulum ve kullanım',
        items: [
          {
            q: 'Kurulum nasıl yapılır?',
            a: "Kayıttan sonra 5 adımlı kurulum sihirbazında işletme bilgilerinizi, sektörünüzü, konumunuzu ve platformlarınızı girer, ilk QR kodunuzu oluşturursunuz. Google'daki işletmenizi panelde adıyla arayıp seçtiğinizde Buaze resmi Google yorum bağlantınızı oluşturur. Teknik bilgi gerekmez.",
          },
          {
            q: 'Hangi cihazlarda çalışır?',
            a: 'Müşterinin QR kod okutabilen bir telefonu olması yeterli; uygulama indirmesi gerekmez. Panel web tabanlıdır, bilgisayarda ve telefon tarayıcısında çalışır. Ayrı bir iOS veya Android uygulaması yoktur.',
          },
          {
            q: 'QR kodlarını nasıl oluştururum?',
            a: 'Panelden istediğiniz kadar QR kodu oluşturabilirsiniz. İsterseniz masa veya oda etiketi ekler, açılacak platformu sabitler, 6 hazır renkten birini ya da marka renginizi seçersiniz. QR kodunu PNG olarak indirebilir veya PDF olarak yazdırabilirsiniz. QR kodu sizin Buaze sayfanızı açtığı için yorum bağlantılarınızı sonradan değiştirdiğinizde yeniden basmanız gerekmez.',
          },
          {
            q: 'Buaze hangi dillerde kullanılabilir?',
            a: 'Panel, müşteri formu ve e-postalar Türkçe ve İngilizcedir. Müşteri formu tarayıcının diline göre Türkçe ya da İngilizce açılır; Pulse AI yanıt taslakları da bu iki dilde hazırlanır.',
          },
        ],
      },
      {
        id: 'replies',
        title: 'Geri bildirim ve yanıtlar',
        items: [
          {
            q: 'Düşük puanlı geri bildirimlerden nasıl haberdar olurum?',
            a: '1–3 yıldızlık her yeni geri bildirimde e-posta uyarısı alırsınız; panelde de bildirim görünür. Her pazartesi haftalık özet e-postası gelir. İki e-postayı da ayarlardan kapatabilirsiniz.',
          },
          {
            q: 'Pulse AI yanıtları kendisi gönderir mi?',
            a: 'Hayır. Pulse AI her geri bildirim için 2–4 cümlelik bir yanıt taslağı hazırlar; sıcak, resmi veya özür dileyen tonu siz seçersiniz. Taslağı düzenler ve onaylarsınız; hiçbir yanıt siz onaylamadan gönderilmez. Taslak hazırlamak için geri bildirim metni yapay zekâ sağlayıcısına (Anthropic, yedek olarak OpenAI) gönderilir.',
            links: [{ href: p('/features/pulse-ai'), label: 'Pulse AI' }],
          },
          {
            q: 'Müşteriye nasıl yanıt veririm?',
            a: 'Müşteri e-posta adresini bıraktıysa yanıtınızı gelen kutusundan e-postayla gönderirsiniz; bırakmadıysa yanıtınız panelde kayıt olarak kalır. Her yanıt gönderilmeden önce otomatik bir kontrolden geçer: tehdit, hakaret veya kişisel veri içeren yanıtlar gönderilmez.',
          },
        ],
      },
      {
        id: 'pricing',
        title: 'Fiyat ve abonelik',
        items: [
          {
            q: 'Ücretsiz deneme var mı, kredi kartı gerekir mi?',
            a: '14 gün ücretsiz deneyebilirsiniz; kayıt sırasında kredi kartı istenmez. Deneme süresi bitince devam etmek için bir plan seçersiniz.',
          },
          {
            q: 'Fiyatlandırma nasıl işliyor?',
            a: `Güncel planlar ve fiyatlar Fiyatlandırma sayfasında yer alır; kartla ödeme Türk lirası olarak PayNKolay üzerinden alınır ve her ödeme bir ay ya da bir yıl açar. Kurumsal faturalama için ${SUPPORT_EMAIL} adresine yazabilirsiniz.`,
            links: [{ href: p('/pricing'), label: 'Fiyatlandırma' }],
          },
          {
            q: 'Aboneliğimi nasıl iptal ederim?',
            a: "Kartla ödenen paketlerde otomatik çekim yoktur; her ödeme bir ay ya da bir yıl açar. Devam etmek istemezseniz yeni ödeme yapmamanız yeterlidir: dönem bitince panel kullanılamaz, verileriniz silinmez. İade koşulları İade ve İptal Politikası'nda yer alır.",
            links: [{ href: p('/iade-iptal-politikasi'), label: 'İade ve İptal Politikası' }],
          },
        ],
      },
      {
        id: 'team',
        title: 'Ekip ve birden çok işletme',
        items: [
          {
            q: 'Ekip arkadaşlarımı nasıl eklerim?',
            a: 'Hesabım → Ekip ve roller bölümünden e-postayla davet gönderirsiniz; davet 7 gün geçerlidir. Her kişiye yönetici, personel veya görüntüleyici rolü verir ve hangi işletmelere erişebileceğini seçersiniz. Görüntüleyiciler değişiklik yapamaz.',
          },
          {
            q: 'Birden çok işletmeyi tek hesaptan yönetebilir miyim?',
            a: 'Evet. İşletme seçiciyle işletmeleriniz arasında geçiş yaparsınız. İşletmeler tablosunda her işletmenin son 30 gündeki yorum sayısını, puanını, bekleyen düşük puanlarını ve bağlantı durumunu yan yana görürsünüz.',
          },
        ],
      },
      {
        id: 'data',
        title: 'Veri ve destek',
        items: [
          {
            q: 'Müşteri verileri nasıl işleniyor?',
            a: "Müşteri formunda KVKK aydınlatma onayı alınır; pazarlama izni ayrıdır ve varsayılan olarak kapalıdır. IP adresleri 90 gün sonra anonimleştirilir. Veritabanı AB'de (Frankfurt) çalışır; bazı alt işleyiciler ABD'dedir ve Veri İşleyici Sözleşmesi'nde listelenir. Pulse AI taslakları için geri bildirim metni yapay zekâ sağlayıcımıza (Anthropic, yedek olarak OpenAI) gönderilir.",
            links: [
              { href: p('/kvkk'), label: 'KVKK Aydınlatma Metni' },
              { href: p('/veri-isleyici-sozlesmesi'), label: 'Veri İşleyici Sözleşmesi' },
            ],
          },
          {
            q: 'Verilerimi indirebilir veya hesabımı silebilir miyim?',
            a: 'Evet. Hesap verilerinizi panelden JSON dosyası olarak indirebilirsiniz. Hesabınızı silerseniz 30 gün içinde geri alabilirsiniz; bu süre dolunca hesabınız kalıcı olarak silinir.',
          },
          {
            q: 'Destek ekibine nasıl ulaşırım?',
            a: `${SUPPORT_EMAIL} adresine Türkçe ya da İngilizce yazabilir veya İletişim sayfasındaki formu kullanabilirsiniz. ${SUPPORT_HOURS.tr}`,
            links: [
              { href: p('/contact'), label: 'İletişim' },
              { href: p('/help'), label: 'Yardım merkezi' },
            ],
          },
        ],
      },
    ];
  }

  return [
    {
      id: 'review-flow',
      title: 'The review flow and platforms',
      items: [
        {
          q: 'What happens when a customer scans the QR code?',
          a: "The customer scans the QR code and gives a rating from 1 to 5 stars. At or above the threshold you set (5 stars by default), your chosen platform's review page opens. Below it, the customer can first send you private feedback; the public review link is shown on the same screen.",
        },
        {
          q: 'How do I change the threshold?',
          a: 'You set the threshold in the panel to 4 or 5 stars; the default is 5 stars. It only decides at which ratings the review page opens directly. The public review link is shown at every rating.',
        },
        {
          q: 'Does Buaze interfere with reviews?',
          a: "No. Buaze does not delete, hide or edit reviews, and it does not write fake reviews or have them written. It offers no discount, gift or reward in exchange for a review either. We explain Google's review rules in detail on a separate page.",
          links: [{ href: p('/google-compliance'), label: "Google's review rules and Buaze" }],
        },
        {
          q: 'How does it work with Yemeksepeti, Getir and other platforms?',
          a: 'Buaze supports 10 platforms: Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking.com, Airbnb, Yandex, Yelp and Foursquare. You add the links to your review pages on these platforms in the panel, and when you create a QR code you can choose which platform opens or set a default one. Buaze does not import reviews from these platforms or reply to them.',
          links: [{ href: p('/integrations'), label: 'Platform links' }],
        },
        {
          q: 'Can I reply to Google reviews from the panel?',
          a: "Not at the moment. Replying to Google reviews from the panel depends on Google's access approval and is not generally available. On the Google Reviews page you can see your Google rating, review count, up to 5 reviews that Google returns and a 6-item profile checklist, without signing in with Google.",
        },
      ],
    },
    {
      id: 'setup',
      title: 'Setup and everyday use',
      items: [
        {
          q: 'How does setup work?',
          a: 'After you sign up, a 5-step setup wizard takes you through your business details, sector, location and platforms, and you create your first QR code. When you search for your business on Google by name in the panel and select it, Buaze creates your official Google review link. No technical skills are needed.',
        },
        {
          q: 'Which devices does it work on?',
          a: 'The customer only needs a phone that can scan a QR code; there is no app to download. The panel is web-based and works in desktop and mobile browsers. There is no separate iOS or Android app.',
        },
        {
          q: 'How do I create QR codes?',
          a: "You can create as many QR codes as you need in the panel. Optionally add a table or room label, pin the platform that opens, and pick one of 6 preset colours or your brand colour. Download the QR code as a PNG or print it to PDF. Because the QR code opens your Buaze page, you don't need to reprint it when you change your review links later.",
        },
        {
          q: 'Which languages does Buaze support?',
          a: 'The panel, the customer form and the e-mails are in Turkish and English. The customer form opens in Turkish or English based on the browser language, and Pulse AI reply drafts are written in either language.',
        },
      ],
    },
    {
      id: 'replies',
      title: 'Feedback and replies',
      items: [
        {
          q: 'How do I hear about low ratings?',
          a: 'Every new piece of 1–3 star feedback triggers an e-mail alert and a notification in the panel. A weekly summary e-mail arrives every Monday. You can switch off both e-mails in settings.',
        },
        {
          q: 'Does Pulse AI send replies on its own?',
          a: 'No. Pulse AI drafts a 2–4 sentence reply for each piece of feedback, in the warm, formal or apologetic tone you choose. You edit and approve the draft; nothing is sent without your approval. To create a draft, the feedback text is sent to an AI provider (Anthropic, with OpenAI as a backup).',
          links: [{ href: p('/features/pulse-ai'), label: 'Pulse AI' }],
        },
        {
          q: 'How do I reply to a customer?',
          a: 'If the customer left an e-mail address, you send your reply by e-mail from the inbox; otherwise your reply is kept as a record in the panel. Every reply goes through an automatic check before it is sent: replies that contain threats, insults or personal data are not sent.',
        },
      ],
    },
    {
      id: 'pricing',
      title: 'Pricing and subscription',
      items: [
        {
          q: 'Is there a free trial, and do I need a credit card?',
          a: 'You can try Buaze free for 14 days, and no credit card is required at sign-up. When the trial ends, you choose a plan to continue.',
        },
        {
          q: 'How does pricing work?',
          a: `Current plans and prices are on the Pricing page; card payments are taken in Turkish lira through PayNKolay and each payment opens one month or one year. For invoiced billing, write to ${SUPPORT_EMAIL}.`,
          links: [{ href: p('/pricing'), label: 'Pricing' }],
        },
        {
          q: 'How do I cancel my subscription?',
          a: 'Plans paid by card are never charged automatically; each payment opens one month or one year. If you do not want to continue, simply do not pay again: when the period ends the panel cannot be used, and your data is not deleted. Refund terms are in the Refund and Cancellation Policy.',
          links: [{ href: p('/iade-iptal-politikasi'), label: 'Refund and Cancellation Policy' }],
        },
      ],
    },
    {
      id: 'team',
      title: 'Teams and multiple businesses',
      items: [
        {
          q: 'How do I add teammates?',
          a: 'Send an e-mail invitation from Account → Team & roles; invitations are valid for 7 days. Give each person a manager, staff or viewer role and choose which businesses they can access. Viewers cannot make changes.',
        },
        {
          q: 'Can I manage several businesses from one account?',
          a: "Yes. You switch between your businesses with the business switcher. The businesses table shows each one's review count and rating for the last 30 days, pending low ratings and link health side by side.",
        },
      ],
    },
    {
      id: 'data',
      title: 'Data and support',
      items: [
        {
          q: 'How is customer data handled?',
          a: "The customer form asks for consent under KVKK, Turkey's data protection law; marketing consent is separate and off by default. IP addresses are anonymised after 90 days. The database runs in the EU (Frankfurt); some sub-processors are in the US and are listed in the Data Processing Agreement. For Pulse AI drafts, the feedback text is sent to our AI provider (Anthropic, with OpenAI as a backup).",
          links: [
            { href: p('/privacy'), label: 'Privacy policy' },
            { href: p('/veri-isleyici-sozlesmesi'), label: 'Data Processing Agreement' },
          ],
        },
        {
          q: 'Can I export my data or delete my account?',
          a: 'Yes. You can download your account data as a JSON file from the panel. If you delete your account, you can undo it within 30 days; after that, the account is deleted permanently.',
        },
        {
          q: 'How do I reach support?',
          a: `Write to ${SUPPORT_EMAIL} in Turkish or English, or use the form on the Contact page. ${SUPPORT_HOURS.en}`,
          links: [
            { href: p('/contact'), label: 'Contact' },
            { href: p('/help'), label: 'Help center' },
          ],
        },
      ],
    },
  ];
}

const PAGE_COPY = {
  tr: {
    eyebrow: 'SSS',
    h1: 'Sık sorulan sorular',
    lead: 'Yorum akışı, kurulum, fiyatlar, ekip ve veriler hakkında en sık sorulan soruların yanıtları.',
    topicsLabel: 'Konular',
    ctaTitle: 'Yanıtını bulamadığınız bir soru mu var?',
    ctaBody: `${SUPPORT_EMAIL} adresine yazın ya da iletişim formunu kullanın. ${SUPPORT_HOURS.tr}`,
    ctaPrimary: 'İletişime geçin',
    ctaSecondary: 'Yardım merkezi',
    home: 'Ana sayfa',
  },
  en: {
    eyebrow: 'FAQ',
    h1: 'Frequently asked questions',
    lead: 'Answers to the most common questions about the review flow, setup, pricing, teams and data.',
    topicsLabel: 'Topics',
    ctaTitle: "Didn't find your answer?",
    ctaBody: `Write to ${SUPPORT_EMAIL} or use the contact form. ${SUPPORT_HOURS.en}`,
    ctaPrimary: 'Contact us',
    ctaSecondary: 'Help center',
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
      canonical: `/${lang}/faq`,
      languages: { tr: '/tr/faq', en: '/en/faq', 'x-default': '/tr/faq' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${lang}/faq`,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
  };
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const lang: Lang = locale === 'en' ? 'en' : 'tr';
  const copy = PAGE_COPY[lang];
  const groups = buildGroups(lang);
  const pageUrl = `${SITE_URL}/${lang}/faq`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faq`,
        url: pageUrl,
        name: copy.h1,
        inLanguage: lang === 'tr' ? 'tr-TR' : 'en-US',
        mainEntity: groups.flatMap((group) =>
          group.items.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        ),
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
    <div className="min-h-screen bg-white text-[#0A0A0A] lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <MarketingNavbar locale={locale} />
      <main id="main-content">
        {/* Hero + topic links */}
        <section aria-labelledby="faq-title" className="pt-[60px] pb-10 sm:pt-20 sm:pb-14">
          <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
            <div className="max-w-[720px]">
              <p className="pulse-eyebrow text-[#737373]">{copy.eyebrow}</p>
              <h1
                id="faq-title"
                className="mt-4 text-balance text-[38px] leading-[1.02] tracking-[-0.035em] text-[#0A0A0A] sm:text-[56px] md:text-[52px] lg:text-[64px]"
              >
                {copy.h1}
              </h1>
              <p className="mt-5 max-w-[640px] text-pretty text-[16px] leading-[1.6] text-[#525252] sm:text-[18px]">
                {copy.lead}
              </p>
            </div>
            <nav aria-label={copy.topicsLabel} className="mt-8">
              <ul className="flex flex-wrap gap-2">
                {groups.map((group) => (
                  <li key={group.id}>
                    <a
                      href={`#${group.id}`}
                      className="inline-flex min-h-[44px] items-center rounded-full border border-[#EDEDED] bg-white px-4 text-[14px] font-medium text-[#0A0A0A] transition-colors hover:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                    >
                      {group.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>

        {/* Question groups */}
        <div className="bg-[#FAFAFA] py-[60px] sm:py-24">
          <div className="mx-auto w-full max-w-[1200px] space-y-6 px-5 sm:space-y-8 sm:px-10">
            {groups.map((group, gi) => (
              <section
                key={group.id}
                id={group.id}
                aria-labelledby={`${group.id}-title`}
                className="scroll-mt-24 rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12"
              >
                <h2
                  id={`${group.id}-title`}
                  className="text-balance text-[24px] leading-[1.15] text-[#0A0A0A] sm:text-[28px]"
                >
                  {group.title}
                </h2>
                <div className="mt-2 lg:mt-[-22px]">
                  <FaqAccordion faqs={group.items} defaultOpen={gi === 0 ? [0] : []} headingLevel={3} />
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <section aria-labelledby="faq-cta-title" className="py-[60px] sm:py-24">
          <div className="mx-auto w-full max-w-[880px] px-5 text-center sm:px-10">
            <h2
              id="faq-cta-title"
              className="text-balance text-[28px] leading-[1.08] text-[#0A0A0A] sm:text-[40px]"
            >
              {copy.ctaTitle}
            </h2>
            <p className="mx-auto mt-5 max-w-[640px] text-pretty text-[16px] leading-[1.6] text-[#525252] sm:text-[18px]">
              {copy.ctaBody}
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href={`/${lang}/contact`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
              >
                {copy.ctaPrimary}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link
                href={`/${lang}/help`}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#D4D4D4] px-6 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
              >
                {copy.ctaSecondary}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
