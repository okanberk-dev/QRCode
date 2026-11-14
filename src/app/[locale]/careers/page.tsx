import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Mail } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { jsonLdString } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/site';
import { ORGANIZATION_ID, SUPPORT_EMAIL, WEBSITE_ID } from '@/lib/company-constants';
import type { Locale } from '@/lib/translations';

/**
 * /careers — honest state: no published openings right now, general
 * applications go to the one public mailbox. The earlier role list and
 * team-size line came from the design prototype and were not real (spec D3).
 * When a real opening exists, publish it here with JobPosting JSON-LD
 * (datePosted / validThrough) — never an undated list.
 * Static: nothing here reads headers()/cookies()/searchParams.
 */

export const revalidate = 86400;

type Lang = 'tr' | 'en';

const META = {
  tr: {
    title: 'Kariyer: genel başvuru ve açık pozisyon duyuruları',
    description:
      "Buaze'de şu anda yayımlanmış bir açık pozisyon yok. Genel başvurunuzu kısa bir tanıtım ve özgeçmişinizle birlikte support@buaze.com adresine gönderebilirsiniz.",
  },
  en: {
    title: 'Careers: general applications and future openings',
    description:
      'There are no published openings at Buaze right now. You can send a general application with a short introduction and your CV to support@buaze.com.',
  },
} as const;

const COPY = {
  tr: {
    eyebrow: 'Kariyer',
    h1: "Buaze'de kariyer",
    lead: 'Şu anda yayımlanmış bir açık pozisyonumuz yok. Açık pozisyonlar yayımlandığında bu sayfada yer alır.',
    applyTitle: 'Genel başvuru',
    applyBody:
      "Buaze'de çalışmak istiyorsanız kısa bir tanıtım ve özgeçmişinizi, varsa portfolyo bağlantınızla birlikte support@buaze.com adresine gönderebilirsiniz. Konu satırına “Genel başvuru” yazmanız yeterli.",
    applyNote:
      'Başvurunuzda yalnızca değerlendirme için gereken bilgileri paylaşın; kimlik numarası veya sağlık bilgisi gibi verileri göndermeyin.',
    applyButton: 'E-postayla başvurun',
    mailSubject: 'Genel başvuru',
    workTitle: 'Ne üzerinde çalışıyoruz',
    workBody:
      "Buaze, işletmelerin müşteri geri bildirimini QR kodla toplamasına, müşterilerini yorum sayfalarına yönlendirmesine ve gelen geri bildirimleri tek panelde yanıtlamasına yardımcı olan bir yazılım. Ürünü İstanbul'da, Türkçe ve İngilizce kullanan işletmeler için geliştiriyoruz.",
    links: [
      { path: '/about', label: 'Buaze hakkında' },
      { path: '/how-it-works', label: 'Nasıl çalışır' },
    ],
    home: 'Ana sayfa',
  },
  en: {
    eyebrow: 'Careers',
    h1: 'Careers at Buaze',
    lead: 'We have no published openings right now. When we open a role, it will be listed on this page.',
    applyTitle: 'General applications',
    applyBody:
      'If you would like to work at Buaze, send a short introduction and your CV, plus a portfolio link if you have one, to support@buaze.com. Writing “General application” in the subject line is enough.',
    applyNote:
      'Share only what we need to review your application; please do not send data such as ID numbers or health information.',
    applyButton: 'Apply by e-mail',
    mailSubject: 'General application',
    workTitle: 'What we work on',
    workBody:
      'Buaze is software that helps businesses collect customer feedback with QR codes, send customers on to their review pages and reply to feedback from one panel. We build it in Istanbul for businesses that work in Turkish and English.',
    links: [
      { path: '/about', label: 'About Buaze' },
      { path: '/how-it-works', label: 'How it works' },
    ],
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
      canonical: `/${lang}/careers`,
      languages: { tr: '/tr/careers', en: '/en/careers', 'x-default': '/tr/careers' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${lang}/careers`,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
  };
}

export default async function CareersPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (locale !== 'tr' && locale !== 'en') notFound();
  const lang: Lang = locale;
  const copy = COPY[lang];
  const pageUrl = `${SITE_URL}/${lang}/careers`;
  const mailHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(copy.mailSubject)}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: copy.h1,
        description: META[lang].description,
        inLanguage: lang === 'tr' ? 'tr-TR' : 'en-US',
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': ORGANIZATION_ID },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: copy.home, item: `${SITE_URL}/${lang}` },
          { '@type': 'ListItem', position: 2, name: copy.eyebrow, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <MarketingNavbar locale={lang} />
      <main id="main-content">
        <section aria-labelledby="careers-title" className="pt-[60px] pb-10 sm:pt-20 sm:pb-16">
          <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
            <div className="max-w-[720px]">
              <p className="pulse-eyebrow text-[#737373]">{copy.eyebrow}</p>
              <h1
                id="careers-title"
                className="mt-4 text-balance text-[38px] leading-[1.02] tracking-[-0.035em] text-[#0A0A0A] sm:text-[56px] md:text-[52px] lg:text-[64px]"
              >
                {copy.h1}
              </h1>
              <p className="mt-6 max-w-[620px] text-pretty text-[17px] leading-[1.65] text-[#525252] sm:text-[19px]">
                {copy.lead}
              </p>
            </div>
          </div>
        </section>

        <div className="bg-[#FAFAFA] py-[60px] sm:py-24">
          <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-4 px-5 sm:gap-6 sm:px-10 lg:grid-cols-2">
            <section
              aria-labelledby="careers-apply-title"
              className="flex flex-col rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8"
            >
              <span
                aria-hidden="true"
                className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#EAF9B8] text-[#0A0A0A]"
              >
                <Mail size={20} strokeWidth={2} />
              </span>
              <h2 id="careers-apply-title" className="mt-5 text-[26px] leading-[1.15] text-[#0A0A0A] sm:text-[30px]">
                {copy.applyTitle}
              </h2>
              <p className="mt-4 text-[16px] leading-[1.65] text-[#333333]">{copy.applyBody}</p>
              <p className="mt-3 text-[14px] leading-[1.6] text-[#737373]">{copy.applyNote}</p>
              <div className="mt-auto pt-7">
                <a
                  href={mailHref}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                >
                  {copy.applyButton}
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
              </div>
            </section>

            <section
              aria-labelledby="careers-work-title"
              className="flex flex-col rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8"
            >
              <h2 id="careers-work-title" className="text-[26px] leading-[1.15] text-[#0A0A0A] sm:text-[30px]">
                {copy.workTitle}
              </h2>
              <p className="mt-4 text-[16px] leading-[1.65] text-[#333333]">{copy.workBody}</p>
              <ul className="mt-auto flex flex-wrap gap-x-6 gap-y-1 pt-6">
                {copy.links.map((link) => (
                  <li key={link.path}>
                    <Link
                      href={`/${lang}${link.path}`}
                      className="inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-semibold text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 transition-colors hover:decoration-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                    >
                      {link.label}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>
      <MarketingFooter locale={lang} />
    </div>
  );
}
