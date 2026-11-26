import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import HelpSearchBar from '@/components/marketing/HelpSearchBar';
import { jsonLdString } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/site';
import { WEBSITE_ID } from '@/lib/company-constants';
import type { Locale } from '@/lib/translations';
import { CATEGORY_BY_SLUG, HELP_CATEGORIES } from '@/lib/help-categories';
import HelpBreadcrumb from '../../_components/HelpBreadcrumb';
import HelpCategoryIcon from '../../_components/HelpCategoryIcon';
import HelpSupportCta from '../../_components/HelpSupportCta';
import { countByCategory, helpLabels, loadHelpArticleList } from '../../_lib/help-data';

/**
 * /help/category/[slug] — every article in one help topic, in the editorial
 * order. Static (ISR from the [locale] layout, §35.12.3); the 7 topics are
 * prerendered for both locales. Unknown topics (including the removed
 * `api-webhook`) return 404.
 */

interface PageParams {
  params: Promise<{ locale: Locale; slug: string }>;
}

export async function generateStaticParams() {
  return HELP_CATEGORIES.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, slug } = await params;
  const lang = locale === 'en' ? 'en' : 'tr';
  const category = CATEGORY_BY_SLUG[slug];
  if (!category) {
    return { title: lang === 'tr' ? 'Konu bulunamadı' : 'Topic not found', robots: { index: false, follow: true } };
  }
  const { seoTitle: title, seoDescription: description } = category[lang];
  const ogImage = lang === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png';
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/help/category/${slug}`,
      languages: {
        tr: `/tr/help/category/${slug}`,
        en: `/en/help/category/${slug}`,
        'x-default': `/tr/help/category/${slug}`,
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${lang}/help/category/${slug}`,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: category[lang].title }],
    },
  };
}

export default async function HelpCategoryPage({ params }: PageParams) {
  const { locale, slug } = await params;
  const lang = locale === 'en' ? 'en' : 'tr';
  const category = CATEGORY_BY_SLUG[slug];
  if (!category) notFound();

  const meta = category[lang];
  const labels = helpLabels(lang);
  const base = `/${lang}`;
  const pageUrl = `${SITE_URL}/${lang}/help/category/${slug}`;

  const list = await loadHelpArticleList(lang);
  const articles = list.filter((item) => item.category === slug);
  const counts = countByCategory(list);
  const otherTopics = HELP_CATEGORIES.filter((item) => item.slug !== slug && (counts[item.slug] ?? 0) > 0);

  const copy =
    lang === 'tr'
      ? {
          listTitle: 'Bu konudaki rehberler',
          empty: 'Bu konuda henüz rehber yok.',
          otherTopics: 'Diğer konular',
        }
      : {
          listTitle: 'Guides on this topic',
          empty: 'There are no guides on this topic yet.',
          otherTopics: 'Other topics',
        };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#page`,
        url: pageUrl,
        name: meta.title,
        description: meta.seoDescription,
        inLanguage: lang === 'tr' ? 'tr-TR' : 'en-US',
        isPartOf: { '@id': WEBSITE_ID },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: articles.length,
          itemListElement: articles.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${SITE_URL}/${lang}/help/${item.slug}`,
            name: item.title,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: labels.home, item: `${SITE_URL}/${lang}` },
          { '@type': 'ListItem', position: 2, name: labels.helpCenter, item: `${SITE_URL}/${lang}/help` },
          { '@type': 'ListItem', position: 3, name: meta.title, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <MarketingNavbar locale={locale} />
      <main id="main-content">
        {/* Header */}
        <header className="border-b border-[#EDEDED] bg-[#FAFAFA]">
          <div className="mx-auto w-full max-w-[1200px] px-5 pb-10 pt-6 sm:px-10 sm:pb-14 sm:pt-8">
            <HelpBreadcrumb
              label={labels.breadcrumb}
              items={[
                { label: labels.home, href: base },
                { label: labels.helpCenter, href: `${base}/help` },
                { label: meta.title },
              ]}
            />
            <div className="mt-6 flex flex-col gap-8 sm:mt-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
              <div className="max-w-[680px]">
                <span
                  aria-hidden="true"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#0A0A0A] text-[#C6F24E]"
                >
                  <HelpCategoryIcon icon={category.icon} size={22} />
                </span>
                <h1 className="mt-5 text-balance text-[38px] leading-[1.02] tracking-[-0.035em] text-[#0A0A0A] sm:text-[56px] md:text-[52px] lg:text-[64px]">
                  {meta.title}
                </h1>
                <p className="mt-5 max-w-[640px] text-pretty text-[16px] leading-[1.6] text-[#525252] sm:text-[18px]">
                  {meta.desc}
                </p>
                <p className="mt-3 text-[14px] text-[#737373]">{labels.articles(articles.length)}</p>
              </div>
              <div className="w-full lg:max-w-[420px]">
                <HelpSearchBar locale={lang} size="compact" />
              </div>
            </div>
          </div>
        </header>

        {/* Articles + other topics */}
        <div className="mx-auto w-full max-w-[1200px] px-5 py-[60px] sm:px-10 sm:py-20">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
            <section aria-labelledby="help-category-list">
              <h2
                id="help-category-list"
                className="text-balance text-[26px] leading-[1.15] tracking-[-0.02em] text-[#0A0A0A] sm:text-[32px]"
              >
                {copy.listTitle}
              </h2>
              {articles.length === 0 ? (
                <p className="mt-6 text-[16px] text-[#525252]">{copy.empty}</p>
              ) : (
                <ol role="list" className="mt-6 border-t border-[#EDEDED]">
                  {articles.map((item) => (
                    <li key={item.slug} className="group relative border-b border-[#EDEDED] focus-within:ring-2 focus-within:ring-[#C6F24E] focus-within:ring-offset-2">
                      <div className="flex items-start justify-between gap-6 py-6 sm:py-7">
                        <div className="min-w-0">
                          <h3 className="text-pretty text-[18px] font-medium leading-[1.3] tracking-[-0.015em] text-[#0A0A0A] sm:text-[20px]">
                            <Link
                              href={`${base}/help/${item.slug}`}
                              className="decoration-[#C6F24E] decoration-2 underline-offset-4 after:absolute after:inset-0 group-hover:underline focus-visible:outline-none"
                            >
                              {item.title}
                            </Link>
                          </h3>
                          {item.excerpt && (
                            <p className="mt-2 max-w-[640px] text-pretty text-[15px] leading-[1.6] text-[#525252]">{item.excerpt}</p>
                          )}
                        </div>
                        <ArrowRight
                          size={18}
                          aria-hidden="true"
                          className="mt-1 shrink-0 text-[#A3A3A3] transition-all group-hover:translate-x-0.5 group-hover:text-[#0A0A0A]"
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {otherTopics.length > 0 && (
              <aside aria-labelledby="help-other-topics" className="mt-14 lg:mt-0">
                <h2 id="help-other-topics" className="text-[20px] leading-[1.2] tracking-[-0.02em] text-[#0A0A0A]">
                  {copy.otherTopics}
                </h2>
                <ul role="list" className="mt-5 space-y-2">
                  {otherTopics.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`${base}/help/category/${item.slug}`}
                        className="group flex min-h-[52px] items-center gap-3 rounded-[14px] border border-[#EDEDED] bg-white px-4 py-2 transition-colors hover:border-[#D4D4D4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                      >
                        <span
                          aria-hidden="true"
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#F5F5F5] text-[#0A0A0A] transition-colors group-hover:bg-[#C6F24E]"
                        >
                          <HelpCategoryIcon icon={item.icon} size={16} />
                        </span>
                        <span className="min-w-0 flex-1 text-[15px] font-medium text-[#0A0A0A]">{item[lang].title}</span>
                        <span className="shrink-0 text-[13px] text-[#737373] tabular-nums">
                          {counts[item.slug] ?? 0}
                          <span className="sr-only"> {lang === 'tr' ? 'makale' : 'articles'}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        </div>

        <HelpSupportCta locale={lang} />
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
