import type { Metadata } from 'next';
import { Suspense } from 'react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import HelpSearchBar from '@/components/marketing/HelpSearchBar';
import type { Locale } from '@/lib/translations';
import { CATEGORY_BY_SLUG, HELP_CATEGORIES } from '@/lib/help-categories';
import { normalizeHelpSearchText } from '@/lib/help-search';
import HelpBreadcrumb from '../_components/HelpBreadcrumb';
import HelpSupportCta from '../_components/HelpSupportCta';
import HelpTopicGrid from '../_components/HelpTopicGrid';
import HelpSearchResults, {
  HelpSearchQueryBar,
  type HelpSearchEntry,
  type HelpSearchTopic,
} from '../_components/HelpSearchResults';
import { countByCategory, helpLabels, loadHelpArticleList } from '../_lib/help-data';

/**
 * /help/search — static page (no searchParams on the server, §35.12.3).
 * The query is read on the client from ?q= and matched against the index
 * built here. Not indexed (robots noindex); robots.txt also disallows ?q=.
 */

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale !== 'en';
  return {
    title: isTr ? 'Yardım merkezinde arama: rehber ve yanıt bulun' : 'Help center search: find guides and answers',
    description: isTr
      ? 'Buaze yardım merkezindeki rehberlerde arama yapın: kurulum, QR kodları, yorum yönetimi, platform bağlantıları, ekip, faturalandırma ve KVKK konuları.'
      : 'Search the Buaze help center guides: setup, QR codes, review management, platform links, your team, billing, privacy and data protection topics.',
    robots: { index: false, follow: true },
  };
}

export default async function HelpSearchPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const lang = locale === 'en' ? 'en' : 'tr';
  const labels = helpLabels(lang);
  const base = `/${lang}`;

  const list = await loadHelpArticleList(lang);
  const counts = countByCategory(list);
  const entries: HelpSearchEntry[] = list.map((item) => {
    const category = CATEGORY_BY_SLUG[item.category];
    return {
      slug: item.slug,
      category: item.category,
      categoryTitle: category ? category[lang].title : '',
      icon: category ? category.icon : null,
      title: item.title,
      excerpt: item.excerpt,
      searchText: item.searchText,
      titleText: normalizeHelpSearchText(item.title),
    };
  });
  const topics: HelpSearchTopic[] = HELP_CATEGORIES.filter((category) => (counts[category.slug] ?? 0) > 0).map(
    (category) => ({
      slug: category.slug,
      title: category[lang].title,
      icon: category.icon,
      count: counts[category.slug] ?? 0,
    }),
  );

  const copy = lang === 'tr' ? { h1: 'Yardım merkezinde ara', crumb: 'Arama' } : { h1: 'Search the help center', crumb: 'Search' };

  return (
    <div className="min-h-screen bg-white">
      <MarketingNavbar locale={locale} />
      <main id="main-content">
        <header className="border-b border-[#EDEDED] bg-[#FAFAFA]">
          <div className="mx-auto w-full max-w-[1200px] px-5 pb-10 pt-6 sm:px-10 sm:pb-14 sm:pt-8">
            <HelpBreadcrumb
              label={labels.breadcrumb}
              items={[
                { label: labels.home, href: base },
                { label: labels.helpCenter, href: `${base}/help` },
                { label: copy.crumb },
              ]}
            />
            <h1 className="mt-6 text-balance text-[32px] leading-[1.08] tracking-[-0.03em] text-[#0A0A0A] sm:mt-8 sm:text-[44px] lg:text-[52px]">
              {copy.h1}
            </h1>
            <div className="mt-8 max-w-[640px]">
              <Suspense fallback={<HelpSearchBar locale={lang} />}>
                <HelpSearchQueryBar locale={lang} />
              </Suspense>
            </div>
          </div>
        </header>

        <section className="mx-auto w-full max-w-[1200px] px-5 py-[48px] sm:px-10 sm:py-16">
          <div className="min-h-[240px] max-w-[880px]">
            {/* Static HTML (and no-JS visitors) get the topic list; the client
                swaps in results once it has read ?q=. */}
            <Suspense fallback={<HelpTopicGrid locale={lang} topics={topics} className="" />}>
              <HelpSearchResults locale={lang} entries={entries} topics={topics} />
            </Suspense>
          </div>
        </section>

        <HelpSupportCta locale={lang} />
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
