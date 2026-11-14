import type { Metadata } from 'next';
import { jsonLdString } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/site';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import RoiCalculator, { type RoiPlanOption } from '@/components/marketing/RoiCalculator';
import PageHero from '@/components/marketing/commercial/PageHero';
import SectionHeader from '@/components/marketing/commercial/SectionHeader';
import FaqList, { type FaqEntry } from '@/components/marketing/commercial/FaqList';
import CtaBand from '@/components/marketing/commercial/CtaBand';
import { CONTAINER, CONTAINER_NARROW, SECTION_Y } from '@/components/marketing/commercial/styles';
import { getActivePlans } from '@/lib/subscription-plans';
import type { Locale } from '@/lib/translations';

// ISR: inherits `revalidate = 3600` from `[locale]/layout.tsx`; plan saves
// revalidate the pricing pages, and this page picks the prices up hourly.

const META = {
  tr: {
    title: 'ROI hesaplayıcı: yanıt süresi ve plan maliyeti',
    description:
      'Kendi rakamlarınızla Pulse AI taslaklarının yanıt yazmaya harcadığınız süreyi ne kadar kısaltabileceğini ve bunu plan fiyatıyla karşılaştırın. Kayıt gerekmez.',
  },
  en: {
    title: 'ROI calculator: reply time saved and plan cost',
    description:
      'Use your own numbers to estimate how much reply-writing time Pulse AI drafts could save and compare it with the plan price. No sign-up needed.',
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
      canonical: `/${lang}/roi`,
      languages: { tr: '/tr/roi', en: '/en/roi', 'x-default': '/tr/roi' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${lang}/roi`,
      title,
      description,
      images: [{ url: `/images/open-graph-${lang}.png`, width: 1200, height: 630, alt: title }],
    },
  };
}

const COPY = {
  tr: {
    eyebrow: 'ROI hesaplayıcı',
    title: 'ROI hesaplayıcı: Buaze size ne kadar zaman kazandırabilir?',
    lead:
      'Kendi rakamlarınızı girin; ayda kaç puan toplayabileceğinizi, yanıtlara ne kadar zaman ayıracağınızı ve bunun plan fiyatıyla karşılaştırmasını görün. Sonuçlar tahminidir, kayıt gerekmez.',
    methodEyebrow: 'Yöntem',
    methodTitle: 'Hesap nasıl yapılır',
    methodLead: 'Gizli bir çarpan yok. Her sonuç, girdiğiniz değerlerden şu adımlarla çıkar.',
    method: [
      { title: 'Tahmini puan', body: 'Aylık müşteri sayınız × QR kodu okutup puan veren müşteri oranı.' },
      { title: 'Yanıt sayısı', body: 'Tahmini puan × yanıt yazdığınız geri bildirim oranı.' },
      {
        title: 'Yanıt süresi',
        body: 'Yanıt sayısı × bir yanıtın süresi; elle yazma ve Pulse AI taslağı için ayrı ayrı hesaplanır.',
      },
      {
        title: 'Zaman tasarrufunun değeri',
        body: 'Kazanılan saat × bir çalışma saatinin maliyeti. Bu tutardan plan fiyatını çıkarınca aylık farkı bulursunuz.',
      },
    ],
    excludedTitle: 'Hesaba katmadıklarımız',
    excludedBody:
      'Daha fazla herkese açık yorumun, daha iyi bir puanın ya da geri kazanılan müşterilerin gelire etkisini hesaplamıyoruz. Bu etkiler işletmeden işletmeye çok değişir ve önceden bilinemez.',
    faqEyebrow: 'Sık sorulan sorular',
    faqTitle: 'Hesaplayıcı hakkında',
    faqs: [
      {
        q: 'Varsayılan oranlar nereden geliyor?',
        a: 'Hiçbir araştırmaya ya da Buaze müşteri verisine dayanmazlar; hesaplayıcı boş açılmasın diye konmuş başlangıç değerleridir. Kendi işletmenizin rakamlarını girdiğinizde sonuç size özel olur.',
      },
      {
        q: 'Pulse AI yanıt süresini nasıl kısaltır?',
        a: 'Pulse AI her geri bildirim için sıcak, resmi ya da özür dileyen tonda 2–4 cümlelik bir taslak hazırlar. Taslağı okuyup düzenler ve onaylarsınız; onayınız olmadan hiçbir yanıt gönderilmez.',
      },
      {
        q: 'Sonuç garanti mi?',
        a: 'Hayır. Sonuçlar girdiğiniz değerlere dayanan tahminlerdir. Gerçek tasarruf, aldığınız geri bildirim sayısına ve ekibinizin yanıt alışkanlığına göre değişir.',
      },
      {
        q: 'Fiyatlar neden USD?',
        a: 'Buaze planları tüm dillerde USD ile faturalandırılır. Hesaplayıcı, fiyatlandırma sayfasındaki güncel plan fiyatlarını kullanır.',
      },
      {
        q: 'Raporu e-postayla alabilir miyim?',
        a: 'Evet. Formu doldurursanız bu hesabın özeti ve PDF’i birkaç dakika içinde e-postanıza gelir. Rapor için hesap açmanız gerekmez.',
      },
    ],
    cta: {
      title: '14 gün ücretsiz deneyin, kendi rakamlarınızı görün',
      facts: ['Kredi kartı gerekmez', 'Pulse AI taslakları dahil', 'İstediğiniz zaman iptal'],
      primary: 'Ücretsiz deneyin',
      secondary: 'Planları görün',
    },
    breadcrumbHome: 'Ana sayfa',
    breadcrumbSelf: 'ROI hesaplayıcı',
  },
  en: {
    eyebrow: 'ROI calculator',
    title: 'ROI calculator: how much time could Buaze save you?',
    lead:
      'Enter your own numbers to see how many ratings you could collect each month, how much time replies would take and how that compares with the plan price. Results are estimates; no sign-up needed.',
    methodEyebrow: 'Method',
    methodTitle: 'How the calculation works',
    methodLead: 'There is no hidden multiplier. Every result comes from the values you enter, in these steps.',
    method: [
      { title: 'Estimated ratings', body: 'Your customers per month × the share who scan the QR code and leave a rating.' },
      { title: 'Number of replies', body: 'Estimated ratings × the share of feedback you reply to.' },
      {
        title: 'Reply time',
        body: 'Number of replies × the time one reply takes, calculated separately for writing by hand and for Pulse AI drafts.',
      },
      {
        title: 'Value of the time saved',
        body: 'Hours saved × the cost of one working hour. Subtract the plan price from it to get the monthly difference.',
      },
    ],
    excludedTitle: 'What we leave out',
    excludedBody:
      'We do not calculate any revenue effect of more public reviews, a better rating or customers you win back. Those effects vary widely between businesses and cannot be known in advance.',
    faqEyebrow: 'Frequently asked questions',
    faqTitle: 'About the calculator',
    faqs: [
      {
        q: 'Where do the default rates come from?',
        a: 'They are not based on research or on Buaze customer data; they are starting values so the calculator does not open empty. When you enter your own numbers, the result is specific to you.',
      },
      {
        q: 'How does Pulse AI shorten reply time?',
        a: 'Pulse AI prepares a 2–4 sentence draft for each piece of feedback in a warm, formal or apologetic tone. You read, edit and approve it; no reply is sent without your approval.',
      },
      {
        q: 'Is the result guaranteed?',
        a: 'No. The results are estimates based on the values you enter. The real saving depends on how much feedback you receive and how your team handles replies.',
      },
      {
        q: 'Why are prices in USD?',
        a: 'Buaze plans are billed in USD in every language. The calculator uses the current plan prices from the pricing page.',
      },
      {
        q: 'Can I get the report by e-mail?',
        a: 'Yes. If you fill in the form, a summary of this calculation and a PDF reach your inbox within a few minutes. You do not need an account for the report.',
      },
    ],
    cta: {
      title: 'Try it free for 14 days and see your own numbers',
      facts: ['No credit card required', 'Pulse AI drafts included', 'Cancel anytime'],
      primary: 'Start free trial',
      secondary: 'See plans',
    },
    breadcrumbHome: 'Home',
    breadcrumbSelf: 'ROI calculator',
  },
} as const;

export default async function RoiPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: 'tr' | 'en' = rawLocale === 'en' ? 'en' : 'tr';
  const base = `/${locale}`;
  const copy = COPY[locale];
  const pageUrl = `${SITE_URL}/${locale}/roi`;
  const faqs: FaqEntry[] = [...copy.faqs];

  // Real plan prices from the DB (USD). If they cannot be loaded, the
  // calculator asks for the monthly cost instead — it still works.
  const plans: RoiPlanOption[] = await getActivePlans(locale)
    .then((rows) =>
      rows.map((p) => ({
        id: p.id,
        name: p.name,
        priceMonthly:
          p.discount.active && p.discount.discountedMonthly < p.priceMonthly
            ? p.discount.discountedMonthly
            : p.priceMonthly,
      })),
    )
    .catch((err: unknown) => {
      console.error('[roi] plans unavailable', err instanceof Error ? err.message : err);
      return [];
    });

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
        <PageHero align="center" eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />

        <section className="pb-[60px] sm:pb-24">
          <div className={CONTAINER}>
            <RoiCalculator locale={locale} plans={plans} />
          </div>
        </section>

        <section aria-labelledby="roi-method-title" className={`bg-[#FAFAFA] ${SECTION_Y}`}>
          <div className={CONTAINER}>
            <SectionHeader id="roi-method-title" eyebrow={copy.methodEyebrow} title={copy.methodTitle} lead={copy.methodLead} />
            <ol className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
              {copy.method.map((step, i) => (
                <li key={step.title} className="rounded-[20px] border border-[#EDEDED] bg-white p-6">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A0A0A] font-mono text-[14px] font-semibold text-[#C6F24E]"
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-[20px] leading-[1.25] text-[#0A0A0A]">{step.title}</h3>
                  <p className="mt-2 text-[15px] leading-[1.6] text-[#525252]">{step.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-8 max-w-[760px] rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8">
              <h3 className="text-[20px] leading-[1.25] text-[#0A0A0A]">{copy.excludedTitle}</h3>
              <p className="mt-2 text-[15px] leading-[1.65] text-[#525252]">{copy.excludedBody}</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="roi-faq-title" className={SECTION_Y}>
          <div className={CONTAINER_NARROW}>
            <SectionHeader id="roi-faq-title" eyebrow={copy.faqEyebrow} title={copy.faqTitle} />
            <div className="mt-10">
              <FaqList items={faqs} idPrefix="roi-faq" />
            </div>
          </div>
        </section>

        <CtaBand
          id="roi-cta-title"
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
