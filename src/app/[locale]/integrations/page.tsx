import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarCheck, Globe } from 'lucide-react';
import { jsonLdString } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/site';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PlatformLogo from '@/components/marketing/PlatformLogo';
import PlatformOrbitStage from '@/components/marketing/three/PlatformOrbitStage';
import PageHero from '@/components/marketing/commercial/PageHero';
import SectionHeader from '@/components/marketing/commercial/SectionHeader';
import FaqList, { type FaqEntry } from '@/components/marketing/commercial/FaqList';
import CtaBand from '@/components/marketing/commercial/CtaBand';
import {
  REVIEW_PLATFORMS,
  REVIEW_PLATFORM_COUNT,
  type ReviewPlatformGroup,
} from '@/components/marketing/commercial/review-platforms';
import {
  BTN_DARK,
  BTN_OUTLINE,
  CONTAINER,
  CONTAINER_NARROW,
  SECTION_Y,
} from '@/components/marketing/commercial/styles';
import type { Locale } from '@/lib/translations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx`.

const META = {
  tr: {
    title: 'Platform bağlantıları: 10 yorum platformu',
    description:
      'Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking.com, Airbnb, Yandex, Yelp ve Foursquare bağlantılarınız tek panelde; her gün kontrol edilir.',
  },
  en: {
    title: 'Platform links for 10 review platforms',
    description:
      'Keep your review links for Google, Yemeksepeti, Getir, Trendyol GO, Tripadvisor, Booking.com, Airbnb, Yandex, Yelp and Foursquare in one panel, checked daily.',
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
      canonical: `/${lang}/integrations`,
      languages: { tr: '/tr/integrations', en: '/en/integrations', 'x-default': '/tr/integrations' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${lang}/integrations`,
      title,
      description,
      images: [{ url: `/images/open-graph-${lang}.png`, width: 1200, height: 630, alt: title }],
    },
  };
}

const PLATFORM_NOTES: Record<'tr' | 'en', Record<string, string>> = {
  tr: {
    google: 'Google İşletme Profili yorum bağlantısı. Profilinizi adıyla arayıp seçersiniz.',
    yandex: 'Yandex Haritalar’daki işletme sayfanız.',
    foursquare: 'Foursquare’deki mekân sayfanız.',
    yemeksepeti: 'Yemeksepeti’ndeki restoran sayfanız.',
    getir: 'Getir Yemek’teki restoran sayfanız.',
    trendyol_go: 'Trendyol GO’daki restoran sayfanız.',
    tripadvisor: 'Restoran, otel ya da mekân sayfanız.',
    booking: 'Booking.com’daki tesis sayfanız.',
    airbnb: 'Airbnb’deki ilan sayfanız.',
    yelp: 'Yelp’teki işletme sayfanız.',
  },
  en: {
    google: 'Your Google Business Profile review link. You search for your profile by name and pick it.',
    yandex: 'Your business page on Yandex Maps.',
    foursquare: 'Your venue page on Foursquare.',
    yemeksepeti: 'Your restaurant page on Yemeksepeti.',
    getir: 'Your restaurant page on Getir Yemek.',
    trendyol_go: 'Your restaurant page on Trendyol GO.',
    tripadvisor: 'Your restaurant, hotel or venue page.',
    booking: 'Your property page on Booking.com.',
    airbnb: 'Your listing page on Airbnb.',
    yelp: 'Your business page on Yelp.',
  },
};

const GROUPS: Record<'tr' | 'en', { key: ReviewPlatformGroup; title: string; body: string }[]> = {
  tr: [
    { key: 'search', title: 'Arama ve harita', body: 'Müşterinin işletmenizi aradığı ve haritada bulduğu yerler.' },
    { key: 'delivery', title: 'Paket servis', body: 'Siparişi uygulamadan veren müşterilerin yorum yazdığı yerler.' },
    { key: 'travel', title: 'Seyahat ve konaklama', body: 'Misafirlerin konaklama ve gezi sonrası yorum yazdığı yerler.' },
    { key: 'international', title: 'Uluslararası', body: 'Yurt dışından gelen müşterilerin kullandığı yerler.' },
  ],
  en: [
    { key: 'search', title: 'Search and maps', body: 'Where customers search for your business and find it on a map.' },
    { key: 'delivery', title: 'Food delivery', body: 'Where customers who order through an app leave reviews.' },
    { key: 'travel', title: 'Travel and stays', body: 'Where guests review a stay or a trip.' },
    { key: 'international', title: 'International', body: 'Where visitors from abroad look for reviews.' },
  ],
};

const COPY = {
  tr: {
    eyebrow: 'Platform bağlantıları',
    title: 'Yorum platformu bağlantıları',
    lead:
      'Google, Yemeksepeti, Booking.com ve diğer platformlardaki yorum sayfalarınızın bağlantılarını tek panelde tutun. QR akışı müşteriyi seçtiğiniz platformun yorum sayfasına ulaştırır; bağlantılar her gün otomatik kontrol edilir.',
    heroPrimary: 'Ücretsiz deneyin',
    heroSecondary: 'Nasıl çalışır',
    platformsEyebrow: 'Desteklenen platformlar',
    platformsTitle: `${REVIEW_PLATFORM_COUNT} yorum platformu, dört grupta`,
    platformsLead:
      'Buaze bu platformlardaki yorum sayfanızın bağlantısını tutar. Yorumlar platformun kendisinde yazılır ve orada kalır.',
    modelEyebrow: 'Bağlantı modeli',
    modelTitle: 'Bağlantılar nasıl çalışır',
    modelLead: 'Buaze platformlara bağlanıp veri çekmez; doğru yorum sayfasının adresini tutar ve sağlığını izler.',
    model: [
      {
        title: 'Kaydederken kontrol',
        body: 'Bağlantıyı kaydettiğinizde adresin doğru platforma ait olduğu ve bir yorum sayfasına benzediği kontrol edilir. Ana sayfa gibi bir adres girerseniz uyarı görürsünüz.',
      },
      {
        title: 'Her QR koda bir platform',
        body: 'Varsayılan platformunuzu seçersiniz; isterseniz her QR kodu ayrı bir platforma bağlarsınız. Eşiğinizin üzerinde puan veren müşteri için bu platformun yorum sayfası açılır.',
      },
      {
        title: 'Her gün otomatik kontrol',
        body: 'Bağlantılar her gün otomatik test edilir. Son 24 saatte açılmayan bir bağlantı müşteri akışında atlanır ve sıradaki uygun platform kullanılır. Panelden istediğiniz an tek tek ya da hepsini test edebilirsiniz.',
      },
      {
        title: 'Yorumlar platformda kalır',
        body: 'Buaze diğer platformlardaki yorumları içeri aktarmaz. Google için profil puanınızı, yorum sayınızı ve Google’ın gösterdiği en fazla 5 yorumu panelde görürsünüz; bunun için Google hesabıyla giriş gerekmez.',
      },
    ],
    socialEyebrow: 'Sosyal ve iletişim',
    socialTitle: 'Sosyal medya ve iletişim bağlantıları',
    socialLead: 'Yorum platformlarının yanında sosyal medya, web sitesi ve rezervasyon bağlantılarınızı da işletme ayarlarınızda tutarsınız.',
    social: [
      { key: 'instagram', title: 'Instagram', body: 'Profil bağlantınız.' },
      { key: 'facebook', title: 'Facebook', body: 'Sayfa bağlantınız.' },
      {
        key: 'whatsapp',
        title: 'WhatsApp',
        body: 'İsterseniz eşiğin altında puan veren müşteri, teşekkür ekranından size WhatsApp’tan yazabilir.',
      },
      { key: 'web', title: 'Web sitesi ve rezervasyon', body: 'Web sitenizin ve rezervasyon sayfanızın adresi.' },
    ],
    socialNote:
      'Birden çok işletmeniz varsa Instagram, Facebook ve WhatsApp bağlantısını diğer işletmelerinize tek seferde uygulayabilirsiniz.',
    faqEyebrow: 'Sık sorulan sorular',
    faqTitle: 'Platform bağlantıları hakkında',
    faqs: [
      {
        q: 'Buaze yorumları platformlardan çekiyor mu?',
        a: 'Hayır. Buaze diğer platformlardaki yorumları içeri aktarmaz ve onlara yanıt vermez; yalnızca yorum sayfanızın bağlantısını tutar. Google için profil puanınızı, yorum sayınızı ve Google’ın gösterdiği en fazla 5 yorumu panelde görebilirsiniz.',
      },
      {
        q: 'Google yorumlarına panelden yanıt verebilir miyim?',
        a: 'Bu özellik Google’ın erişim onayına bağlıdır ve şu an genel kullanımda değildir. Google yorumlarına Google İşletme Profili üzerinden yanıt vermeye devam edersiniz.',
      },
      {
        q: 'Hangi platformları eklemeliyim?',
        a: 'Müşterilerinizin gerçekten kullandığı platformları ekleyin. Panel sektörünüze uygun platformları listeler; örneğin restoranlarda Google, Yemeksepeti ve Getir, otellerde Google, Booking.com ve Tripadvisor öne çıkar.',
      },
      {
        q: 'Bir bağlantı bozulursa ne olur?',
        a: 'Bağlantılar her gün otomatik test edilir. Son 24 saatte açılmayan bir bağlantı müşteri akışında atlanır ve sıradaki uygun platform kullanılır. Panelde bağlantının durumunu görür, düzelttikten sonra yeniden test edersiniz.',
      },
      {
        q: 'Listede olmayan bir platformu kullanıyorum, ne yapmalıyım?',
        a: 'Bağlantısını “Diğer” alanına kaydedebilirsiniz; ancak bu bağlantı QR akışında kullanılmaz. Hangi platforma ihtiyacınız olduğunu bize yazın.',
      },
    ],
    cta: {
      title: 'Yorum bağlantılarınızı tek panelde toplayın',
      facts: ['14 gün ücretsiz', 'Kredi kartı gerekmez', 'İstediğiniz zaman iptal'],
      primary: 'Ücretsiz deneyin',
      secondary: 'Planları görün',
    },
    itemListName: 'Buaze’nin desteklediği yorum platformları',
    breadcrumbHome: 'Ana sayfa',
    breadcrumbSelf: 'Platform bağlantıları',
  },
  en: {
    eyebrow: 'Platform links',
    title: 'Review platform links',
    lead:
      'Keep the links to your review pages on Google, Yemeksepeti, Booking.com and other platforms in one panel. The QR flow takes customers to your chosen platform’s review page, and every link is checked automatically each day.',
    heroPrimary: 'Start free trial',
    heroSecondary: 'How it works',
    platformsEyebrow: 'Supported platforms',
    platformsTitle: `${REVIEW_PLATFORM_COUNT} review platforms in four groups`,
    platformsLead:
      'Buaze keeps the link to your review page on these platforms. Reviews are written on the platform itself and stay there.',
    modelEyebrow: 'How links work',
    modelTitle: 'How platform links work',
    modelLead: 'Buaze does not connect to these platforms or pull data from them; it keeps the address of the right review page and watches its health.',
    model: [
      {
        title: 'Checked when you save',
        body: 'When you save a link, Buaze checks that the address belongs to the right platform and looks like a review page. If you enter something like a home page, you see a warning.',
      },
      {
        title: 'One platform per QR code',
        body: 'You choose a default platform and, if you like, tie each QR code to a different one. For a customer who rates at or above your threshold, that platform’s review page opens.',
      },
      {
        title: 'Checked every day',
        body: 'Links are tested automatically every day. A link that failed in the last 24 hours is skipped in the customer flow and the next suitable platform is used. You can also test one link or all of them from the panel at any time.',
      },
      {
        title: 'Reviews stay on the platform',
        body: 'Buaze does not import reviews from other platforms. For Google, the panel shows your profile rating, review count and up to 5 reviews that Google returns; no Google sign-in is needed.',
      },
    ],
    socialEyebrow: 'Social and contact',
    socialTitle: 'Social media and contact links',
    socialLead: 'Next to your review platforms, you keep your social media, website and booking links in your business settings.',
    social: [
      { key: 'instagram', title: 'Instagram', body: 'Your profile link.' },
      { key: 'facebook', title: 'Facebook', body: 'Your page link.' },
      {
        key: 'whatsapp',
        title: 'WhatsApp',
        body: 'If you switch it on, a customer who rates below your threshold can message you on WhatsApp from the thank-you screen.',
      },
      { key: 'web', title: 'Website and booking', body: 'The address of your website and your booking page.' },
    ],
    socialNote:
      'If you run several businesses, you can apply an Instagram, Facebook or WhatsApp link to your other businesses in one go.',
    faqEyebrow: 'Frequently asked questions',
    faqTitle: 'About platform links',
    faqs: [
      {
        q: 'Does Buaze pull reviews from these platforms?',
        a: 'No. Buaze does not import or reply to reviews on other platforms; it only keeps the link to your review page. For Google, the panel shows your profile rating, review count and up to 5 reviews that Google returns.',
      },
      {
        q: 'Can I reply to Google reviews from the panel?',
        a: 'This depends on access approval from Google and is not generally available yet. You keep replying to Google reviews in your Google Business Profile.',
      },
      {
        q: 'Which platforms should I add?',
        a: 'Add the platforms your customers actually use. The panel lists the platforms that suit your sector; for example, Google, Yemeksepeti and Getir come first for restaurants, and Google, Booking.com and Tripadvisor for hotels.',
      },
      {
        q: 'What happens if a link breaks?',
        a: 'Links are tested automatically every day. A link that failed in the last 24 hours is skipped in the customer flow and the next suitable platform is used. The panel shows the link’s status, and you test it again after fixing it.',
      },
      {
        q: 'I use a platform that is not on the list. What can I do?',
        a: 'You can save its link in the “Other” field, but that link is not used in the QR flow. Tell us which platform you need.',
      },
    ],
    cta: {
      title: 'Keep your review links in one panel',
      facts: ['14 days free', 'No credit card required', 'Cancel anytime'],
      primary: 'Start free trial',
      secondary: 'See plans',
    },
    itemListName: 'Review platforms supported by Buaze',
    breadcrumbHome: 'Home',
    breadcrumbSelf: 'Platform links',
  },
} as const;

export default async function IntegrationsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: 'tr' | 'en' = rawLocale === 'en' ? 'en' : 'tr';
  const base = `/${locale}`;
  const copy = COPY[locale];
  const notes = PLATFORM_NOTES[locale];
  const pageUrl = `${SITE_URL}/${locale}/integrations`;
  const faqs: FaqEntry[] = [...copy.faqs];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#platforms`,
        name: copy.itemListName,
        numberOfItems: REVIEW_PLATFORM_COUNT,
        itemListElement: REVIEW_PLATFORMS.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: p.name,
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
          eyebrow={copy.eyebrow}
          title={copy.title}
          lead={copy.lead}
          actions={
            <>
              <Link href={`${base}/auth/register`} rel="nofollow" className={BTN_DARK}>
                {copy.heroPrimary}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href={`${base}/how-it-works`} className={BTN_OUTLINE}>
                {copy.heroSecondary}
              </Link>
            </>
          }
          aside={
            <div className="hidden lg:block">
              <PlatformOrbitStage
                locale={locale}
                theme="light"
                media="(min-width: 1024px) and (pointer: fine)"
                afterLoad
                className="mx-auto max-w-[480px]"
                id="bz-integrations-orbit"
              />
            </div>
          }
        />

        <section aria-labelledby="int-platforms-title" className={`bg-[#FAFAFA] ${SECTION_Y}`}>
          <div className={CONTAINER}>
            <SectionHeader
              id="int-platforms-title"
              eyebrow={copy.platformsEyebrow}
              title={copy.platformsTitle}
              lead={copy.platformsLead}
            />
            <div className="mt-10 space-y-10 sm:mt-12 sm:space-y-12">
              {GROUPS[locale].map((group) => {
                const items = REVIEW_PLATFORMS.filter((p) => p.group === group.key);
                return (
                  <div
                    key={group.key}
                    className="grid grid-cols-1 gap-5 border-t border-[#E5E5E5] pt-8 lg:grid-cols-[260px_1fr] lg:gap-10"
                  >
                    <div>
                      <h3 className="text-[22px] leading-[1.2] text-[#0A0A0A]">{group.title}</h3>
                      <p className="mt-2 text-[15px] leading-[1.55] text-[#525252]">{group.body}</p>
                    </div>
                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map((p) => (
                        <li
                          key={p.key}
                          className="flex items-start gap-4 rounded-[20px] border border-[#EDEDED] bg-white p-5"
                        >
                          <PlatformLogo id={p.logo} size={40} rounded={10} className="shrink-0" />
                          <div className="min-w-0">
                            <p className="bz-h-tight text-[17px] text-[#0A0A0A]">{p.name}</p>
                            <p className="mt-1 text-[14px] leading-[1.5] text-[#525252]">{notes[p.key]}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section aria-labelledby="int-model-title" className={SECTION_Y}>
          <div className={CONTAINER}>
            <SectionHeader
              id="int-model-title"
              eyebrow={copy.modelEyebrow}
              title={copy.modelTitle}
              lead={copy.modelLead}
            />
            <ol className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6">
              {copy.model.map((item, i) => (
                <li key={item.title} className="rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A0A0A] font-mono text-[14px] font-semibold text-[#C6F24E]"
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-[22px] leading-[1.2] text-[#0A0A0A]">{item.title}</h3>
                  <p className="mt-2 text-[15px] leading-[1.65] text-[#525252]">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="int-social-title" className={`bg-[#FAFAFA] ${SECTION_Y}`}>
          <div className={CONTAINER}>
            <SectionHeader
              id="int-social-title"
              eyebrow={copy.socialEyebrow}
              title={copy.socialTitle}
              lead={copy.socialLead}
            />
            <ul className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
              {copy.social.map((item) => (
                <li key={item.key} className="rounded-[20px] border border-[#EDEDED] bg-white p-6">
                  {item.key === 'web' ? (
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 items-center justify-center gap-0.5 rounded-[10px] bg-[#EAF9B8] text-[#0A0A0A]"
                    >
                      <Globe size={16} strokeWidth={1.8} />
                      <CalendarCheck size={14} strokeWidth={1.8} />
                    </span>
                  ) : (
                    <PlatformLogo id={item.key} size={40} rounded={10} />
                  )}
                  <h3 className="mt-4 text-[19px] leading-[1.25] text-[#0A0A0A]">{item.title}</h3>
                  <p className="mt-2 text-[15px] leading-[1.6] text-[#525252]">{item.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-8 max-w-[720px] text-[15px] leading-[1.6] text-[#525252]">{copy.socialNote}</p>
          </div>
        </section>

        <section aria-labelledby="int-faq-title" className={SECTION_Y}>
          <div className={CONTAINER_NARROW}>
            <SectionHeader id="int-faq-title" eyebrow={copy.faqEyebrow} title={copy.faqTitle} />
            <div className="mt-10">
              <FaqList items={faqs} idPrefix="int-faq" />
            </div>
          </div>
        </section>

        <CtaBand
          id="int-cta-title"
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
