import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import HelpSearchBar from '@/components/marketing/HelpSearchBar';
import { jsonLdString } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/site';
import { WEBSITE_ID } from '@/lib/company-constants';
import type { Locale } from '@/lib/translations';
import { CATEGORY_BY_SLUG, HELP_CATEGORIES } from '@/lib/help-categories';
import { HELP_START_HERE_SLUGS } from '@/lib/help-articles';
import HelpCategoryIcon from './_components/HelpCategoryIcon';
import HelpSupportCta from './_components/HelpSupportCta';
import { countByCategory, helpLabels, loadHelpArticleList } from './_lib/help-data';

/**
 * /help — help center hub: search, the 7 topics (counts computed from the
 * article list) and an editorial "start here" list. Static (ISR from the
 * [locale] layout, §35.12.3). JSON-LD lists only what the page shows.
 */

const META = {
  tr: {
    title: 'Yardım merkezi: kurulum ve kullanım rehberleri',
    description:
      'Buaze’yi kurmak ve her gün kullanmak için rehberler: QR kodları, yorum yönetimi, platform bağlantıları, ekip, faturalandırma ve KVKK, Türkçe ve İngilizce.',
  },
  en: {
    title: 'Help center: guides for setup and daily use',
    description:
      'Guides to setting up Buaze and using it day to day: QR codes, review management, platform links, your team, billing and privacy, in Turkish and English.',
  },
} as const;

const FEATURED_CATEGORY = 'getting-started';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale === 'en' ? 'en' : 'tr';
  const { title, description } = META[lang];
  const ogImage = lang === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png';
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/help`,
      languages: { tr: '/tr/help', en: '/en/help', 'x-default': '/tr/help' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${lang}/help`,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
  };
}

export default async function HelpCenterPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const lang = locale === 'en' ? 'en' : 'tr';
  const isTr = lang === 'tr';
  const base = `/${lang}`;
  const labels = helpLabels(lang);

  const list = await loadHelpArticleList(lang);
  const counts = countByCategory(list);
  const topics = HELP_CATEGORIES.filter((category) => (counts[category.slug] ?? 0) > 0);
  const featured = topics.find((category) => category.slug === FEATURED_CATEGORY) ?? null;
  const otherTopics = topics.filter((category) => category !== featured);
  const featuredArticles = featured ? list.filter((item) => item.category === featured.slug).slice(0, 3) : [];
  const startHere = HELP_START_HERE_SLUGS.map((slug) => list.find((item) => item.slug === slug)).filter(
    (item): item is (typeof list)[number] => Boolean(item),
  );

  const copy = isTr
    ? {
        eyebrow: 'Destek',
        h1: 'Buaze yardım merkezi',
        lead: `Kurulumdan günlük kullanıma kadar adım adım rehberler: ${topics.length} konuda ${list.length} makale. Aradığınızı yazın ya da bir konu seçin.`,
        topicsTitle: 'Konular',
        startTitle: 'Önce bunları okuyun',
        startLead: 'Müşteri akışını ve günlük işi anlamak için en önemli dört rehber.',
      }
    : {
        eyebrow: 'Support',
        h1: 'Buaze help center',
        lead: `Step-by-step guides from setup to daily use: ${list.length} articles across ${topics.length} topics. Search for what you need or pick a topic.`,
        topicsTitle: 'Topics',
        startTitle: 'Start with these',
        startLead: 'The four most important guides for understanding the customer flow and the daily work.',
      };

  const pageUrl = `${SITE_URL}/${lang}/help`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#page`,
        url: pageUrl,
        name: copy.h1,
        description: META[lang].description,
        inLanguage: isTr ? 'tr-TR' : 'en-US',
        isPartOf: { '@id': WEBSITE_ID },
        mainEntity: {
          '@type': 'ItemList',
          name: copy.topicsTitle,
          numberOfItems: topics.length,
          itemListElement: topics.map((category, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${SITE_URL}/${lang}/help/category/${category.slug}`,
            name: category[lang].title,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: labels.home, item: `${SITE_URL}/${lang}` },
          { '@type': 'ListItem', position: 2, name: labels.helpCenter, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A] lg:pt-[64px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <MarketingNavbar locale={locale} />
      <main id="main-content">
        {/* Hero + search */}
        <section aria-labelledby="help-title" className="border-b border-[#EDEDED] bg-[#FAFAFA] pb-[60px] pt-[60px] sm:pb-20 sm:pt-20">
          <div className="mx-auto w-full max-w-[1200px] px-5 text-center sm:px-10">
            <p lang={lang} className="pulse-eyebrow text-[#737373]">
              {copy.eyebrow}
            </p>
            <h1
              id="help-title"
              className="mx-auto mt-4 max-w-[860px] text-balance text-[38px] leading-[1.02] tracking-[-0.035em] text-[#0A0A0A] sm:text-[56px] md:text-[52px] lg:text-[64px]"
            >
              {copy.h1}
            </h1>
            <p className="mx-auto mt-5 max-w-[640px] text-pretty text-[16px] leading-[1.6] text-[#525252] sm:text-[18px]">
              {copy.lead}
            </p>
            <div className="mx-auto mt-8 max-w-[600px]">
              <HelpSearchBar locale={lang} />
            </div>
          </div>
        </section>

        {/* Topics */}
        <section aria-labelledby="help-topics-title" className="py-[60px] sm:py-24">
          <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
            <h2
              id="help-topics-title"
              className="text-balance text-[28px] leading-[1.08] tracking-[-0.02em] text-[#0A0A0A] sm:text-[40px] lg:text-[48px]"
            >
              {copy.topicsTitle}
            </h2>
            <ul role="list" className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4">
              {featured && (
                <li className="flex flex-col rounded-[20px] bg-[#0A0A0A] p-6 text-white sm:col-span-2 sm:p-8">
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden="true"
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#C6F24E] text-[#0A0A0A]"
                    >
                      <HelpCategoryIcon icon={featured.icon} size={20} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[22px] leading-[1.2] tracking-[-0.02em] text-white sm:text-[26px]">
                        <Link
                          href={`${base}/help/category/${featured.slug}`}
                          className="rounded-sm hover:underline hover:decoration-[#C6F24E] hover:decoration-2 hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
                        >
                          {featured[lang].title}
                        </Link>
                      </h3>
                      <p className="mt-2 text-pretty text-[15px] leading-[1.6] text-white/70">{featured[lang].desc}</p>
                    </div>
                  </div>
                  <ul role="list" className="mt-6 border-t border-white/10">
                    {featuredArticles.map((item) => (
                      <li key={item.slug} className="border-b border-white/10">
                        <Link
                          href={`${base}/help/${item.slug}`}
                          className="group flex min-h-[48px] items-center justify-between gap-4 py-3 text-[15px] font-medium text-white transition-colors hover:text-[#C6F24E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
                        >
                          <span className="text-pretty">{item.title}</span>
                          <ArrowRight size={16} aria-hidden="true" className="shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`${base}/help/category/${featured.slug}`}
                    className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 self-start text-[14px] font-semibold text-[#C6F24E] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
                  >
                    {labels.seeAll(counts[featured.slug] ?? 0)}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </li>
              )}
              {otherTopics.map((category) => (
                <li
                  key={category.slug}
                  className="group relative flex gap-4 rounded-[20px] border border-[#EDEDED] bg-white p-5 transition-colors hover:border-[#D4D4D4] focus-within:ring-2 focus-within:ring-[#C6F24E] focus-within:ring-offset-2 sm:flex-col sm:gap-0 sm:p-6"
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#F5F5F5] text-[#0A0A0A] transition-colors group-hover:bg-[#C6F24E]"
                  >
                    <HelpCategoryIcon icon={category.icon} size={20} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col sm:mt-5">
                    <h3 className="text-[18px] font-medium leading-[1.25] tracking-[-0.015em] text-[#0A0A0A] sm:text-[19px]">
                      <Link
                        href={`${base}/help/category/${category.slug}`}
                        className="after:absolute after:inset-0 after:rounded-[20px] focus-visible:outline-none"
                      >
                        {category[lang].title}
                      </Link>
                    </h3>
                    <p className="mt-1.5 text-pretty text-[14px] leading-[1.6] text-[#525252] sm:mt-2">{category[lang].desc}</p>
                    <p className="mt-3 text-[13px] text-[#737373] sm:mt-auto sm:pt-5">{labels.articles(counts[category.slug] ?? 0)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Start here */}
        {startHere.length > 0 && (
          <section aria-labelledby="help-start-title" className="border-t border-[#EDEDED] bg-[#FAFAFA] py-[60px] sm:py-24">
            <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
              <h2
                id="help-start-title"
                className="text-balance text-[28px] leading-[1.08] tracking-[-0.02em] text-[#0A0A0A] sm:text-[40px] lg:text-[48px]"
              >
                {copy.startTitle}
              </h2>
              <p className="mt-4 max-w-[640px] text-pretty text-[16px] leading-[1.6] text-[#525252] sm:text-[18px]">
                {copy.startLead}
              </p>
              <ul role="list" className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 md:grid-cols-2">
                {startHere.map((item) => {
                  const category = CATEGORY_BY_SLUG[item.category];
                  return (
                    <li
                      key={item.slug}
                      className="group relative flex flex-col rounded-[20px] border border-[#EDEDED] bg-white p-6 transition-colors hover:border-[#D4D4D4] focus-within:ring-2 focus-within:ring-[#C6F24E] focus-within:ring-offset-2 sm:p-8"
                    >
                      {category && (
                        <p lang={lang} className="pulse-eyebrow flex items-center gap-2 text-[#737373]">
                          <HelpCategoryIcon icon={category.icon} size={13} />
                          {category[lang].title}
                        </p>
                      )}
                      <h3 className="mt-4 text-pretty text-[20px] font-medium leading-[1.25] tracking-[-0.015em] text-[#0A0A0A] sm:text-[22px]">
                        <Link
                          href={`${base}/help/${item.slug}`}
                          className="after:absolute after:inset-0 after:rounded-[20px] focus-visible:outline-none"
                        >
                          {item.title}
                        </Link>
                      </h3>
                      <p className="mt-3 text-pretty text-[15px] leading-[1.6] text-[#525252]">{item.excerpt}</p>
                      <span aria-hidden="true" className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[14px] font-medium text-[#0A0A0A]">
                        {labels.readMore}
                        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}

        <HelpSupportCta locale={lang} />
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
