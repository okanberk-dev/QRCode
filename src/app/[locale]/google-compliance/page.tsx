import type { Metadata } from 'next';
import { ArrowRight, Check, ExternalLink, X } from 'lucide-react';
import { jsonLdString } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/site';
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
import { DATA_COPY } from '@/lib/legal/subprocessors';

// ISR (1 day): trust/policy content changes rarely.
export const revalidate = 86400;

const POLICY_URL = {
  tr: 'https://support.google.com/contributionpolicy/answer/7400114?hl=tr',
  en: 'https://support.google.com/contributionpolicy/answer/7400114?hl=en',
} as const;

const META = {
  tr: {
    title: 'Google yorum kuralları ve QR yorum akışı',
    description:
      'Google’ın sahte yorum, teşvik ve seçici yorum isteme kuralları ile Buaze’nin müşteri akışı: herkese açık yorum bağlantısı her puanda gösterilir.',
  },
  en: {
    title: 'Google review rules and our QR review flow',
    description:
      'Google’s rules on fake reviews, incentives and selective review requests, and how the Buaze flow works: the public review link is shown at every rating.',
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
      canonical: `/${lang}/google-compliance`,
      languages: { tr: '/tr/google-compliance', en: '/en/google-compliance', 'x-default': '/tr/google-compliance' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${lang}/google-compliance`,
      title,
      description,
      images: [{ url: `/images/open-graph-${lang}.png`, width: 1200, height: 630, alt: title }],
    },
  };
}

const COPY = {
  tr: {
    eyebrow: 'Şeffaflık',
    title: 'Google yorum kuralları ve Buaze akışı',
    lead:
      'Google’ın işletme yorumlarıyla ilgili kurallarını, Buaze’de müşterinin hangi adımlardan geçtiğini ve işletme olarak nelere dikkat etmeniz gerektiğini tek sayfada anlatıyoruz.',
    heroPrimary: 'Akışı adım adım görün',
    heroSecondary: 'Sık sorulan sorular',
    rulesEyebrow: 'Google’ın kuralları',
    rulesTitle: 'Google yorumlarında neler yasak',
    rulesLead:
      'Aşağıdaki özet, Google Haritalar kullanıcı katkısı politikasının işletmeleri en çok ilgilendiren maddeleridir. Hukuki görüş değildir; güncel metin için Google’ın politika sayfasına bakın.',
    rules: [
      {
        title: 'Sahte yorum',
        body: 'Gerçek bir deneyime dayanmayan yorumlar: işletme sahibinin, çalışanların ya da para karşılığı tutulan kişilerin yazdığı yorumlar.',
      },
      {
        title: 'Yorum karşılığı teşvik',
        body: 'Yorum yazdırmak, yorumu değiştirtmek ya da kaldırtmak için indirim, hediye, ikram veya ödeme sunmak.',
      },
      {
        title: 'Seçici yorum isteme',
        body: 'Yalnızca memnun müşterilerden yorum istemek ya da olumsuz yorum yazılmasını caydırmak.',
      },
      {
        title: 'Çıkar çatışması',
        body: 'Kendi işletmenize kendiniz ya da yakınlarınız aracılığıyla yorum yazmak; rakip bir işletmeye olumsuz yorum yazmak ya da yazdırmak.',
      },
    ],
    rulesNote:
      'İşletmeler müşteri yorumlarını düzenleyemez veya silemez; kurallara aykırı bir yorumu yalnızca Google’a bildirebilir.',
    policyLink: 'Google Haritalar kullanıcı katkısı politikası',
    roleEyebrow: 'Buaze’nin rolü',
    roleTitle: 'Buaze ne yapar, ne yapmaz',
    does: {
      title: 'Buaze bunları yapar',
      items: [
        'QR koduyla her müşteriye puan verme imkânı sunar.',
        'Herkese açık yorum bağlantısını her puanda gösterir; belirlediğiniz eşik ve üzerindeki puanlarda yorum sayfasını kendiliğinden açar.',
        'Özel geri bildirimleri panelinizde toplar; 1–3 yıldızlık her geri bildirimde size e-posta gönderir.',
        'Pulse AI ile yanıt taslağı hazırlar; siz onaylamadan hiçbir yanıt gönderilmez.',
      ],
    },
    doesNot: {
      title: 'Buaze bunları yapmaz',
      items: [
        'Yorum silmez, gizlemez veya değiştirmez.',
        'Sahte yorum yazmaz ya da yazdırmaz.',
        'Yorum karşılığında indirim, hediye veya ödül sunmaz.',
        'Müşteri adına herkese açık platformlara yorum göndermez.',
        'Müşteriden yorumunu değiştirmesini ya da silmesini isteyen yanıtları göndermez; bu ifadeleri içeren yanıtlar engellenir.',
      ],
    },
    flowEyebrow: 'Müşteri akışı',
    flowTitle: 'Akış adım adım',
    flowLead: 'Müşterinin QR kodu okuttuğu andan geri bildiriminin panelinize düştüğü ana kadar olanlar.',
    flow: [
      {
        title: 'QR kodu okutur',
        body: 'Müşteri masadaki, adisyondaki ya da kapıdaki QR kodu telefonuyla okutur; uygulama indirmez, hesap açmaz.',
      },
      {
        title: 'Puan verir',
        body: 'Açılan ilk ekran puan ekranıdır. Müşteri 1 ile 5 yıldız arasında puan verir.',
      },
      {
        title: 'Eşik ve üzerinde yorum sayfası açılır',
        body: 'Puan, belirlediğiniz eşik ve üzerindeyse (varsayılan 5 yıldız, isterseniz 4 yıldız) seçtiğiniz platformun yorum sayfası açılır. Müşteri yorumunu orada, kendi hesabıyla yazar.',
      },
      {
        title: 'Eşiğin altında özel form ve herkese açık bağlantı',
        body: 'Puan eşiğin altındaysa müşteri önce size özel geri bildirim yazabilir. Formun altında, aynı ekranda “Google üzerinde yorum yaz” gibi bir bağlantı görünür; müşteri isterse oradan herkese açık yorum yazar.',
      },
      {
        title: 'Geri bildirim panelinize düşer',
        body: 'Özel geri bildirim panelinize düşer ve 1–3 yıldızlık her geri bildirimde size e-posta gelir. Müşteri e-posta adresini bıraktıysa yanıtınızı e-postayla gönderirsiniz.',
      },
    ],
    dutiesEyebrow: 'Sizin payınız',
    dutiesTitle: 'İşletme olarak dikkat etmeniz gerekenler',
    dutiesLead:
      'Buaze bir araçtır. Google’ın kurallarına uymak ve Google İşletme Profilinizi yönetmek işletmenin sorumluluğundadır.',
    duties: [
      'QR kodu tüm müşterilerinize gösterin; yalnızca memnun görünen müşterilere vermeyin.',
      'Yorum karşılığında indirim, ikram ya da hediye vermeyin. Anketlerde gösterebileceğiniz teşekkür kuponu yalnızca anketi tamamlayana verilir ve herkese açık bir yoruma bağlanmamalıdır.',
      'Çalışanlarınıza, ailenize ya da tanıdıklarınıza yorum yazdırmayın.',
      'Müşteriden yorumunu değiştirmesini ya da silmesini istemeyin.',
      'Kişisel verileri KVKK’ya uygun işleyin. Buaze formlarında aydınlatma metni ve açık rıza onayı bulunur; pazarlama izni ayrıdır ve varsayılan olarak kapalıdır.',
    ],
    faqEyebrow: 'Sık sorulan sorular',
    faqTitle: 'Google kuralları ve Buaze hakkında',
    faqs: [
      {
        q: 'Buaze yorumları siliyor veya gizliyor mu?',
        a: 'Hayır. Buaze herkese açık platformlardaki yorumları silemez, gizleyemez ya da değiştiremez. Müşteri yorumunu doğrudan Google’da ya da seçtiğiniz platformda, kendi hesabıyla yazar.',
      },
      {
        q: 'Eşiğin altında puan veren müşteri Google’a yorum yazabilir mi?',
        a: 'Evet. Müşteri önce size özel geri bildirim yazabilir; aynı ekranda seçtiğiniz platformun yorum bağlantısı görünür ve müşteri istediği yere yorum yazabilir.',
      },
      {
        q: 'Eşik neyi değiştirir?',
        a: 'Eşik yalnızca yorum sayfasının hangi puanda kendiliğinden açılacağını belirler. Panelde 4 ya da 5 yıldız seçebilirsiniz; varsayılan 5 yıldızdır. Herkese açık yorum bağlantısı her puanda gösterilir.',
      },
      {
        q: 'Buaze yorum karşılığında kupon veya indirim sunuyor mu?',
        a: 'Hayır. Buaze’de yoruma bağlı bir ödül özelliği yoktur. Anketlerde isteğe bağlı bir teşekkür kuponu gösterebilirsiniz; bu kupon yalnızca anketi tamamlayana gösterilir ve herkese açık bir yoruma bağlanmamalıdır.',
      },
      {
        q: 'Pulse AI müşteri yorumlarını değiştiriyor mu?',
        a: 'Hayır. Pulse AI yalnızca sizin yanıtınız için taslak hazırlar; taslağı siz düzenler ve onaylarsınız, onayınız olmadan hiçbir yanıt gönderilmez. Taslak hazırlanırken ' + DATA_COPY.aiSent.tr + '.',
      },
      {
        q: 'Buaze, Google’ın iş ortağı mı?',
        a: 'Hayır. Buaze bağımsız bir yazılımdır; Google’ın iş ortağı değildir ve Google tarafından onaylanmamıştır. Google adı yalnızca hizmeti tanımlamak için kullanılır.',
      },
      {
        q: 'Formu dolduran müşterinin verileri nasıl işleniyor?',
        a: 'Formlarda KVKK aydınlatma metni ve açık rıza onayı bulunur; pazarlama izni ayrıdır ve varsayılan olarak kapalıdır. IP adresleri 90 gün sonra anonimleştirilir. ' + DATA_COPY.hosting.tr,
      },
    ],
    cta: {
      title: 'Akışı kendi işletmenizde deneyin',
      facts: ['14 gün ücretsiz', 'Kredi kartı gerekmez', 'İstediğiniz zaman iptal'],
      primary: 'Ücretsiz deneyin',
      secondary: 'Nasıl çalıştığını görün',
    },
    breadcrumbHome: 'Ana sayfa',
    breadcrumbSelf: 'Google yorum kuralları',
  },
  en: {
    eyebrow: 'Transparency',
    title: 'Google review rules and the Buaze flow',
    lead:
      'On one page: Google’s rules on business reviews, the steps a customer goes through in Buaze, and what you need to watch out for as a business.',
    heroPrimary: 'See the flow step by step',
    heroSecondary: 'Frequently asked questions',
    rulesEyebrow: 'Google’s rules',
    rulesTitle: 'What Google does not allow in reviews',
    rulesLead:
      'This summary covers the points of the Google Maps user-contributed content policy that matter most to businesses. It is not legal advice; see Google’s policy page for the current text.',
    rules: [
      {
        title: 'Fake reviews',
        body: 'Reviews that are not based on a real experience: reviews written by the owner, by staff or by people paid to write them.',
      },
      {
        title: 'Incentives for reviews',
        body: 'Offering discounts, gifts, free items or payment to get a review written, changed or removed.',
      },
      {
        title: 'Selective review requests',
        body: 'Asking only happy customers for reviews, or discouraging people from writing negative ones.',
      },
      {
        title: 'Conflicts of interest',
        body: 'Reviewing your own business yourself or through people close to you; writing, or arranging, negative reviews of a competitor.',
      },
    ],
    rulesNote: 'Businesses cannot edit or delete customer reviews; they can only report a review that breaks the rules to Google.',
    policyLink: 'Google Maps user-contributed content policy',
    roleEyebrow: 'Buaze’s role',
    roleTitle: 'What Buaze does, and what it does not',
    does: {
      title: 'What Buaze does',
      items: [
        'Gives every customer a way to leave a rating through a QR code.',
        'Shows the public review link at every rating, and opens the review page on its own at or above the threshold you set.',
        'Collects private feedback in your panel and e-mails you about every 1–3 star piece of feedback.',
        'Drafts replies with Pulse AI; nothing is sent until you approve it.',
      ],
    },
    doesNot: {
      title: 'What Buaze does not do',
      items: [
        'Does not delete, hide or change reviews.',
        'Does not write fake reviews or have them written.',
        'Offers no discount, gift or reward for a review.',
        'Does not post reviews to public platforms on a customer’s behalf.',
        'Does not send replies that ask a customer to change or delete their review; replies with such wording are blocked.',
      ],
    },
    flowEyebrow: 'Customer flow',
    flowTitle: 'The flow, step by step',
    flowLead: 'What happens from the moment a customer scans the QR code until their feedback reaches your panel.',
    flow: [
      {
        title: 'Scans the QR code',
        body: 'The customer scans the QR code on the table, bill or door with their phone; no app download, no account.',
      },
      {
        title: 'Gives a rating',
        body: 'The first screen is the rating screen. The customer gives between 1 and 5 stars.',
      },
      {
        title: 'At or above the threshold, the review page opens',
        body: 'If the rating is at or above the threshold you set (5 stars by default, or 4 if you prefer), your chosen platform’s review page opens. The customer writes the review there, with their own account.',
      },
      {
        title: 'Below the threshold, a private form and the public link',
        body: 'If the rating is below the threshold, the customer can first send you private feedback. Under the form, on the same screen, a link such as “Write a review on Google” is shown; the customer can post a public review from there if they wish.',
      },
      {
        title: 'The feedback reaches your panel',
        body: 'Private feedback lands in your panel, and every 1–3 star piece of feedback triggers an e-mail to you. If the customer left an e-mail address, you reply by e-mail.',
      },
    ],
    dutiesEyebrow: 'Your part',
    dutiesTitle: 'What to watch out for as a business',
    dutiesLead:
      'Buaze is a tool. Following Google’s rules and managing your Google Business Profile is the business’s responsibility.',
    duties: [
      'Show the QR code to all your customers; do not hand it only to customers who seem happy.',
      'Do not give discounts, free items or gifts for reviews. A thank-you coupon you show in a survey goes to people who complete the survey and must not be tied to a public review.',
      'Do not have staff, family or friends write reviews.',
      'Do not ask customers to change or delete their review.',
      'Process personal data in line with KVKK. Buaze forms show a notice and an explicit consent box; marketing consent is separate and off by default.',
    ],
    faqEyebrow: 'Frequently asked questions',
    faqTitle: 'About Google’s rules and Buaze',
    faqs: [
      {
        q: 'Does Buaze delete or hide reviews?',
        a: 'No. Buaze cannot delete, hide or change reviews on public platforms. Customers write their reviews directly on Google or the platform you chose, with their own account.',
      },
      {
        q: 'Can a customer who rates below the threshold post on Google?',
        a: 'Yes. The customer can first send you private feedback; the review link for your chosen platform is shown on the same screen, and the customer can post a review wherever they like.',
      },
      {
        q: 'What does the threshold change?',
        a: 'The threshold only sets the rating at which the review page opens on its own. You choose 4 or 5 stars in the panel; the default is 5 stars. The public review link is shown at every rating.',
      },
      {
        q: 'Does Buaze offer coupons or discounts for reviews?',
        a: 'No. Buaze has no reward feature tied to reviews. You can show an optional thank-you coupon in a survey; it is shown only to people who complete the survey and must not be tied to a public review.',
      },
      {
        q: 'Does Pulse AI change customer reviews?',
        a: 'No. Pulse AI only drafts your reply; you edit and approve the draft, and no reply is sent without your approval. To prepare the draft, ' + DATA_COPY.aiSent.en + '.',
      },
      {
        q: 'Is Buaze a Google partner?',
        a: 'No. Buaze is independent software; it is not a Google partner and is not endorsed by Google. The Google name is used only to describe the service.',
      },
      {
        q: 'How is customer data processed?',
        a: 'Forms show a KVKK notice and an explicit consent box; marketing consent is separate and off by default. IP addresses are anonymised after 90 days. ' + DATA_COPY.hosting.en,
      },
    ],
    cta: {
      title: 'Try the flow in your own business',
      facts: ['14 days free', 'No credit card required', 'Cancel anytime'],
      primary: 'Start free trial',
      secondary: 'See how it works',
    },
    breadcrumbHome: 'Home',
    breadcrumbSelf: 'Google review rules',
  },
} as const;

export default async function GoogleCompliancePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: 'tr' | 'en' = rawLocale === 'en' ? 'en' : 'tr';
  const base = `/${locale}`;
  const copy = COPY[locale];
  const pageUrl = `${SITE_URL}/${locale}/google-compliance`;
  const faqs: FaqEntry[] = [...copy.faqs];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
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
              <a href="#akis" className={BTN_DARK}>
                {copy.heroPrimary}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
              <a href="#sss" className={BTN_OUTLINE}>
                {copy.heroSecondary}
              </a>
            </>
          }
        />

        <section aria-labelledby="gc-rules-title" className={`bg-[#FAFAFA] ${SECTION_Y}`}>
          <div className={CONTAINER}>
            <SectionHeader id="gc-rules-title" eyebrow={copy.rulesEyebrow} title={copy.rulesTitle} lead={copy.rulesLead} />
            <ul className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6">
              {copy.rules.map((rule) => (
                <li key={rule.title} className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8">
                  <h3 className="text-[22px] leading-[1.2] text-[#0A0A0A]">{rule.title}</h3>
                  <p className="mt-3 text-[15px] leading-[1.65] text-[#525252]">{rule.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-8 max-w-[720px] text-[15px] leading-[1.65] text-[#525252]">{copy.rulesNote}</p>
            <p className="mt-4 text-[15px]">
              <a
                href={POLICY_URL[locale]}
                target="_blank"
                rel="noopener noreferrer"
                className={`${TEXT_LINK} inline-flex items-center gap-1.5`}
              >
                {copy.policyLink}
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </p>
          </div>
        </section>

        <section aria-labelledby="gc-role-title" className={SECTION_Y}>
          <div className={CONTAINER}>
            <SectionHeader id="gc-role-title" eyebrow={copy.roleEyebrow} title={copy.roleTitle} />
            <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 sm:gap-6 md:grid-cols-2">
              {[
                { group: copy.does, positive: true },
                { group: copy.doesNot, positive: false },
              ].map(({ group, positive }) => (
                <div
                  key={group.title}
                  className={`rounded-[20px] border p-6 sm:p-8 ${
                    positive ? 'border-[#C6F24E] bg-[#EAF9B8]/50' : 'border-[#EDEDED] bg-white'
                  }`}
                >
                  <h3 className="text-[22px] leading-[1.2] text-[#0A0A0A]">{group.title}</h3>
                  <ul className="mt-5 space-y-3">
                    {group.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[15px] leading-[1.55] text-[#1A1A1A]">
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            positive ? 'bg-[#C6F24E]' : 'bg-[#F2F2F2]'
                          }`}
                        >
                          {positive ? (
                            <Check size={12} strokeWidth={2.75} className="text-[#0A0A0A]" />
                          ) : (
                            <X size={12} strokeWidth={2.75} className="text-[#525252]" />
                          )}
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="akis" aria-labelledby="gc-flow-title" className={`scroll-mt-20 bg-[#FAFAFA] ${SECTION_Y}`}>
          <div className={CONTAINER}>
            <SectionHeader id="gc-flow-title" eyebrow={copy.flowEyebrow} title={copy.flowTitle} lead={copy.flowLead} />
            <ol className="mt-10 space-y-4 sm:mt-12">
              {copy.flow.map((step, i) => (
                <li
                  key={step.title}
                  id={`step-${i + 1}`}
                  className="flex scroll-mt-24 gap-4 rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:gap-6 sm:p-8"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] font-mono text-[14px] font-semibold text-[#C6F24E]"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-[20px] leading-[1.25] text-[#0A0A0A] sm:text-[22px]">{step.title}</h3>
                    <p className="mt-2 max-w-[760px] text-[15px] leading-[1.65] text-[#525252]">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="gc-duties-title" className={SECTION_Y}>
          <div className={`${CONTAINER} lg:grid lg:grid-cols-[1fr_1.2fr] lg:gap-16`}>
            <SectionHeader id="gc-duties-title" eyebrow={copy.dutiesEyebrow} title={copy.dutiesTitle} lead={copy.dutiesLead} />
            <ul className="mt-8 space-y-4 lg:mt-12">
              {copy.duties.map((duty) => (
                <li key={duty} className="flex items-start gap-3 text-[16px] leading-[1.6] text-[#1A1A1A]">
                  <span
                    aria-hidden="true"
                    className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EAF9B8]"
                  >
                    <Check size={12} strokeWidth={2.75} className="text-[#0A0A0A]" />
                  </span>
                  {duty}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="sss" aria-labelledby="gc-faq-title" className={`scroll-mt-20 border-t border-[#EDEDED] ${SECTION_Y}`}>
          <div className={CONTAINER_NARROW}>
            <SectionHeader id="gc-faq-title" eyebrow={copy.faqEyebrow} title={copy.faqTitle} />
            <div className="mt-10">
              <FaqList items={faqs} idPrefix="gc-faq" />
            </div>
          </div>
        </section>

        <CtaBand
          id="gc-cta-title"
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
