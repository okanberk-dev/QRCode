import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ChevronDown } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { jsonLdString } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/site';
import { ORGANIZATION_ID } from '@/lib/company-constants';
import { resolveDisplayTimeZone } from '@/lib/timezone';
import { sanitizeBlogContent } from '@/lib/blog-content';
import type { Locale } from '@/lib/translations';
import { CATEGORY_BY_SLUG } from '@/lib/help-categories';
import { getStaticHelpArticle, inlineToPlain } from '@/lib/help-articles';
import HelpBreadcrumb from '../_components/HelpBreadcrumb';
import HelpCategoryIcon from '../_components/HelpCategoryIcon';
import HelpArticleBody, { HelpInline, helpArticleToc, type HelpTocEntry } from '../_components/HelpArticleBody';
import HelpSupportCta from '../_components/HelpSupportCta';
import { helpArticleMetaTitle, helpLabels, loadHelpArticle, loadHelpArticleList } from '../_lib/help-data';

/**
 * /help/[slug] — one help article. Static articles render from their
 * structured body (HelpArticleBody); database articles render sanitized
 * HTML. Static page: no headers()/cookies()/searchParams (§35.12.3); ISR
 * from the [locale] layout. JSON-LD (Article, BreadcrumbList, FAQPage) is
 * built from the same content the page shows.
 */

interface PageParams {
  params: Promise<{ locale: Locale; slug: string }>;
}

// Nothing is prerendered at build time: each article is rendered on its
// first request and then cached (ISR). Unknown slugs return 404.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, slug } = await params;
  const lang = locale === 'en' ? 'en' : 'tr';
  const loaded = await loadHelpArticle(lang, slug);
  if (!loaded) {
    return { title: lang === 'tr' ? 'Makale bulunamadı' : 'Article not found', robots: { index: false, follow: true } };
  }
  const { article } = loaded;
  const title = helpArticleMetaTitle(article.title, lang);
  const description =
    article.excerpt ||
    (lang === 'tr' ? `${article.title}: Buaze yardım merkezi rehberi.` : `${article.title}: a Buaze help center guide.`);
  const other = lang === 'tr' ? 'en' : 'tr';
  const hasOther = loaded.kind === 'static' && Boolean(getStaticHelpArticle(other, slug));
  const ogImage = lang === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png';
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/help/${slug}`,
      ...(hasOther
        ? { languages: { tr: `/tr/help/${slug}`, en: `/en/help/${slug}`, 'x-default': `/tr/help/${slug}` } }
        : {}),
    },
    openGraph: {
      type: 'article',
      siteName: 'Buaze',
      locale: lang === 'tr' ? 'tr_TR' : 'en_US',
      url: `${SITE_URL}/${lang}/help/${slug}`,
      title,
      description,
      modifiedTime: article.updatedAt.toISOString(),
      images: [{ url: ogImage, width: 1200, height: 630, alt: article.title }],
    },
  };
}

function slugifyHeading(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** Adds ids to <h2> tags of database HTML and returns them for the contents list. */
function anchorHtmlHeadings(html: string): { html: string; toc: HelpTocEntry[] } {
  const toc: HelpTocEntry[] = [];
  const used = new Set<string>();
  const out = html.replace(/<h2>(.*?)<\/h2>/gi, (_match, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const base = slugifyHeading(text) || 'bolum';
    let id = base;
    let n = 2;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id);
    toc.push({ id, label: text });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return { html: out, toc };
}

export default async function HelpArticlePage({ params }: PageParams) {
  const { locale, slug } = await params;
  const lang = locale === 'en' ? 'en' : 'tr';
  const isTr = lang === 'tr';
  const loaded = await loadHelpArticle(lang, slug);
  if (!loaded) notFound();

  const { article } = loaded;
  const category = CATEGORY_BY_SLUG[article.category];
  if (!category) notFound();
  const categoryTitle = category[lang].title;
  const labels = helpLabels(lang);
  const base = `/${lang}`;
  const pageUrl = `${SITE_URL}/${lang}/help/${slug}`;

  const list = await loadHelpArticleList(lang);
  const related = list.filter((item) => item.category === article.category && item.slug !== article.slug).slice(0, 3);

  const struct = loaded.kind === 'static' ? loaded.article.bodyStruct : undefined;
  let tocEntries: HelpTocEntry[] = [];
  let dbHtml: string | null = null;
  if (struct) {
    const toc = helpArticleToc(struct, lang);
    tocEntries = [...toc.sections, ...(toc.checklist ? [toc.checklist] : []), ...(toc.faq ? [toc.faq] : [])];
  } else if (loaded.kind === 'db') {
    const anchored = anchorHtmlHeadings(sanitizeBlogContent(loaded.article.body));
    dbHtml = anchored.html;
    tocEntries = anchored.toc.slice(0, 10);
  }

  const updatedLabel = article.updatedAt.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: resolveDisplayTimeZone(),
  });

  const copy = isTr
    ? { updated: 'Güncelleme', contents: 'Bu sayfada', related: 'Bu konudaki diğer rehberler', seeAll: 'Konudaki tüm rehberler' }
    : { updated: 'Updated', contents: 'On this page', related: 'More guides on this topic', seeAll: 'All guides on this topic' };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${pageUrl}#article`,
        headline: article.title,
        description: article.excerpt || undefined,
        inLanguage: isTr ? 'tr-TR' : 'en-US',
        datePublished: article.updatedAt.toISOString(),
        dateModified: article.updatedAt.toISOString(),
        image: `${SITE_URL}/images/open-graph-${lang}.png`,
        author: { '@id': ORGANIZATION_ID },
        publisher: { '@id': ORGANIZATION_ID },
        mainEntityOfPage: pageUrl,
        articleSection: categoryTitle,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: labels.home, item: `${SITE_URL}/${lang}` },
          { '@type': 'ListItem', position: 2, name: labels.helpCenter, item: `${SITE_URL}/${lang}/help` },
          { '@type': 'ListItem', position: 3, name: categoryTitle, item: `${SITE_URL}/${lang}/help/category/${article.category}` },
          { '@type': 'ListItem', position: 4, name: article.title, item: pageUrl },
        ],
      },
      ...(struct && struct.faq.length
        ? [
            {
              '@type': 'FAQPage',
              '@id': `${pageUrl}#faq`,
              url: pageUrl,
              inLanguage: isTr ? 'tr-TR' : 'en-US',
              mainEntity: struct.faq.map((item) => ({
                '@type': 'Question',
                name: item.q,
                acceptedAnswer: { '@type': 'Answer', text: inlineToPlain(item.a) },
              })),
            },
          ]
        : []),
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
                { label: categoryTitle, href: `${base}/help/category/${article.category}` },
              ]}
            />
            <div className="mt-6 max-w-[760px] sm:mt-8">
              <p lang={lang} className="pulse-eyebrow flex items-center gap-2 text-[#525252]">
                <HelpCategoryIcon icon={category.icon} size={14} />
                {categoryTitle}
              </p>
              <h1 className="mt-4 text-balance text-[32px] leading-[1.08] tracking-[-0.03em] text-[#0A0A0A] sm:text-[44px] lg:text-[52px]">
                {article.title}
              </h1>
              {(struct?.lead || article.excerpt) && (
                <p className="mt-5 max-w-[680px] text-pretty text-[16px] leading-[1.6] text-[#525252] sm:text-[18px]">
                  {struct ? <HelpInline text={struct.lead} locale={lang} /> : article.excerpt}
                </p>
              )}
              <p className="mt-5 text-[13px] text-[#737373]">
                {copy.updated}: <time dateTime={article.updatedAt.toISOString()}>{updatedLabel}</time>
              </p>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="mx-auto w-full max-w-[1200px] px-5 py-[48px] sm:px-10 sm:py-16">
          <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
            {tocEntries.length > 1 && (
              <aside className="hidden lg:block">
                <nav aria-label={copy.contents} className="sticky top-28">
                  <p lang={lang} className="pulse-eyebrow text-[#737373]">
                    {copy.contents}
                  </p>
                  <ol className="mt-4 border-l border-[#EDEDED]">
                    {tocEntries.map((entry, index) => (
                      <li key={entry.id}>
                        <a
                          href={`#${entry.id}`}
                          className="-ml-px flex gap-2 border-l-2 border-transparent py-2 pl-4 text-[13px] leading-[1.45] text-[#525252] transition-colors hover:border-[#0A0A0A] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
                        >
                          <span aria-hidden="true" className="w-5 shrink-0 font-mono text-[11px] leading-[1.75] text-[#A3A3A3] tabular-nums">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span>{entry.label}</span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </aside>
            )}

            <div className={tocEntries.length > 1 ? 'min-w-0' : 'min-w-0 lg:col-span-2'}>
              <div className="max-w-[720px]">
                {tocEntries.length > 1 && (
                  <details className="group mb-10 rounded-[16px] border border-[#EDEDED] bg-white lg:hidden">
                    <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-5 text-[15px] font-medium text-[#0A0A0A] [&::-webkit-details-marker]:hidden">
                      {copy.contents}
                      <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <ol className="border-t border-[#EDEDED] px-5 py-2">
                      {tocEntries.map((entry, index) => (
                        <li key={entry.id}>
                          <a
                            href={`#${entry.id}`}
                            className="flex min-h-[44px] items-center gap-3 text-[15px] text-[#404040] hover:text-[#0A0A0A]"
                          >
                            <span aria-hidden="true" className="w-5 shrink-0 font-mono text-[11px] text-[#A3A3A3] tabular-nums">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            {entry.label}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}

                {struct ? (
                  <HelpArticleBody body={struct} locale={lang} />
                ) : (
                  <article
                    className="pulse-blog-content break-words [&_a]:font-medium [&_a]:text-[#0A0A0A] [&_a]:underline [&_a]:decoration-[#C6F24E] [&_a]:decoration-2 [&_a]:underline-offset-4 [&_h2]:scroll-mt-28 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
                    dangerouslySetInnerHTML={{ __html: dbHtml ?? '' }}
                  />
                )}

                <div className="mt-14 sm:mt-16">
                  <HelpSupportCta locale={lang} variant="card" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section aria-labelledby="help-related-title" className="border-t border-[#EDEDED] bg-[#FAFAFA] py-[60px] sm:py-20">
            <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <h2
                  id="help-related-title"
                  className="text-balance text-[26px] leading-[1.15] tracking-[-0.02em] text-[#0A0A0A] sm:text-[32px]"
                >
                  {copy.related}
                </h2>
                <Link
                  href={`${base}/help/category/${article.category}`}
                  className="inline-flex min-h-[44px] items-center gap-1.5 self-start text-[15px] font-medium text-[#0A0A0A] underline decoration-[#C6F24E] decoration-2 underline-offset-4 hover:decoration-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 sm:self-auto"
                >
                  {copy.seeAll}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
              <ul role="list" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <li
                    key={item.slug}
                    className="group relative flex flex-col rounded-[20px] border border-[#EDEDED] bg-white p-6 transition-colors hover:border-[#D4D4D4] focus-within:ring-2 focus-within:ring-[#C6F24E] focus-within:ring-offset-2"
                  >
                    <h3 className="text-pretty text-[18px] font-medium leading-[1.3] tracking-[-0.015em] text-[#0A0A0A]">
                      <Link href={`${base}/help/${item.slug}`} className="after:absolute after:inset-0 after:rounded-[20px] focus-visible:outline-none">
                        {item.title}
                      </Link>
                    </h3>
                    {item.excerpt && (
                      <p className="mt-3 line-clamp-3 text-[14px] leading-[1.6] text-[#525252]">{item.excerpt}</p>
                    )}
                    <span aria-hidden="true" className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[14px] font-medium text-[#0A0A0A]">
                      {labels.readMore}
                      <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
