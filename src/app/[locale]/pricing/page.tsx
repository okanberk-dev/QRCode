import type { Metadata } from 'next';
import PaymentResultNotice from '@/components/marketing/PaymentResultNotice';
import Link from 'next/link';
import { BarChart3, Bell, Check, Link2, QrCode, Sparkles, Users } from 'lucide-react';
import { jsonLdString } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/site';
import { SUPPORT_EMAIL, SUPPORT_HOURS } from '@/lib/company-constants';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import PricingPlans from '@/components/marketing/PricingPlans';
import PageHero from '@/components/marketing/commercial/PageHero';
import SectionHeader from '@/components/marketing/commercial/SectionHeader';
import FaqList, { type FaqEntry } from '@/components/marketing/commercial/FaqList';
import PlatformChips from '@/components/marketing/commercial/PlatformChips';
import CtaBand from '@/components/marketing/commercial/CtaBand';
import { REVIEW_PLATFORM_COUNT } from '@/components/marketing/commercial/review-platforms';
import {
  CONTAINER,
  CONTAINER_NARROW,
  SECTION_Y,
  TEXT_LINK,
} from '@/components/marketing/commercial/styles';
import { getActivePlans } from '@/lib/subscription-plans';
import type { Locale } from '@/lib/translations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx`; admin plan
// saves call revalidatePricing() so price edits show up immediately.

const META = {
  tr: {
    title: 'Fiyatlandırma: planlar ve 14 gün ücretsiz deneme',
    description:
      'Buaze planlarını ve Türk lirası fiyatlarını karşılaştırın. 14 gün ücretsiz deneyin; kredi kartı gerekmez, otomatik çekim yoktur.',
  },
  en: {
    title: 'Pricing: plans and a 14-day free trial',
    description:
      'Compare Buaze plans and their monthly prices. Try it free for 14 days with no credit card; there is no automatic charge.',
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
      canonical: `/${lang}/pricing`,
      languages: { tr: '/tr/pricing', en: '/en/pricing', 'x-default': '/tr/pricing' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${lang}/pricing`,
      title,
      description,
      images: [
        { url: `/images/open-graph-${lang}.png`, width: 1200, height: 630, alt: title },
      ],
    },
  };
}

function buildCopy(locale: 'tr' | 'en') {
  if (locale === 'tr') {
    return {
      eyebrow: 'Fiyatlandırma',
      title: 'Planlar ve fiyatlar',
      lead:
        'Planlar kapsadıkları işletme sayısı ve açtıkları modüllerle ayrılır. Fiyatlar Türk lirasıdır; yıllık ödemede iki ay ücretsizdir.',
      ticks: ['14 gün ücretsiz', 'Kredi kartı gerekmez', 'Otomatik çekim yok'],
      empty: {
        title: 'Planlar şu anda güncelleniyor',
        body: 'Güncel fiyatları kısa süre içinde burada göreceksiniz. Bu arada 14 günlük ücretsiz denemeyi başlatabilir ya da fiyatlar için bize yazabilirsiniz.',
        trial: '14 gün ücretsiz deneyin',
        contact: 'Bize yazın',
      },
      paymentNote:
        'Kartla ödemeden önce ücretsiz hesabınızı açın ve giriş yapın; ödeme PayNKolay’ın güvenli kart sayfasında, Türk lirası olarak alınır. Her ödeme bir ay ya da bir yıl açar; kartınızdan otomatik çekim yapılmaz, dönem bitmeden panelden uzatırsınız.',
      included: {
        eyebrow: 'Her planda',
        title: 'Her planda bulunanlar',
        lead: 'Hangi planı seçerseniz seçin, aşağıdaki özellikler hesabınızda açıktır.',
        items: [
          {
            icon: QrCode,
            title: 'QR geri bildirim akışı',
            body: 'İstediğiniz kadar QR kod oluşturun, masa veya oda etiketi ekleyin. Yorum sayfasının hangi puanda açılacağını siz seçersiniz: 4 ya da 5 yıldız.',
            href: '/how-it-works',
          },
          {
            icon: Link2,
            title: `${REVIEW_PLATFORM_COUNT} yorum platformu bağlantısı`,
            body: 'Google’dan Booking.com’a kadar yorum sayfalarınızın bağlantılarını tek panelde tutun; bağlantılar her gün otomatik kontrol edilir.',
            href: '/integrations',
          },
          {
            icon: Sparkles,
            title: 'Geri bildirim kutusu ve yanıt şablonları',
            body: 'Düşük puanlı geri bildirimleri tek kutuda görür, müşteriye e-postayla yanıt verirsiniz. Sık kullandığınız yanıtları şablon olarak kaydedersiniz.',
            href: '/features/review-management',
          },
          {
            icon: Bell,
            title: 'E-posta uyarısı ve haftalık özet',
            body: '1–3 yıldızlık her geri bildirimde size anında e-posta gelir. Her pazartesi haftalık özet e-postası gönderilir.',
            href: '/features/review-management',
          },
          {
            icon: BarChart3,
            title: 'Analitik ve CSV',
            body: '7, 30, 90 günlük ve 12 aylık raporlar; puanlardan tahmini NPS ve gün-saat dağılımı. Geri bildirimleri ve raporları CSV olarak indirebilirsiniz.',
            href: '/features/analytics-reports',
          },
          {
            icon: Users,
            title: 'Ekip ve işletmeler arası geçiş',
            body: 'Ekibinizi yönetici, personel ya da görüntüleyici rolüyle davet edin. Planınız birden çok işletmeyi kapsıyorsa aralarında tek tıkla geçin.',
            href: '/features',
          },
        ],
      },
      platforms: {
        eyebrow: 'Platform bağlantıları',
        title: `${REVIEW_PLATFORM_COUNT} yorum platformu`,
        lead: 'Müşterinizi bu platformlardaki yorum sayfanıza yönlendirebilirsiniz. Buaze yalnızca bağlantıyı yönetir; yorumlar platformun kendisinde yazılır.',
        more: 'Platform bağlantılarını inceleyin',
      },
      faq: {
        eyebrow: 'Sık sorulan sorular',
        title: 'Fiyatlandırma hakkında sorular',
        related: 'İlgili belgeler',
        refund: 'İade ve İptal Politikası',
        dpa: 'Veri İşleyici Sözleşmesi',
        privacy: 'Gizlilik Politikası',
        privacyHref: '/gizlilik',
      },
      cta: {
        title: 'Önce 14 gün ücretsiz deneyin',
        lead: 'Kredi kartı gerekmez. Sorunuz varsa bize yazın; genellikle bir iş günü içinde yanıt veriyoruz.',
        primary: 'Ücretsiz deneyin',
        secondary: 'Bize yazın',
      },
      breadcrumbHome: 'Ana sayfa',
      breadcrumbSelf: 'Fiyatlandırma',
    };
  }
  return {
    eyebrow: 'Pricing',
    title: 'Plans and pricing',
    lead: 'Plans differ by how many businesses they cover and which modules they switch on. Paying yearly gives you two months free.',
    ticks: ['14 days free', 'No credit card required', 'No automatic charge'],
    empty: {
      title: 'Plans are being updated',
      body: 'Current prices will be back here shortly. In the meantime you can start the 14-day free trial or ask us about pricing.',
      trial: 'Start 14-day free trial',
      contact: 'Contact us',
    },
    paymentNote:
      'Before you pay by card, create your free account and sign in; payment is taken in Turkish lira on PayNKolay’s secure card page. Each payment opens one month or one year; your card is never charged automatically, you extend from the panel before the period ends.',
    included: {
      eyebrow: 'In every plan',
      title: 'Included in every plan',
      lead: 'Whichever plan you choose, the following features are switched on in your account.',
      items: [
        {
          icon: QrCode,
          title: 'QR feedback flow',
          body: 'Create as many QR codes as you need and add a table or room label. You choose the rating at which the review page opens: 4 or 5 stars.',
          href: '/how-it-works',
        },
        {
          icon: Link2,
          title: `Links to ${REVIEW_PLATFORM_COUNT} review platforms`,
          body: 'Keep the links to your review pages, from Google to Booking.com, in one panel; every link is checked automatically each day.',
          href: '/integrations',
        },
        {
          icon: Sparkles,
          title: 'Feedback inbox and reply templates',
          body: 'See low-rated feedback in one inbox and reply to the customer by e-mail. Save the replies you use often as templates.',
          href: '/features/review-management',
        },
        {
          icon: Bell,
          title: 'E-mail alerts and a weekly summary',
          body: 'Every 1–3 star piece of feedback triggers an instant e-mail. A weekly summary e-mail arrives every Monday.',
          href: '/features/review-management',
        },
        {
          icon: BarChart3,
          title: 'Analytics and CSV',
          body: 'Reports for 7, 30 and 90 days and 12 months, an NPS estimate based on ratings and day-and-hour patterns. Export feedback and reports as CSV.',
          href: '/features/analytics-reports',
        },
        {
          icon: Users,
          title: 'Teams and switching businesses',
          body: 'Invite your team as managers, staff or viewers. If your plan covers several businesses, switch between them in one click.',
          href: '/features',
        },
      ],
    },
    platforms: {
      eyebrow: 'Platform links',
      title: `${REVIEW_PLATFORM_COUNT} review platforms`,
      lead: 'You can send customers to your review page on any of these platforms. Buaze only manages the link; reviews are written on the platform itself.',
      more: 'See platform links',
    },
    faq: {
      eyebrow: 'Frequently asked questions',
      title: 'Questions about pricing',
      related: 'Related documents',
      refund: 'Refund and Cancellation Policy',
      dpa: 'Data Processing Agreement',
      privacy: 'Privacy Policy',
      privacyHref: '/privacy',
    },
    cta: {
      title: 'Try it free for 14 days first',
      lead: 'No credit card required. If you have a question, write to us; we usually reply within one business day.',
      primary: 'Start free trial',
      secondary: 'Contact us',
    },
    breadcrumbHome: 'Home',
    breadcrumbSelf: 'Pricing',
  };
}

function buildFaqs(locale: 'tr' | 'en'): FaqEntry[] {
  if (locale === 'tr') {
    return [
      {
        q: 'Ücretsiz deneme için kredi kartı gerekiyor mu?',
        a: 'Hayır. Hesabınızı açtığınızda 14 günlük ücretsiz deneme başlar ve kart bilgisi istenmez. Deneme bittiğinde paneli kullanmaya devam etmek için aylık bir plan başlatırsınız.',
      },
      {
        q: 'Ödemeyi nasıl yapıyorum?',
        a: 'Kartla ödeme Türk lirası olarak, PayNKolay’ın güvenli kart sayfasında alınır (3D Secure). Kart bilgileriniz Buaze’ye ulaşmaz. Faturalarınızı panelde görürsünüz; otomatik çekim yoktur, dönemi panelden uzatırsınız.',
      },
      {
        q: 'Yıllık ödeme yapabilir miyim?',
        a: 'Evet. Plan kartlarında “Yıllık”ı seçip kartla ödeyebilirsiniz; yıllık ödeme 12 ay yerine 10 ayın fiyatıdır.',
      },
      {
        q: 'Aboneliğimi nasıl bitiririm?',
        a: 'Otomatik çekim olmadığı için iptal etmeniz gerekmez: dönemi uzatmazsanız, ödediğiniz dönemin sonunda panel erişiminiz durur. İade koşulları İade ve İptal Politikası’nda yer alır.',
      },
      {
        q: 'Verileri nasıl koruyorsunuz?',
        a: 'Müşteri formlarında KVKK aydınlatma metni ve açık rıza onayı bulunur; pazarlama izni ayrıdır ve varsayılan olarak kapalıdır. IP adresleri 90 gün sonra anonimleştirilir. Veritabanımız AB’de (Frankfurt) çalışır; bazı alt işleyicilerimiz ABD’dedir ve Veri İşleyici Sözleşmesi’nde listelenir. Pulse AI taslakları için geri bildirim metni yapay zekâ sağlayıcımıza (Anthropic, yedek olarak OpenAI) gönderilir.',
      },
      {
        q: 'Destek nasıl alırım?',
        a: `${SUPPORT_EMAIL} adresine ya da iletişim formuna yazabilirsiniz. ${SUPPORT_HOURS.tr} Yardım merkezinde Türkçe ve İngilizce rehberler bulunur.`,
      },
      {
        q: 'Planlar arasındaki fark ne?',
        a: 'Başlangıç tek işletme içindir ve QR, yorum yönlendirme, uyarılar, yanıtlar ve analitiği içerir. Büyüme 3 işletmeye kadar çıkar ve Pulse AI taslaklarını, yapay zekâ içgörülerini, dijital menüyü ve anketleri açar. Zincir 10 işletmeye kadar çıkar ve Google yorumlarına panelden yanıtı ekler. 14 günlük denemede tüm özellikler açıktır.',
      },
      {
        q: 'Fiyatlar hangi para biriminde?',
        a: 'Fiyatlar ve ödeme Türk lirasıdır. İngilizce sayfada fiyatlar bilgi için ABD doları olarak gösterilir; kart sayfasında tam tutar Türk lirası olarak görünür.',
      },
    ];
  }
  return [
    {
      q: 'Do I need a credit card for the free trial?',
      a: 'No. Your 14-day free trial starts when you create your account, and no card details are needed. When the trial ends, you start a monthly plan to keep using the panel.',
    },
    {
      q: 'How do I pay?',
      a: 'Card payments are charged in Turkish lira on PayNKolay’s secure card page (3D Secure). Your card details never reach Buaze. You see your invoices in the panel; there is no automatic charge, you extend the period from the panel.',
    },
    {
      q: 'Can I pay yearly?',
      a: 'Yes. Choose “Yearly” on the plan cards and pay by card; a year costs the price of 10 months.',
    },
    {
      q: 'How do I end my subscription?',
      a: 'There is no automatic charge, so there is nothing to cancel: if you do not extend, panel access stops at the end of the period you paid for. Refund terms are set out in the Refund and Cancellation Policy.',
    },
    {
      q: 'How do you protect data?',
      a: 'Customer forms show a KVKK notice and an explicit consent box; marketing consent is separate and off by default. IP addresses are anonymised after 90 days. Our database runs in the EU (Frankfurt); some of our sub-processors are in the US and are listed in the Data Processing Agreement. For Pulse AI drafts, the feedback text is sent to our AI provider (Anthropic, with OpenAI as a backup).',
    },
    {
      q: 'How do I get support?',
      a: `Write to ${SUPPORT_EMAIL} or use the contact form. ${SUPPORT_HOURS.en} The help center has guides in Turkish and English.`,
    },
    {
      q: 'How do the plans differ?',
      a: 'Starter covers one business with QR codes, review links, alerts, replies and analytics. Growth covers up to 3 businesses and adds Pulse AI drafts, AI insights, the digital menu and surveys. Scale covers up to 10 businesses and adds replying to Google reviews from the panel. Every feature is on during the 14-day trial.',
    },
    {
      q: 'Which currency are prices in?',
      a: 'This page shows prices in US dollars for reference. Card payments are taken in Turkish lira, and the card page shows the exact amount.',
    },
  ];
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: 'tr' | 'en' = rawLocale === 'en' ? 'en' : 'tr';
  const base = `/${locale}`;
  const copy = buildCopy(locale);
  const faqs = buildFaqs(locale);

  // Plans come from the SubscriptionPlan table (admin /admin/plans). A DB
  // error is NOT swallowed: during ISR regeneration Next keeps serving the
  // last good page instead of caching an empty one for an hour.
  const plans = await getActivePlans(locale);
  const hasCheckout = plans.some((p) => p.paymentProvider === 'paynkolay' && !!p.checkout);

  const pageUrl = `${SITE_URL}/${locale}/pricing`;
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
    <div className="min-h-screen overflow-x-clip bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <MarketingNavbar locale={locale} />
      <main id="main-content">
        <PaymentResultNotice locale={locale} />
        <PageHero
          align="center"
          eyebrow={copy.eyebrow}
          title={copy.title}
          lead={copy.lead}
          note={
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {copy.ticks.map((tick) => (
                <li key={tick} className="flex items-center gap-2 text-[15px] text-[#525252]">
                  <span
                    aria-hidden="true"
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A]"
                  >
                    <Check size={12} strokeWidth={2.75} />
                  </span>
                  {tick}
                </li>
              ))}
            </ul>
          }
        />

        <section className="pb-[60px] sm:pb-24">
          <div className={CONTAINER}>
            {plans.length > 0 ? (
              <>
                <PricingPlans locale={locale} plans={plans} />
                {hasCheckout ? (
                  <p className="mx-auto mt-8 max-w-[720px] text-center text-[14px] leading-[1.6] text-[#737373]">
                    {copy.paymentNote}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="mx-auto max-w-[640px] rounded-[20px] border border-[#EDEDED] bg-[#FAFAFA] p-8 text-center">
                <h2 className="text-[24px] leading-[1.2] text-[#0A0A0A]">{copy.empty.title}</h2>
                <p className="mt-3 text-[15px] leading-[1.6] text-[#525252]">{copy.empty.body}</p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    href={`${base}/auth/register`}
                    rel="nofollow"
                    className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#0A0A0A] px-6 text-[15px] font-medium text-white transition-colors hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                  >
                    {copy.empty.trial}
                  </Link>
                  <Link
                    href={`${base}/contact`}
                    className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#0A0A0A] bg-white px-6 text-[15px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#0A0A0A] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                  >
                    {copy.empty.contact}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="pricing-included-title" className={`bg-[#FAFAFA] ${SECTION_Y}`}>
          <div className={CONTAINER}>
            <SectionHeader
              id="pricing-included-title"
              eyebrow={copy.included.eyebrow}
              title={copy.included.title}
              lead={copy.included.lead}
            />
            <ul className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {copy.included.items.map((item) => (
                <li key={item.title} className="flex flex-col rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#EAF9B8] text-[#0A0A0A]"
                  >
                    <item.icon size={20} strokeWidth={1.8} />
                  </span>
                  <h3 className="mt-5 text-[20px] leading-[1.25] text-[#0A0A0A]">
                    <Link
                      href={`${base}${item.href}`}
                      className="rounded-sm decoration-[#C6F24E] decoration-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                    >
                      {item.title}
                    </Link>
                  </h3>
                  <p className="mt-2 flex-1 text-[15px] leading-[1.6] text-[#525252]">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="pricing-platforms-title" className={SECTION_Y}>
          <div className={`${CONTAINER} lg:grid lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16`}>
            <SectionHeader
              id="pricing-platforms-title"
              eyebrow={copy.platforms.eyebrow}
              title={copy.platforms.title}
              lead={copy.platforms.lead}
            />
            <div className="mt-8 lg:mt-0">
              <PlatformChips />
              <p className="mt-6 text-[15px]">
                <Link href={`${base}/integrations`} className={TEXT_LINK}>
                  {copy.platforms.more}
                </Link>
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="pricing-faq-title" className={`border-t border-[#EDEDED] ${SECTION_Y}`}>
          <div className={CONTAINER_NARROW}>
            <SectionHeader id="pricing-faq-title" eyebrow={copy.faq.eyebrow} title={copy.faq.title} />
            <div className="mt-10">
              <FaqList items={faqs} idPrefix="pricing-faq" />
            </div>
            <p className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-[#525252]">
              <span>{copy.faq.related}:</span>
              <Link href={`${base}/iade-iptal-politikasi`} className={TEXT_LINK}>
                {copy.faq.refund}
              </Link>
              <Link href={`${base}/veri-isleyici-sozlesmesi`} className={TEXT_LINK}>
                {copy.faq.dpa}
              </Link>
              <Link href={`${base}${copy.faq.privacyHref}`} className={TEXT_LINK}>
                {copy.faq.privacy}
              </Link>
            </p>
          </div>
        </section>

        <CtaBand
          id="pricing-cta-title"
          title={copy.cta.title}
          lead={copy.cta.lead}
          primary={{ href: `${base}/auth/register`, label: copy.cta.primary, nofollow: true }}
          secondary={{ href: `${base}/contact`, label: copy.cta.secondary }}
        />
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
